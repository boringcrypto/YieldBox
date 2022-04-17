// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "../YieldBox.sol";

// Thanks to
// - BookyPooBah - numToBytes

// TODO:
// Gas: Reduce where safe
// Docs: Document every line in the contract
// Check: Get extreme decimal examples, does exercise work ok?

// price: this is the price of 10^18 base units of asset (ignoring decimals) as expressed in base units of currency (also ignoring decimals)

// The frontend is responsible for making the simple calculation so the code can stay decimal agnostic and simple
// For example, the price of 1 CVC (has 8 decimals) in the currency DAI (18 decimals):
// 1 CVC = 0.0365 DAI
// 1 * 8^10 base units of CVC = 0.0365 DAI (CVC has 8 decimals)
// 1 * 8^10 base units of CVC = 0.0365 * 10^18 base units of DAI (DAI has 18 decimals)
// 1 * 18^10 base units of CVC = 0.0365 * 10^28 base units of DAI (Multiply by 10^10 in this case to get to 10^18 base units)
// Price = 0.0365 * 10^28 = 365000000000000000000000000

// Design decisions and rationale

// Use of block.timestamp
// While blocknumber is more 'exact', block.timestamp is easier to understand for users and more predictable
// So while it can be slightly manipulated by miners, this is not an issue on the timescales options operate at

// solhint-disable not-rely-on-time

library String {
    bytes1 private constant DOT = bytes1(uint8(46));
    bytes1 private constant ZERO = bytes1(uint8(48));

    function numToString(uint256 number, uint8 decimals) internal pure returns (string memory) {
        uint256 i;
        uint256 j;
        uint256 result;
        bytes memory b = new bytes(40);
        if (number == 0) {
            b[j++] = ZERO;
        } else {
            i = decimals + 18;
            do {
                uint256 num = number / 10**i;
                result = result * 10 + (num % 10);
                if (result > 0) {
                    b[j++] = bytes1(uint8((num % 10) + uint8(ZERO)));
                    if ((j > 1) && (number == num * 10**i) && (i <= decimals)) {
                        break;
                    }
                } else {
                    if (i == decimals) {
                        b[j++] = ZERO;
                        b[j++] = DOT;
                    }
                    if (i < decimals) {
                        b[j++] = ZERO;
                    }
                }
                if (decimals != 0 && decimals == i && result > 0 && i > 0) {
                    b[j++] = DOT;
                }
                i--;
            } while (i >= 0);
        }

        bytes memory out = new bytes(j);
        for (uint256 x = 0; x < j; x++) {
            out[x] = b[x];
        }
        return string(out);
    }
}

struct Option {
    uint32 asset; // Allows for up to 4B assets
    uint32 currency;
    uint32 expiry;
    uint32 optionAssetId;
    uint32 minterAssetId;
    uint256 price;
}

contract YieldOptions {
    YieldBox public yieldBox;

    constructor(YieldBox _yieldBox) {
        yieldBox = _yieldBox;
    }

    Option[] public options;

    function create(
        uint32 asset,
        uint32 currency,
        uint128 price,
        uint32 expiry
    ) public returns (uint256 optionId) {
        Option memory option;
        option.asset = asset;
        option.currency = currency;
        option.price = price;
        option.expiry = expiry;
        option.optionAssetId = yieldBox.createToken(
            "YieldOption",
            string(
                abi.encodePacked(
                    "yo",
                    yieldBox.symbol(option.asset),
                    ":",
                    yieldBox.symbol(option.currency),
                    " ",
                    String.numToString(option.price, yieldBox.decimals(option.currency))
                )
            ),
            18,
            ""
        );
        option.minterAssetId = yieldBox.createToken(
            "YieldOptionMinter",
            string(
                abi.encodePacked(
                    "ym",
                    yieldBox.symbol(option.asset),
                    ":",
                    yieldBox.symbol(option.currency),
                    " ",
                    String.numToString(option.price, yieldBox.decimals(option.currency))
                )
            ),
            18,
            ""
        );

        optionId = options.length;
        options.push(option);
    }

    event Mint(uint256 optionId, address indexed by, uint256 amount);
    event Withdraw(uint256 optionId, address indexed by, uint256 amount);
    event Exercise(uint256 optionId, address indexed by, uint256 amount);
    event Swap(uint256 optionId, address indexed by, uint256 assetAmount);

    /**
     * @dev Mint options.
     * @param amount The amount to mint expressed in units of currency.
     */
    function mint(
        uint256 optionId,
        uint256 amount,
        address optionTo,
        address minterTo
    ) public {
        Option storage option = options[optionId];

        require(block.timestamp < option.expiry, "Option expired");
        require(yieldBox.totalSupply(option.asset) == 0, "Options exercised, no minting");

        // Step 1. Receive amount base units of currency. This is held in the contract to be paid when the option is exercised.
        yieldBox.transfer(msg.sender, address(this), option.asset, amount);

        // Step 2. Mint option tokens
        yieldBox.mint(option.optionAssetId, optionTo, amount);

        // Step 3. Mint issue tokens
        yieldBox.mint(option.minterAssetId, minterTo, amount);

        // EVENTS
        emit Mint(optionId, msg.sender, amount);
    }

    /**
     * @dev Withdraw from the pool. Asset and currency are withdrawn to the proportion in which they are exercised.
     * @param amount The amount to withdraw expressed in units of the option.
     */
    function withdraw(
        uint256 optionId,
        uint256 amount,
        address to
    ) public {
        Option storage option = options[optionId];

        // CHECKS
        require(block.timestamp >= option.expiry, "Option not yet expired");

        // EFFECTS
        yieldBox.transfer(
            address(this),
            to,
            option.asset,
            (yieldBox.totalSupply(option.currency) * amount) / yieldBox.totalSupply(option.minterAssetId)
        );
        yieldBox.transfer(
            address(this),
            to,
            option.asset,
            (yieldBox.totalSupply(option.currency) * amount) / yieldBox.totalSupply(option.minterAssetId)
        );
        yieldBox.burn(option.minterAssetId, msg.sender, amount);

        // EVENTS
        emit Withdraw(optionId, msg.sender, amount);
    }

    /**
     * @dev Withdraw from the pool before expiry by returning the options.
     * In this case Assets are withdrawn first if available. Only currency is returned if assets run to 0.
     * @param amount The amount to withdraw expressed in units of the option.
     */
    function withdrawEarly(
        uint256 optionId,
        uint256 amount,
        address to
    ) public {
        Option storage option = options[optionId];

        // CHECKS
        require(block.timestamp < option.expiry, "Option not yet expired");

        // EFFECTS
        yieldBox.burn(option.optionAssetId, msg.sender, amount);
        yieldBox.burn(option.minterAssetId, msg.sender, amount);

        // Step 3. Receive from the asset pool
        uint256 assetAmount;
        uint256 currencyAmount;
        uint256 totalAsset = yieldBox.totalSupply(option.asset);

        if (totalAsset > 0) {
            // The amount fully in Assets
            assetAmount = (amount * 1e18) / option.price;

            // If there aren't enough Assets in the contract, use as much as possible and get the rest from currency
            if (assetAmount > totalAsset) {
                currencyAmount = ((assetAmount - totalAsset) * option.price) / 1e18;
                assetAmount = totalAsset;
            }
        } else {
            currencyAmount = amount;
        }

        yieldBox.transfer(address(this), to, option.currency, currencyAmount);
        yieldBox.transfer(address(this), to, option.asset, assetAmount);

        // EVENTS
        emit Withdraw(optionId, msg.sender, amount);
    }

    /**
     * @dev Exercise options.
     * @param amount The amount to exercise expressed in units of currency.
     */
    function exercise(uint256 optionId, uint256 amount) public {
        Option storage option = options[optionId];

        require(block.timestamp < option.expiry, "Option has expired");

        yieldBox.burn(option.optionAssetId, msg.sender, amount);
        yieldBox.transfer(msg.sender, address(this), option.asset, (amount * 1e18) / option.price);
        yieldBox.transfer(address(this), msg.sender, option.currency, amount);

        emit Exercise(optionId, msg.sender, amount);
    }

    /**
     * @dev If some of the options are exercised, but the price of the asset goes back up, anyone can
     * swap the assets for the original currency. The main reason for this is that minted gets locked
     * once any option is exercised. When all assets are swapped back for currency, further minting
     * can happen again.
     * @param assetAmount The amount to swap. This is denominated in asset (NOT currency!) so it's always possible to swap ALL
     * assets, and rounding won't leave dust behind.
     */
    function swap(
        uint256 optionId,
        uint256 assetAmount,
        address to
    ) public {
        Option storage option = options[optionId];

        uint256 currencyAmount = (assetAmount * option.price) / 1e18;
        yieldBox.transfer(msg.sender, address(this), option.currency, currencyAmount); // TODO: Round up
        yieldBox.transfer(address(this), msg.sender, option.asset, assetAmount);
        yieldBox.mint(option.optionAssetId, to, currencyAmount);

        // EVENTS
        emit Swap(optionId, msg.sender, currencyAmount);
    }
}

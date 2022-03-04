// SPDX-License-Identifier: UNLICENSED

// The YieldBox
// The original BentoBox is owned by the Sushi team to set strategies for each token. Abracadabra wanted different strategies, which led to
// them launching their own DegenBox. The YieldBox solves this by allowing an unlimited number of strategies for each token in a fully
// permissionless manner. The YieldBox has no owner and operates fully permissionless.

// Other improvements:
// Better system to make sure the token to share ratio doesn't reset.
// Full support for rebasing tokens.

// This contract stores funds, handles their transfers, approvals and strategies.

// Copyright (c) 2021, 2022 BoringCrypto - All rights reserved
// Twitter: @Boring_Crypto

// Since the contract is permissionless, only one deployment per chain is needed. If it's not yet deployed
// on a chain or if you want to make a derivative work, contact @BoringCrypto. The core of YieldBox is
// copyrighted. Most of the contracts that it builds on are open source though. 

pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;
import "./interfaces/IWrappedNative.sol";
import "./interfaces/IStrategy.sol";
import "@boringcrypto/boring-solidity/contracts/interfaces/IERC1155.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/Base64.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringAddress.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "@boringcrypto/boring-solidity/contracts/Domain.sol";
import "./ERC1155TokenReceiver.sol";
import "./ERC1155.sol";
import "@boringcrypto/boring-solidity/contracts/BoringBatchable.sol";
import "@boringcrypto/boring-solidity/contracts/BoringFactory.sol";
import "./YieldBoxBase.sol";

// An asset is a token + a strategy
struct Asset {
    TokenType tokenType;
    address contractAddress;
    IStrategy strategy;
    uint256 tokenId;
}

struct NativeAsset {
    string name;
    string symbol;
    uint8 decimals;
}

contract AssetRegister {
    using BoringAddress for address;

    // ids start at 1 so that id 0 means it's not yet registered
    mapping(TokenType => mapping(address => mapping(IStrategy => mapping(uint256 => uint256)))) public ids;
    Asset[] public assets;

    constructor() {
        assets.push(Asset(TokenType.EIP20, address(0), NO_STRATEGY, 0));
    }

    function registerAsset(TokenType tokenType, address contractAddress, IStrategy strategy, uint256 tokenId) public returns (uint256 assetId) {
        // Checks
        assetId = ids[tokenType][contractAddress][strategy][tokenId];

        // If assetId is 0, this is a new asset that needs to be registered
        if (assetId == 0) {
            // Only do these checks if a new asset needs to be created
            require(tokenId == 0 || tokenType != TokenType.EIP20, "YieldBox: No tokenId for ERC20");
            require(strategy == NO_STRATEGY || (tokenType == strategy.tokenType() && contractAddress == strategy.contractAddress() && tokenId == strategy.tokenId()), "YieldBox: Strategy mismatch");
            // If a new token gets added, the isContract checks that this is a deployed contract. Needed for security.
            // Prevents getting shares for a future token whose address is known in advance. For instance a token that will be deployed with CREATE2 in the future or while the contract creation is
            // in the mempool
            require(contractAddress.isContract(), "YieldBox: Not a token");

            // Effects
            assetId = assets.length;
            assets.push(Asset(tokenType, contractAddress, strategy, tokenId));
            ids[tokenType][contractAddress][strategy][tokenId] = assetId;
        }
    }
}

contract NativeTokenVault is ERC1155, AssetRegister {
    mapping(uint256 => NativeAsset) public nativeAssets;
    mapping(uint256 => address) public owner;
    mapping(uint256 => address) public pendingOwner;

    event OwnershipTransferred(uint256 indexed assetId, address indexed previousOwner, address indexed newOwner);

    /// @notice Only allows the `owner` to execute the function.
    modifier onlyOwner(uint256 assetId) {
        require(msg.sender == owner[assetId], "NTV: caller is not the owner");
        _;
    }    

    /// @notice Transfers ownership to `newOwner`. Either directly or claimable by the new pending owner.
    /// Can only be invoked by the current `owner`.
    /// @param newOwner Address of the new owner.
    /// @param direct True if `newOwner` should be set immediately. False if `newOwner` needs to use `claimOwnership`.
    /// @param renounce Allows the `newOwner` to be `address(0)` if `direct` and `renounce` is True. Has no effect otherwise.
    function transferOwnership(
        uint256 assetId,
        address newOwner,
        bool direct,
        bool renounce
    ) public onlyOwner(assetId) {
        if (direct) {
            // Checks
            require(newOwner != address(0) || renounce, "NTV: zero address");

            // Effects
            emit OwnershipTransferred(assetId, owner[assetId], newOwner);
            owner[assetId] = newOwner;
            pendingOwner[assetId] = address(0);
        } else {
            // Effects
            pendingOwner[assetId] = newOwner;
        }
    }

    /// @notice Needs to be called by `pendingOwner` to claim ownership.
    function claimOwnership(uint256 assetId) public {
        address _pendingOwner = pendingOwner[assetId];

        // Checks
        require(msg.sender == _pendingOwner, "NTV: caller != pending owner");

        // Effects
        emit OwnershipTransferred(assetId, owner[assetId], _pendingOwner);
        owner[assetId] = _pendingOwner;
        pendingOwner[assetId] = address(0);
    }

    function createToken(string calldata name, string calldata symbol, uint8 decimals) public {
        uint256 assetId = registerAsset(TokenType.Native, address(0), NO_STRATEGY, 0);
        // Initial supply is 0, use owner can mint. For a fixed supply the owner can mint and revoke ownership.
        // The msg.sender is the initial owner, can be changed after.
        nativeAssets[assetId] = NativeAsset(name, symbol, decimals);
        owner[assetId] = msg.sender;

        emit OwnershipTransferred(assetId, address(0), msg.sender);
    }

    function mint(uint256 assetId, address to, uint256 amount) public onlyOwner(assetId) {
        _mint(to, assetId, amount);
    }

    function burn(uint256 assetId, uint256 amount) public {
        require(assets[assetId].tokenType == TokenType.Native, "NTV: Not native");
        _burn(msg.sender, assetId, amount);
    }
}

contract YieldBoxURIBuilder {
    using BoringERC20 for IERC20;
    using Base64 for bytes;

    YieldBox immutable public yieldBox;

    constructor() {
        yieldBox = YieldBox(payable(msg.sender));
    }

    function uri(uint256 assetId) external view returns (string memory) {
        NativeAsset memory details;
        (TokenType tokenType, address contractAddress, IStrategy strategy, uint256 tokenId) = yieldBox.assets(assetId);
        if (tokenType == TokenType.EIP1155) {
            details.name = "EIP1155 token";
            details.symbol = "EIP1155";
        } else if (tokenType == TokenType.Native) {
            (details.name, details.symbol, details.decimals) = yieldBox.nativeAssets(assetId);
        } else if (tokenType == TokenType.EIP20) {

        }
        IERC20 token = IERC20(contractAddress);
        return
            abi.encodePacked(
                '{"name": "',
                token.safeName(),
                '", "symbol": "', // properties
                token.safeSymbol(),
                '", "decimals": ',
                token.safeDecimals(),
                "}"
            )
            .encode();
    }
}

/// @title YieldBox
/// @author BoringCrypto, Keno
/// @notice The YieldBox is a vault for tokens. The stored tokens can assigned to strategies.
/// Yield from this will go to the token depositors.
/// Any funds transfered directly onto the YieldBox will be lost, use the deposit function instead.
contract YieldBox is Domain, BoringBatchable, BoringFactory, NativeTokenVault, ERC1155TokenReceiver {
    using BoringAddress for address;
    using BoringERC20 for IERC20;
    using BoringERC20 for IWrappedNative;
    using BoringRebase for uint256;

    // ************** //
    // *** EVENTS *** //
    // ************** //

    // TODO: Add events

    // ******************* //
    // *** CONSTRUCTOR *** //
    // ******************* //

    IWrappedNative private immutable wrappedNative;
    YieldBoxURIBuilder private immutable uriBuilder;

    constructor(IWrappedNative wrappedNative_) {
        wrappedNative = wrappedNative_;
        uriBuilder = new YieldBoxURIBuilder();
    }

    // ***************** //
    // *** MODIFIERS *** //
    // ***************** //

    /// Modifier to check if the msg.sender is allowed to use funds belonging to the 'from' address.
    /// If 'from' is msg.sender, it's allowed.
    /// If 'msg.sender' is an address (an operator) that is approved by 'from', it's allowed.
    /// If 'msg.sender' is a clone of a masterContract that is approved by 'from', it's allowed.
    modifier allowed(address from) {
        if (from != msg.sender && !isApprovedForAll[from][msg.sender]) {
            address masterContract = masterContractOf[msg.sender];
            require(masterContract != address(0) && isApprovedForAll[masterContract][from], "YieldBox: Not approved");
        }
        _;
    }

    // ************************** //
    // *** INTERNAL FUNCTIONS *** //
    // ************************** //

    /// @dev Returns the total balance of `token` this contracts holds,
    /// plus the total amount this contract thinks the strategy holds.
    function _tokenBalanceOf(Asset storage asset) internal view returns (uint256 amount) {
        if (asset.strategy == NO_STRATEGY) {
            if (asset.tokenType == TokenType.EIP20) {
                return IERC20(asset.contractAddress).safeBalanceOf(address(this));
            } else if (asset.tokenType == TokenType.EIP1155) {
                return IERC1155(asset.contractAddress).balanceOf(address(this), asset.tokenId);
            }
        } else {
            return asset.strategy.currentBalance();
        }
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice Deposit an amount of `token` represented in either `amount` or `share`.
    /// @param assetId The id of the asset.
    /// @param from which account to pull the tokens.
    /// @param to which account to push the tokens.
    /// @param amount Token amount in native representation to deposit.
    /// @param share Token amount represented in shares to deposit. Takes precedence over `amount`.
    /// @return amountOut The amount deposited.
    /// @return shareOut The deposited amount repesented in shares.
    function depositAsset(
        uint256 assetId,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) public allowed(from) returns (uint256 amountOut, uint256 shareOut) {
        // Checks
        Asset storage asset = assets[assetId];
        require(asset.tokenType != TokenType.Native);

        // Effects
        uint256 totalAmount = _tokenBalanceOf(asset);
        if (share == 0) {
            // value of the share may be lower than the amount due to rounding, that's ok
            share = amount._toShares(totalSupply[assetId], totalAmount, false);
        } else {
            // amount may be lower than the value of share due to rounding, in that case, add 1 to amount (Always round up)
            amount = share._toAmount(totalSupply[assetId], totalAmount, true);
        }

        _mint(to, assetId, share);

        // Interactions
        if (asset.tokenType == TokenType.EIP20) {
            IERC20(asset.contractAddress).safeTransferFrom(from, asset.strategy == NO_STRATEGY ? address(this) : address(asset.strategy), amount);
        } else if (asset.tokenType == TokenType.EIP1155) {
            IERC1155(asset.contractAddress).safeTransferFrom(from, asset.strategy == NO_STRATEGY ? address(this) : address(asset.strategy), asset.tokenId, amount, "");
        }

        return (amount, share);
    }

    function depositETHAsset(
        uint256 assetId,
        address to
    ) public payable returns (uint256 amountOut, uint256 shareOut) {
        // Checks
        Asset storage asset = assets[assetId];
        require(asset.tokenType == TokenType.EIP20 && asset.contractAddress == address(wrappedNative), "YieldBox: not WETH");

        // Effects
        uint256 amount = msg.value;
        uint256 share = amount._toShares(totalSupply[assetId], _tokenBalanceOf(asset), false);

        _mint(to, assetId, share);

        // Interactions
        if (asset.strategy == NO_STRATEGY) {
            wrappedNative.deposit{value: amount}();
        } else {
            // Strategies will receive the the native currency directly. It is up to the strategy to wrap it if needed
            address(asset.strategy).sendNative(amount);
        }

        return (amount, share);
    }

    /// @notice Withdraws an amount of `token` from a user account.
    /// @param assetId The id of the asset.
    /// @param from which user to pull the tokens.
    /// @param to which user to push the tokens.
    /// @param amount of tokens. Either one of `amount` or `share` needs to be supplied.
    /// @param share Like above, but `share` takes precedence over `amount`.
    function withdraw(
        uint256 assetId,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) public allowed(from) returns (uint256 amountOut, uint256 shareOut) {
        // Checks
        Asset storage asset = assets[assetId];
        require(asset.tokenType != TokenType.Native);

        // Effects
        uint256 totalAmount = _tokenBalanceOf(asset);
        if (share == 0) {
            // value of the share paid could be lower than the amount paid due to rounding, in that case, add a share (Always round up)
            share = amount._toShares(totalSupply[assetId], totalAmount, true);
        } else {
            // amount may be lower than the value of share due to rounding, that's ok
            amount = share._toAmount(totalSupply[assetId], totalAmount, false);
        }

        _burn(from, assetId, share);

        // Interactions
        if (asset.strategy == NO_STRATEGY) {
            if (asset.tokenType == TokenType.EIP20) {
                // Native tokens are always unwrapped when withdrawn
                if (asset.contractAddress == address(wrappedNative)) {
                    wrappedNative.withdraw(amount);
                    to.sendNative(amount);
                } else {
                    IERC20(asset.contractAddress).safeTransfer(to, amount);
                }
            } else if (asset.tokenType == TokenType.EIP1155) {
                IERC1155(asset.contractAddress).safeTransferFrom(address(this), to, asset.tokenId, amount, "");
            }
        } else {
            asset.strategy.withdraw(amount, to);
        }

        return (amount, share);
    }

    function _requireTransferAllowed(address from) internal view override allowed(from) { }

    /// @notice Transfer shares from a user account to another one.
    /// @param from which user to pull the tokens.
    /// @param to which user to push the tokens.
    /// @param assetId The id of the asset.
    /// @param share The amount of `token` in shares.
    function transfer(
        address from,
        address to,
        uint256 assetId,
        uint256 share
    ) public allowed(from) {
        _transferSingle(from, to, assetId, share);
    }

    function batchTransfer(
        address from,
        address to,
        uint256[] calldata assetIds_,
        uint256[] calldata shares_
    ) public allowed(from) {
        _transferBatch(from, to, assetIds_, shares_);
    }

    /// @notice Transfer shares from a user account to multiple other ones.
    /// @param assetId The id of the asset.
    /// @param from which user to pull the tokens.
    /// @param tos The receivers of the tokens.
    /// @param share The amount of `token` in shares for each receiver in `tos`.
    function transferMultiple(
        uint256 assetId,
        address from,
        address[] calldata tos,
        uint256[] calldata share
    ) public allowed(from) {
        // Checks
        require(tos[0] != address(0), "YieldBox: tos[0] not set"); // To avoid a bad UI from burning funds

        // Effects
        uint256 totalAmount;
        uint256 len = tos.length;
        for (uint256 i = 0; i < len; i++) {
            address to = tos[i];
            uint256 share_ = share[i];
            balanceOf[to][assetId] += share_;
            totalAmount += share_;
            emit TransferSingle(msg.sender, from, to, assetId, share_);
        }
        balanceOf[from][assetId] -= totalAmount;
    }

    function setApprovalForAll(address operator, bool approved) external override {
        // Checks
        require(operator != address(0), "YieldBox: operator not set"); // Important for security
        require(masterContractOf[msg.sender] == address(0), "YieldBox: user is clone");

        // Effects
        isApprovedForAll[msg.sender][operator] = approved;

        emit ApprovalForAll(msg.sender, operator, approved);
    }

    // See https://eips.ethereum.org/EIPS/eip-191
    string private constant EIP191_PREFIX_FOR_EIP712_STRUCTURED_DATA = "\x19\x01";
    bytes32 private constant APPROVAL_SIGNATURE_HASH =
        keccak256("setApprovalForAllWithPermit(address user,address operator,bool approved,uint256 nonce)");

    /// @notice user nonces for masterContract approvals
    mapping(address => uint256) public nonces;

    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return _domainSeparator();
    }

    function setApprovalForAllWithPermit(
        address user,
        address operator,
        bool approved,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        // Checks
        require(operator != address(0), "YieldBox: operator not set"); // Important for security
        require(masterContractOf[user] == address(0), "YieldBox: user is clone");

        // Important for security - any address without masterContract has address(0) as masterContract
        // So approving address(0) would approve every address, leading to full loss of funds
        // Also, ecrecover returns address(0) on failure. So we check this:
        require(user != address(0), "YieldBox: User cannot be 0");

        bytes32 digest = _getDigest(keccak256(abi.encode(APPROVAL_SIGNATURE_HASH, user, operator, approved, nonces[user]++)));
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress == user, "YieldBox: Invalid Signature");

        // Effects
        isApprovedForAll[user][operator] = approved;
        emit ApprovalForAll(user, operator, approved);
    }

    function uri(uint256 assetId) external view override returns (string memory) {
        // This functionality has been split off into a separate contract. This is only a view function, so gas usage isn't a huge issue.
        // This keeps the YieldBox contract smaller, so it can be optimized more.
        return uriBuilder.uri(assetId);
    }

    // Included to support unwrapping wrapped native tokens such as WETH
    receive() external payable { }

    // Helper functions

    /// @dev Helper function to represent an `amount` of `token` in shares.
    /// @param assetId The id of the asset.
    /// @param amount The `token` amount.
    /// @param roundUp If the result `share` should be rounded up.
    /// @return share The token amount represented in shares.
    function toShare(
        uint256 assetId,
        uint256 amount,
        bool roundUp
    ) external view returns (uint256 share) {
        share = amount._toShares(totalSupply[assetId], _tokenBalanceOf(assets[assetId]), roundUp);
    }

    /// @dev Helper function represent shares back into the `token` amount.
    /// @param assetId The id of the asset.
    /// @param share The amount of shares.
    /// @param roundUp If the result should be rounded up.
    /// @return amount The share amount back into native representation.
    function toAmount(
        uint256 assetId,
        uint256 share,
        bool roundUp
    ) external view returns (uint256 amount) {
        amount = share._toAmount(totalSupply[assetId], _tokenBalanceOf(assets[assetId]), roundUp);
    }

    function deposit(
        TokenType tokenType,
        address contractAddress,
        IStrategy strategy,
        uint256 tokenId,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) public returns (uint256 amountOut, uint256 shareOut)  {
        return depositAsset(registerAsset(tokenType, contractAddress, strategy, tokenId), from, to, amount, share);
    }

    function depositETH(
        IStrategy strategy,
        address to
    ) public payable returns (uint256 amountOut, uint256 shareOut) {
        return depositETHAsset(registerAsset(TokenType.EIP20, address(wrappedNative), strategy, 0), to);
    }
}

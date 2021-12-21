// SPDX-License-Identifier: UNLICENSED

// The BoringBox
// The original BentoBox is owned by the Sushi team to set strategies for each token. Abracadabra wanted different strategies, which led to
// them launching their own DegenBox. The BoringBox solves this by allowing an unlimited number of strategies for each token in a fully
// permissionless manner. The BoringBox has no owner and operates fully permissionless.

// Other improvements:
// Better system to make sure the token to share ratio doesn't reset.
// Full support for rebasing tokens.

// This contract stores funds, handles their transfers, approvals and strategies.

// Copyright (c) 2021 BoringCrypto - All rights reserved
// Twitter: @Boring_Crypto

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "./interfaces/IWETH.sol";
import "./interfaces/IStrategy.sol";
import "./interfaces/IERC1155TokenReceiver.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringAddress.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "@boringcrypto/boring-solidity/contracts/Domain.sol";
import "@boringcrypto/boring-solidity/contracts/BoringBatchable.sol";
import "@boringcrypto/boring-solidity/contracts/BoringFactory.sol";

/// @title BoringBox
/// @author BoringCrypto, Keno
/// @notice The BoringBox is a vault for tokens. The stored tokens can assigned to strategies.
/// Yield from this will go to the token depositors.
/// Any funds transfered directly onto the BoringBox will be lost, use the deposit function instead.
contract BoringBox is Domain, BoringBatchable, BoringFactory {
    using BoringMath for uint256;
    using BoringAddress for address;
    using BoringERC20 for IERC20;

    // ************** //
    // *** EVENTS *** //
    // ************** //

    event LogDeposit(IERC20 indexed token, IStrategy strategy, address indexed from, address indexed to, uint256 amount, uint256 share);
    event LogWithdraw(IERC20 indexed token, IStrategy strategy, address indexed from, address indexed to, uint256 amount, uint256 share);
    event LogTransfer(IERC20 indexed token, IStrategy strategy, address indexed from, address indexed to, uint256 share);

    // EIP-1155 events
    event TransferSingle(address indexed _operator, address indexed _from, address indexed _to, uint256 _id, uint256 _value);
    event TransferBatch(address indexed _operator, address indexed _from, address indexed _to, uint256[] _ids, uint256[] _values);
    event ApprovalForAll(address indexed _owner, address indexed _operator, bool _approved);
    event URI(string _value, uint256 indexed _id);

    // ******************************** //
    // *** CONSTANTS AND IMMUTABLES *** //
    // ******************************** //

    IERC20 private immutable wethToken;
    IERC20 private constant USE_ETHEREUM = IERC20(0);

    // An asset is a token + a strategy
    struct Asset {
        IERC20 token;
        IStrategy strategy;
    }

    // ***************** //
    // *** VARIABLES *** //
    // ***************** //

    // ids start at 1 so that id 0 means it's not yet registered
    mapping(IERC20 => mapping(IStrategy => uint256)) public ids;
    Asset[] public assets;

    // Balance per token per strategy per address/contract in shares
    mapping(uint256 => mapping(address => uint256)) public shares;

    // Total shares per asset
    mapping(uint256 => uint256) public totalShares;

    // ******************* //
    // *** CONSTRUCTOR *** //
    // ******************* //

    constructor(IERC20 wethToken_) public {
        wethToken = wethToken_;
        assets.push(Asset(IERC20(0), IStrategy(0)));
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
            require(masterContract != address(0) && isApprovedForAll[masterContract][from], "BoringBox: Not approved");
        }
        _;
    }

    // ************************** //
    // *** INTERNAL FUNCTIONS *** //
    // ************************** //

    /// @notice Calculates the base value in relationship to `elastic` and `total`.
    function _toShares(
        uint256 totalShares_,
        uint256 totalAmount,
        uint256 amount,
        bool roundUp
    ) internal pure returns (uint256 share) {
        // To prevent reseting the ratio due to withdrawal of all shares, we start with
        // 1 amount/1e8 shares already burned. This also starts with a 1 : 1e8 ratio which
        // functions like 8 decimal fixed point math. This prevents ratio attacks or inaccuracy
        // due to 'gifting' or rebasing tokens. (Up to a certain degree)
        totalAmount = totalAmount.add(1);
        totalShares_ = totalShares_.add(1e8);

        // Calculte the shares using te current amount to share ratio
        share = amount.mul(totalShares_) / totalAmount;

        // Default is to round down (Solidity), round up if required
        if (roundUp && share.mul(totalAmount) / totalShares_ < amount) {
            share = share.add(1);
        }
    }

    /// @notice Calculates the elastic value in relationship to `base` and `total`.
    function _toAmount(
        uint256 totalShares_,
        uint256 totalAmount,
        uint256 share,
        bool roundUp
    ) internal pure returns (uint256 amount) {
        // To prevent reseting the ratio due to withdrawal of all shares, we start with
        // 1 amount/1e8 shares already burned. This also starts with a 1 : 1e8 ratio which
        // functions like 8 decimal fixed point math. This prevents ratio attacks or inaccuracy
        // due to 'gifting' or rebasing tokens. (Up to a certain degree)
        totalAmount = totalAmount.add(1);
        totalShares_ = totalShares_.add(1e8);

        // Calculte the amount using te current amount to share ratio
        amount = share.mul(totalShares_) / totalAmount;

        // Default is to round down (Solidity), round up if required
        if (roundUp && amount.mul(totalShares_) / totalAmount < share) {
            amount = amount.add(1);
        }
    }

    /// @dev Returns the total balance of `token` this contracts holds,
    /// plus the total amount this contract thinks the strategy holds.
    function _tokenBalanceOf(Asset memory asset) internal view returns (uint256 amount) {
        amount = asset.strategy == IStrategy(0) ? asset.token.safeBalanceOf(address(this)) : asset.strategy.currentBalance(asset.token);
    }

    function _transfer(
        uint256 id,
        address from,
        address to,
        uint256 share
    ) internal {
        // Checks
        require(to != address(0), "BoringBox: to not set"); // To avoid a bad UI from burning funds

        // Effects
        shares[id][from] = shares[id][from].sub(share);
        shares[id][to] = shares[id][to].add(share);

        emit TransferSingle(msg.sender, from, to, id, share);
    }

    function _batchTransfer(
        address from,
        address to,
        uint256[] calldata ids_,
        uint256[] calldata shares_
    ) internal {
        // Checks
        require(to != address(0), "BoringBox: to not set"); // To avoid a bad UI from burning funds

        // Effects
        uint256 len = ids_.length;
        for (uint256 i = 0; i < len; i++) {
            uint256 id = ids_[i];
            uint256 share = shares_[i];
            shares[id][from] = shares[id][from].sub(share);
            shares[id][to] = shares[id][to].add(share);
        }

        emit TransferBatch(msg.sender, from, to, ids_, shares_);
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        return
            interfaceID == 0x01ffc9a7 || // EIP-165
            interfaceID == 0xd9b67a26; // EIP-1155
    }

    /// @dev Helper function to represent an `amount` of `token` in shares.
    /// @param id The id of the asset.
    /// @param amount The `token` amount.
    /// @param roundUp If the result `share` should be rounded up.
    /// @return share The token amount represented in shares.
    function toShare(
        uint256 id,
        uint256 amount,
        bool roundUp
    ) external view returns (uint256 share) {
        share = _toShares(totalShares[id], _tokenBalanceOf(assets[id]), amount, roundUp);
    }

    /// @dev Helper function represent shares back into the `token` amount.
    /// @param id The id of the asset.
    /// @param share The amount of shares.
    /// @param roundUp If the result should be rounded up.
    /// @return amount The share amount back into native representation.
    function toAmount(
        uint256 id,
        uint256 share,
        bool roundUp
    ) external view returns (uint256 amount) {
        amount = _toAmount(totalShares[id], _tokenBalanceOf(assets[id]), share, roundUp);
    }

    function registerId(IERC20 token, IStrategy strategy) public returns (uint256 id) {
        require(ids[token][strategy] > 0, "BoringBox: Already registered");
        assets.push(Asset(token, strategy));
        id = assets.length;
        ids[token][strategy] = id;
    }

    /// @notice Deposit an amount of `token` represented in either `amount` or `share`.
    /// @param id The id of the asset.
    /// @param from which account to pull the tokens.
    /// @param to which account to push the tokens.
    /// @param amount Token amount in native representation to deposit.
    /// @param share Token amount represented in shares to deposit. Takes precedence over `amount`.
    /// @return amountOut The amount deposited.
    /// @return shareOut The deposited amount repesented in shares.
    function deposit(
        uint256 id,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) public payable allowed(from) returns (uint256 amountOut, uint256 shareOut) {
        // Checks
        require(to != address(0), "BoringBox: to not set"); // To avoid a bad UI from burning funds

        // Effects
        Asset memory asset = assets[id];
        IERC20 token = asset.token == USE_ETHEREUM ? wethToken : asset.token;
        uint256 totalAmount = _tokenBalanceOf(assets[id]);

        // If a new token gets added, the tokenSupply call checks that this is a deployed contract. Needed for security.
        require(totalAmount != 0 || token.totalSupply() > 0, "BoringBox: No tokens");
        if (share == 0) {
            // value of the share may be lower than the amount due to rounding, that's ok
            share = _toShares(totalShares[id], totalAmount, amount, false);
        } else {
            // amount may be lower than the value of share due to rounding, in that case, add 1 to amount (Always round up)
            amount = _toAmount(totalShares[id], totalAmount, share, true);
        }

        shares[id][to] = shares[id][to].add(share);
        totalShares[id] = totalShares[id].add(share);

        // Interactions
        // During the first deposit, we check that this token is 'real'
        //if ()
        if (asset.token == USE_ETHEREUM) {
            IWETH(address(wethToken)).deposit{value: amount}();
            if (asset.strategy != IStrategy(0)) {
                wethToken.safeTransfer(address(asset.strategy), amount);
            }
        } else if (from != address(this)) {
            token.safeTransferFrom(from, asset.strategy == IStrategy(0) ? address(this) : address(asset.strategy), amount);
        }
        emit LogDeposit(token, asset.strategy, from, to, amount, share);
        emit TransferSingle(msg.sender, address(0), to, id, share);
        amountOut = amount;
        shareOut = share;
    }

    /// @notice Withdraws an amount of `token` from a user account.
    /// @param id The id of the asset.
    /// @param from which user to pull the tokens.
    /// @param to which user to push the tokens.
    /// @param amount of tokens. Either one of `amount` or `share` needs to be supplied.
    /// @param share Like above, but `share` takes precedence over `amount`.
    function withdraw(
        uint256 id,
        IStrategy strategy,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) public allowed(from) returns (uint256 amountOut, uint256 shareOut) {
        // Checks
        require(to != address(0), "BoringBox: to not set"); // To avoid a bad UI from burning funds

        // Effects
        Asset memory asset = assets[id];
        IERC20 token = asset.token == USE_ETHEREUM ? wethToken : asset.token;
        uint256 totalAmount = _tokenBalanceOf(asset);
        if (share == 0) {
            // value of the share paid could be lower than the amount paid due to rounding, in that case, add a share (Always round up)
            share = _toShares(totalShares[id], totalAmount, amount, true);
        } else {
            // amount may be lower than the value of share due to rounding, that's ok
            amount = _toAmount(totalShares[id], totalAmount, share, false);
        }

        shares[id][from] = shares[id][from].sub(share);
        totalShares[id] = totalShares[id].sub(share.to128());

        // Interactions
        if (asset.token == USE_ETHEREUM) {
            IWETH(address(wethToken)).withdraw(amount);
            // solhint-disable-next-line avoid-low-level-calls
            (bool success, ) = to.call{value: amount}("");
            require(success, "BoringBox: ETH transfer failed");
        } else {
            token.safeTransfer(to, amount);
        }
        emit LogWithdraw(token, strategy, from, to, amount, share);
        amountOut = amount;
        shareOut = share;
    }

    /// @notice Transfer shares from a user account to another one.
    /// @param id The id of the asset.
    /// @param from which user to pull the tokens.
    /// @param to which user to push the tokens.
    /// @param share The amount of `token` in shares.
    // Clones of master contracts can transfer from any account that has approved them
    function transfer(
        uint256 id,
        address from,
        address to,
        uint256 share
    ) public allowed(from) {
        _transfer(id, from, to, share);
    }

    /// @notice Transfer shares from a user account to multiple other ones.
    /// @param id The id of the asset.
    /// @param from which user to pull the tokens.
    /// @param tos The receivers of the tokens.
    /// @param share The amount of `token` in shares for each receiver in `tos`.
    function transferMultiple(
        uint256 id,
        address from,
        address[] calldata tos,
        uint256[] calldata share
    ) public allowed(from) {
        // Checks
        require(tos[0] != address(0), "BoringBox: to[0] not set"); // To avoid a bad UI from burning funds

        // Effects
        uint256 totalAmount;
        uint256 len = tos.length;
        for (uint256 i = 0; i < len; i++) {
            address to = tos[i];
            uint256 share_ = share[i];
            shares[id][to] = shares[id][to].add(share_);
            totalAmount = totalAmount.add(share_);
            emit TransferSingle(msg.sender, from, to, id, share_);
        }
        shares[id][from] = shares[id][from].sub(totalAmount);
    }

    /// The following functions are purely here to be EIP-1155 compliant. Using these in your protocol is NOT recommended as it opens
    /// up many attack vectors, such as reentrancy issues and denial of service?
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 share,
        bytes calldata data
    ) external {
        require(from == msg.sender, "BoringBox: Not allowed");

        _transfer(id, from, to, share);

        if (to.isContract()) {
            require(
                IERC1155TokenReceiver(to).onERC1155Received(msg.sender, from, id, share, data) ==
                    bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)")),
                "Wrong return value"
            );
        }
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids_,
        uint256[] calldata shares_,
        bytes calldata data
    ) external {
        // Checks
        require(from == msg.sender, "BoringBox: Not allowed");

        // Effects
        _batchTransfer(from, to, ids_, shares_);

        if (to.isContract()) {
            require(
                IERC1155TokenReceiver(to).onERC1155BatchReceived(msg.sender, from, ids_, shares_, data) ==
                    bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)")),
                "Wrong return value"
            );
        }
    }

    function balanceOf(address owner, uint256 id) external view returns (uint256) {
        return shares[id][owner];
    }

    function balanceOfBatch(address[] calldata owners, uint256[] calldata ids_) external view returns (uint256[] memory balances) {
        uint256 len = owners.length;
        balances = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            balances[i] = shares[ids_[i]][owners[i]];
        }
    }

    mapping(address => mapping(address => bool)) public isApprovedForAll;

    function setApprovalForAll(address operator, bool approved) external {
        // Checks
        require(operator != address(0), "BoringBox: operator not set"); // Important for security
        require(masterContractOf[msg.sender] == address(0), "BoringBox: user is clone");

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
        require(operator != address(0), "BoringBox: operator not set"); // Important for security
        require(masterContractOf[user] == address(0), "BoringBox: user is clone");

        // Important for security - any address without masterContract has address(0) as masterContract
        // So approving address(0) would approve every address, leading to full loss of funds
        // Also, ecrecover returns address(0) on failure. So we check this:
        require(user != address(0), "BoringBox: User cannot be 0");

        bytes32 digest = _getDigest(
            keccak256(
                abi.encode(
                    APPROVAL_SIGNATURE_HASH,
                    user,
                    operator,
                    approved,
                    nonces[user]++
                )
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress == user, "MasterCMgr: Invalid Signature");

        // Effects
        isApprovedForAll[user][operator] = approved;
        emit ApprovalForAll(user, operator, approved);
    }

    // Contract should be able to receive ETH deposits to support deposit & skim
    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}

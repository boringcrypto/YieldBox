// SPDX-License-Identifier: UNLICENSED

// The BoringBox V2
// The original BentoBox is owned by the Sushi team to set strategies for each token. Abracadabra wanted different strategies, which led to
// them launching their own DegenBox. Version 2 solves this by allowing an unlimited number of strategies for each token in a fully
// permissionless manner. The BoringBox has no owner and operates fully permissionless.

// Other improvements:
// Better system to make sure the token to share ratio doesn't reset.
// Full support for rebasing tokens.

// This contract stores funds, handles their transfers, approvals and strategies.

// Copyright (c) 2021 BoringCrypto - All rights reserved
// Twitter: @Boring_Crypto

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "./interfaces/IFlashLoan.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/IStrategy.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol";
import "./MasterContractManager.sol";
import "@boringcrypto/boring-solidity/contracts/BoringBatchable.sol";

/// @title BoringBox
/// @author BoringCrypto, Keno
/// @notice The BoringBox is a vault for tokens. The stored tokens can assigned to strategies.
/// Yield from this will go to the token depositors.
/// Any funds transfered directly onto the BoringBox will be lost, use the deposit function instead.
contract BoringBoxV2 is MasterContractManager, BoringBatchable {
    using BoringMath for uint256;
    //using BoringMath128 for uint128;
    using BoringERC20 for IERC20;

    // ************** //
    // *** EVENTS *** //
    // ************** //

    event LogDeposit(IERC20 indexed token, IStrategy strategy, address indexed from, address indexed to, uint256 amount, uint256 share);
    event LogWithdraw(IERC20 indexed token, IStrategy strategy, address indexed from, address indexed to, uint256 amount, uint256 share);
    event LogTransfer(IERC20 indexed token, IStrategy strategy, address indexed from, address indexed to, uint256 share);

    // ******************************** //
    // *** CONSTANTS AND IMMUTABLES *** //
    // ******************************** //

    IERC20 private immutable wethToken;

    IERC20 private constant USE_ETHEREUM = IERC20(0);
    uint256 private constant MINIMUM_SHARE_BALANCE = 1000; // To prevent the ratio going off

    // ***************** //
    // *** VARIABLES *** //
    // ***************** //

    // Balance per token per strategy per address/contract in shares
    mapping(IERC20 => mapping(IStrategy => mapping(address => uint256))) public balanceOf;

    // Rebase from amount to share
    mapping(IERC20 => mapping(IStrategy => uint256)) public totalShares;

    // ******************* //
    // *** CONSTRUCTOR *** //
    // ******************* //

    constructor(IERC20 wethToken_) public {
        wethToken = wethToken_;
    }

    // ***************** //
    // *** MODIFIERS *** //
    // ***************** //

    /// Modifier to check if the msg.sender is allowed to use funds belonging to the 'from' address.
    /// If 'from' is msg.sender, it's allowed.
    /// If 'from' is the BoringBox itself, it's allowed. Any ETH, token balances (above the known balances) or BoringBox balances
    /// can be taken by anyone.
    /// This is to enable skimming, not just for deposits, but also for withdrawals or transfers, enabling better composability.
    /// If 'from' is a clone of a masterContract AND the 'from' address has approved that masterContract, it's allowed.
    modifier allowed(address from) {
        if (from != msg.sender) {
            // From is sender or you are skimming
            address masterContract = masterContractOf[msg.sender];
            require(masterContract != address(0), "BoringBox: no masterContract");
            require(masterContractApproved[masterContract][from], "BoringBox: Transfer not approved");
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
    ) internal pure returns (uint256 shares) {
        if (totalAmount == 0) {
            shares = amount;
        } else {
            // Add imaginary 1000 units
            totalShares_ = totalShares_.add(1000);
            totalAmount = totalAmount.add(1000);
            shares = amount.mul(totalShares_) / totalAmount;
            if (roundUp && shares.mul(totalAmount) / totalShares_ < amount) {
                shares = shares.add(1);
            }
        }
    }

    /// @notice Calculates the elastic value in relationship to `base` and `total`.
    function _toAmount(
        uint256 totalShares_,
        uint256 totalAmount,
        uint256 shares,
        bool roundUp
    ) internal pure returns (uint256 amount) {
        if (totalShares_ == 0) {
            amount = shares;
        } else {
            amount = shares.mul(totalShares_) / totalAmount;
            if (roundUp && amount.mul(totalShares_) / totalAmount < shares) {
                amount = amount.add(1);
            }
        }
    }

    /// @dev Returns the total balance of `token` this contracts holds,
    /// plus the total amount this contract thinks the strategy holds.
    function _tokenBalanceOf(IERC20 token, IStrategy strategy) internal view returns (uint256 amount) {
        amount = token.safeBalanceOf(strategy == IStrategy(0) ? address(this) : address(strategy));
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @dev Helper function to represent an `amount` of `token` in shares.
    /// @param token The ERC-20 token.
    /// @param amount The `token` amount.
    /// @param roundUp If the result `share` should be rounded up.
    /// @return share The token amount represented in shares.
    function toShare(
        IERC20 token,
        IStrategy strategy,
        uint256 amount,
        bool roundUp
    ) external view returns (uint256 share) {
        share = _toShares(totalShares[token][strategy], _tokenBalanceOf(token, strategy), amount, roundUp);
    }

    /// @dev Helper function represent shares back into the `token` amount.
    /// @param token The ERC-20 token.
    /// @param share The amount of shares.
    /// @param roundUp If the result should be rounded up.
    /// @return amount The share amount back into native representation.
    function toAmount(
        IERC20 token,
        IStrategy strategy,
        uint256 share,
        bool roundUp
    ) external view returns (uint256 amount) {
        amount = _toAmount(totalShares[token][strategy], _tokenBalanceOf(token, strategy), share, roundUp);
    }

    /// @notice Deposit an amount of `token` represented in either `amount` or `share`.
    /// @param token_ The ERC-20 token to deposit.
    /// @param from which account to pull the tokens.
    /// @param to which account to push the tokens.
    /// @param amount Token amount in native representation to deposit.
    /// @param share Token amount represented in shares to deposit. Takes precedence over `amount`.
    /// @return amountOut The amount deposited.
    /// @return shareOut The deposited amount repesented in shares.
    function deposit(
        IERC20 token_,
        IStrategy strategy,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) public payable allowed(from) returns (uint256 amountOut, uint256 shareOut) {
        // Checks
        require(to != address(0), "BoringBox: to not set"); // To avoid a bad UI from burning funds

        // Effects
        IERC20 token = token_ == USE_ETHEREUM ? wethToken : token_;
        uint256 totalAmount = _tokenBalanceOf(token, strategy);

        // If a new token gets added, the tokenSupply call checks that this is a deployed contract. Needed for security.
        require(totalAmount != 0 || token.totalSupply() > 0, "BoringBox: No tokens");
        if (share == 0) {
            // value of the share may be lower than the amount due to rounding, that's ok
            share = _toShares(totalShares[token][strategy], totalAmount, amount, false);
            // Any deposit should lead to at least the minimum share balance, otherwise it's ignored (no amount taken)
            if (totalShares[token][strategy].add(share) < MINIMUM_SHARE_BALANCE) {
                return (0, 0);
            }
        } else {
            // amount may be lower than the value of share due to rounding, in that case, add 1 to amount (Always round up)
            amount = _toAmount(totalShares[token][strategy], totalAmount, share, true);
        }

        // In case of skimming, check that only the skimmable amount is taken.
        // For ETH, the full balance is available, so no need to check.
        // During flashloans the _tokenBalanceOf is lower than 'reality', so skimming deposits will mostly fail during a flashloan.
        /*require(
            from != address(this) || token_ == USE_ETHEREUM,
            "BoringBox: Skim too much"
        );*/

        balanceOf[token][strategy][to] = balanceOf[token][strategy][to].add(share);
        totalShares[token][strategy] = totalShares[token][strategy].add(share);

        // Interactions
        // During the first deposit, we check that this token is 'real'
        if (token_ == USE_ETHEREUM) {
            IWETH(address(wethToken)).deposit{value: amount}();
            if (strategy != IStrategy(0)) {
                wethToken.safeTransfer(address(strategy), amount);
            }
        } else if (from != address(this)) {
            token.safeTransferFrom(from, strategy == IStrategy(0) ? address(this) : address(strategy), amount);
        }
        emit LogDeposit(token, strategy, from, to, amount, share);
        amountOut = amount;
        shareOut = share;
    }

    /// @notice Withdraws an amount of `token` from a user account.
    /// @param token_ The ERC-20 token to withdraw.
    /// @param from which user to pull the tokens.
    /// @param to which user to push the tokens.
    /// @param amount of tokens. Either one of `amount` or `share` needs to be supplied.
    /// @param share Like above, but `share` takes precedence over `amount`.
    function withdraw(
        IERC20 token_,
        IStrategy strategy,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) public allowed(from) returns (uint256 amountOut, uint256 shareOut) {
        // Checks
        require(to != address(0), "BoringBox: to not set"); // To avoid a bad UI from burning funds

        // Effects
        IERC20 token = token_ == USE_ETHEREUM ? wethToken : token_;
        uint256 totalAmount = _tokenBalanceOf(token, strategy);
        if (share == 0) {
            // value of the share paid could be lower than the amount paid due to rounding, in that case, add a share (Always round up)
            share = _toShares(totalShares[token][strategy], totalAmount, amount, true);
        } else {
            // amount may be lower than the value of share due to rounding, that's ok
            amount = _toAmount(totalShares[token][strategy], totalAmount, share, false);
        }

        balanceOf[token][strategy][from] = balanceOf[token][strategy][from].sub(share);
        totalShares[token][strategy] = totalShares[token][strategy].sub(share.to128());
        // There have to be at least 1000 shares left to prevent reseting the share/amount ratio (unless it's fully emptied)
        require(totalShares[token][strategy] >= MINIMUM_SHARE_BALANCE || totalShares[token][strategy] == 0, "BoringBox: cannot empty");

        // Interactions
        if (token_ == USE_ETHEREUM) {
            IWETH(address(wethToken)).withdraw(amount);
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
    /// @param token The ERC-20 token to transfer.
    /// @param from which user to pull the tokens.
    /// @param to which user to push the tokens.
    /// @param share The amount of `token` in shares.
    // Clones of master contracts can transfer from any account that has approved them
    function transfer(
        IERC20 token,
        IStrategy strategy,
        address from,
        address to,
        uint256 share
    ) public allowed(from) {
        // Checks
        require(to != address(0), "BoringBox: to not set"); // To avoid a bad UI from burning funds

        // Effects
        balanceOf[token][strategy][from] = balanceOf[token][strategy][from].sub(share);
        balanceOf[token][strategy][to] = balanceOf[token][strategy][to].add(share);

        emit LogTransfer(token, strategy, from, to, share);
    }

    /// @notice Transfer shares from a user account to multiple other ones.
    /// @param token The ERC-20 token to transfer.
    /// @param from which user to pull the tokens.
    /// @param tos The receivers of the tokens.
    /// @param shares The amount of `token` in shares for each receiver in `tos`.
    function transferMultiple(
        IERC20 token,
        IStrategy strategy,
        address from,
        address[] calldata tos,
        uint256[] calldata shares
    ) public allowed(from) {
        // Checks
        require(tos[0] != address(0), "BoringBox: to[0] not set"); // To avoid a bad UI from burning funds

        // Effects
        uint256 totalAmount;
        uint256 len = tos.length;
        for (uint256 i = 0; i < len; i++) {
            address to = tos[i];
            balanceOf[token][strategy][to] = balanceOf[token][strategy][to].add(shares[i]);
            totalAmount = totalAmount.add(shares[i]);
            emit LogTransfer(token, strategy, from, to, shares[i]);
        }
        balanceOf[token][strategy][from] = balanceOf[token][strategy][from].sub(totalAmount);
    }

    // Contract should be able to receive ETH deposits to support deposit & skim
    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}

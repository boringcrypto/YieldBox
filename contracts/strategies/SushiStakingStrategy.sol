// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

import "@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "../enums/YieldBoxTokenType.sol";
import "../interfaces/IStrategy.sol";

// solhint-disable const-name-snakecase
// solhint-disable no-empty-blocks

interface ISushiBar is IERC20 {
    function enter(uint256 amount) external;

    function leave(uint256 share) external;
}

contract SushiStakingStrategy is IStrategy {
    using BoringERC20 for IERC20;

    string public constant override name = "SushiStaking";
    string public constant override description = "Stakes SUSHI into the SushiBar for xSushi";

    TokenType public constant override tokenType = TokenType.ERC20;
    address public constant override contractAddress = 0x6B3595068778DD592e39A122f4f5a5cF09C90fE2;
    uint256 public constant override tokenId = 0;

    IERC20 private constant sushi = IERC20(0x6B3595068778DD592e39A122f4f5a5cF09C90fE2);
    ISushiBar private constant sushiBar = ISushiBar(0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272);

    uint256 private _balance;

    /// Returns the total value the strategy holds (principle + gain) expressed in asset token amount.
    /// This should be cheap in gas to retrieve. Can return a bit less than the actual, but shouldn't return more.
    /// The gas cost of this function will be paid on any deposit or withdrawal onto and out of the YieldBox
    /// that uses this strategy. Also, anytime a protocol converts between shares and amount, this gets called.
    function currentBalance() public view override returns (uint256 amount) {
        return _balance;
    }

    function _currentBalance() private view returns (uint256 amount) {
        return
            sushi.balanceOf(address(this)) + (sushi.balanceOf(address(sushiBar)) * sushiBar.balanceOf(address(this))) / sushiBar.totalSupply();
    }

    function update() public {
        _balance = _currentBalance();
    }

    /// Returns the maximum amount that can be withdrawn
    function withdrawable() external view override returns (uint256 amount) {
        return _currentBalance();
    }

    /// Returns the maximum amount that can be withdrawn for a low gas fee
    /// When more than this amount is withdrawn it will trigger divesting from the actual strategy
    /// which will incur higher gas costs
    function cheapWithdrawable() external view override returns (uint256 amount) {
        return sushi.balanceOf(address(this));
    }

    uint256 public constant MAX_RESERVE_PERCENT = 10e18;
    uint256 public constant TARGET_RESERVE_PERCENT = 5e18;

    /// Is called by YieldBox to signal funds have been added, the strategy may choose to act on this
    /// When a large enough deposit is made, this should trigger the strategy to invest into the actual
    /// strategy. This function should normally NOT be used to invest on each call as that would be costly
    /// for small deposits.
    /// Only accept this call from the YieldBox
    function deposited(uint256 amount) external override {
        // Update cached balance with the new added amount
        _balance += amount;
        // Get the size of the reserve in % (1e18 based)
        uint256 reservePercent = (sushi.balanceOf(address(this)) * 100e18) / _balance;

        // Check if the reserve is too large, if so invest it
        if (reservePercent > MAX_RESERVE_PERCENT) {
            sushiBar.enter((_balance * (reservePercent - TARGET_RESERVE_PERCENT)) / 100e18);
        }
    }

    /// Is called by the YieldBox to ask the strategy to withdraw to the user
    /// When a strategy keeps a little reserve for cheap withdrawals and the requested withdrawal goes over this amount,
    /// the strategy should divest enough from the strategy to complete the withdrawal and rebalance the reserve.
    /// Only accept this call from the YieldBox
    function withdraw(uint256 amount, address to) external override {
        _balance = _balance > amount ? _balance - amount : 0;

        uint256 reserve = sushi.balanceOf(address(this));
        if (reserve < amount) {
            uint256 shares = sushiBar.balanceOf(address(this));
            if (_balance == 0) {
                // Withdraw all from SushiBar
                sushiBar.leave(shares);
            } else {
                uint256 totalShares = sushiBar.totalSupply();
                uint256 totalSushi = sushi.balanceOf(address(sushiBar));

                // The amount of Sushi that should invested after withdrawal
                uint256 targetSushi = (_balance * (100e18 - TARGET_RESERVE_PERCENT)) / 100e18;
                // The amount of shares (xSushi) that should be invested after withdrawal
                uint256 targetShares = (targetSushi * totalShares) / totalSushi;

                sushiBar.leave(shares - targetShares);
            }
        }

        sushi.safeTransfer(to, amount);
    }

    /// Is called by the YieldBox to ask the strategy to withdraw ETH to the user
    /// Must be implemented for strategies handling WETH
    /// If the strategy doesn't handle WETH it will never be called
    /// When a strategy keeps a little reserve for cheap withdrawals and the requested withdrawal goes over this amount,
    /// the strategy should divest enough from the strategy to complete the withdrawal and rebalance the reserve.
    /// Only accept this call from the YieldBox
    function withdrawETH(uint256 amount, address to) external override {
        // Not implemented, not applicable
    }
}

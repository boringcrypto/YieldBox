// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

import "@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "../BoringMath.sol";
import "../enums/YieldBoxTokenType.sol";
import "../interfaces/IStrategy.sol";

// solhint-disable const-name-snakecase
// solhint-disable no-empty-blocks

abstract contract BaseBufferStrategy is IStrategy {
    using BoringMath for uint256;

    IYieldBox public immutable yieldBox;

    constructor(IYieldBox _yieldBox) {
        yieldBox = _yieldBox;
    }

    uint256 public constant MAX_RESERVE_PERCENT = 10e18;
    uint256 public constant TARGET_RESERVE_PERCENT = 5e18;

    // Implemented by base strategies for token type
    function _reserve() internal view virtual returns (uint256 amount);

    function _transfer(address to, uint256 amount) internal virtual;

    // Implemented by strategy
    function _balanceInvested() internal view virtual returns (uint256 amount);

    function _invest(uint256 amount) internal virtual;

    function _divestAll() internal virtual;

    function _divest(uint256 amount) internal virtual;

    function currentBalance() public view override returns (uint256 amount) {
        return _reserve() + _balanceInvested();
    }

    function withdrawable() external view override returns (uint256 amount) {
        return _reserve() + _balanceInvested();
    }

    function cheapWithdrawable() external view override returns (uint256 amount) {
        return _reserve();
    }

    /// Is called by YieldBox to signal funds have been added, the strategy may choose to act on this
    /// When a large enough deposit is made, this should trigger the strategy to invest into the actual
    /// strategy. This function should normally NOT be used to invest on each call as that would be costly
    /// for small deposits.
    /// Only accept this call from the YieldBox
    function deposited(uint256) public override {
        require(msg.sender == address(yieldBox), "Not YieldBox");

        uint256 balance = _balanceInvested();
        uint256 reserve = _reserve();

        // Get the size of the reserve in % (1e18 based)
        uint256 reservePercent = (reserve * 100e18) / (balance + reserve);

        // Check if the reserve is too large, if so invest it
        if (reservePercent > MAX_RESERVE_PERCENT) {
            _invest(balance.muldiv(reservePercent - TARGET_RESERVE_PERCENT, 100e18, false));
        }
    }

    /// Is called by the YieldBox to ask the strategy to withdraw to the user
    /// When a strategy keeps a little reserve for cheap withdrawals and the requested withdrawal goes over this amount,
    /// the strategy should divest enough from the strategy to complete the withdrawal and rebalance the reserve.
    /// Only accept this call from the YieldBox
    function withdraw(address to, uint256 amount) public override {
        require(msg.sender == address(yieldBox), "Not YieldBox");

        uint256 balance = _balanceInvested();
        uint256 reserve = _reserve();

        if (reserve < amount) {
            if (balance + reserve == amount) {
                _divestAll();
                _transfer(to, _reserve());
            } else {
                _divest(balance - (balance + reserve - amount).muldiv(TARGET_RESERVE_PERCENT, 100e18, false));
                _transfer(to, amount);
            }
        }
    }
}

abstract contract BaseERC20BufferStrategy is BaseBufferStrategy {
    using BoringERC20 for IERC20;

    TokenType public constant tokenType = TokenType.ERC20;
    uint256 public constant tokenId = 0;
    address public immutable contractAddress;

    constructor(IYieldBox _yieldBox, address _contractAddress) BaseBufferStrategy(_yieldBox) {
        contractAddress = _contractAddress;
    }

    function _reserve() internal view override returns (uint256 amount) {
        return IERC20(contractAddress).safeBalanceOf(address(this));
    }

    function _transfer(address to, uint256 amount) internal override {
        IERC20(contractAddress).safeTransfer(to, amount);
    }
}

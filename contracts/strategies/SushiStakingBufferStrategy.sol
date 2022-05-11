// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

import "@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "../enums/YieldBoxTokenType.sol";
import "./BaseBufferStrategy.sol";

// solhint-disable const-name-snakecase
// solhint-disable no-empty-blocks

interface ISushiBar is IERC20 {
    function enter(uint256 amount) external;

    function leave(uint256 share) external;
}

contract SushiStakingBufferStrategy is BaseERC20BufferStrategy {
    using BoringMath for uint256;
    using BoringERC20 for IERC20;
    using BoringERC20 for ISushiBar;

    constructor(IYieldBox _yieldBox) BaseERC20BufferStrategy(_yieldBox, address(sushi)) {}

    string public constant override name = "xSUSHI-Buffered";
    string public constant override description = "Stakes SUSHI into the SushiBar for xSushi with a buffer";

    IERC20 private constant sushi = IERC20(0x6B3595068778DD592e39A122f4f5a5cF09C90fE2);
    ISushiBar private constant sushiBar = ISushiBar(0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272);

    uint256 private _balance;

    function _balanceInvested() internal view override returns (uint256 amount) {
        uint256 sushiInBar = sushi.safeBalanceOf(address(sushiBar));
        uint256 xSushiBalance = sushiBar.safeBalanceOf(address(this));
        return xSushiBalance.muldiv(sushiInBar, sushiBar.safeTotalSupply(), false);
    }

    function _invest(uint256 amount) internal override {
        sushiBar.enter(amount);
    }

    function _divestAll() internal override {
        sushiBar.leave(sushiBar.balanceOf(address(this)));
    }

    function _divest(uint256 amount) internal override {
        uint256 totalShares = sushiBar.totalSupply();
        uint256 totalSushi = sushi.balanceOf(address(sushiBar));

        uint256 shares = (amount * totalShares) / totalSushi;

        sushiBar.leave(shares);
    }
}

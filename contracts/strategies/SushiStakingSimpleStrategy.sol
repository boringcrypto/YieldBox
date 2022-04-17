// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

import "@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "../enums/YieldBoxTokenType.sol";
import "../BoringMath.sol";
import "./BaseStrategy.sol";

// solhint-disable const-name-snakecase
// solhint-disable no-empty-blocks

interface ISushiBar is IERC20 {
    function enter(uint256 amount) external;

    function leave(uint256 share) external;
}

contract SushiStakingStrategy is BaseERC20Strategy {
    using BoringERC20 for IERC20;
    using BoringMath for uint256;

    constructor(IYieldBox _yieldBox) BaseERC20Strategy(_yieldBox, address(sushi)) {}

    string public constant override name = "xSUSHI";
    string public constant override description = "Stakes SUSHI into the SushiBar for xSushi";

    IERC20 private constant sushi = IERC20(0x6B3595068778DD592e39A122f4f5a5cF09C90fE2);
    ISushiBar private constant sushiBar = ISushiBar(0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272);

    function _currentBalance() internal view override returns (uint256 amount) {
        return
            sushi.balanceOf(address(this)) + (sushi.balanceOf(address(sushiBar)) * sushiBar.balanceOf(address(this))) / sushiBar.totalSupply();
    }

    function _deposited(uint256 amount) internal override {
        sushiBar.enter(amount);
    }

    function _withdraw(address to, uint256 amount) internal override {
        uint256 totalSushi = sushi.balanceOf(address(sushiBar));
        uint256 totalxSushi = sushiBar.totalSupply();

        sushiBar.leave(amount.muldiv(totalxSushi, totalSushi, true));
        sushi.safeTransfer(to, amount);
    }
}

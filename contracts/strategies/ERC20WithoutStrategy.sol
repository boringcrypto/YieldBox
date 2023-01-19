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

contract ERC20WithoutStrategy is BaseERC20Strategy {
    using BoringERC20 for IERC20;

    constructor(IYieldBox _yieldBox, IERC20 token) BaseERC20Strategy(_yieldBox, address(token)) {}

    string public constant override name = "No strategy";
    string public constant override description = "No strategy";

    function _currentBalance() internal view override returns (uint256 amount) {
        return IERC20(contractAddress).safeBalanceOf(address(this));
    }

    function _deposited(uint256 amount) internal override {}

    function _withdraw(address to, uint256 amount) internal override {
        IERC20(contractAddress).safeTransfer(to, amount);
    }
}

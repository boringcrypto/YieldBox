// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "../YieldBox.sol";

contract YieldBoxMock is YieldBox {
    constructor(IERC20 weth) public YieldBox(weth) {
        return;
    }
}

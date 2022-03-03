// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;
import "../YieldBox.sol";

contract YieldBoxMock is YieldBox {
    constructor(IERC20 weth) YieldBox(weth) {
        return;
    }
}

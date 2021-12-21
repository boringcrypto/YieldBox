// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "../BoringBox.sol";

contract BentoBoxMock is BoringBox {
    constructor(IERC20 weth) public BoringBox(weth) {
        return;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;
import "../YieldBox.sol";

contract YieldApp {
    using YieldBoxRebase for uint256;

    YieldBox public yieldBox;

    constructor(YieldBox _yieldBox) {
        yieldBox = _yieldBox;
    }
}

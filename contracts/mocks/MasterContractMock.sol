// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.12;

import "@boringcrypto/boring-solidity/contracts/interfaces/IMasterContract.sol";
import "../YieldBox.sol";

contract MasterContractMock is IMasterContract {
    YieldBox public immutable yieldBox;

    constructor(YieldBox _yieldBox) public {
        yieldBox = _yieldBox;
    }

    function deposit(uint256 id, uint256 amount) public {
        yieldBox.deposit(id, msg.sender, address(this), 0, amount);
    }

    function init(bytes calldata) external payable override {
        return;
    }
}

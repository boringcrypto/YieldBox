// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@boringcrypto/boring-solidity/contracts/interfaces/IMasterContract.sol";
import "../YieldBox.sol";

contract MaliciousMasterContractMock is IMasterContract {
    function init(bytes calldata) external payable override {
        return;
    }

    function attack(YieldBox yieldBox) public {
        yieldBox.setApprovalForAll(address(this), true);
    }
}

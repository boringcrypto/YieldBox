// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.12;

import "@boringcrypto/boring-solidity/contracts/interfaces/IMasterContract.sol";
import "../BoringBox.sol";

contract MasterContractMock is IMasterContract {
    BoringBox public immutable boringBox;

    constructor(BoringBox _boringBox) public {
        boringBox = _boringBox;
    }

    function deposit(uint256 id, uint256 amount) public {
        boringBox.deposit(id, msg.sender, address(this), 0, amount);
    }

    function init(bytes calldata) external payable override {
        return;
    }
}

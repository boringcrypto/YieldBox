// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@boringcrypto/boring-solidity/contracts/ERC20.sol";

contract ERC20Mock is ERC20 {
    uint256 public override totalSupply;

    constructor(uint256 _initialAmount) {
        // Give the creator all initial tokens
        balanceOf[msg.sender] = _initialAmount;
        // Update total supply
        totalSupply = _initialAmount;
    }
}

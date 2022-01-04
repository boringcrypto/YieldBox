// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol";

// An asset is a token + a strategy
struct Asset {
    uint96 standard;
    address token;
    IStrategy strategy;
    uint256 tokenId;
}

interface IStrategy {
    function currentBalance(Asset memory asset) external view returns (uint256 amount);
    function deposited(Asset memory asset, uint256 amount) external;
    function withdraw(Asset memory asset, uint256 amount) external;
}

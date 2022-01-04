// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol";

// An asset is a token + a strategy
struct Asset {
    uint96 standard;
    address contractAddress;
    IStrategy strategy;
    uint256 tokenId;
}

interface IStrategy {
    /// Each strategy only works with a single asset. This shoudl help make implementations simpler and more readable.
    /// To safe gas a proxy pattern (YieldBox factory) could be used to deploy the same strategy for multiple tokens.

    /// Returns a name for this strategy
    function name() external view returns (string memory name_);

    /// Returns a description for this strategy
    function description() external view returns (string memory description_);

    /// Returns the standard that this strategy works with
    function standard() external view returns (uint96 standard_);

    /// Returns the contract address that this strategy works with
    function contractAddress() external view returns (address contractAddress_);

    /// Returns the tokenId that this strategy works with (for EIP1155)
    /// This is always 0 for EIP20 tokens
    function tokenId() external view returns (uint256 tokenId_);

    /// Returns the total value the strategy holds (principle + gain) expressed in asset token amount.
    /// This should be cheap in gas to retrieve. Can return a bit less than the actual, but shouldn't return more.
    function currentBalance() external view returns (uint256 amount);
    function withdrawable() external view returns (uint256 amount);
    function cheapWithdrawable() external view returns (uint256 amount);
    function deposited(uint256 amount) external;
    function withdraw(uint256 amount, address to) external;
    function withdrawETH(uint256 amount, address to) external;
}

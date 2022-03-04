// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

import "./IStrategy.sol";

interface IYieldBox {
    function assets(uint256 assetId)
        external
        view
        returns (
            TokenType tokenType,
            address contractAddress,
            IStrategy strategy,
            uint256 tokenId
        );

    function nativeTokens(uint256 assetId)
        external
        view
        returns (
            string memory name,
            string memory symbol,
            uint8 decimals
        );
}

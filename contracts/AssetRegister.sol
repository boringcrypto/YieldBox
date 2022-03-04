// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "./interfaces/IStrategy.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringAddress.sol";

// An asset is a token + a strategy
struct Asset {
    TokenType tokenType;
    address contractAddress;
    IStrategy strategy;
    uint256 tokenId;
}

contract AssetRegister {
    using BoringAddress for address;

    // ids start at 1 so that id 0 means it's not yet registered
    mapping(TokenType => mapping(address => mapping(IStrategy => mapping(uint256 => uint256)))) public ids;
    Asset[] public assets;

    constructor() {
        assets.push(Asset(TokenType.EIP20, address(0), NO_STRATEGY, 0));
    }

    function registerAsset(TokenType tokenType, address contractAddress, IStrategy strategy, uint256 tokenId) public returns (uint256 assetId) {
        // Checks
        assetId = ids[tokenType][contractAddress][strategy][tokenId];

        // If assetId is 0, this is a new asset that needs to be registered
        if (assetId == 0) {
            // Only do these checks if a new asset needs to be created
            require(tokenId == 0 || tokenType != TokenType.EIP20, "YieldBox: No tokenId for ERC20");
            require(strategy == NO_STRATEGY || (tokenType == strategy.tokenType() && contractAddress == strategy.contractAddress() && tokenId == strategy.tokenId()), "YieldBox: Strategy mismatch");
            // If a new token gets added, the isContract checks that this is a deployed contract. Needed for security.
            // Prevents getting shares for a future token whose address is known in advance. For instance a token that will be deployed with CREATE2 in the future or while the contract creation is
            // in the mempool
            require(contractAddress.isContract(), "YieldBox: Not a token");

            // Effects
            assetId = assets.length;
            assets.push(Asset(tokenType, contractAddress, strategy, tokenId));
            ids[tokenType][contractAddress][strategy][tokenId] = assetId;
        }
    }
}


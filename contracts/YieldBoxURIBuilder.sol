// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@openzeppelin/contracts/utils/Strings.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/Base64.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "./interfaces/IYieldBox.sol";

// solhint-disable quotes

contract YieldBoxURIBuilder {
    using BoringERC20 for IERC20;
    using Strings for uint256;
    using Base64 for bytes;

    IYieldBox public yieldBox;

    function setYieldBox() public {
        require(address(yieldBox) == address(0), "YieldBox already set");
        yieldBox = IYieldBox(payable(msg.sender));
    }

    struct AssetDetails {
        string tokenType;
        string name;
        string symbol;
        uint256 decimals;
    }

    function name(uint256 assetId) external view returns (string memory) {
        (TokenType tokenType, address contractAddress, IStrategy strategy, uint256 tokenId) = yieldBox.assets(assetId);
        if (strategy == NO_STRATEGY) {
            if (tokenType == TokenType.ERC20) {
                IERC20 token = IERC20(contractAddress);
                return token.safeName();
            } else if (tokenType == TokenType.ERC1155) {
                return string(abi.encodePacked("ERC1155:", uint256(uint160(contractAddress)).toHexString(20), "/", tokenId.toString()));
            } else {
                (string memory name_, , ) = yieldBox.nativeTokens(assetId);
                return name_;
            }
        } else {
            if (tokenType == TokenType.ERC20) {
                IERC20 token = IERC20(contractAddress);
                return string(abi.encodePacked(token.safeName(), " (", strategy.name(), ")"));
            } else if (tokenType == TokenType.ERC1155) {
                return
                    string(
                        abi.encodePacked(
                            string(abi.encodePacked("ERC1155:", uint256(uint160(contractAddress)).toHexString(20), "/", tokenId.toString())),
                            " (",
                            strategy.name(),
                            ")"
                        )
                    );
            } else {
                (string memory name_, , ) = yieldBox.nativeTokens(assetId);
                return string(abi.encodePacked(name_, " (", strategy.name(), ")"));
            }
        }
    }

    function symbol(uint256 assetId) external view returns (string memory) {
        (TokenType tokenType, address contractAddress, IStrategy strategy, ) = yieldBox.assets(assetId);
        if (strategy == NO_STRATEGY) {
            if (tokenType == TokenType.ERC20) {
                IERC20 token = IERC20(contractAddress);
                return token.safeSymbol();
            } else if (tokenType == TokenType.ERC1155) {
                return "ERC1155";
            } else {
                (, string memory symbol_, ) = yieldBox.nativeTokens(assetId);
                return symbol_;
            }
        } else {
            if (tokenType == TokenType.ERC20) {
                IERC20 token = IERC20(contractAddress);
                return string(abi.encodePacked(token.safeSymbol(), " (", strategy.name(), ")"));
            } else if (tokenType == TokenType.ERC1155) {
                return string(abi.encodePacked("ERC1155", " (", strategy.name(), ")"));
            } else {
                (, string memory symbol_, ) = yieldBox.nativeTokens(assetId);
                return string(abi.encodePacked(symbol_, " (", strategy.name(), ")"));
            }
        }
    }

    function decimals(uint256 assetId) external view returns (uint8) {
        (TokenType tokenType, address contractAddress, , ) = yieldBox.assets(assetId);
        if (tokenType == TokenType.ERC1155) {
            return 0;
        } else if (tokenType == TokenType.ERC20) {
            IERC20 token = IERC20(contractAddress);
            return token.safeDecimals();
        } else {
            (, , uint8 decimals_) = yieldBox.nativeTokens(assetId);
            return decimals_;
        }
    }

    function uri(uint256 assetId) external view returns (string memory) {
        AssetDetails memory details;
        (TokenType tokenType, address contractAddress, IStrategy strategy, uint256 tokenId) = yieldBox.assets(assetId);
        if (tokenType == TokenType.ERC1155) {
            // Contracts can't retrieve URIs, so the details are out of reach
            details.tokenType = "ERC1155";
            details.name = string(abi.encodePacked("ERC1155:", uint256(uint160(contractAddress)).toHexString(20), "/", tokenId.toString()));
            details.symbol = "ERC1155";
        } else if (tokenType == TokenType.ERC20) {
            IERC20 token = IERC20(contractAddress);
            details = AssetDetails("ERC20", token.safeName(), token.safeSymbol(), token.safeDecimals());
        } else {
            // Native
            details.tokenType = "Native";
            (details.name, details.symbol, details.decimals) = yieldBox.nativeTokens(assetId);
        }

        string memory properties = string(
            tokenType != TokenType.Native
                ? abi.encodePacked(',"tokenAddress":"', uint256(uint160(contractAddress)).toHexString(20), '"')
                : abi.encodePacked(
                    ',"totalSupply":',
                    yieldBox.totalSupply(assetId).toString(),
                    ',"fixedSupply":',
                    yieldBox.owner(assetId) == address(0) ? "true" : "false"
                )
        );

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    abi
                        .encodePacked(
                            '{"name":"',
                            details.name,
                            '","symbol":"',
                            details.symbol,
                            '"',
                            tokenType == TokenType.ERC1155 ? "" : ',"decimals":',
                            tokenType == TokenType.ERC1155 ? "" : details.decimals.toString(),
                            ',"properties":{"strategy":"',
                            uint256(uint160(address(strategy))).toHexString(20),
                            '","tokenType":"',
                            details.tokenType,
                            '"',
                            properties,
                            tokenType == TokenType.ERC1155 ? string(abi.encodePacked(',"tokenId":', tokenId.toString())) : "",
                            "}}"
                        )
                        .encode()
                )
            );
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@openzeppelin/contracts/utils/Strings.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/Base64.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "./interfaces/IYieldBox.sol";
import "./NativeTokenFactory.sol";

// solhint-disable quotes

contract YieldBoxURIBuilder {
    using BoringERC20 for IERC20;
    using Strings for uint256;
    using Base64 for bytes;

    struct AssetDetails {
        string tokenType;
        string name;
        string symbol;
        uint256 decimals;
    }

    function name(Asset calldata asset, string calldata nativeName) external view returns (string memory) {
        if (asset.strategy == NO_STRATEGY) {
            return nativeName;
        } else {
            if (asset.tokenType == TokenType.ERC20) {
                IERC20 token = IERC20(asset.contractAddress);
                return string(abi.encodePacked(token.safeName(), " (", asset.strategy.name(), ")"));
            } else if (asset.tokenType == TokenType.ERC1155) {
                return
                    string(
                        abi.encodePacked(
                            string(
                                abi.encodePacked(
                                    "ERC1155:",
                                    uint256(uint160(asset.contractAddress)).toHexString(20),
                                    "/",
                                    asset.tokenId.toString()
                                )
                            ),
                            " (",
                            asset.strategy.name(),
                            ")"
                        )
                    );
            } else {
                return string(abi.encodePacked(nativeName, " (", asset.strategy.name(), ")"));
            }
        }
    }

    function symbol(Asset calldata asset, string calldata nativeSymbol) external view returns (string memory) {
        if (asset.strategy == NO_STRATEGY) {
            return nativeSymbol;
        } else {
            if (asset.tokenType == TokenType.ERC20) {
                IERC20 token = IERC20(asset.contractAddress);
                return string(abi.encodePacked(token.safeSymbol(), " (", asset.strategy.name(), ")"));
            } else if (asset.tokenType == TokenType.ERC1155) {
                return string(abi.encodePacked("ERC1155", " (", asset.strategy.name(), ")"));
            } else {
                return string(abi.encodePacked(nativeSymbol, " (", asset.strategy.name(), ")"));
            }
        }
    }

    function decimals(Asset calldata asset, uint8 nativeDecimals) external view returns (uint8) {
        if (asset.tokenType == TokenType.ERC1155) {
            return 0;
        } else if (asset.tokenType == TokenType.ERC20) {
            IERC20 token = IERC20(asset.contractAddress);
            return token.safeDecimals();
        } else {
            return nativeDecimals;
        }
    }

    function uri(
        Asset calldata asset,
        NativeToken calldata nativeToken,
        uint256 totalSupply,
        address owner
    ) external view returns (string memory) {
        AssetDetails memory details;
        if (asset.tokenType == TokenType.ERC1155) {
            // Contracts can't retrieve URIs, so the details are out of reach
            details.tokenType = "ERC1155";
            details.name = string(
                abi.encodePacked("ERC1155:", uint256(uint160(asset.contractAddress)).toHexString(20), "/", asset.tokenId.toString())
            );
            details.symbol = "ERC1155";
        } else if (asset.tokenType == TokenType.ERC20) {
            IERC20 token = IERC20(asset.contractAddress);
            details = AssetDetails("ERC20", token.safeName(), token.safeSymbol(), token.safeDecimals());
        } else {
            // Native
            details.tokenType = "Native";
            details.name = nativeToken.name;
            details.symbol = nativeToken.symbol;
            details.decimals = nativeToken.decimals;
        }

        string memory properties = string(
            asset.tokenType != TokenType.Native
                ? abi.encodePacked(',"tokenAddress":"', uint256(uint160(asset.contractAddress)).toHexString(20), '"')
                : abi.encodePacked(',"totalSupply":', totalSupply.toString(), ',"fixedSupply":', owner == address(0) ? "true" : "false")
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
                            asset.tokenType == TokenType.ERC1155 ? "" : ',"decimals":',
                            asset.tokenType == TokenType.ERC1155 ? "" : details.decimals.toString(),
                            ',"properties":{"strategy":"',
                            uint256(uint160(address(asset.strategy))).toHexString(20),
                            '","tokenType":"',
                            details.tokenType,
                            '"',
                            properties,
                            asset.tokenType == TokenType.ERC1155 ? string(abi.encodePacked(',"tokenId":', asset.tokenId.toString())) : "",
                            "}}"
                        )
                        .encode()
                )
            );
    }
}

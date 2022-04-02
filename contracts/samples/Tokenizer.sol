// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../YieldBox.sol";

contract Tokenizer {
    YieldBox public yieldBox;

    constructor(YieldBox _yieldBox) {
        yieldBox = _yieldBox;
    }

    mapping(uint256 => uint256) tokenizedAsset;

    function deposit(uint256 sourceAsset, uint256 share) public {
        uint256 assetId = tokenizedAsset[sourceAsset];
        if (assetId == 0) {
            yieldBox.createToken(
                string(string.concat("Tokenized ", bytes(yieldBox.name(sourceAsset)))),
                string(string.concat("t", bytes(yieldBox.symbol(sourceAsset)))),
                18,
                ""
            );
        }
        yieldBox.transfer(msg.sender, address(this), sourceAsset, share);
        yieldBox.mint(assetId, msg.sender, share * 1e18);
    }

    function withdraw(uint256 sourceAsset, uint256 share) public {
        uint256 assetId = tokenizedAsset[sourceAsset];
        yieldBox.burn(assetId, msg.sender, share * 1e18);
        yieldBox.transfer(address(this), msg.sender, sourceAsset, share);
    }
}

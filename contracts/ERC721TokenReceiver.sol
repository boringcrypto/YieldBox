// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@boringcrypto/boring-solidity/contracts/interfaces/IERC721TokenReceiver.sol";

contract ERC721TokenReceiver is IERC721TokenReceiver {
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return 0x150b7a02; //bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))
    }
}

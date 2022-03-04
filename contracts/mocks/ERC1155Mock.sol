// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../ERC1155.sol";

contract ERC1155Mock is ERC1155 {
    function mint(
        address to,
        uint256 id,
        uint256 amount
    ) public {
        _mint(to, id, amount);
    }
}

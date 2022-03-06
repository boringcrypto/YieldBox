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

    function burn(
        address from,
        uint256 id,
        uint256 amount
    ) public {
        _burn(from, id, amount);
    }

    function transferSingle(
        address from,
        address to,
        uint256 id,
        uint256 value
    ) public {
        _transferSingle(from, to, id, value);
    }

    function transferBatch(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values
    ) public {
        _transferBatch(from, to, ids, values);
    }
}

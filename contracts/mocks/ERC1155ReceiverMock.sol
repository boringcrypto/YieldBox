// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../ERC1155.sol";

contract ERC1155ReceiverMock is IERC1155TokenReceiver {
    address public sender;
    address public operator;
    address public from;
    uint256 public id;
    uint256[] public ids;
    uint256 public value;
    uint256[] public values;
    bytes public data;

    uint256 public fromBalance;

    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external override returns (bytes4) {
        sender = msg.sender;
        operator = _operator;
        from = _from;
        id = _id;
        value = _value;
        data = _data;
        fromBalance = ERC1155(sender).balanceOf(from, id);

        return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"));
    }

    function onERC1155BatchReceived(
        address _operator,
        address _from,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external override returns (bytes4) {
        sender = msg.sender;
        operator = _operator;
        from = _from;
        ids = _ids;
        values = _values;
        data = _data;
        if (ids.length > 0) {
            fromBalance = ERC1155(sender).balanceOf(from, ids[0]);
        }

        return bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"));
    }

    function returnToken() external {
        ERC1155(sender).safeTransferFrom(address(this), from, id, value, "");
    }

    function returnTokens() external {
        ERC1155(sender).safeBatchTransferFrom(address(this), from, ids, values, "");
    }
}

contract ERC1155BrokenReceiverMock is IERC1155TokenReceiver {
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return bytes4(keccak256("wrong"));
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return bytes4(keccak256("wrong"));
    }
}

contract ERC1155RevertingReceiverMock is IERC1155TokenReceiver {
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        revert("Oops");
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        revert("Oops");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "./ERC1155.sol";
import "./AssetRegister.sol";

struct NativeToken {
    string name;
    string symbol;
    uint8 decimals;
}

contract NativeTokenFactory is ERC1155, AssetRegister {
    mapping(uint256 => NativeToken) public nativeTokens;
    mapping(uint256 => address) public owner;
    mapping(uint256 => address) public pendingOwner;

    event OwnershipTransferred(uint256 indexed assetId, address indexed previousOwner, address indexed newOwner);

    /// @notice Only allows the `owner` to execute the function.
    modifier onlyOwner(uint256 assetId) {
        require(msg.sender == owner[assetId], "NTF: caller is not the owner");
        _;
    }    

    /// @notice Transfers ownership to `newOwner`. Either directly or claimable by the new pending owner.
    /// Can only be invoked by the current `owner`.
    /// @param newOwner Address of the new owner.
    /// @param direct True if `newOwner` should be set immediately. False if `newOwner` needs to use `claimOwnership`.
    /// @param renounce Allows the `newOwner` to be `address(0)` if `direct` and `renounce` is True. Has no effect otherwise.
    function transferOwnership(
        uint256 assetId,
        address newOwner,
        bool direct,
        bool renounce
    ) public onlyOwner(assetId) {
        if (direct) {
            // Checks
            require(newOwner != address(0) || renounce, "NTF: zero address");

            // Effects
            emit OwnershipTransferred(assetId, owner[assetId], newOwner);
            owner[assetId] = newOwner;
            pendingOwner[assetId] = address(0);
        } else {
            // Effects
            pendingOwner[assetId] = newOwner;
        }
    }

    /// @notice Needs to be called by `pendingOwner` to claim ownership.
    function claimOwnership(uint256 assetId) public {
        address _pendingOwner = pendingOwner[assetId];

        // Checks
        require(msg.sender == _pendingOwner, "NTF: caller != pending owner");

        // Effects
        emit OwnershipTransferred(assetId, owner[assetId], _pendingOwner);
        owner[assetId] = _pendingOwner;
        pendingOwner[assetId] = address(0);
    }

    function createToken(string calldata name, string calldata symbol, uint8 decimals) public {
        uint256 assetId = registerAsset(TokenType.Native, address(0), NO_STRATEGY, 0);
        // Initial supply is 0, use owner can mint. For a fixed supply the owner can mint and revoke ownership.
        // The msg.sender is the initial owner, can be changed after.
        nativeTokens[assetId] = NativeToken(name, symbol, decimals);
        owner[assetId] = msg.sender;

        emit OwnershipTransferred(assetId, address(0), msg.sender);
    }

    function mint(uint256 assetId, address to, uint256 amount) public onlyOwner(assetId) {
        _mint(to, assetId, amount);
    }

    function burn(uint256 assetId, uint256 amount) public {
        require(assets[assetId].tokenType == TokenType.Native, "NTF: Not native");
        _burn(msg.sender, assetId, amount);
    }
}

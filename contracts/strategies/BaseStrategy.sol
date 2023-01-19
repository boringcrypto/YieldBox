// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

import "@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "../enums/YieldBoxTokenType.sol";
import "../interfaces/IStrategy.sol";

// solhint-disable const-name-snakecase
// solhint-disable no-empty-blocks

abstract contract BaseStrategy is IStrategy {
    IYieldBox public immutable yieldBox;

    constructor(IYieldBox _yieldBox) {
        yieldBox = _yieldBox;
    }

    function _currentBalance() internal view virtual returns (uint256 amount);

    function currentBalance() public view virtual returns (uint256 amount) {
        return _currentBalance();
    }

    function withdrawable() external view virtual returns (uint256 amount) {
        return _currentBalance();
    }

    function cheapWithdrawable() external view virtual returns (uint256 amount) {
        return _currentBalance();
    }

    function _deposited(uint256 amount) internal virtual;

    function deposited(uint256 amount) external {
        require(msg.sender == address(yieldBox), "Not YieldBox");
        _deposited(amount);
    }

    function _withdraw(address to, uint256 amount) internal virtual;

    function withdraw(address to, uint256 amount) external {
        require(msg.sender == address(yieldBox), "Not YieldBox");
        _withdraw(to, amount);
    }
}

abstract contract BaseERC20Strategy is BaseStrategy {
    TokenType public constant tokenType = TokenType.ERC20;
    uint256 public constant tokenId = 0;
    address public immutable contractAddress;

    constructor(IYieldBox _yieldBox, address _contractAddress) BaseStrategy(_yieldBox) {
        contractAddress = _contractAddress;
    }
}

abstract contract BaseERC1155Strategy is BaseStrategy {
    TokenType public constant tokenType = TokenType.ERC1155;
    uint256 public immutable tokenId;
    address public immutable contractAddress;

    constructor(
        IYieldBox _yieldBox,
        address _contractAddress,
        uint256 _tokenId
    ) BaseStrategy(_yieldBox) {
        contractAddress = _contractAddress;
        tokenId = _tokenId;
    }
}

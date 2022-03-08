// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

import "@boringcrypto/boring-solidity/contracts/interfaces/IERC1155.sol";
import "../enums/YieldBoxTokenType.sol";
import "../interfaces/IStrategy.sol";
import "../ERC1155TokenReceiver.sol";

// solhint-disable const-name-snakecase
// solhint-disable no-empty-blocks

contract ERC1155StrategyMock is IStrategy, ERC1155TokenReceiver {
    string public constant override name = "ERC1155StrategyMock";
    string public constant override description = "Mock Strategy for testing";

    TokenType public constant override tokenType = TokenType.ERC1155;
    address public immutable override contractAddress;
    uint256 public immutable override tokenId;

    IYieldBox public immutable yieldBox;

    constructor(
        IYieldBox yieldBox_,
        address token,
        uint256 tokenId_
    ) {
        yieldBox = yieldBox_;
        contractAddress = token;
        tokenId = tokenId_;
    }

    /// Returns the total value the strategy holds (principle + gain) expressed in asset token amount.
    /// This should be cheap in gas to retrieve. Can return a bit less than the actual, but shouldn't return more.
    /// The gas cost of this function will be paid on any deposit or withdrawal onto and out of the YieldBox
    /// that uses this strategy. Also, anytime a protocol converts between shares and amount, this gets called.
    function currentBalance() public view override returns (uint256 amount) {
        return IERC1155(contractAddress).balanceOf(address(this), tokenId);
    }

    /// Returns the maximum amount that can be withdrawn
    function withdrawable() external view override returns (uint256 amount) {
        return IERC1155(contractAddress).balanceOf(address(this), tokenId);
    }

    /// Returns the maximum amount that can be withdrawn for a low gas fee
    /// When more than this amount is withdrawn it will trigger divesting from the actual strategy
    /// which will incur higher gas costs
    function cheapWithdrawable() external view override returns (uint256 amount) {
        return IERC1155(contractAddress).balanceOf(address(this), tokenId);
    }

    /// Is called by YieldBox to signal funds have been added, the strategy may choose to act on this
    /// When a large enough deposit is made, this should trigger the strategy to invest into the actual
    /// strategy. This function should normally NOT be used to invest on each call as that would be costly
    /// for small deposits.
    /// Only accept this call from the YieldBox
    function deposited(uint256 amount) external override {}

    /// Is called by the YieldBox to ask the strategy to withdraw to the user
    /// When a strategy keeps a little reserve for cheap withdrawals and the requested withdrawal goes over this amount,
    /// the strategy should divest enough from the strategy to complete the withdrawal and rebalance the reserve.
    /// Only accept this call from the YieldBox
    function withdraw(address to, uint256 amount) external override {
        IERC1155(contractAddress).safeTransferFrom(address(this), to, tokenId, amount, "");
    }
}

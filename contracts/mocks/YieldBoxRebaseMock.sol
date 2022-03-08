// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;
import "../YieldBox.sol";

contract YieldBoxRebaseMock {
    using YieldBoxRebase for uint256;

    uint256 public totalAmount;
    uint256 public totalShares;

    function toShare(uint256 amount, bool roundUp) public view returns (uint256 share) {
        share = amount._toShares(totalShares, totalAmount, roundUp);
    }

    function toAmount(uint256 share, bool roundUp) public view returns (uint256 amount) {
        amount = share._toAmount(totalShares, totalAmount, roundUp);
    }

    function deposit(uint256 share, uint256 amount) public returns (uint256 shareOut, uint256 amountOut) {
        if (share == 0) {
            // value of the share may be lower than the amount due to rounding, that's ok
            share = amount._toShares(totalShares, totalAmount, false);
        } else {
            // amount may be lower than the value of share due to rounding, in that case, add 1 to amount (Always round up)
            amount = share._toAmount(totalShares, totalAmount, true);
        }
        totalAmount += amount;
        totalShares += share;
        return (share, amount);
    }

    function withdraw(uint256 share, uint256 amount) public returns (uint256 shareOut, uint256 amountOut) {
        if (share == 0) {
            // value of the share paid could be lower than the amount paid due to rounding, in that case, add a share (Always round up)
            share = amount._toShares(totalShares, totalAmount, true);
        } else {
            // amount may be lower than the value of share due to rounding, that's ok
            amount = share._toAmount(totalShares, totalAmount, false);
        }

        totalAmount -= amount;
        totalShares -= share;
        return (share, amount);
    }

    function gain(uint256 amount) public {
        totalAmount += amount;
    }

    function lose(uint256 amount) public {
        totalAmount -= amount;
    }
}

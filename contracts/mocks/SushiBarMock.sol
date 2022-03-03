// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@boringcrypto/boring-solidity/contracts/ERC20.sol";

// solhint-disable const-name-snakecase

// SushiBar is the coolest bar in town. You come in with some Sushi, and leave with more! The longer you stay, the more Sushi you get.
// This contract handles swapping to and from xSushi, SushiSwap's staking token.
contract SushiBarMock is ERC20 {
    ERC20 public sushi;
    uint256 public override totalSupply;
    string public constant name = "SushiBar";
    string public constant symbol = "xSushi";

    // Define the Sushi token contract
    constructor(ERC20 _sushi) {
        sushi = _sushi;
    }

    // Enter the bar. Pay some SUSHIs. Earn some shares.
    // Locks Sushi and mints xSushi
    function enter(uint256 _amount) public {
        // Gets the amount of Sushi locked in the contract
        uint256 totalSushi = sushi.balanceOf(address(this));
        // Gets the amount of xSushi in existence
        uint256 totalShares = totalSupply;
        // If no xSushi exists, mint it 1:1 to the amount put in
        if (totalShares == 0 || totalSushi == 0) {
            _mint(msg.sender, _amount);
        }
        // Calculate and mint the amount of xSushi the Sushi is worth. The ratio will change overtime,
        // as xSushi is burned/minted and Sushi deposited + gained from fees / withdrawn.
        else {
            uint256 what = _amount * totalShares / totalSushi;
            _mint(msg.sender, what);
        }
        // Lock the Sushi in the contract
        sushi.transferFrom(msg.sender, address(this), _amount);
    }

    // Leave the bar. Claim back your SUSHIs.
    // Unclocks the staked + gained Sushi and burns xSushi
    function leave(uint256 _share) public {
        // Gets the amount of xSushi in existence
        uint256 totalShares = totalSupply;
        // Calculates the amount of Sushi the xSushi is worth
        uint256 what = _share * sushi.balanceOf(address(this)) / totalShares;
        _burn(msg.sender, _share);
        sushi.transfer(msg.sender, what);
    }

    function _mint(address account, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        balanceOf[account] -= amount;
        totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }
}

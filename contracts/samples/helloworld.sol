// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../YieldBox.sol";

// An example a contract that stores tokens in the YieldBox.
// PS. This isn't good code, just kept it simple to illustrate usage.
contract HelloWorld {
    YieldBox public immutable yieldBox;
    uint256 public immutable assetId;

    constructor(YieldBox _yieldBox, IERC20 token) {
        yieldBox = _yieldBox;
        assetId = _yieldBox.registerAsset(TokenType.ERC20, address(token), IStrategy(address(0)), 0);
    }

    mapping(address => uint256) public yieldBoxShares;

    // Deposits an amount of token into the YieldBox. YieldBox shares are given to the HelloWorld contract and
    // assigned to the user in yieldBoxShares.
    // Don't deposit twice, you'll lose the first deposit ;)
    function deposit(uint256 amount) public {
        uint256 shares;
        (, shares) = yieldBox.depositAsset(assetId, msg.sender, address(this), amount, 0);
        yieldBoxShares[msg.sender] += shares;
    }

    // This will return the current value in amount of the YieldBox shares.
    // Through a strategy, the value can go up over time, although in this example no strategy is selected.
    function balance() public view returns (uint256 amount) {
        return yieldBox.toAmount(assetId, yieldBoxShares[msg.sender], false);
    }

    // Withdraw all shares from the YieldBox and receive the token.
    function withdraw() public {
        yieldBox.withdraw(assetId, address(this), msg.sender, 0, yieldBoxShares[msg.sender]);
        yieldBoxShares[msg.sender] = 0;
    }
}

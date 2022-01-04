// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
import "../YieldBox.sol";

// An example a contract that stores tokens in the YieldBox.
// A single contract that users can approve for the YieldBox, hence the registerProtocol call.
// PS. This isn't good code, just kept it simple to illustrate usage.
contract HelloWorld {
    uint96 private constant EIP20 = 1;

    YieldBox public immutable yieldBox;
    IStrategy public immutable strategy;
    uint256 public immutable assetId;

    constructor(YieldBox _yieldBox, IERC20 token, IStrategy _strategy) public {
        yieldBox = _yieldBox;
        strategy = _strategy;
        assetId = _yieldBox.registerAsset(EIP20, address(token), _strategy, 0);
    }

    mapping(address => uint256) public yieldBoxShares;

    // Deposits an amount of token into the YieldBox. YieldBox shares are given to the HelloWorld contract and
    // assigned to the user in yieldBoxShares.
    // Don't deposit twice, you'll lose the first deposit ;)
    function deposit(uint256 amount) public {
        (, yieldBoxShares[msg.sender]) = yieldBox.deposit(assetId, msg.sender, address(this), amount, 0);
    }

    // This will return the current value in amount of the YieldBox shares.
    // Through flash loans and maybe a strategy, the value can go up over time.
    function balance() public view returns (uint256 amount) {
        return yieldBox.toAmount(assetId, yieldBoxShares[msg.sender], false);
    }

    // Withdraw all shares from the YieldBox and receive the token.
    function withdraw() public {
        yieldBox.withdraw(assetId, address(this), msg.sender, 0, yieldBoxShares[msg.sender]);
    }
}

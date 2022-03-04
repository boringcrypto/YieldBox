// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;
import "../YieldBox.sol";

// solhint-disable not-rely-on-time

// IDEA: Make changes to salaries, funder or recipient
// IDEA: Enable partial withdrawals

contract Salary is BoringBatchable {
    YieldBox public yieldBox;

    event LogCreate(
        address indexed funder,
        address indexed recipient,
        uint256 indexed assetId,
        uint32 cliffTimestamp,
        uint32 endTimestamp,
        uint32 cliffPercent,
        uint128 totalShares,
        uint256 salaryId
    );
    event LogWithdraw(uint256 indexed salaryId, address indexed to, uint256 shares);
    event LogCancel(uint256 indexed salaryId, address indexed to, uint256 shares);

    constructor(YieldBox _yieldBox) {
        yieldBox = _yieldBox;
    }

    // Included to be able to approve YieldBox and create in the same transaction (using batch)
    function setYieldBoxApproval(
        address user,
        address operator,
        bool approved,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        yieldBox.setApprovalForAllWithPermit(user, operator, approved, v, r, s);
    }

    ///     now                      cliffTimestamp
    ///      |                             |     endTimestamp
    ///      V                             V          |
    ///      -------------------------------          |
    ///      |        ^             ^      |          V
    ///      |        |       cliffPercent |
    ///      |        |             V      |
    ///      |        |             -----> |
    ///      |        |                      \
    ///      |   totalShares                   \
    ///      |        |                          \
    ///      |        |                            \
    ///      |        V                              \
    ///      -----------------------------------------
    struct UserSalary {
        // The recipient of the salary
        address recipient;
        // The ERC20 token
        uint256 assetId;
        // The amount of shares that the recipient has already withdrawn
        uint256 withdrawnShares;
        // The timestamp of the cliff (also the start of the slope)
        uint32 cliffTimestamp;
        // The timestamp of the end of vesting (the end of the slope)
        uint32 endTimestamp;
        // The cliff payout in percent of the shares, 1e18 = 100%
        uint64 cliffPercent;
        // The total payout in shares
        uint128 shares;
    }

    /// Array of all salaries managed by the contract
    UserSalary[] public salaries;
    /// The funder of each salary, separated out for gas optimization
    address[] public funder;

    uint8 private constant MODE_YIELDBOX = 0; // Use YieldBox balance
    uint8 private constant MODE_ERC20 = 2; // Use ERC20 tokens in the users wallet (transferFrom with approval)

    /// Create a salary
    function create(
        address recipient,
        uint256 assetId,
        uint32 cliffTimestamp,
        uint32 endTimestamp,
        uint32 cliffPercent,
        uint8 mode,
        uint128 amount
    ) public returns (uint256 salaryId, uint256 shares) {
        // Check that the end if after or equal to the cliff
        // If they are equal, all shares become payable at once, use this for a fixed term lockup
        require(cliffTimestamp <= endTimestamp, "Salary: cliff > end");
        // You cannot have a cliff greater than 100%, important check, without the contract will lose funds
        require(cliffPercent <= 1e18, "Salary: cliff too large");

        if (mode == MODE_YIELDBOX) {
            // Fund this salary using the funder's YieldBox balance. Convert the amoutn to shares, then transfer the shares
            shares = yieldBox.toShare(assetId, amount, false);
            yieldBox.transfer(msg.sender, address(this), assetId, shares);
        } else {
            // Fund this salary with ERC20 tokens
            // This is a potential reentrancy target, funds in this contract could be higher than the total of salaries during this call
            // Since this contract doesn't have a skim function, this is ok
            (, shares) = yieldBox.depositAsset(assetId, msg.sender, address(this), amount, 0);
        }

        salaryId = salaries.length;
        UserSalary memory salary;
        salary.recipient = recipient;
        salary.assetId = assetId;
        salary.cliffTimestamp = cliffTimestamp;
        salary.endTimestamp = endTimestamp;
        salary.cliffPercent = cliffPercent;
        salary.shares = uint128(shares);
        salaries.push(salary);
        funder.push(msg.sender);

        emit LogCreate(msg.sender, recipient, assetId, cliffTimestamp, endTimestamp, cliffPercent, uint128(shares), salaryId);
    }

    function _available(UserSalary memory salary) internal view returns (uint256 shares) {
        if (block.timestamp < salary.cliffTimestamp) {
            // Before the cliff, none is available
            shares = 0;
        } else if (block.timestamp >= salary.endTimestamp) {
            // After the end, all is available
            shares = salary.shares;
        } else {
            // In between, cliff is available, rest according to slope

            // Time that has passed since the cliff
            uint256 timeSinceCliff = block.timestamp - salary.cliffTimestamp;
            // Total time period of the slope
            uint256 timeSlope = salary.endTimestamp - salary.cliffTimestamp;
            uint256 payablePercent = salary.cliffPercent;
            if (timeSinceCliff > 0) {
                // The percentage paid out during the slope
                uint256 slopePercent = 1e18 - salary.cliffPercent;
                // The percentage payable on the slope added to the cliff percentage
                payablePercent = payablePercent + ((slopePercent * timeSinceCliff) / timeSlope);
            }
            // The share payable
            shares = (salary.shares * payablePercent) / 1e18;
        }

        // Remove any shares already wiythdrawn, if negative, return 0
        if (shares > salary.withdrawnShares) {
            shares = shares - salary.withdrawnShares;
        } else {
            shares = 0;
        }
    }

    // Get the number of shares currently available for withdrawal by salaryId
    function available(uint256 salaryId) public view returns (uint256 shares) {
        shares = _available(salaries[salaryId]);
    }

    // Withdraw the maximum amount possible for a salaryId
    function withdraw(
        uint256 salaryId,
        address to,
        bool toYieldBox
    ) public {
        UserSalary memory salary = salaries[salaryId];
        // Only pay out to the recipient
        require(salary.recipient == msg.sender, "Salary: not recipient");

        uint256 pendingShares = _available(salary);
        salaries[salaryId].withdrawnShares = salary.withdrawnShares + pendingShares;
        if (toYieldBox) {
            yieldBox.transfer(address(this), to, salary.assetId, pendingShares);
        } else {
            yieldBox.withdraw(salary.assetId, address(this), to, 0, pendingShares);
        }
        emit LogWithdraw(salaryId, to, pendingShares);
    }

    // Modifier for functions only allowed by the funder
    modifier onlyFunder(uint256 salaryId) {
        require(funder[salaryId] == msg.sender, "Salary: not funder");
        _;
    }

    // Cancel a salary, can only be done by the funder
    function cancel(
        uint256 salaryId,
        address to,
        bool toYieldBox
    ) public onlyFunder(salaryId) {
        uint256 sharesLeft = salaries[salaryId].shares - salaries[salaryId].withdrawnShares;
        if (toYieldBox) {
            yieldBox.transfer(address(this), to, salaries[salaryId].assetId, sharesLeft);
        } else {
            yieldBox.withdraw(salaries[salaryId].assetId, address(this), to, 0, sharesLeft);
        }
        emit LogCancel(salaryId, to, sharesLeft);
    }
}

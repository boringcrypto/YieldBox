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
        uint128 totalShare,
        uint256 salaryId
    );
    event LogWithdraw(uint256 indexed salaryId, address indexed to, uint256 share);
    event LogCancel(uint256 indexed salaryId, address indexed to, uint256 share);

    constructor(YieldBox _yieldBox) {
        yieldBox = _yieldBox;
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
    ///      |   totalShare                   \
    ///      |        |                          \
    ///      |        |                            \
    ///      |        V                              \
    ///      -----------------------------------------
    struct UserSalary {
        // The funder of the salary, the one who can cancel it
        address funder;
        // The recipient of the salary
        address recipient;
        // The ERC20 token
        uint256 assetId;
        // The amount of share that the recipient has already withdrawn
        uint256 withdrawnShare;
        // The timestamp of the cliff (also the start of the slope)
        uint32 cliffTimestamp;
        // The timestamp of the end of vesting (the end of the slope)
        uint32 endTimestamp;
        // The cliff payout in percent of the share
        uint64 cliffPercent;
        // The total payout in share
        uint128 share;
    }

    /// Array of all salaries managed by the contract
    UserSalary[] public salaries;

    function salaryCount() public view returns (uint256) {
        return salaries.length;
    }

    /// Create a salary
    function create(
        address recipient,
        uint256 assetId,
        uint32 cliffTimestamp,
        uint32 endTimestamp,
        uint32 cliffPercent,
        uint128 amount
    ) public returns (uint256 salaryId, uint256 share) {
        // Check that the end if after or equal to the cliff
        // If they are equal, all share become payable at once, use this for a fixed term lockup
        require(cliffTimestamp <= endTimestamp, "Salary: cliff > end");
        // You cannot have a cliff greater than 100%, important check, without the contract will lose funds
        require(cliffPercent <= 1e18, "Salary: cliff too large");

        // Fund this salary using the funder's YieldBox balance. Convert the amount to share, then transfer the share
        share = yieldBox.toShare(assetId, amount, false);
        yieldBox.transfer(msg.sender, address(this), assetId, share);

        salaryId = salaries.length;
        UserSalary memory salary;
        salary.funder = msg.sender;
        salary.recipient = recipient;
        salary.assetId = assetId;
        salary.cliffTimestamp = cliffTimestamp;
        salary.endTimestamp = endTimestamp;
        salary.cliffPercent = cliffPercent;
        salary.share = uint128(share);
        salaries.push(salary);

        emit LogCreate(msg.sender, recipient, assetId, cliffTimestamp, endTimestamp, cliffPercent, uint128(share), salaryId);
    }

    function _available(UserSalary memory salary) internal view returns (uint256 share) {
        if (block.timestamp < salary.cliffTimestamp) {
            // Before the cliff, none is available
            share = 0;
        } else if (block.timestamp >= salary.endTimestamp) {
            // After the end, all is available
            share = salary.share;
        } else {
            // In between, cliff is available, rest according to slope

            // Time that has passed since the cliff
            uint256 timeSinceCliff = block.timestamp - salary.cliffTimestamp;
            // Total time period of the slope
            uint256 timeSlope = salary.endTimestamp - salary.cliffTimestamp;
            uint256 payablePercent = salary.cliffPercent;
            if (timeSinceCliff > 0) {
                // The percentage paid out during the slope
                uint256 slopePercent = 100 - salary.cliffPercent;
                // The percentage payable on the slope added to the cliff percentage
                payablePercent += ((slopePercent * timeSinceCliff) / timeSlope);
            }
            // The share payable
            share = (salary.share * payablePercent) / 100;
        }

        // Remove any share already withdrawn
        share -= salary.withdrawnShare;
    }

    // Get the number of share currently available for withdrawal by salaryId
    function available(uint256 salaryId) public view returns (uint256 share) {
        share = _available(salaries[salaryId]);
    }

    function info(uint256 salaryId)
        public
        view
        returns (
            address funder,
            address recipient,
            uint256 assetId,
            uint256 withdrawnAmount,
            uint32 cliffTimestamp,
            uint32 endTimestamp,
            uint64 cliffPercent,
            uint256 amount,
            uint256 availableAmount
        )
    {
        funder = salaries[salaryId].funder;
        recipient = salaries[salaryId].recipient;
        assetId = salaries[salaryId].assetId;
        cliffTimestamp = salaries[salaryId].cliffTimestamp;
        endTimestamp = salaries[salaryId].endTimestamp;
        cliffPercent = salaries[salaryId].cliffPercent;
        amount = yieldBox.toAmount(salaries[salaryId].assetId, salaries[salaryId].share, false);
        withdrawnAmount = yieldBox.toAmount(salaries[salaryId].assetId, salaries[salaryId].withdrawnShare, false);
        availableAmount = yieldBox.toAmount(salaries[salaryId].assetId, _available(salaries[salaryId]), false);
    }

    function _withdraw(uint256 salaryId, address to) internal {
        uint256 pendingShare = _available(salaries[salaryId]);
        salaries[salaryId].withdrawnShare += pendingShare;
        yieldBox.transfer(address(this), to, salaries[salaryId].assetId, pendingShare);
        emit LogWithdraw(salaryId, to, pendingShare);
    }

    // Withdraw the maximum amount possible for a salaryId
    function withdraw(uint256 salaryId, address to) public {
        // Only pay out to the recipient
        require(salaries[salaryId].recipient == msg.sender, "Salary: not recipient");
        _withdraw(salaryId, to);
    }

    // Modifier for functions only allowed by the funder
    modifier onlyFunder(uint256 salaryId) {
        require(salaries[salaryId].funder == msg.sender, "Salary: not funder");
        _;
    }

    // Cancel a salary, can only be done by the funder
    function cancel(uint256 salaryId, address to) public onlyFunder(salaryId) {
        // Pay the recipient all accrued funds
        _withdraw(salaryId, salaries[salaryId].recipient);
        // Return the rest to the funder
        uint256 shareLeft = salaries[salaryId].share - salaries[salaryId].withdrawnShare;
        yieldBox.transfer(address(this), to, salaries[salaryId].assetId, shareLeft);
        emit LogCancel(salaryId, to, shareLeft);
    }
}

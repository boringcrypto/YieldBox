// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;
import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";
import "@boringcrypto/boring-solidity/contracts/ERC20.sol";
import "@boringcrypto/boring-solidity/contracts/interfaces/IMasterContract.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "./IOracle.sol";
import "./ISwapper.sol";
import "../../YieldBox.sol";

// Isolated Lending

// Quick port, most certainly broken... very broken

// Copyright (c) 2021, 2022 BoringCrypto - All rights reserved
// Twitter: @Boring_Crypto

// Special thanks to:
// @0xKeno - for all his invaluable contributions

// solhint-disable avoid-low-level-calls
// solhint-disable no-inline-assembly
// solhint-disable not-rely-on-time

struct Market {
    uint256 collateral;
    uint256 asset;
    IOracle oracle;
    bytes oracleData;
    // Collateral
    uint256 totalCollateralShare; // Total collateral supplied is yieldBox shares
    mapping(address => uint256) userCollateralShare; // Amount of collateral per user in yieldBox shares
    // Assets
    uint256 totalAssetShares;
    // totalAssetFractions and userAssetFraction are stored as the ERC1155 totalSupply and balanceOf in yieldBox

    // Borrow
    // elastic = Total token amount to be repayed by borrowers
    // base = Total parts of the debt held by borrowers
    Rebase totalBorrow;
    // User balances
    mapping(address => uint256) userBorrowPart;
    /// @notice Exchange and interest rate tracking.
    /// This is 'cached' here because calls to Oracles can be very expensive.
    uint256 exchangeRate;
    uint64 interestPerSecond;
    uint64 lastAccrued;
    uint128 assetId;
}

/// @title LendingPair
contract LendingPair is IMasterContract {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    event LogExchangeRate(uint256 rate);
    event LogAccrue(uint256 accruedAmount, uint64 rate, uint256 utilization);
    event LogAddCollateral(address indexed from, address indexed to, uint256 share);
    event LogAddAsset(address indexed from, address indexed to, uint256 share, uint256 fraction);
    event LogRemoveCollateral(address indexed from, address indexed to, uint256 share);
    event LogRemoveAsset(address indexed from, address indexed to, uint256 share, uint256 fraction);
    event LogBorrow(address indexed from, address indexed to, uint256 amount, uint256 part);
    event LogRepay(address indexed from, address indexed to, uint256 amount, uint256 part);
    event LogLiquidate(uint256 indexed marketId, address indexed user, uint256 borrowPart, address to, ISwapper swapper);

    // Immutables (for MasterContract and all clones)
    YieldBox public immutable yieldBox;
    LendingPair public immutable masterContract;

    mapping(uint256 => Market) public markets;
    uint256[] public marketList;

    // Settings for the Medium Risk LendingPair
    uint256 private constant COLLATERIZATION_RATE = 75000; // 75%
    uint256 private constant COLLATERIZATION_RATE_PRECISION = 1e5; // Must be less than EXCHANGE_RATE_PRECISION (due to optimization in math)
    uint256 private constant MINIMUM_TARGET_UTILIZATION = 7e17; // 70%
    uint256 private constant MAXIMUM_TARGET_UTILIZATION = 8e17; // 80%
    uint256 private constant UTILIZATION_PRECISION = 1e18;
    uint256 private constant FULL_UTILIZATION = 1e18;
    uint256 private constant FULL_UTILIZATION_MINUS_MAX = FULL_UTILIZATION - MAXIMUM_TARGET_UTILIZATION;
    uint256 private constant FACTOR_PRECISION = 1e18;

    uint64 private constant STARTING_INTEREST_PER_SECOND = 317097920; // approx 1% APR
    uint64 private constant MINIMUM_INTEREST_PER_SECOND = 79274480; // approx 0.25% APR
    uint64 private constant MAXIMUM_INTEREST_PER_SECOND = 317097920000; // approx 1000% APR
    uint256 private constant INTEREST_ELASTICITY = 28800e36; // Half or double in 28800 seconds (8 hours) if linear

    uint256 private constant EXCHANGE_RATE_PRECISION = 1e18;

    uint256 private constant LIQUIDATION_MULTIPLIER = 112000; // add 12%
    uint256 private constant LIQUIDATION_MULTIPLIER_PRECISION = 1e5;

    /// @notice The constructor is only used for the initial master contract. Subsequent clones are initialised via `init`.
    constructor(YieldBox yieldBox_) {
        yieldBox = yieldBox_;
        masterContract = this;
    }

    /// @notice No clones are used
    function init(bytes calldata) public payable override {
        revert("No clones");
    }

    function createMarket(
        uint256 collateral_,
        uint256 asset_,
        IOracle oracle_,
        bytes calldata oracleData_
    ) public {
        uint256 marketId = yieldBox.createToken(
            string(abi.encodePacked(yieldBox.name(collateral_), "/", yieldBox.name(asset_), "-", oracle_.name(oracleData_))),
            string(abi.encodePacked(yieldBox.symbol(collateral_), "/", yieldBox.symbol(asset_), "-", oracle_.symbol(oracleData_))),
            18
        );

        Market storage market = markets[marketId];
        (market.collateral, market.asset, market.oracle, market.oracleData) = (collateral_, asset_, oracle_, oracleData_);
        market.interestPerSecond = uint64(STARTING_INTEREST_PER_SECOND); // 1% APR, with 1e18 being 100%
        market.assetId = uint128(marketId);

        marketList.push(marketId);
    }

    /// @notice Accrues the interest on the borrowed tokens.
    function accrue(uint256 marketId) public {
        Market storage market = markets[marketId];

        // Number of seconds since accrue was called
        uint256 elapsedTime = block.timestamp - market.lastAccrued;
        if (elapsedTime == 0) {
            return;
        }
        market.lastAccrued = uint64(block.timestamp);

        if (market.totalBorrow.base == 0) {
            // If there are no borrows, reset the interest rate
            if (market.interestPerSecond != STARTING_INTEREST_PER_SECOND) {
                market.interestPerSecond = STARTING_INTEREST_PER_SECOND;
                emit LogAccrue(0, STARTING_INTEREST_PER_SECOND, 0);
            }
            return;
        }

        uint256 extraAmount = 0;

        // Accrue interest
        extraAmount = (market.totalBorrow.elastic * market.interestPerSecond * elapsedTime) / 1e18;
        market.totalBorrow.elastic += uint128(extraAmount);
        uint256 fullAssetAmount = yieldBox.toAmount(market.asset, yieldBox.totalSupply(marketId), false) + market.totalBorrow.elastic;

        // Update interest rate
        uint256 utilization = (market.totalBorrow.elastic * UTILIZATION_PRECISION) / fullAssetAmount;
        if (utilization < MINIMUM_TARGET_UTILIZATION) {
            uint256 underFactor = ((MINIMUM_TARGET_UTILIZATION - utilization) * FACTOR_PRECISION) / MINIMUM_TARGET_UTILIZATION;
            uint256 scale = INTEREST_ELASTICITY + (underFactor * underFactor * elapsedTime);
            market.interestPerSecond = uint64((market.interestPerSecond * INTEREST_ELASTICITY) / scale);

            if (market.interestPerSecond < MINIMUM_INTEREST_PER_SECOND) {
                market.interestPerSecond = MINIMUM_INTEREST_PER_SECOND; // 0.25% APR minimum
            }
        } else if (utilization > MAXIMUM_TARGET_UTILIZATION) {
            uint256 overFactor = ((utilization - MAXIMUM_TARGET_UTILIZATION) * FACTOR_PRECISION) / FULL_UTILIZATION_MINUS_MAX;
            uint256 scale = INTEREST_ELASTICITY + (overFactor * overFactor * elapsedTime);
            uint256 newInterestPerSecond = (market.interestPerSecond * scale) / INTEREST_ELASTICITY;
            if (newInterestPerSecond > MAXIMUM_INTEREST_PER_SECOND) {
                newInterestPerSecond = MAXIMUM_INTEREST_PER_SECOND; // 1000% APR maximum
            }
            market.interestPerSecond = uint64(newInterestPerSecond);
        }

        emit LogAccrue(extraAmount, market.interestPerSecond, utilization);
    }

    /// @notice Concrete implementation of `isSolvent`. Includes a third parameter to allow caching `exchangeRate`.
    /// @param _exchangeRate The exchange rate. Used to cache the `exchangeRate` between calls.
    function _isSolvent(
        uint256 marketId,
        address user,
        uint256 _exchangeRate
    ) internal view returns (bool) {
        Market storage market = markets[marketId];

        // accrue must have already been called!
        uint256 borrowPart = market.userBorrowPart[user];
        if (borrowPart == 0) return true;
        uint256 collateralShare = market.userCollateralShare[user];
        if (collateralShare == 0) return false;

        return
            yieldBox.toAmount(
                market.collateral,
                ((collateralShare * EXCHANGE_RATE_PRECISION) / COLLATERIZATION_RATE_PRECISION) * COLLATERIZATION_RATE,
                false
            ) >=
            // Moved exchangeRate here instead of dividing the other side to preserve more precision
            (borrowPart * market.totalBorrow.elastic * _exchangeRate) / market.totalBorrow.base;
    }

    modifier solvent(uint256 marketId) {
        _;
        // TODO
    }

    /// @notice Gets the exchange rate. I.e how much collateral to buy 1e18 asset.
    /// This function is supposed to be invoked if needed because Oracle queries can be expensive.
    /// @return updated True if `exchangeRate` was updated.
    /// @return rate The new exchange rate.
    function updateExchangeRate(uint256 marketId) public returns (bool updated, uint256 rate) {
        Market storage market = markets[marketId];

        (updated, rate) = market.oracle.get(market.oracleData);

        if (updated) {
            market.exchangeRate = rate;
            emit LogExchangeRate(rate);
        } else {
            // Return the old rate if fetching wasn't successful
            rate = market.exchangeRate;
        }
    }

    /// @notice Adds `collateral` from msg.sender to the account `to`.
    /// @param marketId The id of the market.
    /// @param to The receiver of the tokens.
    /// @param share The amount of shares to add for `to`.
    function addCollateral(
        uint256 marketId,
        address to,
        uint256 share
    ) public {
        Market storage market = markets[marketId];

        market.userCollateralShare[to] += share;
        market.totalCollateralShare += share;
        yieldBox.transfer(msg.sender, address(this), market.collateral, share);
        emit LogAddCollateral(msg.sender, to, share);
    }

    /// @dev Concrete implementation of `removeCollateral`.
    function _removeCollateral(
        uint256 marketId,
        address to,
        uint256 share
    ) internal {
        Market storage market = markets[marketId];

        market.userCollateralShare[msg.sender] -= share;
        market.totalCollateralShare -= share;
        yieldBox.transfer(address(this), to, market.collateral, share);
        emit LogRemoveCollateral(msg.sender, to, share);
    }

    /// @notice Removes `share` amount of collateral and transfers it to `to`.
    /// @param to The receiver of the shares.
    /// @param share Amount of shares to remove.
    function removeCollateral(
        uint256 marketId,
        address to,
        uint256 share
    ) public solvent(marketId) {
        // accrue must be called because we check solvency
        accrue(marketId);
        _removeCollateral(marketId, to, share);
    }

    /// @dev Concrete implementation of `addAsset`.
    function _addAsset(
        uint256 marketId,
        address to,
        uint256 share
    ) internal returns (uint256 fraction) {
        Market storage market = markets[marketId];

        uint256 allShare = yieldBox.totalSupply(marketId) + yieldBox.toShare(market.asset, market.totalBorrow.elastic, true);
        fraction = allShare == 0 ? share : (share * yieldBox.totalSupply(marketId)) / allShare;
        if (yieldBox.totalSupply(marketId) + fraction < 1000) {
            return 0;
        }
        yieldBox.mint(marketId, to, share);
        yieldBox.transfer(msg.sender, to, marketId, share);
        emit LogAddAsset(msg.sender, to, share, fraction);
    }

    /// @notice Adds assets to the lending pair.
    /// @param to The address of the user to receive the assets.
    /// @param share The amount of shares to add.
    /// @return fraction Total fractions added.
    function addAsset(
        uint256 marketId,
        address to,
        uint256 share
    ) public returns (uint256 fraction) {
        accrue(marketId);
        fraction = _addAsset(marketId, to, share);
    }

    /// @dev Concrete implementation of `removeAsset`.
    function _removeAsset(
        uint256 marketId,
        address to,
        uint256 fraction
    ) internal returns (uint256 share) {
        Market storage market = markets[marketId];

        uint256 allShare = yieldBox.totalSupply(marketId) + yieldBox.toShare(market.asset, market.totalBorrow.elastic, true);
        share = (fraction * allShare) / yieldBox.totalSupply(marketId);
        yieldBox.burn(marketId, msg.sender, fraction);
        require(yieldBox.totalSupply(marketId) >= 1000, "Kashi: below minimum");
        emit LogRemoveAsset(msg.sender, to, share, fraction);
        yieldBox.transfer(address(this), to, marketId, share);
    }

    /// @notice Removes an asset from msg.sender and transfers it to `to`.
    /// @param to The user that receives the removed assets.
    /// @param fraction The amount/fraction of assets held to remove.
    /// @return share The amount of shares transferred to `to`.
    function removeAsset(
        uint256 marketId,
        address to,
        uint256 fraction
    ) public returns (uint256 share) {
        accrue(marketId);
        share = _removeAsset(marketId, to, fraction);
    }

    /// @dev Concrete implementation of `borrow`.
    function _borrow(
        uint256 marketId,
        address to,
        uint256 amount
    ) internal returns (uint256 part, uint256 share) {
        Market storage market = markets[marketId];

        (market.totalBorrow, part) = market.totalBorrow.add(amount, true);
        market.userBorrowPart[msg.sender] += part;
        emit LogBorrow(msg.sender, to, amount, part);

        share = yieldBox.toShare(market.asset, amount, false);
        require(yieldBox.totalSupply(marketId) >= 1000, "Kashi: below minimum");
        market.totalAssetShares -= share;
        yieldBox.transfer(address(this), to, market.asset, share);
    }

    /// @notice Sender borrows `amount` and transfers it to `to`.
    /// @return part Total part of the debt held by borrowers.
    /// @return share Total amount in shares borrowed.
    function borrow(
        uint256 marketId,
        address to,
        uint256 amount
    ) public solvent(marketId) returns (uint256 part, uint256 share) {
        updateExchangeRate(marketId);
        accrue(marketId);
        (part, share) = _borrow(marketId, to, amount);
    }

    /// @dev Concrete implementation of `repay`.
    function _repay(
        uint256 marketId,
        address to,
        uint256 part
    ) internal returns (uint256 amount) {
        Market storage market = markets[marketId];

        (market.totalBorrow, amount) = market.totalBorrow.sub(part, true);
        market.userBorrowPart[to] -= part;

        uint256 share = yieldBox.toShare(market.asset, amount, true);
        yieldBox.transfer(msg.sender, address(this), market.asset, share);
        market.totalAssetShares += share;
        emit LogRepay(msg.sender, to, amount, part);
    }

    /// @notice Repays a loan.
    /// @param to Address of the user this payment should go.
    /// @param part The amount to repay. See `userBorrowPart`.
    /// @return amount The total amount repayed.
    function repay(
        uint256 marketId,
        address to,
        uint256 part
    ) public returns (uint256 amount) {
        accrue(marketId);
        amount = _repay(marketId, to, part);
    }

    /// @notice Handles the liquidation of users' balances, once the users' amount of collateral is too low.
    /// @param user The user to liquidate.
    /// @param maxBorrowPart Maximum (partial) borrow amounts to liquidate.
    /// @param to Address of the receiver if `swapper` is zero.
    /// @param swapper Contract address of the `ISwapper` implementation.
    function liquidate(
        uint256 marketId,
        address user,
        uint256 maxBorrowPart,
        address to,
        ISwapper swapper
    ) public {
        Market storage market = markets[marketId];

        // Oracle can fail but we still need to allow liquidations
        (, uint256 _exchangeRate) = updateExchangeRate(marketId);
        accrue(marketId);
        require(!_isSolvent(marketId, user, _exchangeRate), "Lending: user solvent");

        uint256 availableBorrowPart = market.userBorrowPart[user];
        uint256 borrowPart = maxBorrowPart > availableBorrowPart ? availableBorrowPart : maxBorrowPart;
        market.userBorrowPart[user] = availableBorrowPart - borrowPart;
        uint256 borrowAmount = market.totalBorrow.toElastic(borrowPart, false);
        uint256 collateralShare = yieldBox.toShare(
            market.collateral,
            ((borrowAmount * LIQUIDATION_MULTIPLIER * _exchangeRate) / LIQUIDATION_MULTIPLIER_PRECISION) * EXCHANGE_RATE_PRECISION,
            false
        );

        market.userCollateralShare[user] -= collateralShare;
        emit LogRemoveCollateral(user, swapper == ISwapper(address(0)) ? to : address(swapper), collateralShare);
        emit LogRepay(swapper == ISwapper(address(0)) ? msg.sender : address(swapper), user, borrowAmount, borrowPart);

        market.totalBorrow.elastic -= uint128(borrowAmount);
        market.totalBorrow.base -= uint128(borrowPart);
        market.totalCollateralShare -= collateralShare;

        uint256 borrowShare = yieldBox.toShare(market.asset, borrowAmount, true);

        // Flash liquidation: get proceeds first and provide the borrow after
        yieldBox.transfer(address(this), swapper == ISwapper(address(0)) ? to : address(swapper), market.collateral, collateralShare);
        if (swapper != ISwapper(address(0))) {
            swapper.swap(market.collateral, market.asset, msg.sender, borrowShare, collateralShare);
        }

        yieldBox.transfer(msg.sender, address(this), market.asset, borrowShare);
        market.totalAssetShares += borrowShare;

        emit LogLiquidate(marketId, user, borrowPart, to, swapper);
    }
}

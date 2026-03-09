// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPositionManager} from "./interfaces/IPositionManager.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PositionManager is IPositionManager {
    // ERRORS
    error PositionManager__PositionIsSafe();

    // STATE VARIABLES
    IPriceOracle public immutable I_PRICE_ORACLE;

    // User -> Asset -> Amount
    mapping(address => mapping(address => uint256)) public sUserCollateral;
    mapping(address => mapping(address => uint256)) public sUserDebt;

    // Supported assets (for HF calculation)
    address[] public sCollateralAssets;
    address[] public sDebtAssets;

    // CONSTANTS
    uint256 public constant LIQUIDATION_THRESHOLD = 8000; // 80% (basis points)
    uint256 public constant BASIS_POINTS_DIVISOR = 10000;

    // CONSTRUCTOR
    constructor(address _priceOracle) {
        I_PRICE_ORACLE = IPriceOracle(_priceOracle);
    }

    // EXTERNAL FUNCTIONS
    function addCollateralAsset(address asset) external {
        sCollateralAssets.push(asset);
    }

    function addDebtAsset(address asset) external {
        sDebtAssets.push(asset);
    }

    function recordDeposit(address user, address asset, uint256 amount) external {
        sUserCollateral[user][asset] += amount;
    }

    function recordWithdraw(address user, address asset, uint256 amount) external {
        sUserCollateral[user][asset] -= amount;
    }

    function recordBorrow(address user, address asset, uint256 amount) external {
        sUserDebt[user][asset] += amount;
    }

    function recordRepay(address user, address asset, uint256 amount) external {
        sUserDebt[user][asset] -= amount;
    }

    function updatePosition(address user) external {
        // In this implementation, values are derived dynamically in getPosition
    }

    function executePartialLiquidation(address user)
        external
        returns (uint256 debtToRepayUSD, uint256 collateralToSeizeUSD)
    {
        Position memory pos = getPosition(user);
        if (pos.healthFactor >= 1e18) {
            revert PositionManager__PositionIsSafe();
        }

        uint256 penalty = 500; // 5%

        uint256 num = pos.borrowValue - (pos.collateralValue * LIQUIDATION_THRESHOLD / BASIS_POINTS_DIVISOR);
        uint256 denom =
            BASIS_POINTS_DIVISOR - ((BASIS_POINTS_DIVISOR + penalty) * LIQUIDATION_THRESHOLD / BASIS_POINTS_DIVISOR);

        debtToRepayUSD = (num * BASIS_POINTS_DIVISOR) / denom;

        // Add 5% buffer to ensure HF easily clears 1.0 threshold
        debtToRepayUSD = (debtToRepayUSD * 105) / 100;

        if (debtToRepayUSD > pos.borrowValue) {
            debtToRepayUSD = pos.borrowValue;
        }

        collateralToSeizeUSD = (debtToRepayUSD * (BASIS_POINTS_DIVISOR + penalty)) / BASIS_POINTS_DIVISOR;

        if (collateralToSeizeUSD > pos.collateralValue) {
            collateralToSeizeUSD = pos.collateralValue;
        }

        uint256 remainingDebtToRepayUSD = debtToRepayUSD;
        for (uint256 i = 0; i < sDebtAssets.length; i++) {
            if (remainingDebtToRepayUSD == 0) break;
            address asset = sDebtAssets[i];
            uint256 amount = sUserDebt[user][asset];
            if (amount > 0) {
                uint256 price = I_PRICE_ORACLE.getPrice(asset);
                uint256 assetUsd = (amount * price) / 1e18;

                if (assetUsd <= remainingDebtToRepayUSD) {
                    sUserDebt[user][asset] = 0;
                    remainingDebtToRepayUSD -= assetUsd;
                } else {
                    uint256 amountToRepay = (remainingDebtToRepayUSD * 1e18) / price;
                    sUserDebt[user][asset] -= amountToRepay;
                    remainingDebtToRepayUSD = 0;
                }
            }
        }

        uint256 remainingCollateralToSeizeUSD = collateralToSeizeUSD;
        for (uint256 i = 0; i < sCollateralAssets.length; i++) {
            if (remainingCollateralToSeizeUSD == 0) break;
            address asset = sCollateralAssets[i];
            uint256 amount = sUserCollateral[user][asset];
            if (amount > 0) {
                uint256 price = I_PRICE_ORACLE.getPrice(asset);
                uint256 assetUsd = (amount * price) / 1e18;

                if (assetUsd <= remainingCollateralToSeizeUSD) {
                    sUserCollateral[user][asset] = 0;
                    remainingCollateralToSeizeUSD -= assetUsd;
                } else {
                    uint256 amountToSeize = (remainingCollateralToSeizeUSD * 1e18) / price;
                    sUserCollateral[user][asset] -= amountToSeize;
                    remainingCollateralToSeizeUSD = 0;
                }
            }
        }
    }

    // PUBLIC FUNCTIONS
    function getPosition(address user) public view returns (Position memory) {
        uint256 totalCollateralValue = 0;
        for (uint256 i = 0; i < sCollateralAssets.length; i++) {
            address asset = sCollateralAssets[i];
            uint256 amount = sUserCollateral[user][asset];
            if (amount > 0) {
                totalCollateralValue += (amount * I_PRICE_ORACLE.getPrice(asset)) / 1e18;
            }
        }

        uint256 totalBorrowValue = 0;
        for (uint256 i = 0; i < sDebtAssets.length; i++) {
            address asset = sDebtAssets[i];
            uint256 amount = sUserDebt[user][asset];
            if (amount > 0) {
                totalBorrowValue += (amount * I_PRICE_ORACLE.getPrice(asset)) / 1e18;
            }
        }

        uint256 hf = 0;
        if (totalBorrowValue == 0) {
            hf = type(uint256).max;
        } else {
            hf = (totalCollateralValue * LIQUIDATION_THRESHOLD * 1e18) / (totalBorrowValue * BASIS_POINTS_DIVISOR);
        }

        return Position({collateralValue: totalCollateralValue, borrowValue: totalBorrowValue, healthFactor: hf});
    }
}

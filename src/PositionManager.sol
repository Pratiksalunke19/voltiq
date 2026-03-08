// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPositionManager} from "./interfaces/IPositionManager.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PositionManager is IPositionManager {
    // STATE VARIABLES
    IPriceOracle public immutable priceOracle;

    // User -> Asset -> Amount
    mapping(address => mapping(address => uint256)) public userCollateral;
    mapping(address => mapping(address => uint256)) public userDebt;

    // Supported assets (for HF calculation)
    address[] public collateralAssets;
    address[] public debtAssets;

    // CONSTANTS
    uint256 public constant LIQUIDATION_THRESHOLD = 8000; // 80% (basis points)
    uint256 public constant BASIS_POINTS_DIVISOR = 10000;

    // CONSTRUCTOR
    constructor(address _priceOracle) {
        priceOracle = IPriceOracle(_priceOracle);
    }

    // EXTERNAL FUNCTIONS
    function addCollateralAsset(address asset) external {
        collateralAssets.push(asset);
    }

    function addDebtAsset(address asset) external {
        debtAssets.push(asset);
    }

    function recordDeposit(address user, address asset, uint256 amount) external {
        userCollateral[user][asset] += amount;
    }

    function recordWithdraw(address user, address asset, uint256 amount) external {
        userCollateral[user][asset] -= amount;
    }

    function recordBorrow(address user, address asset, uint256 amount) external {
        userDebt[user][asset] += amount;
    }

    function recordRepay(address user, address asset, uint256 amount) external {
        userDebt[user][asset] -= amount;
    }

    function updatePosition(address user) external {
        // In this implementation, values are derived dynamically in getPosition
    }

    // PUBLIC FUNCTIONS
    function getPosition(address user) public view returns (Position memory) {
        uint256 totalCollateralValue = 0;
        for (uint256 i = 0; i < collateralAssets.length; i++) {
            address asset = collateralAssets[i];
            uint256 amount = userCollateral[user][asset];
            if (amount > 0) {
                totalCollateralValue += (amount * priceOracle.getPrice(asset)) / 1e18;
            }
        }

        uint256 totalBorrowValue = 0;
        for (uint256 i = 0; i < debtAssets.length; i++) {
            address asset = debtAssets[i];
            uint256 amount = userDebt[user][asset];
            if (amount > 0) {
                totalBorrowValue += (amount * priceOracle.getPrice(asset)) / 1e18;
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

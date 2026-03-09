// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ILendingPool} from "./interfaces/ILendingPool.sol";
import {PositionManager} from "./PositionManager.sol";
import {IPositionManager} from "./interfaces/IPositionManager.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract LendingPool is ILendingPool {
    // ERRORS
    error LendingPool__HealthFactorTooLow();
    error LendingPool__PositionIsSafe();

    // LIBRARIES
    using SafeERC20 for IERC20;

    // STATE VARIABLES
    PositionManager public immutable I_POSITION_MANAGER;

    // CONSTRUCTOR
    constructor(address _positionManager) {
        I_POSITION_MANAGER = PositionManager(_positionManager);
    }

    // EXTERNAL FUNCTIONS
    function deposit(address asset, uint256 amount) external {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        I_POSITION_MANAGER.recordDeposit(msg.sender, asset, amount);
        emit Deposited(msg.sender, asset, amount);
    }

    function withdraw(address asset, uint256 amount) external {
        I_POSITION_MANAGER.recordWithdraw(msg.sender, asset, amount);

        // Check health factor after withdrawal
        IPositionManager.Position memory pos = I_POSITION_MANAGER.getPosition(msg.sender);
        if (pos.healthFactor < 1e18) {
            revert LendingPool__HealthFactorTooLow();
        }

        IERC20(asset).safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, asset, amount);
    }

    function borrow(address asset, uint256 amount) external {
        I_POSITION_MANAGER.recordBorrow(msg.sender, asset, amount);

        // Check health factor after borrow
        IPositionManager.Position memory pos = I_POSITION_MANAGER.getPosition(msg.sender);
        if (pos.healthFactor < 1e18) {
            revert LendingPool__HealthFactorTooLow();
        }

        IERC20(asset).safeTransfer(msg.sender, amount);
        emit Borrowed(msg.sender, asset, amount);
    }

    function repay(address asset, uint256 amount) external {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        I_POSITION_MANAGER.recordRepay(msg.sender, asset, amount);
        emit Repaid(msg.sender, asset, amount);
    }

    function liquidate(address user) external {
        IPositionManager.Position memory pos = I_POSITION_MANAGER.getPosition(user);
        if (pos.healthFactor >= 1e18) {
            revert LendingPool__PositionIsSafe();
        }

        // Execute partial liquidation
        (uint256 debtCoveredUSD, uint256 collateralLiquidatedUSD) = I_POSITION_MANAGER.executePartialLiquidation(user);

        emit Liquidated(user, collateralLiquidatedUSD, debtCoveredUSD);
    }
}

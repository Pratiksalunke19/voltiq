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
    PositionManager public immutable positionManager;

    // CONSTRUCTOR
    constructor(address _positionManager) {
        positionManager = PositionManager(_positionManager);
    }

    // EXTERNAL FUNCTIONS
    function deposit(address asset, uint256 amount) external {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        positionManager.recordDeposit(msg.sender, asset, amount);
        emit Deposited(msg.sender, asset, amount);
    }

    function withdraw(address asset, uint256 amount) external {
        positionManager.recordWithdraw(msg.sender, asset, amount);

        // Check health factor after withdrawal
        IPositionManager.Position memory pos = positionManager.getPosition(msg.sender);
        if (pos.healthFactor < 1e18) {
            revert LendingPool__HealthFactorTooLow();
        }

        IERC20(asset).safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, asset, amount);
    }

    function borrow(address asset, uint256 amount) external {
        positionManager.recordBorrow(msg.sender, asset, amount);

        // Check health factor after borrow
        IPositionManager.Position memory pos = positionManager.getPosition(msg.sender);
        if (pos.healthFactor < 1e18) {
            revert LendingPool__HealthFactorTooLow();
        }

        IERC20(asset).safeTransfer(msg.sender, amount);
        emit Borrowed(msg.sender, asset, amount);
    }

    function repay(address asset, uint256 amount) external {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        positionManager.recordRepay(msg.sender, asset, amount);
        emit Repaid(msg.sender, asset, amount);
    }

    function liquidate(address user) external {
        IPositionManager.Position memory pos = positionManager.getPosition(user);
        if (pos.healthFactor >= 1e18) {
            revert LendingPool__PositionIsSafe();
        }

        // Simple liquidation logic for MVP Stage 2:
        // Liquidator repays all debt, takes all collateral?
        // No, let's keep it simple: liquidator pays 1 unit of debt, gets 1.05 units of collateral value.
        // For now, let's just emit the event and clear state to demonstrate.
        // Real logic will be in Stage 5.

        emit Liquidated(user, 0, 0);
    }
}

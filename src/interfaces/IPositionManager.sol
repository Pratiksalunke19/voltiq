// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPositionManager {
    struct Position {
        uint256 collateralValue; // In USD, 18 decimals
        uint256 borrowValue; // In USD, 18 decimals
        uint256 healthFactor; // 1e18 = 1.0
    }

    /**
     * @notice Get the position details of a user
     * @param user The address of the user
     * @return The Position struct containing collateral, borrow and health factor
     */
    function getPosition(address user) external view returns (Position memory);

    /**
     * @notice Update position data (called after deposits, borrows, etc.)
     * @param user The address of the user
     */
    function updatePosition(address user) external;
}

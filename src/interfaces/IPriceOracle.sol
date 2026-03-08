// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPriceOracle {
    event PriceUpdated(address indexed asset, uint256 price, uint256 timestamp);

    /**
     * @notice Get the current price of an asset in USD (18 decimals)
     * @param asset The address of the asset
     * @return The price of the asset
     */
    function getPrice(address asset) external view returns (uint256);
}

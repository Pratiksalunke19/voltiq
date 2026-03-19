// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPriceOracle} from "./interfaces/IPriceOracle.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract ChainlinkPriceOracle is IPriceOracle {
    // ERRORS
    error ChainlinkPriceOracle__InvalidPrice();

    // STATE VARIABLES
    mapping(address => address) public sPriceFeeds;

    /**
     * @notice Get the current price of an asset in USD (18 decimals)
     * @param asset The address of the asset
     * @return The price of the asset
     */
    function getPrice(address asset) public view returns (uint256) {
        address feedAddress = sPriceFeeds[asset];
        if (feedAddress == address(0)) {
            revert ChainlinkPriceOracle__InvalidPrice();
        }

        AggregatorV3Interface feed = AggregatorV3Interface(feedAddress);
        (, int256 price,,,) = feed.latestRoundData();

        if (price <= 0) {
            revert ChainlinkPriceOracle__InvalidPrice();
        }

        uint8 decimals = feed.decimals();
        return uint256(price) * (10 ** (18 - decimals));
    }

    function setPriceFeed(address asset, address feed) external {
        sPriceFeeds[asset] = feed;
        // Optionally emit when feed is set, but better to have a dedicated trigger
        emit PriceUpdated(asset, getPrice(asset), block.timestamp);
    }

    /**
     * @notice Manually trigger a price update event for reactivity
     * @param asset The address of the asset
     */
    function notifyPriceUpdate(address asset) external {
        uint256 price = getPrice(asset);
        emit PriceUpdated(asset, price, block.timestamp);
    }
}

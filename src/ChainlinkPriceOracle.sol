// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPriceOracle} from "./interfaces/IPriceOracle.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract ChainlinkPriceOracle is IPriceOracle {
    // ERRORS
    error ChainlinkPriceOracle__InvalidPrice();

    // STATE VARIABLES
    mapping(address => address) public sPriceFeeds;

    // EXTERNAL FUNCTIONS
    function setPriceFeed(address asset, address feed) external {
        sPriceFeeds[asset] = feed;
    }

    /**
     * @notice Get the current price of an asset in USD (18 decimals)
     * @param asset The address of the asset
     * @return The price of the asset
     */
    function getPrice(address asset) external view returns (uint256) {
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
}

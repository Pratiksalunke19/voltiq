// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {ChainlinkPriceOracle} from "../src/ChainlinkPriceOracle.sol";
import {HelperConfig} from "../script/HelperConfig.s.sol";

contract ChainlinkPriceOracleTest is Test {
    ChainlinkPriceOracle public oracle;
    HelperConfig public config;

    address weth;
    address ethUsdFeed;

    function setUp() public {
        oracle = new ChainlinkPriceOracle();
        config = new HelperConfig();
        HelperConfig.NetworkConfig memory activeConfig = config.getActiveNetworkConfig();
        weth = activeConfig.weth;
        ethUsdFeed = activeConfig.ethUsdPriceFeed;

        oracle.setPriceFeed(weth, ethUsdFeed);
    }

    function test_GetPrice_IsCorrect() public view {
        uint256 price = oracle.getPrice(weth);
        console2.log("Current price:", price);

        assertTrue(price > 0, "Price should be greater than zero");

        // If we are on Anvil (local), we know the price is 2000e18
        if (block.chainid == 31337) {
            assertEq(price, 2000e18, "Mock price should be 2000e18");
        }
    }

    function test_GetPrice_FailsOnEmptyFeed() public {
        address randomAsset = address(0x123);
        vm.expectRevert(ChainlinkPriceOracle.ChainlinkPriceOracle__InvalidPrice.selector);
        oracle.getPrice(randomAsset);
    }

    function test_GetPrice_FailsOnInvalidPrice_LocalOnly() public {
        if (block.chainid == 31337) {
            // In anvil, we can manipulate the mock
            address feed = oracle.sPriceFeeds(weth);
            (bool success,) = feed.call(abi.encodeWithSignature("setPrice(int256)", int256(-1)));
            assertTrue(success, "Mock price update failed");

            vm.expectRevert(ChainlinkPriceOracle.ChainlinkPriceOracle__InvalidPrice.selector);
            oracle.getPrice(weth);
        }
    }
}

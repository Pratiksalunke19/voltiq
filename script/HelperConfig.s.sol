// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {MockChainlinkAggregator} from "../test/mocks/MockChainlinkAggregator.sol";

contract HelperConfig is Script {
    struct NetworkConfig {
        address weth;
        address wbtc;
        address usdc;
        address ethUsdPriceFeed;
        address btcUsdPriceFeed;
    }

    NetworkConfig private activeNetworkConfig;

    function getActiveNetworkConfig() public view returns (NetworkConfig memory) {
        return activeNetworkConfig;
    }

    // Default values for Mainnet/Sepolia
    address public constant WETH_MAINNET = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant WBTC_MAINNET = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    address public constant USDC_MAINNET = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    constructor() {
        if (block.chainid == 11155111) {
            activeNetworkConfig = getSepoliaEthConfig();
        } else if (block.chainid == 1) {
            activeNetworkConfig = getMainnetEthConfig();
        } else {
            activeNetworkConfig = getOrCreateAnvilEthConfig();
        }
    }

    function getSepoliaEthConfig() public pure returns (NetworkConfig memory) {
        return NetworkConfig({
            weth: 0xDd13e5510973770165986C8CFC21f05218D84032, // Sepolia WETH
            wbtc: 0x8f3cF621D9607f0F62fd79612CC23F405629910D, // Sepolia WBTC (Example)
            usdc: 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8, // Sepolia USDC
            ethUsdPriceFeed: 0x694AA1769357215DE4FAC081bf1f309aDC325306,
            btcUsdPriceFeed: 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43
        });
    }

    function getMainnetEthConfig() public pure returns (NetworkConfig memory) {
        return NetworkConfig({
            weth: WETH_MAINNET,
            wbtc: WBTC_MAINNET,
            usdc: USDC_MAINNET,
            ethUsdPriceFeed: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419,
            btcUsdPriceFeed: 0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c
        });
    }

    function getOrCreateAnvilEthConfig() public returns (NetworkConfig memory) {
        if (activeNetworkConfig.ethUsdPriceFeed != address(0)) {
            return activeNetworkConfig;
        }

        vm.startBroadcast();
        MockChainlinkAggregator ethUsdFeed = new MockChainlinkAggregator(2000e8, 8);
        MockChainlinkAggregator btcUsdFeed = new MockChainlinkAggregator(60000e8, 8);
        vm.stopBroadcast();

        return NetworkConfig({
            weth: address(0x1), // Mock WETH
            wbtc: address(0x2), // Mock WBTC
            usdc: address(0x3), // Mock USDC
            ethUsdPriceFeed: address(ethUsdFeed),
            btcUsdPriceFeed: address(btcUsdFeed)
        });
    }
}

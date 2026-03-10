// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {LendingPool} from "../src/LendingPool.sol";
import {PositionManager} from "../src/PositionManager.sol";
import {ChainlinkPriceOracle} from "../src/ChainlinkPriceOracle.sol";
import {ReactiveLiquidationEngine} from "../src/ReactiveLiquidationEngine.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract DeployLendingPool is Script {
    function run()
        external
        returns (LendingPool, PositionManager, ChainlinkPriceOracle, ReactiveLiquidationEngine, HelperConfig)
    {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory activeConfig = helperConfig.getActiveNetworkConfig();

        vm.startBroadcast();

        // 1. Deploy Oracle
        ChainlinkPriceOracle oracle = new ChainlinkPriceOracle();
        oracle.setPriceFeed(activeConfig.weth, activeConfig.ethUsdPriceFeed);
        oracle.setPriceFeed(activeConfig.wbtc, activeConfig.btcUsdPriceFeed);
        oracle.setPriceFeed(activeConfig.usdc, activeConfig.usdcUsdPriceFeed);

        // 2. Deploy Position Manager
        PositionManager positionManager = new PositionManager(address(oracle));
        positionManager.addCollateralAsset(activeConfig.weth);
        positionManager.addCollateralAsset(activeConfig.wbtc);
        positionManager.addDebtAsset(activeConfig.usdc);

        // 3. Deploy Lending Pool
        LendingPool pool = new LendingPool(address(positionManager));

        // 4. Deploy Reactive Engine
        ReactiveLiquidationEngine engine =
            new ReactiveLiquidationEngine(address(pool), address(positionManager), address(oracle));

        vm.stopBroadcast();

        return (pool, positionManager, oracle, engine, helperConfig);
    }
}

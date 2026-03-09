// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DeployLendingPool} from "../script/DeployLendingPool.s.sol";
import {LendingPool} from "../src/LendingPool.sol";
import {PositionManager} from "../src/PositionManager.sol";
import {ChainlinkPriceOracle} from "../src/ChainlinkPriceOracle.sol";
import {ReactiveLiquidationEngine} from "../src/ReactiveLiquidationEngine.sol";
import {HelperConfig} from "../script/HelperConfig.s.sol";

contract DeployTest is Test {
    DeployLendingPool public deployer;
    LendingPool public pool;
    PositionManager public positionManager;
    ChainlinkPriceOracle public oracle;
    ReactiveLiquidationEngine public engine;
    HelperConfig public helperConfig;

    function setUp() public {
        deployer = new DeployLendingPool();
        (pool, positionManager, oracle, engine, helperConfig) = deployer.run();
    }

    function testDeployment() public view {
        assert(address(pool) != address(0));
        assert(address(positionManager) != address(0));
        assert(address(oracle) != address(0));
        assert(address(engine) != address(0));
        assertEq(address(positionManager.I_PRICE_ORACLE()), address(oracle));
    }

    function testOracleFeedsSet() public view {
        HelperConfig.NetworkConfig memory activeConfig = helperConfig.getActiveNetworkConfig();
        assert(oracle.sPriceFeeds(activeConfig.weth) != address(0));
        assert(oracle.sPriceFeeds(activeConfig.wbtc) != address(0));
    }
}

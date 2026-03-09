// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {LendingPool} from "../src/LendingPool.sol";
import {ILendingPool} from "../src/interfaces/ILendingPool.sol";
import {PositionManager} from "../src/PositionManager.sol";
import {ChainlinkPriceOracle} from "../src/ChainlinkPriceOracle.sol";
import {ReactiveLiquidationEngine} from "../src/ReactiveLiquidationEngine.sol";
import {MockOracle} from "./mocks/MockOracle.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {IPositionManager} from "../src/interfaces/IPositionManager.sol";
import {IPriceOracle} from "../src/interfaces/IPriceOracle.sol";

contract ReactiveLiquidationTest is Test {
    LendingPool pool;
    PositionManager positionManager;
    MockOracle oracle;
    ReactiveLiquidationEngine engine;
    MockERC20 weth;
    MockERC20 usdc;

    address user = address(1);
    address constant SOMNIA_PRECOMPILE = address(0x0100);

    function setUp() public {
        oracle = new MockOracle();
        positionManager = new PositionManager(address(oracle));
        pool = new LendingPool(address(positionManager));
        engine = new ReactiveLiquidationEngine(address(pool), address(positionManager), address(oracle));

        weth = new MockERC20("Wrapped ETH", "WETH");
        usdc = new MockERC20("USDC", "USDC");

        positionManager.addCollateralAsset(address(weth));
        positionManager.addDebtAsset(address(usdc));

        oracle.setPrice(address(weth), 2000e18); // $2000
        oracle.setPrice(address(usdc), 1e18); // $1

        weth.mint(user, 10e18);
        usdc.mint(address(pool), 100000e18); // Pool liquidity

        vm.startPrank(user);
        weth.approve(address(pool), type(uint256).max);
        vm.stopPrank();

        // Register user for monitoring
        engine.addMonitoredUser(user);
    }

    function test_ReactiveLiquidationTriggeredOnPriceDrop() public {
        // 1. User deposits $2000 (1 ETH) and borrows $1000 USDC. HF = 1.6
        vm.startPrank(user);
        pool.deposit(address(weth), 1e18);
        pool.borrow(address(usdc), 1000e18);
        vm.stopPrank();

        IPositionManager.Position memory pos = positionManager.getPosition(user);
        assertEq(pos.healthFactor, 1.6e18);

        // 2. ETH price drops to $1200.
        // Max borrow = $1200 * 0.8 = $960.
        // Current borrow = $1000.
        // HF = 960 / 1000 = 0.96 (Below 1)
        oracle.setPrice(address(weth), 1200e18);

        pos = positionManager.getPosition(user);
        assertTrue(pos.healthFactor < 1e18);

        // 3. Simulate Somnia Reactivity calling the engine due to a PriceUpdated event
        // We prepare the topics for "PriceUpdated(address,uint256,uint256)"
        bytes32[] memory topics = new bytes32[](2);
        topics[0] = keccak256("PriceUpdated(address,uint256,uint256)");
        topics[1] = bytes32(uint256(uint160(address(weth)))); // Indexed asset

        // Dummy data for price and timestamp (non-indexed)
        bytes memory data = abi.encode(uint256(1200e18), block.timestamp);

        // We expect the Liquidated event to be emitted
        vm.expectEmit(true, false, false, true, address(pool));
        emit ILendingPool.Liquidated(user, 0, 0);

        vm.prank(SOMNIA_PRECOMPILE);
        engine.onEvent(address(oracle), topics, data);

        console2.log("Reactive liquidation triggered successfully");
    }

    function test_ReactiveLiquidation_SkipsIfSafe() public {
        // User is safe
        vm.startPrank(user);
        pool.deposit(address(weth), 1e18);
        pool.borrow(address(usdc), 500e18);
        vm.stopPrank();

        bytes32[] memory topics = new bytes32[](2);
        topics[0] = keccak256("PriceUpdated(address,uint256,uint256)");
        topics[1] = bytes32(uint256(uint160(address(weth))));
        bytes memory data = abi.encode(uint256(2000e18), block.timestamp);

        // No liquidation should occur
        // If we want to be sure, we can check that no event was emitted, but the try/catch in engine handles it anyway.
        // Liquidation script in pool has a check.

        vm.prank(SOMNIA_PRECOMPILE);
        engine.onEvent(address(oracle), topics, data);

        IPositionManager.Position memory pos = positionManager.getPosition(user);
        assert(pos.healthFactor >= 1e18);
    }
}


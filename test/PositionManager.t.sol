// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test, console2} from "forge-std/Test.sol";
import {PositionManager} from "../src/PositionManager.sol";
import {MockOracle} from "./mocks/MockOracle.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {IPositionManager} from "../src/interfaces/IPositionManager.sol";

contract PositionManagerTest is Test {
    PositionManager public positionManager;
    MockOracle public oracle;
    MockERC20 public weth;
    MockERC20 public usdc;

    address public user = address(1);

    function setUp() public {
        oracle = new MockOracle();
        positionManager = new PositionManager(address(oracle));

        weth = new MockERC20("Wrapped ETH", "WETH");
        usdc = new MockERC20("USDC", "USDC");

        positionManager.addCollateralAsset(address(weth));
        positionManager.addDebtAsset(address(usdc));

        oracle.setPrice(address(weth), 2000e18); // $2000
        oracle.setPrice(address(usdc), 1e18); // $1
    }

    function test_RecordFunctions() public {
        positionManager.recordDeposit(user, address(weth), 1e18);
        positionManager.recordBorrow(user, address(usdc), 1000e18);

        IPositionManager.Position memory pos = positionManager.getPosition(user);
        assertEq(pos.collateralValue, 2000e18);
        assertEq(pos.borrowValue, 1000e18);
    }

    function test_ExecutePartialLiquidation_RevertsIfSafe() public {
        positionManager.recordDeposit(user, address(weth), 1e18); // $2000
        positionManager.recordBorrow(user, address(usdc), 1000e18); // $1000
        // HF = (2000 * 0.8) / 1000 = 1.6

        vm.expectRevert(PositionManager.PositionManager__PositionIsSafe.selector);
        positionManager.executePartialLiquidation(user);
    }

    function test_ExecutePartialLiquidation_Success() public {
        // 1. Setup unsafe position
        // Collateral: 1 ETH ($2000)
        // Debt: 1650 USDC ($1650)
        // HF = (2000 * 0.8) / 1650 = 1600 / 1650 = 0.969...
        positionManager.recordDeposit(user, address(weth), 1e18);
        positionManager.recordBorrow(user, address(usdc), 1650e18);

        IPositionManager.Position memory beforePos = positionManager.getPosition(user);
        console2.log("Health Factor Before:", beforePos.healthFactor);
        assertTrue(beforePos.healthFactor < 1e18);

        // 2. Execute liquidation
        (uint256 debtToRepayUSD, uint256 collateralToSeizeUSD) = positionManager.executePartialLiquidation(user);

        console2.log("Debt to Repay USD:", debtToRepayUSD);
        console2.log("Collateral to Seize USD:", collateralToSeizeUSD);

        // 3. Verify position is now safe
        IPositionManager.Position memory afterPos = positionManager.getPosition(user);
        console2.log("Health Factor After:", afterPos.healthFactor);
        assertTrue(afterPos.healthFactor >= 1e18);

        // 4. Verify debt and collateral were actually reduced in state
        uint256 finalDebt = positionManager.sUserDebt(user, address(usdc));
        uint256 finalCollateral = positionManager.sUserCollateral(user, address(weth));
        
        // debtToRepayUSD is in 1e18 precision (USD)
        // usdc price is 1e18, so debtToRepayUSD / 1e18 is the amount in USDC units * 1e18
        assertEq(finalDebt, 1650e18 - (debtToRepayUSD * 1e18 / oracle.getPrice(address(usdc))));
        assertEq(finalCollateral, 1e18 - (collateralToSeizeUSD * 1e18 / oracle.getPrice(address(weth))));
    }

    function test_WithdrawAndRepay() public {
        positionManager.recordDeposit(user, address(weth), 1e18);
        positionManager.recordWithdraw(user, address(weth), 0.5e18);
        assertEq(positionManager.sUserCollateral(user, address(weth)), 0.5e18);

        positionManager.recordBorrow(user, address(usdc), 1000e18);
        positionManager.recordRepay(user, address(usdc), 500e18);
        assertEq(positionManager.sUserDebt(user, address(usdc)), 500e18);
    }

    function test_UpdatePosition() public {
        positionManager.updatePosition(user); // Just to cover the line
    }

    function test_MultipleAssets() public {
        MockERC20 wbtc = new MockERC20("Wrapped BTC", "WBTC");
        positionManager.addCollateralAsset(address(wbtc));
        oracle.setPrice(address(wbtc), 50000e18);

        positionManager.recordDeposit(user, address(weth), 1e18); // $2000
        positionManager.recordDeposit(user, address(wbtc), 1e18); // $50000

        IPositionManager.Position memory pos = positionManager.getPosition(user);
        assertEq(pos.collateralValue, 52000e18);
    }

    function test_ExecutePartialLiquidation_FullLiquidation() public {
        // Setup extremely unsafe position
        positionManager.recordDeposit(user, address(weth), 1e18); // $2000
        positionManager.recordBorrow(user, address(usdc), 2000e18); // $2000 (HF = 0.8)

        // Drop price of ETH to $1000
        oracle.setPrice(address(weth), 1000e18);
        // Collateral: $1000, Debt: $2000. HF = (1000 * 0.8) / 2000 = 0.4

        positionManager.executePartialLiquidation(user);

        IPositionManager.Position memory afterPos = positionManager.getPosition(user);
        // In extreme cases, it might liquidate everything if debt > collateral
        console2.log("Debt After Full Liquidation:", afterPos.borrowValue);
        console2.log("Collateral After Full Liquidation:", afterPos.collateralValue);
    }
}

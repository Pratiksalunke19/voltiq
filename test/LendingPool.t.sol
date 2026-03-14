// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test, console2} from "forge-std/Test.sol";
import {LendingPool} from "../src/LendingPool.sol";
import {PositionManager} from "../src/PositionManager.sol";
import {MockOracle} from "./mocks/MockOracle.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {IPositionManager} from "../src/interfaces/IPositionManager.sol";

contract LendingPoolTest is Test {
    LendingPool public pool;
    PositionManager public positionManager;
    MockOracle public oracle;
    MockERC20 public weth;
    MockERC20 public usdc;

    address public user = address(1);

    function setUp() public {
        oracle = new MockOracle();
        positionManager = new PositionManager(address(oracle));
        pool = new LendingPool(address(positionManager));

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
    }

    function testDeposit() public {
        vm.prank(user);
        pool.deposit(address(weth), 1e18);

        IPositionManager.Position memory pos = positionManager.getPosition(user);
        assertEq(pos.collateralValue, 2000e18);
        assertEq(pos.borrowValue, 0);
        assertEq(pos.healthFactor, type(uint256).max);
    }

    function testBorrow() public {
        vm.startPrank(user);
        pool.deposit(address(weth), 1e18); // $2000 collateral

        // Max borrow = $2000 * 0.8 = $1600
        pool.borrow(address(usdc), 1000e18); // $1000 borrow
        vm.stopPrank();

        IPositionManager.Position memory pos = positionManager.getPosition(user);
        assertEq(pos.borrowValue, 1000e18);
        // HF = (2000 * 0.8) / 1000 = 1.6
        assertEq(pos.healthFactor, 1.6e18);
    }

    function test_BorrowTooMuch_Reverts() public {
        vm.startPrank(user);
        pool.deposit(address(weth), 1e18); // $2000 collateral

        // Max borrow = $2000 * 0.8 = $1600
        vm.expectRevert(LendingPool.LendingPool__HealthFactorTooLow.selector);
        pool.borrow(address(usdc), 1601e18);
        vm.stopPrank();
    }

    function testRepay() public {
        vm.startPrank(user);
        pool.deposit(address(weth), 1e18);
        pool.borrow(address(usdc), 500e18);
        
        usdc.approve(address(pool), 500e18);
        pool.repay(address(usdc), 500e18);
        vm.stopPrank();

        IPositionManager.Position memory pos = positionManager.getPosition(user);
        assertEq(pos.borrowValue, 0);
    }

    function testWithdraw() public {
        vm.startPrank(user);
        pool.deposit(address(weth), 1e18);
        pool.withdraw(address(weth), 0.5e18);
        vm.stopPrank();

        IPositionManager.Position memory pos = positionManager.getPosition(user);
        assertEq(pos.collateralValue, 1000e18);
    }

    function test_WithdrawTooMuch_Reverts() public {
        vm.startPrank(user);
        pool.deposit(address(weth), 1e18);
        pool.borrow(address(usdc), 1000e18); // HF = 1.6

        // Withdrawing another 0.5 ETH would drop collateral to 0.5 ETH ($1000)
        // HF = (1000 * 0.8) / 1000 = 0.8 (Too low)
        vm.expectRevert(LendingPool.LendingPool__HealthFactorTooLow.selector);
        pool.withdraw(address(weth), 0.5e18);
        vm.stopPrank();
    }

    function test_Liquidate_RevertsIfSafe() public {
        vm.startPrank(user);
        pool.deposit(address(weth), 1e18);
        pool.borrow(address(usdc), 1000e18);
        vm.stopPrank();

        vm.expectRevert(LendingPool.LendingPool__PositionIsSafe.selector);
        pool.liquidate(user);
    }

    function test_Liquidate_Success() public {
        vm.startPrank(user);
        pool.deposit(address(weth), 1e18); // $2000
        pool.borrow(address(usdc), 1500e18); // $1500 (Limit $1600)
        vm.stopPrank();

        // Drop price to make it liquidatable
        oracle.setPrice(address(weth), 1800e18);
        // New Limit = (1800 * 0.8) = 1440. 1500 > 1440.
        // HF = 1440 / 1500 = 0.96

        pool.liquidate(user);

        IPositionManager.Position memory pos = positionManager.getPosition(user);
        assertTrue(pos.healthFactor >= 1e18);
    }
}

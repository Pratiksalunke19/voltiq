// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SomniaEventHandler} from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";
import {ILendingPool} from "./interfaces/ILendingPool.sol";
import {IPositionManager} from "./interfaces/IPositionManager.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReactiveLiquidationEngine
 * @notice An on-chain somnia event handler that triggers liquidations reactively.
 */
contract ReactiveLiquidationEngine is SomniaEventHandler, Ownable {
    // ERRORS
    error ReactiveLiquidationEngine__NotAuthorized();
    error ReactiveLiquidationEngine__Paused();

    // EVENTS
    event UserAddedToMonitoring(address indexed user);
    event UserRemovedFromMonitoring(address indexed user);
    event EnginePaused(bool isPaused);

    // STATE VARIABLES
    ILendingPool public immutable I_LENDING_POOL;
    IPositionManager public immutable I_POSITION_MANAGER;
    address public immutable I_PRICE_ORACLE;

    bool public sPaused;
    address[] public sMonitoredUsers;
    mapping(address => bool) private sIsMonitored;
    mapping(address => uint256) private sUserIndex; // To allow O(1) removal if needed

    // CONSTRUCTOR
    constructor(address _lendingPool, address _positionManager, address _priceOracle) Ownable(msg.sender) {
        I_LENDING_POOL = ILendingPool(_lendingPool);
        I_POSITION_MANAGER = IPositionManager(_positionManager);
        I_PRICE_ORACLE = _priceOracle;
    }

    // EXTERNAL FUNCTIONS
    function setPaused(bool paused) external onlyOwner {
        sPaused = paused;
        emit EnginePaused(paused);
    }

    function addMonitoredUser(address user) external {
        if (!sIsMonitored[user]) {
            sUserIndex[user] = sMonitoredUsers.length;
            sMonitoredUsers.push(user);
            sIsMonitored[user] = true;
            emit UserAddedToMonitoring(user);
        }
    }

    // INTERNAL FUNCTIONS
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata /* data */
    )
        internal
        override
    {
        if (sPaused) return;

        // 1. Verify Emitter is the Price Oracle
        if (emitter != I_PRICE_ORACLE) return;

        // 2. Verify it's a PriceUpdated event
        // keccak256("PriceUpdated(address,uint256,uint256)")
        if (eventTopics.length == 0 || eventTopics[0] != keccak256("PriceUpdated(address,uint256,uint256)")) return;

        // In a PriceUpdated event:
        // Topic 0: Sig
        // Topic 1: Asset address (indexed)
        // We could technically optimize further by only checking users holding this asset,
        // but for MVP we check the monitored pool as somnia handles high gas limits.

        uint256 length = sMonitoredUsers.length;
        for (uint256 i = 0; i < length; i++) {
            address user = sMonitoredUsers[i];
            IPositionManager.Position memory pos = I_POSITION_MANAGER.getPosition(user);

            if (pos.healthFactor < 1e18) {
                // Trigger liquidation
                try I_LENDING_POOL.liquidate(user) {} catch {}
            }
        }
    }
}

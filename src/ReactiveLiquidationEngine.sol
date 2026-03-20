// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

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
    event EnginePaused(bool isPaused);
    event DebugOnEvent(address emitter, bytes32 sig);
    event DebugUserChecked(address user, uint256 hf);
    event DebugOnEventStart(address emitter, uint256 topicsLength, bytes data);
    event DebugOnEventFailed(string reason, address emitter, bytes32 topics0);
    event DebugOnEventSuccess(address emitter, uint256 monitoredUsersCount);
    event DebugLiquidationTriggered(address user, uint256 healthFactor);

    // STATE VARIABLES
    ILendingPool public immutable I_LENDING_POOL;
    IPositionManager public immutable I_POSITION_MANAGER;
    address public immutable I_PRICE_ORACLE;

    bool public sPaused;
    address[] public sMonitoredUsers;
    mapping(address => bool) private sIsMonitored;
    mapping(address => uint256) private sUserIndex;

    // DEBUGGING ONLY: Add manual call for testing logic
    function manualOnEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) external {
        emit DebugOnEvent(emitter, eventTopics[0]);
        _onEvent(emitter, eventTopics, data);
    }

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
        bytes calldata data
    )
        internal
        override
    {
        emit DebugOnEventStart(emitter, eventTopics.length, data);

        if (sPaused) {
            emit DebugOnEventFailed("Paused", emitter, eventTopics.length > 0 ? eventTopics[0] : bytes32(0));
            return;
        }

        // 1. Verify Emitter is the Price Oracle
        if (emitter != I_PRICE_ORACLE) {
            emit DebugOnEventFailed("Not Price Oracle", emitter, eventTopics.length > 0 ? eventTopics[0] : bytes32(0));
            return;
        }

        // 2. Verify it's a PriceUpdated event
        // keccak256("PriceUpdated(address,uint256,uint256)")
        if (eventTopics.length == 0 || eventTopics[0] != keccak256("PriceUpdated(address,uint256,uint256)")) {
            emit DebugOnEventFailed("Not PriceUpdated or Empty Topics", emitter, eventTopics.length > 0 ? eventTopics[0] : bytes32(0));
            return;
        }

        // In a PriceUpdated event:
        // Topic 0: Sig
        // Topic 1: Asset address (indexed)
        // We could technically optimize further by only checking users holding this asset,
        // but for MVP we check the monitored pool as somnia handles high gas limits.

        emit DebugOnEvent(emitter, eventTopics[0]);

        uint256 length = sMonitoredUsers.length;
        emit DebugOnEventSuccess(emitter, length);

        for (uint256 i = 0; i < length; i++) {
            address user = sMonitoredUsers[i];
            
            // Adding a try-catch for getPosition to avoid reverting entire loop
            try I_POSITION_MANAGER.getPosition(user) returns (IPositionManager.Position memory pos) {
                emit DebugUserChecked(user, pos.healthFactor);

                if (pos.healthFactor < 1e18) {
                    // Trigger liquidation
                    emit DebugLiquidationTriggered(user, pos.healthFactor);
                    try I_LENDING_POOL.liquidate(user) {
                        // Success
                    } catch Error(string memory reason) {
                        emit DebugOnEventFailed(string(abi.encodePacked("Liquidation failed: ", reason)), emitter, eventTopics[0]);
                    } catch (bytes memory) {
                        emit DebugOnEventFailed("Liquidation reverted silently", emitter, eventTopics[0]);
                    }
                }
            } catch {
                emit DebugOnEventFailed("getPosition reverted", emitter, eventTopics[0]);
            }
        }
    }
}

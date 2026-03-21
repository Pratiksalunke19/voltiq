# Voltiq: Reactive Keeperless Liquidation Engine

Voltiq is a next-generation DeFi lending protocol built on **Somnia**. It leverages **On-Chain Reactivity** to eliminate the need for external liquidation bots (keepers), creating a self-healing and more secure financial infrastructure.

---

## 🚀 The Innovation: Keeperless Liquidation

Traditional lending protocols (Aave, Compound) rely on external "keeper" bots to monitor health factors and send liquidation transactions. This leads to MEV wars, delayed liquidations during congestion, and protocol insolvency risk.

**Voltiq solves this using Somnia's reactive execution:**
- **Event-Driven**: The protocol subscribes directly to Oracle price updates.
- **Automatic Execution**: When a price drop is detected, the `ReactiveLiquidationEngine` automatically triggers liquidations in the same reactive cycle.
- **Atomic Safety**: No external transaction or bot is required to maintain protocol solvency.

---

## 🏗️ System Architecture

### Core Smart Contracts (`src/`)
- **`LendingPool.sol`**: Manages deposits, borrows, repayments, and the liquidation entry point.
- **`PositionManager.sol`**: Tracks user collateral and debt across multiple assets. Calculates real-time Health Factors (HF).
- **`ChainlinkPriceOracle.sol`**: A wrapper for price feeds that emits the `PriceUpdated` events which trigger the reactive system.
- **`ReactiveLiquidationEngine.sol`**: The "Reactive Brain." It inherits from `SomniaEventHandler` and contains the logic to iterate through users and trigger liquidations when `HF < 1.0`.

### Interfaces (`src/interfaces/`)
- Standardized interfaces for the Pool, Position Manager, and Oracle to ensure modularity.

---

## 🛠️ Getting Started & Testing

The project uses a **Makefile** located in the `test/` directory to simplify interaction with the Somnia Testnet.

### Prerequisites
- [Foundry](https://book.getfoundry.sh/) installed.
- Valid `PRIVATE_KEY` and `SOMNIA_RPC_URL` in your `.env` file.

### Common Commands
```bash
# Add a user to the reactive monitoring list
make -C test add-monitor USER_ADDR=0x...

# Update the price of an asset (e.g., WETH) on the mock feed
make -C test set-price PRICE=150000000000

# Manually trigger the PriceUpdate event (Simulates a real Oracle update)
make -C test notify-update ASSET_ADDR=0x...

# Check a user's health factor and position
make -C test get-position USER_ADDR=0x...
```

---

## 📡 Subscription Management

Reactivity on Somnia requires a protocol-level subscription. 
- **Script**: `script/create_subscription.js`
- **Requirement**: The subscription owner must maintain a balance of at least **32 STT**.
- **Execution**: Reactive transactions are initiated by the system address `0x0100`.

---

## 💻 Tech Stack
- **Smart Contracts**: Solidity 0.8.30
- **Development Framework**: Foundry
- **Blockchain**: Somnia (Testnet)
- **Reactivity SDK**: `@somnia-chain/reactivity`
- **Frontend**: React + Ethers.js / Viem

---

## ⚖️ License
MIT

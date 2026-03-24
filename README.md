# Voltiq: The First Reactive, Keeperless Liquidation Engine on Somnia

Voltiq is a next-generation DeFi lending protocol built to push the boundaries of **Somnia's High-Performance Layer-1**. It leverages **On-Chain Reactivity** to eliminate the need for external liquidation bots (keepers), creating a self-healing, ultra-resilient financial infrastructure.

---

## ⚡ Somnia Power Features

Voltiq is designed specifically to utilize the unique capabilities of the Somnia network:

- **Native On-Chain Reactivity**: Unlike traditional protocols that rely on external keepers, Voltiq's `ReactiveLiquidationEngine` is hard-wired into the Somnia state machine. It triggers liquidations **instantly** in the same reactive cycle as a price update.
- **Keeperless Architecture**: No profit-driven bots (MEV) required. This ensures that protocol solvency is a first-class citizen of the network, not a side-effect of market incentives.
- **Sub-Second Protocol Sync**: Leveraging Somnia's rapid finality, user positions are synchronized and checked in real-time, allowing for massive scalability—even handling withdrawals and deposits of billions (e.g., 3.7B+ WETH) with atomic precision.
- **Shannon Explorer Integration**: Deeply integrated with the **Shannon Explorer** to provide transparent, real-time tracking of reactive events and automated protocol maintenance.
- **Automated Event Subscriptions**: Uses Somnia's protocol-level subscriptions to ensure the `ReactiveLiquidationEngine` is always active, powered by the system address `0x0100`.

---

## 🏗️ Technical Architecture

### Core Smart Contracts (`src/`)
- **`ReactiveLiquidationEngine.sol`**: The "Brain." It inherits from `SomniaEventHandler` and monitors the network for `PriceUpdated` events to execute automated liquidations.
- **`LendingPool.sol`**: The entry point for all user interactions (Supply, Borrow, Repay, Withdraw).
- **`PositionManager.sol`**: Tracks user internal state and calculates real-time Health Factors (HF) using 18-decimal precision to prevent rounding errors on massive balances.
- **`ChainlinkPriceOracle.sol`**: A high-speed oracle wrapper that emits the reactive triggers for the entire ecosystem.

---

## 🚀 Getting Started

The project uses a **Foundry-based** environment with a custom **Makefile** to interact with the Somnia Testnet.

### Prerequisites
- [Foundry](https://book.getfoundry.sh/) installed.
- Valid `PRIVATE_KEY` and `SOMNIA_RPC_URL` in your `.env` file.

### Common Commands
```bash
# Add a user to the reactive monitoring list
make -C test add-monitor USER_ADDR=0x...

# Update the price of an asset (e.g., WETH) to trigger the engine
make -C test set-price PRICE=250000000000

# Manually trigger the PriceUpdate event (Simulates a real Oracle update)
make -C test notify-update ASSET_ADDR=0x...
```

---

## 📡 Subscription Management

Reactivity on Somnia requires a protocol-level subscription managed via the STT token.
- **Requirement**: Maintain a minimum balance of **32 STT**.
- **System Actor**: All reactive liquidations are initiated by the Somnia System Address `0x0100`.

---

## 💻 Tech Stack
- **Blockchain**: Somnia (Testnet)
- **Reactivity SDK**: `@somnia-chain/reactivity`
- **Smart Contracts**: Solidity 0.8.30 (Optimized for Somnia)
- **Frontend**: React + Ethers.js
- **Design**: Premium Black/Accent Aesthetic with Reactive feedback loops.

---

## ⚖️ License
MIT

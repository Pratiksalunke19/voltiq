# Reactive Keeperless Liquidation Engine

*A DeFi Infrastructure Project Built Using Somnia Reactivity*

---

# 1. Project Overview

## Problem

Most DeFi lending protocols rely on **external bots (called keepers)** to monitor borrower positions and perform liquidations when collateral becomes unsafe.

Examples include protocols like Aave or Compound.

Typical liquidation flow:

1. A user deposits collateral and borrows an asset.
2. The market price of the collateral drops.
3. A liquidation bot detects the unsafe position.
4. The bot sends a transaction to liquidate the position.
5. The fastest bot wins the liquidation reward.

This design introduces several problems:

* **MEV competition** between bots
* **Delayed liquidation** when bots fail or are slow
* **Protocol insolvency risk** during rapid price crashes
* **Gas wars** that increase transaction costs
* **Centralization risk** because only advanced bots compete effectively

---

## Solution

This project builds a **Keeperless Liquidation Engine** using **reactive smart contract execution**.

Instead of relying on external bots, the protocol itself continuously reacts to state changes.

When a user's position becomes unsafe:

* The protocol **detects it automatically**
* Liquidation **executes instantly**
* No external bot or transaction is required

This creates a **self-enforcing lending protocol**.

---

# 2. Core Idea

Reactive execution enables smart contracts to automatically run when certain events occur.

For example:

```
Price Update → Recalculate Health Factor → Liquidate if Unsafe
```

Instead of this traditional flow:

```
Price Update
↓
Bot Detects Risk
↓
Bot Sends Liquidation Transaction
```

The reactive system becomes the **built-in liquidation watcher**.

---

# 3. System Architecture

The protocol consists of the following core modules.

---

## 3.1 Lending Pool Contract

Responsible for core lending functionality.

### Responsibilities

* Accept collateral deposits
* Allow borrowing against collateral
* Track user positions
* Handle repayments
* Allow collateral withdrawals

### Key Data Stored

For each user:

```
Collateral Amount
Borrow Amount
Collateral Asset Price
Health Factor
```

---

## 3.2 Price Oracle

Provides real-time price data for assets used as collateral.

The oracle feeds price updates into the protocol.

Example data:

```
ETH Price
BTC Price
Stablecoin Price
```

Each price update triggers the reactive system.

---

## 3.3 Reactive Liquidation Engine

This is the **core innovation of the project**.

The liquidation engine subscribes to events such as:

* Price updates
* Borrow operations
* Collateral deposits
* Repayments

Whenever any of these events occur, the engine recalculates the **health factor** of affected positions.

If the health factor becomes unsafe:

```
Health Factor < 1
```

The system executes liquidation immediately.

---

## 3.4 Treasury Contract

The protocol treasury receives:

* liquidation fees
* protocol fees
* interest spread

Treasury funds may later support:

* insurance pools
* liquidity stabilization
* protocol upgrades

---

## 3.5 Risk Engine

The risk engine calculates borrower health.

Health factor formula:

```
Health Factor =
(Collateral Value × Liquidation Threshold)
÷ Borrowed Value
```

Example:

```
Collateral = $1000
Borrowed = $700
Liquidation Threshold = 80%

Health Factor =
(1000 × 0.8) / 700
= 1.14
```

If health factor falls below **1**, liquidation occurs.

---

# 4. Key Features

---

## 4.1 Keeperless Liquidation

Liquidation happens automatically.

No external bots required.

Benefits:

* No liquidation race
* Reduced MEV
* Instant response to price changes
* Improved protocol safety

---

## 4.2 Partial Liquidation Optimization

Instead of liquidating large portions of collateral, the protocol calculates the **minimum amount required** to restore safety.

Example:

```
Borrow = $1000
Collateral = $1200
HF falls below threshold

Liquidate only enough to restore HF > 1
```

Benefits:

* Reduces borrower losses
* Limits market impact

---

## 4.3 Cascade Protection System

Large market crashes can trigger many liquidations at once.

To prevent cascading liquidations, the protocol includes:

* liquidation throttling
* temporary liquidation limits
* reactive volatility detection

---

## 4.4 Predictive Risk Alerts

The system emits warnings before liquidation occurs.

Example thresholds:

```
HF < 1.3 → Warning
HF < 1.15 → Critical Warning
HF < 1.05 → Imminent Liquidation
```

These alerts allow users to:

* add collateral
* repay loans

before liquidation occurs.

---

## 4.5 Real-Time Risk Dashboard

A frontend dashboard visualizes protocol health.

Displays:

* user positions
* health factors
* liquidation risk
* system risk metrics
* protocol TVL
* liquidation history

---

# 5. Development Stages

The project will be built in progressive stages.

---

# Stage 1 — Protocol Design

Define core system parameters:

* collateral types
* borrow assets
* liquidation thresholds
* interest model
* oracle structure

Deliverables:

* system architecture diagram
* contract interface definitions
* risk model specification

---

# Stage 2 — Core Lending Smart Contracts

Implement base lending functionality.

Contracts built:

* LendingPool
* PositionManager
* DebtAccounting

Features:

* deposit collateral
* borrow assets
* repay loans
* withdraw collateral

---

# Stage 3 — Oracle Integration

Build a price oracle module.

For MVP:

* simulated price feed

Later:

* integrate decentralized oracle sources

The oracle emits price update events.

---

# Stage 4 — Reactive Liquidation Engine

Implement the reactive module.

Responsibilities:

* subscribe to oracle updates
* monitor health factors
* trigger liquidation automatically

This stage demonstrates the **core innovation**.

---

# Stage 5 — Partial Liquidation Logic

Enhance liquidation efficiency.

Algorithm calculates:

```
Minimum collateral required to restore safe health factor
```

Prevents excessive liquidation.

---

# Stage 6 — Risk Monitoring System

Build advanced risk logic.

Includes:

* cascade detection
* volatility alerts
* system risk indicators

---

# Stage 7 — Frontend Dashboard

Develop user interface.

Dashboard includes:

* wallet position
* borrow status
* health factor meter
* liquidation alerts
* protocol statistics

---

# Stage 8 — Stress Testing & Simulation

Simulate extreme scenarios:

* rapid price crashes
* multiple simultaneous liquidations
* oracle update bursts

Goal:

Ensure protocol remains solvent under stress.

---

# 6. Technology Stack

---

## Smart Contracts

Language:

```
Solidity
```

Framework:

```
Foundry
```

Purpose:

* contract development
* automated testing
* deployment

---

## Blockchain Platform

```
Somnia
```

Used for:

* reactive smart contract execution
* event-based contract triggers

---

## Frontend

Framework:

```
React
```

Libraries:

```
Ethers.js
or
Viem
```

Used for:

* wallet interaction
* contract calls
* real-time dashboard updates

---

## Backend (Optional)

Minimal backend may be used for:

* indexing events
* analytics aggregation

Possible tools:

```
Node.js
GraphQL
The Graph
```

---

## Development Tools

Testing:

```
Foundry Tests
```

Simulation:

```
Custom price simulation scripts
```

Deployment:

```
Foundry scripts
```

Version control:

```
Git
GitHub
```

---

# 7. Security Considerations

Key security risks:

### Oracle Manipulation

If attackers manipulate price feeds, they could trigger false liquidations.

Mitigation:

* use reliable oracle feeds
* implement price sanity checks

---

### Liquidation Loops

Recursive liquidation triggers must be prevented.

Mitigation:

* event throttling
* execution guards

---

### Flash Loan Attacks

Borrowers could manipulate collateral value temporarily.

Mitigation:

* time-weighted price feeds
* delayed liquidation triggers

---

# 8. Future Extensions

Potential improvements:

* multi-collateral support
* cross-protocol liquidation monitoring
* liquidation insurance pool
* dynamic liquidation penalties
* autonomous treasury stabilization

---

# 9. Expected Impact

This system improves DeFi lending by:

* removing keeper dependencies
* reducing MEV extraction
* improving liquidation speed
* strengthening protocol safety
* enabling autonomous financial infrastructure

The result is a **fully reactive lending protocol** where risk management happens automatically.

---

# 10. Summary

This project builds a **keeperless liquidation engine** powered by reactive smart contract execution.

Instead of relying on off-chain bots, the protocol itself detects risk and performs liquidation automatically.

Key innovations include:

* reactive liquidation
* partial liquidation optimization
* cascade protection
* predictive risk alerts
* real-time risk dashboard

The system demonstrates how **reactive blockchain execution can improve DeFi protocol safety and efficiency**.

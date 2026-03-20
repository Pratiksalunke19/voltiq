#!/bin/bash
set -e

source .env

echo "🚀 Starting manual deployment to Somnia..."

# 1. Deploy Mocks
echo "Deploying WETH Mock..."
WETH_OUT=$(forge create test/mocks/MockERC20.sol:MockERC20 --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy --json --broadcast --constructor-args "Wrapped ETH" "WETH")
WETH_ADDR=$(echo $WETH_OUT | jq -r .deployedTo)
echo "WETH: $WETH_ADDR"

echo "Deploying WBTC Mock..."
WBTC_OUT=$(forge create test/mocks/MockERC20.sol:MockERC20 --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy --json --broadcast --constructor-args "Wrapped BTC" "WBTC")
WBTC_ADDR=$(echo $WBTC_OUT | jq -r .deployedTo)
echo "WBTC: $WBTC_ADDR"

echo "Deploying USDC Mock..."
USDC_OUT=$(forge create test/mocks/MockERC20.sol:MockERC20 --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy --json --broadcast --constructor-args "USD Coin" "USDC")
USDC_ADDR=$(echo $USDC_OUT | jq -r .deployedTo)
echo "USDC: $USDC_ADDR"

echo "Deploying ETH/USD Feed Mock..."
ETH_FEED_OUT=$(forge create test/mocks/MockChainlinkAggregator.sol:MockChainlinkAggregator --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy --json --broadcast --constructor-args 200000000000 8)
ETH_FEED=$(echo $ETH_FEED_OUT | jq -r .deployedTo)
echo "ETH FEED: $ETH_FEED"

echo "Deploying BTC/USD Feed Mock..."
BTC_FEED_OUT=$(forge create test/mocks/MockChainlinkAggregator.sol:MockChainlinkAggregator --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy --json --broadcast --constructor-args 6000000000000 8)
BTC_FEED=$(echo $BTC_FEED_OUT | jq -r .deployedTo)
echo "BTC FEED: $BTC_FEED"

echo "Deploying USDC/USD Feed Mock..."
USDC_FEED_OUT=$(forge create test/mocks/MockChainlinkAggregator.sol:MockChainlinkAggregator --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy --json --broadcast --constructor-args 100000000 8)
USDC_FEED=$(echo $USDC_FEED_OUT | jq -r .deployedTo)
echo "USDC FEED: $USDC_FEED"

# 2. Deploy Oracle
echo "Deploying Price Oracle..."
ORACLE_OUT=$(forge create src/ChainlinkPriceOracle.sol:ChainlinkPriceOracle --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy --json --broadcast)
ORACLE_ADDR=$(echo $ORACLE_OUT | jq -r .deployedTo)
echo "ORACLE: $ORACLE_ADDR"

# 3. Setup Oracle
echo "Setting up Oracle feeds..."
cast send $ORACLE_ADDR "setPriceFeed(address,address)" $WETH_ADDR $ETH_FEED --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy
cast send $ORACLE_ADDR "setPriceFeed(address,address)" $WBTC_ADDR $BTC_FEED --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy
cast send $ORACLE_ADDR "setPriceFeed(address,address)" $USDC_ADDR $USDC_FEED --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy

# 4. Deploy Position Manager
echo "Deploying Position Manager..."
PM_OUT=$(forge create src/PositionManager.sol:PositionManager --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy --json --broadcast --constructor-args $ORACLE_ADDR)
PM_ADDR=$(echo $PM_OUT | jq -r .deployedTo)
echo "PM: $PM_ADDR"

# 5. Setup PM
echo "Adding assets to PM..."
cast send $PM_ADDR "addCollateralAsset(address)" $WETH_ADDR --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy
cast send $PM_ADDR "addCollateralAsset(address)" $WBTC_ADDR --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy
cast send $PM_ADDR "addDebtAsset(address)" $USDC_ADDR --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy

# 6. Deploy Lending Pool
echo "Deploying Lending Pool..."
POOL_OUT=$(forge create src/LendingPool.sol:LendingPool --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy --json --broadcast --constructor-args $PM_ADDR)
POOL_ADDR=$(echo $POOL_OUT | jq -r .deployedTo)
echo "POOL: $POOL_ADDR"

# 7. Deploy Reactive Engine
echo "Deploying Reactive Liquidation Engine..."
ENGINE_OUT=$(forge create src/ReactiveLiquidationEngine.sol:ReactiveLiquidationEngine --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy --json --broadcast --constructor-args $POOL_ADDR $PM_ADDR $ORACLE_ADDR)
ENGINE_ADDR=$(echo $ENGINE_OUT | jq -r .deployedTo)
echo "ENGINE: $ENGINE_ADDR"

echo "✅ All contracts deployed successfully!"
echo "WETH: $WETH_ADDR"
echo "WBTC: $WBTC_ADDR"
echo "USDC: $USDC_ADDR"
echo "ORACLE: $ORACLE_ADDR"
echo "PM: $PM_ADDR"
echo "POOL: $POOL_ADDR"
echo "ENGINE: $ENGINE_ADDR"

# Save to a file for later sync
echo "{\"WETH\":\"$WETH_ADDR\",\"WBTC\":\"$WBTC_ADDR\",\"USDC\":\"$USDC_ADDR\",\"ORACLE\":\"$ORACLE_ADDR\",\"PositionManager\":\"$PM_ADDR\",\"LendingPool\":\"$POOL_ADDR\",\"ReactiveLiquidationEngine\":\"$ENGINE_ADDR\"}" > deployed_addresses.json

# AUTOMATION: Sync to frontend
node script/sync_somnia.js

echo "🚀 Frontend is now synced with latest addresses!
Don't forget to mint USDC to LendingPool and add user to MonitoredUsers!"

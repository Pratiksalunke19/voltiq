#!/bin/bash
source .env

# RESUMING FROM PREVIOUS SUCCESSFUL ASSETS
WETH_ADDR="0x941985AaA752B6B2E9873D79d132DEdD8d495889"
WBTC_ADDR="0x04d875D0cf20f3981b273963b091106A1196efF2"
USDC_ADDR="0x43869C43181EF46821dCFF8Ab950eF3c3eb067DB"
ETH_FEED="0x8bDEdbCf242c16132daC07beE21f05a8A172288d"
BTC_FEED="0x42E54fd63B2f54A9Ab3BD23F405629910E146a3a"
USDC_FEED="0xbD76f823884Dcd3Bf40bf9c19AA2dcd03127C6fE"
ORACLE_ADDR="0xC4Ac805330687b2347636f1fFFCA11D796c462855"
PM_ADDR="0x4CFf60920A25deB3CC67129F7f4E81AeAC135962"

echo "🚀 Resuming deployment to Somnia..."

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

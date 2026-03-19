const { createPublicClient, createWalletClient, http, parseEther, parseUnits, getAddress, decodeEventLog } = require('viem');
const { somniaTestnet } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ABIS = {
    MockERC20: [
        { "inputs": [{ "name": "to", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }
    ],
    LendingPool: [
        { "inputs": [{ "name": "asset", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "deposit", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [{ "name": "asset", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "borrow", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "anonymous": false, "inputs": [{ "indexed": true, "name": "user", "type": "address" }, { "indexed": false, "name": "collateralLiquidatedUSD", "type": "uint256" }, { "indexed": false, "name": "debtCoveredUSD", "type": "uint256" }], "name": "Liquidated", "type": "event" }
    ],
    PositionManager: [
        { "inputs": [{ "name": "user", "type": "address" }], "name": "getPosition", "outputs": [{ "components": [{ "name": "collateralValue", "type": "uint256" }, { "name": "borrowValue", "type": "uint256" }, { "name": "healthFactor", "type": "uint256" }], "name": "", "type": "tuple" }], "stateMutability": "view", "type": "function" }
    ],
    ReactiveLiquidationEngine: [
        { "inputs": [{ "name": "user", "type": "address" }], "name": "addMonitoredUser", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
    ],
    ChainlinkPriceOracle: [
        { "inputs": [{ "name": "asset", "type": "address" }], "name": "notifyPriceUpdate", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
    ]
};

async function main() {
    const deployedAddressesPath = path.join(__dirname, '../deployed_addresses.json');
    const contracts = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
    
    const privateKey = `0x${process.env.PRIVATE_KEY.replace('0x', '')}`;
    const account = privateKeyToAccount(privateKey);
    const client = createPublicClient({ chain: somniaTestnet, transport: http() });
    const wallet = createWalletClient({ account, chain: somniaTestnet, transport: http() });

    // 0. Provide Liquidity to the Pool (USDC)
    console.log("Step 0: Providing USDC liquidity to the pool...");
    const mintUsdcTx = await wallet.writeContract({
        address: getAddress(contracts.USDC),
        abi: ABIS.MockERC20,
        functionName: 'mint',
        args: [account.address, parseEther('100000')]
    });
    await client.waitForTransactionReceipt({ hash: mintUsdcTx });

    const approveUsdcTx = await wallet.writeContract({
        address: getAddress(contracts.USDC),
        abi: ABIS.MockERC20,
        functionName: 'approve',
        args: [getAddress(contracts.LendingPool), parseEther('100000')]
    });
    await client.waitForTransactionReceipt({ hash: approveUsdcTx });

    const depositUsdcTx = await wallet.writeContract({
        address: getAddress(contracts.LendingPool),
        abi: ABIS.LendingPool,
        functionName: 'deposit',
        args: [getAddress(contracts.USDC), parseEther('100000')]
    });
    await client.waitForTransactionReceipt({ hash: depositUsdcTx });

    // 1. Setup Position
    console.log("Step 1: Minting and Depositing WETH collateral...");
    const mintTx = await wallet.writeContract({
        address: getAddress(contracts.WETH),
        abi: ABIS.MockERC20,
        functionName: 'mint',
        args: [account.address, parseEther('10')]
    });
    await client.waitForTransactionReceipt({ hash: mintTx });

    const approveTx = await wallet.writeContract({
        address: getAddress(contracts.WETH),
        abi: ABIS.MockERC20,
        functionName: 'approve',
        args: [getAddress(contracts.LendingPool), parseEther('10')]
    });
    await client.waitForTransactionReceipt({ hash: approveTx });

    const depositTx = await wallet.writeContract({
        address: getAddress(contracts.LendingPool),
        abi: ABIS.LendingPool,
        functionName: 'deposit',
        args: [getAddress(contracts.WETH), parseEther('10')]
    });
    await client.waitForTransactionReceipt({ hash: depositTx });

    console.log("Step 2: Borrowing USDC debt...");
    const borrowTx = await wallet.writeContract({
        address: getAddress(contracts.LendingPool),
        abi: ABIS.LendingPool,
        functionName: 'borrow',
        args: [getAddress(contracts.USDC), parseEther('15000')] // USDC Mock has 18 decimals
    });
    // Let's check decimals or just use 18.
    await client.waitForTransactionReceipt({ hash: borrowTx });

    console.log("Step 3: Adding user to Monitoring...");
    const monitorTx = await wallet.writeContract({
        address: getAddress(contracts.ReactiveLiquidationEngine),
        abi: ABIS.ReactiveLiquidationEngine,
        functionName: 'addMonitoredUser',
        args: [account.address]
    });
    await client.waitForTransactionReceipt({ hash: monitorTx });

    console.log("Step 4: Checking Health Factor...");
    const pos = await client.readContract({
        address: getAddress(contracts.PositionManager),
        abi: ABIS.PositionManager,
        functionName: 'getPosition',
        args: [account.address]
    });
    console.log(`Health Factor: ${Number(pos.healthFactor) / 1e18}`);

    console.log("\n--- READY FOR REACIVITY TEST ---");
    console.log("Next steps (Manual or Scripted):");
    console.log("1. Drop WETH price using cast (to e.g. $1400)");
    console.log(`2. Trigger: cast send ${contracts.ORACLE} "notifyPriceUpdate(address)" ${contracts.WETH} --rpc-url $SOMNIA_RPC_URL --private-key $PRIVATE_KEY --legacy`);
    console.log("3. Wait 5-10 seconds for the reactive callback.");
    console.log("4. Check getPosition again to see if values changed.");
}

main().catch(console.error);

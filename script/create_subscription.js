const { SDK } = require('@somnia-chain/reactivity');
const { somniaTestnet } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');
const { createPublicClient, createWalletClient, http, parseGwei, getAddress, keccak256, toBytes } = require('viem');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
    console.log('🔧 Initializing Somnia Reactivity Creation...');

    const deployedAddressesPath = path.join(__dirname, '../deployed_addresses.json');
    if (!fs.existsSync(deployedAddressesPath)) {
        console.error("❌ deployed_addresses.json not found. Run deployment script first.");
        return;
    }
    const contracts = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
    
    const handlerAddr = getAddress(contracts.ReactiveLiquidationEngine);
    const oracleAddr = getAddress(contracts.ORACLE);

    if (!handlerAddr || !oracleAddr) {
        console.error("❌ Addresses not found in deployed_addresses.json");
        return;
    }

    const privateKey = `0x${process.env.PRIVATE_KEY.replace('0x', '')}`;
    const account = privateKeyToAccount(privateKey);
    console.log('👤 Account:', account.address);

    const publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: http()
    });

    const sdk = new SDK({
        public: publicClient,
        wallet: createWalletClient({
            account: account,
            chain: somniaTestnet,
            transport: http(),
        })
    });

    // 💰 Balance check (MANDATORY: 32 STT minimum)
    const balance = await publicClient.getBalance({ address: account.address });
    const balanceSTT = Number(balance) / 1e18;
    console.log(`💰 Balance: ${balanceSTT.toFixed(4)} STT`);
    if (balanceSTT < 32) {
        console.error('❌ Minimum 32 STT required to own a subscription');
        return;
    }

    // keccak256("PriceUpdated(address,uint256,uint256)")
    const priceUpdatedSig = keccak256(toBytes("PriceUpdated(address,uint256,uint256)"));
    console.log('🔔 Event Signature:', priceUpdatedSig);

    const subData = {
        handlerContractAddress: handlerAddr,
        emitter: oracleAddr,
        eventTopics: [priceUpdatedSig],
        priorityFeePerGas: parseGwei('2'),
        maxFeePerGas: parseGwei('10'),
        gasLimit: 3000000n, // Increased for liquidation logic
        isGuaranteed: true,  // Retry on failure (Pattern from successful project)
        isCoalesced: false,
    };

    console.log(`\n🚀 Creating Solidity Subscription...`);
    console.log(JSON.stringify(subData, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

    const txHash = await sdk.createSoliditySubscription(subData);
    
    if (txHash instanceof Error) {
        throw txHash;
    }

    console.log('✅ Subscription transaction sent! Tx:', txHash);
    console.log(`🔍 Explorer: https://shannon-explorer.somnia.network/tx/${txHash}`);
    
    console.log('⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash,
        confirmations: 1
    });

    console.log('✅ Confirmed in block:', receipt.blockNumber);

    // Extract subscription ID from logs
    // Log format: SubscriptionCreated(address indexed owner, uint64 indexed subscriptionId, ...)
    try {
        const log = receipt.logs[0];
        if (log && log.topics[2]) {
            const subscriptionId = BigInt(log.topics[2]).toString();
            console.log('\n📌 SUCCESS! SUBSCRIPTION ID:', subscriptionId);
            
            // Verify with SDK
            const info = await sdk.getSubscriptionInfo(BigInt(subscriptionId));
            if (!(info instanceof Error)) {
                console.log('📋 Verified Subscription Status: ACTIVE');
            }
        } else {
            console.log('⚠️ Could not extract subscription ID from logs, but transaction succeeded.');
        }
    } catch (err) {
        console.warn('⚠️ Error extracting subscription ID:', err.message);
    }
}

main().catch((err) => {
    console.error('❌ Script failed');
    console.error(err);
});

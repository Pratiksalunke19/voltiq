const { SDK } = require('@somnia-chain/reactivity');
const { somniaTestnet } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');
const { createPublicClient, createWalletClient, http, parseGwei, getAddress } = require('viem');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
    const deployedAddressesPath = path.join(__dirname, '../deployed_addresses.json');
    if (!fs.existsSync(deployedAddressesPath)) {
        console.error("deployed_addresses.json not found. Run deployment script first.");
        return;
    }
    const contracts = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
    
    const handlerAddr = getAddress(contracts.ReactiveLiquidationEngine);
    const oracleAddr = getAddress(contracts.ORACLE);

    if (!handlerAddr || !oracleAddr) {
        console.error("Addresses not found in deployed_addresses.json");
        return;
    }

    const privateKey = `0x${process.env.PRIVATE_KEY.replace('0x', '')}`;
    const sdk = new SDK({
        public: createPublicClient({
            chain: somniaTestnet,
            transport: http()
        }),
        wallet: createWalletClient({
            account: privateKeyToAccount(privateKey),
            chain: somniaTestnet,
            transport: http(),
        })
    });

    // keccak256("PriceUpdated(address,uint256,uint256)")
    const priceUpdatedSig = '0xb556fac599c3c70efb9ab1fa725ecace6c81cc48d1455f886607def065f3e0c0';

    const subData = {
        handlerContractAddress: handlerAddr,
        emitter: oracleAddr,
        eventTopics: [priceUpdatedSig],
        priorityFeePerGas: parseGwei('20'),
        maxFeePerGas: parseGwei('100'),
        gasLimit: 1000000n, // Liquidations can be gas heavy
        isGuaranteed: true,
        isCoalesced: false,
    };

    console.log(`Creating Solidity Subscription for:`);
    console.log(`- Handler: ${handlerAddr}`);
    console.log(`- Emitter: ${oracleAddr}`);

    const res = await sdk.createSoliditySubscription(subData);
    
    if (res instanceof Error) {
        console.error('Creation failed:', res.message);
    } else {
        console.log('Subscription creation transaction sent! Tx:', res);
        console.log('Waiting for confirmation...');
        const receipt = await sdk.viem.waitForTransaction(res);
        console.log(`Succeeded! Status: ${receipt.status}`);
        
        // Subscription ID is usually in the logs.
        // For Somnia, it's often the first log of the registry interaction.
        console.log('Subscription is now active.');
    }
}

main().catch(console.error);

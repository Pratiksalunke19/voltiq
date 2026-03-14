const fs = require('fs');
const path = require('path');

function syncSomnia() {
    const deployedAddressesPath = path.join(__dirname, '../deployed_addresses.json');
    const outDir = path.join(__dirname, '../out');
    const frontendDest = path.join(__dirname, '../frontend/src/contracts.ts');

    if (!fs.existsSync(deployedAddressesPath)) {
        console.error("deployed_addresses.json not found.");
        process.exit(1);
    }

    const contracts = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
    const abis = {};

    // Map contract addresses to their base names for ABI fetching
    const contractNameMap = {
        "WETH": "MockERC20",
        "WBTC": "MockERC20",
        "USDC": "MockERC20",
        "ORACLE": "ChainlinkPriceOracle",
        "PositionManager": "PositionManager",
        "LendingPool": "LendingPool",
        "ReactiveLiquidationEngine": "ReactiveLiquidationEngine"
    };

    Object.keys(contracts).forEach(key => {
        const contractName = contractNameMap[key];
        if (contractName && !abis[contractName]) {
            const abiPath = path.join(outDir, `${contractName}.sol`, `${contractName}.json`);
            if (fs.existsSync(abiPath)) {
                abis[contractName] = JSON.parse(fs.readFileSync(abiPath, 'utf8')).abi;
            } else {
                console.warn(`ABI not found for ${contractName} at ${abiPath}`);
            }
        }
    });

    // Also add MockChainlinkAggregator ABI as it might be needed
    if (!abis["MockChainlinkAggregator"]) {
        const abiPath = path.join(outDir, `MockChainlinkAggregator.sol`, `MockChainlinkAggregator.json`);
        if (fs.existsSync(abiPath)) {
            abis["MockChainlinkAggregator"] = JSON.parse(fs.readFileSync(abiPath, 'utf8')).abi;
        }
    }

    const fileContent = `
// Auto-generated file from Somnia deployment
export const CONTRACT_ADDRESSES = ${JSON.stringify(contracts, null, 2)};

export const ABIS = ${JSON.stringify(abis, null, 2)};
`;

    fs.writeFileSync(frontendDest, fileContent);
    console.log('Successfully synced Somnia contracts and ABIs to frontend/src/contracts.ts');
}

syncSomnia();

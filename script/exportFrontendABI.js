const fs = require('fs');
const path = require('path');

function exportFrontendData() {
    const broadcastDir = path.join(__dirname, '../broadcast/DeployLendingPool.s.sol');
    const outDir = path.join(__dirname, '../out');
    const frontendDest = path.join(__dirname, '../frontend/src/contracts.ts');

    // Find latest run on Somnia chain id (50312)
    const runFilePath = path.join(broadcastDir, '50312', 'run-latest.json');
    if (!fs.existsSync(runFilePath)) {
        console.error("No deployment found at", runFilePath);
        process.exit(1);
    }

    const runData = JSON.parse(fs.readFileSync(runFilePath, 'utf8'));
    
    const contracts = {};
    const abis = {};

    runData.transactions.forEach((tx) => {
        if (tx.transactionType === 'CREATE' && tx.contractName) {
            let key = tx.contractName;
            
            // Special handling for multiple MockERC20 instances
            if (key === 'MockERC20' && tx.arguments && tx.arguments[1]) {
                key = tx.arguments[1]; // Use symbol (WETH, USDC, WBTC)
            }
            
            contracts[key] = tx.contractAddress;
            
            // Fetch ABI (only need one ABI per contract name)
            if (!abis[tx.contractName]) {
                const abiPath = path.join(outDir, `${tx.contractName}.sol`, `${tx.contractName}.json`);
                if (fs.existsSync(abiPath)) {
                    abis[tx.contractName] = JSON.parse(fs.readFileSync(abiPath, 'utf8')).abi;
                }
            }
        }
    });

    const fileContent = `
// Auto-generated file from deployment
export const CONTRACT_ADDRESSES = ${JSON.stringify(contracts, null, 2)};

export const ABIS = ${JSON.stringify(abis, null, 2)};
`;

    fs.writeFileSync(frontendDest, fileContent);
    console.log('Successfully exported contracts and ABIs to frontend/src/contracts.ts');
}

exportFrontendData();

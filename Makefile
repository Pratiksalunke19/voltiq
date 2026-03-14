-include .env

.PHONY: deploy sync mint setup

RPC_URL := http://localhost:8545

# Deploys contracts to local anvil
deploy:
	@echo "Deploying contracts..."
	@forge script script/DeployLendingPool.s.sol --rpc-url $(RPC_URL) --broadcast --private-key $(PRIVATE_KEY)

# Syncs ABIs and Addresses to the frontend
sync:
	@echo "Syncing ABIs to frontend..."
	@node script/exportFrontendABI.js

# Mint 100 WETH to a specific address. Usage: make mint ADDR=0x...
mint:
	@if [ -z "$(ADDR)" ]; then echo "Error: ADDR is not set. Usage: make mint ADDR=0x..."; exit 1; fi
	@echo "Fetching WETH contract address from latest deployment..."
	@WETH_ADDR=$$(node -e "\
		const fs=require('fs'); \
		const path=require('path'); \
		const broadcastDir='broadcast/DeployLendingPool.s.sol'; \
		const dirs=fs.readdirSync(broadcastDir).filter(d => fs.statSync(path.join(broadcastDir, d)).isDirectory()); \
		let latestTime=0; let latestFile=''; \
		dirs.forEach(d => { \
			const f=path.join(broadcastDir, d, 'run-latest.json'); \
			if(fs.existsSync(f)) { \
				const t=fs.statSync(f).mtimeMs; \
				if(t > latestTime) { latestTime=t; latestFile=f; } \
			} \
		}); \
		if(!latestFile) { console.error('No deployment found'); process.exit(1); } \
		const run=JSON.parse(fs.readFileSync(latestFile)); \
		const tx=run.transactions.find(t => t.contractName === 'MockERC20' && t.arguments && t.arguments[1] === 'WETH'); \
		if(!tx) { console.error('WETH contract not found in ' + latestFile); process.exit(1); } \
		console.log(tx.contractAddress)"); \
	echo "Minting 100 WETH to $(ADDR) using contract at $$WETH_ADDR..."; \
	cast send $$WETH_ADDR "mint(address,uint256)" $(ADDR) 100000000000000000000 --rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY)

# Full setup: Deploy, Sync, and Mint
setup: deploy sync
	@echo "Setup complete. Don't forget to run 'make mint ADDR=<your_address>'"

# Deploy to Somnia Testnet
deploy-somnia:
	@chmod +x deploy_somnia.sh
	@./deploy_somnia.sh
# mint some balance to lending pool

# Sync Somnia addresses to frontend
sync-somnia:
	@node script/sync_somnia.js

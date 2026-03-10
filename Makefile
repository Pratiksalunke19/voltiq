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
	@echo "Fetching MockERC20 address..."
	@$(eval WETH_ADDR=$(shell node -e "const fs=require('fs'); const run=JSON.parse(fs.readFileSync('broadcast/DeployLendingPool.s.sol/50312/run-latest.json')); const tx=run.transactions.find(t => t.contractName === 'MockERC20'); console.log(tx.contractAddress)"))
	@echo "Minting 100 WETH to $(ADDR)..."
	@cast send $(WETH_ADDR) "mint(address,uint256)" $(ADDR) 100000000000000000000 --rpc-url $(RPC_URL) --private-key $(PRIVATE_KEY)

# Full setup: Deploy, Sync, and Mint
setup: deploy sync
	@echo "Setup complete. Don't forget to run 'make mint ADDR=<your_address>'"

-include ../.env

.PHONY: get-pricefeed get-position add-monitor check-monitor set-price liquidate notify-update manual-event

# RPC and Private Key defaults from .env
RPC := $(SOMNIA_RPC_URL)
PK := $(PRIVATE_KEY)

# 1. Get PriceFeed address from Oracle
get-pricefeed:
	cast call $(ORACLE) "sPriceFeeds(address)(address)" $(ASSET_ADDR) --rpc-url $(RPC)

# 2. Get User Position
get-position:
	cast call $(POSITION_MANAGER) "getPosition(address)((uint256,uint256,uint256))" $(USER_ADDR) --rpc-url $(RPC)

# 3. Add User to Monitoring
add-monitor:
	cast send $(ENGINE) "addMonitoredUser(address)" $(USER_ADDR) --rpc-url $(RPC) --private-key $(PK) --legacy

# 4. Check Monitored Users (Index 0)
check-monitor:
	cast call $(ENGINE) "sMonitoredUsers(uint256)(address)" 0 --rpc-url $(RPC)

# 5. Set Price on the underlying Mock Aggregator
set-price:
	@echo "Discovering PriceFeed for $(ASSET_ADDR)..."
	@FEED_ADDR=$$(cast call $(ORACLE) "sPriceFeeds(address)(address)" $(ASSET_ADDR) --rpc-url $(RPC)); \
	echo "Setting price on mock feed at $$FEED_ADDR to $(PRICE)..."; \
	cast send $$FEED_ADDR "setPrice(int256)" $(PRICE) --rpc-url $(RPC) --private-key $(PK) --legacy

# 6. Manually liquidate via Engine (Testing logic)
liquidate:
	cast send $(ENGINE) "liquidate(address)" $(USER_ADDR) --rpc-url $(RPC) --private-key $(PK) --legacy

# 7. Notify Price Update (Triggers reactivity)
notify-update:
	cast send $(ORACLE) "notifyPriceUpdate(address)" $(ASSET_ADDR) --rpc-url $(RPC) --private-key $(PK) --legacy

# 8. Manual onEvent simulation for debugging
# Uses PriceUpdated signature and padded asset address as topics
PRICE_UPDATED_SIG := 0xb556fac599c3c70efb9ab1fa725ecace6c81cc48d1455f886607def065f3e0c0
PADDED_ASSET := $$(printf "0x%064x" $$(echo $(ASSET_ADDR) | sed 's/0x//'))

manual-event:
	@echo "Simulating price update event for $(ASSET_ADDR)..."
	cast send $(ENGINE) "manualOnEvent(address,bytes32[],bytes)" \
		$(ORACLE) \
		"[$(PRICE_UPDATED_SIG),$(PADDED_ASSET)]" \
		0x \
		--rpc-url $(RPC) --private-key $(PK) --legacy

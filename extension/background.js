/**
 * Voltiq Chrome Extension — Background Service Worker
 * 
 * Uses the SAME Somnia Sub #21168 subscription that the ReactiveLiquidationEngine
 * already uses. No new on-chain subscription is needed — we simply listen to events
 * emitted by the existing contracts via JSON-RPC polling.
 * 
 * Events monitored:
 * - ReactiveLiquidationEngine: DebugLiquidationTriggered, DebugUserChecked
 * - LendingPool: Deposited, Withdrawn, Borrowed, Repaid, Liquidated
 * - ChainlinkPriceOracle: PriceUpdated
 */

import { 
  JsonRpcProvider, Contract, formatUnits 
} from './lib/ethers-6.min.js';

import { 
  RPC_URL, CONTRACT_ADDRESSES, ABIS, TOKEN_SYMBOLS 
} from './contracts.js';

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════
const POLL_INTERVAL_ALARM = 'voltiq-poll';
const POLL_SECONDS = 15; // Poll every 15 seconds
const HF_WARNING_THRESHOLD = 1.3;
const HF_DANGER_THRESHOLD = 1.05;
const MAX_STORED_EVENTS = 100;

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let provider = null;
let engineContract = null;
let lendingPoolContract = null;
let oracleContract = null;
let positionManagerContract = null;
let lastCheckedBlock = 0;

// ═══════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════
function initProvider() {
  if (provider) return;
  provider = new JsonRpcProvider(RPC_URL);
  
  engineContract = new Contract(
    CONTRACT_ADDRESSES.ReactiveLiquidationEngine,
    ABIS.ReactiveLiquidationEngine,
    provider
  );
  
  lendingPoolContract = new Contract(
    CONTRACT_ADDRESSES.LendingPool,
    ABIS.LendingPool,
    provider
  );
  
  oracleContract = new Contract(
    CONTRACT_ADDRESSES.ORACLE,
    ABIS.ChainlinkPriceOracle,
    provider
  );
  
  positionManagerContract = new Contract(
    CONTRACT_ADDRESSES.PositionManager,
    ABIS.PositionManager,
    provider
  );
}

// ═══════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════
async function getStoredData(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => resolve(result[key]));
  });
}

async function setStoredData(obj) {
  return new Promise((resolve) => {
    chrome.storage.local.set(obj, resolve);
  });
}

async function getWatchedAddress() {
  return await getStoredData('watchedAddress');
}

async function getNotificationSettings() {
  const settings = await getStoredData('notificationSettings');
  return settings || {
    liquidations: true,
    healthWarnings: true,
    priceUpdates: false,
    positionChanges: true,
    soundEnabled: true
  };
}

async function addEvent(event) {
  const events = (await getStoredData('events')) || [];
  events.unshift(event);
  if (events.length > MAX_STORED_EVENTS) events.length = MAX_STORED_EVENTS;
  await setStoredData({ events });
  // Notify popup if open
  try {
    chrome.runtime.sendMessage({ type: 'NEW_EVENT', event });
  } catch (e) {
    // Popup not open, that's fine
  }
}

async function updatePositionCache(position) {
  await setStoredData({ cachedPosition: position });
  try {
    chrome.runtime.sendMessage({ type: 'POSITION_UPDATE', position });
  } catch (e) {}
}

// ═══════════════════════════════════════════════
// NOTIFICATION HELPER
// ═══════════════════════════════════════════════
function sendNotification(title, message, priority = 'default', iconType = 'default') {
  const notifId = `voltiq-${Date.now()}`;
  
  chrome.notifications.create(notifId, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `⚡ ${title}`,
    message,
    priority: priority === 'critical' ? 2 : (priority === 'high' ? 1 : 0),
    requireInteraction: priority === 'critical',
    silent: false
  });

  // Update badge
  if (priority === 'critical') {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  } else if (priority === 'high') {
    chrome.action.setBadgeText({ text: '●' });
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
  }
}

function truncateAddress(addr) {
  if (!addr) return '???';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getTokenSymbol(addr) {
  return TOKEN_SYMBOLS[addr.toLowerCase()] || truncateAddress(addr);
}

// ═══════════════════════════════════════════════
// POSITION FETCHER
// ═══════════════════════════════════════════════
async function fetchPosition(address) {
  try {
    initProvider();
    const pos = await positionManagerContract.getPosition(address);
    
    const collateral = Number(formatUnits(pos.collateralValue.toString(), 18));
    const borrow = Number(formatUnits(pos.borrowValue.toString(), 18));
    let hf = 999;
    if (borrow > 0 && pos.healthFactor) {
      hf = Number(formatUnits(pos.healthFactor.toString(), 18));
    }

    // Fetch prices
    const wethPriceBN = await oracleContract.getPrice(CONTRACT_ADDRESSES.WETH);
    const wbtcPriceBN = await oracleContract.getPrice(CONTRACT_ADDRESSES.WBTC);
    const wethPrice = Number(formatUnits(wethPriceBN, 18));
    const wbtcPrice = Number(formatUnits(wbtcPriceBN, 18));

    const position = {
      collateralUsd: collateral,
      borrowUsd: borrow,
      healthFactor: hf,
      prices: { WETH: wethPrice, WBTC: wbtcPrice },
      lastUpdated: Date.now()
    };

    await updatePositionCache(position);
    return position;
  } catch (err) {
    console.error('[Voltiq] Failed to fetch position:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════
// EVENT POLLING
// ═══════════════════════════════════════════════
async function pollEvents() {
  const address = await getWatchedAddress();
  if (!address) return;
  
  const settings = await getNotificationSettings();
  
  try {
    initProvider();
    const currentBlock = await provider.getBlockNumber();
    
    if (lastCheckedBlock === 0) {
      // On first run, look back ~100 blocks (approx 5 min on Somnia)
      lastCheckedBlock = Math.max(0, currentBlock - 100);
    }
    
    if (currentBlock <= lastCheckedBlock) return;
    
    const fromBlock = lastCheckedBlock + 1;
    const toBlock = currentBlock;
    
    // 1. Check Liquidation Events (highest priority)
    if (settings.liquidations) {
      try {
        const liquidationEvents = await engineContract.queryFilter(
          'DebugLiquidationTriggered', fromBlock, toBlock
        );
        
        for (const ev of liquidationEvents) {
          const user = ev.args[0];
          const hf = Number(formatUnits(ev.args[1], 18));
          const isMyAddress = user.toLowerCase() === address.toLowerCase();
          
          const event = {
            id: `liq-${ev.blockNumber}-${ev.transactionIndex}`,
            type: 'LIQUIDATION',
            timestamp: Date.now(),
            user: user,
            healthFactor: hf.toFixed(4),
            isUser: isMyAddress,
            block: ev.blockNumber
          };
          
          await addEvent(event);
          
          if (isMyAddress) {
            sendNotification(
              '🚨 LIQUIDATION TRIGGERED',
              `Your position was partially liquidated!\nHealth Factor: ${hf.toFixed(4)}`,
              'critical'
            );
          } else {
            sendNotification(
              'Liquidation Detected',
              `User ${truncateAddress(user)} was liquidated at HF ${hf.toFixed(4)}`,
              'default'
            );
          }
        }
      } catch (e) {
        console.warn('[Voltiq] Liquidation event query error:', e);
      }
    }

    // 2. Check LendingPool events (user's own position changes)
    if (settings.positionChanges) {
      try {
        // Check for Liquidated events on the LendingPool (actual liquidation execution)
        const lpLiqEvents = await lendingPoolContract.queryFilter(
          'Liquidated', fromBlock, toBlock
        );
        for (const ev of lpLiqEvents) {
          const user = ev.args[0];
          const collLiq = Number(formatUnits(ev.args[1], 18));
          const debtCov = Number(formatUnits(ev.args[2], 18));
          const isMyAddress = user.toLowerCase() === address.toLowerCase();
          
          if (isMyAddress) {
            await addEvent({
              id: `lpliq-${ev.blockNumber}-${ev.transactionIndex}`,
              type: 'MY_LIQUIDATION',
              timestamp: Date.now(),
              collateralLiquidated: collLiq.toFixed(2),
              debtCovered: debtCov.toFixed(2),
              block: ev.blockNumber
            });
            
            sendNotification(
              '⚠️ Position Partially Liquidated',
              `Collateral seized: $${collLiq.toFixed(2)}\nDebt covered: $${debtCov.toFixed(2)}`,
              'critical'
            );
          }
        }

        // Check Deposited / Withdrawn / Borrowed / Repaid for user
        const eventTypes = [
          { name: 'Deposited', label: 'Deposit', icon: '📥' },
          { name: 'Withdrawn', label: 'Withdrawal', icon: '📤' },
          { name: 'Borrowed', label: 'Borrow', icon: '💸' },
          { name: 'Repaid', label: 'Repayment', icon: '💰' }
        ];

        for (const evType of eventTypes) {
          try {
            const events = await lendingPoolContract.queryFilter(
              evType.name, fromBlock, toBlock
            );
            for (const ev of events) {
              const user = ev.args[0];
              if (user.toLowerCase() === address.toLowerCase()) {
                const asset = ev.args[1];
                const amount = Number(formatUnits(ev.args[2], 18));
                
                await addEvent({
                  id: `${evType.name}-${ev.blockNumber}-${ev.transactionIndex}`,
                  type: evType.name.toUpperCase(),
                  timestamp: Date.now(),
                  asset: getTokenSymbol(asset),
                  amount: amount.toFixed(4),
                  isUser: true,
                  block: ev.blockNumber
                });
              }
            }
          } catch (e) {
            // Silently skip on error
          }
        }
      } catch (e) {
        console.warn('[Voltiq] LendingPool event query error:', e);
      }
    }
    
    // 3. Check Price Updates
    if (settings.priceUpdates) {
      try {
        const priceEvents = await oracleContract.queryFilter(
          'PriceUpdated', fromBlock, toBlock
        );
        for (const ev of priceEvents) {
          const asset = ev.args[0];
          const price = Number(formatUnits(ev.args[1], 18));
          const symbol = getTokenSymbol(asset);
          
          await addEvent({
            id: `price-${ev.blockNumber}-${ev.transactionIndex}`,
            type: 'PRICE_UPDATE',
            timestamp: Date.now(),
            asset: symbol,
            price: price.toFixed(2),
            block: ev.blockNumber
          });
          
          sendNotification(
            'Price Updated',
            `${symbol}: $${price.toFixed(2)}`,
            'default'
          );
        }
      } catch (e) {
        console.warn('[Voltiq] Price event query error:', e);
      }
    }
    
    // 4. Fetch updated position & check Health Factor warnings
    const position = await fetchPosition(address);
    if (position && position.borrowUsd > 0 && settings.healthWarnings) {
      if (position.healthFactor < HF_DANGER_THRESHOLD) {
        sendNotification(
          '🚨 CRITICAL: Health Factor Below 1.05',
          `Your HF is ${position.healthFactor.toFixed(4)}! Liquidation is imminent.\nAdd collateral or repay debt NOW.`,
          'critical'
        );
      } else if (position.healthFactor < HF_WARNING_THRESHOLD) {
        sendNotification(
          '⚠️ Health Factor Warning',
          `Your HF dropped to ${position.healthFactor.toFixed(4)}.\nConsider adding collateral to stay safe.`,
          'high'
        );
      }
    }
    
    lastCheckedBlock = toBlock;
    await setStoredData({ lastCheckedBlock: toBlock });
    
  } catch (err) {
    console.error('[Voltiq] Poll error:', err);
  }
}

// ═══════════════════════════════════════════════
// ALARM & LIFECYCLE
// ═══════════════════════════════════════════════
chrome.alarms.create(POLL_INTERVAL_ALARM, {
  periodInMinutes: POLL_SECONDS / 60
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === POLL_INTERVAL_ALARM) {
    await pollEvents();
  }
});

// On install, set defaults and clear badge
chrome.runtime.onInstalled.addListener(async () => {
  await setStoredData({
    notificationSettings: {
      liquidations: true,
      healthWarnings: true,
      priceUpdates: false,
      positionChanges: true,
      soundEnabled: true
    },
    events: [],
    lastCheckedBlock: 0
  });
  
  chrome.action.setBadgeText({ text: '' });
  console.log('[Voltiq] Extension installed successfully.');
});

// ═══════════════════════════════════════════════
// MESSAGE HANDLING (popup <-> background)
// ═══════════════════════════════════════════════
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SET_ADDRESS') {
    setStoredData({ watchedAddress: msg.address }).then(() => {
      lastCheckedBlock = 0; // reset
      fetchPosition(msg.address).then(pos => {
        sendResponse({ success: true, position: pos });
      });
    });
    return true; // async response
  }
  
  if (msg.type === 'GET_POSITION') {
    getWatchedAddress().then(addr => {
      if (!addr) {
        sendResponse({ position: null });
        return;
      }
      fetchPosition(addr).then(pos => sendResponse({ position: pos }));
    });
    return true;
  }
  
  if (msg.type === 'GET_EVENTS') {
    getStoredData('events').then(events => {
      sendResponse({ events: events || [] });
    });
    return true;
  }
  
  if (msg.type === 'UPDATE_SETTINGS') {
    setStoredData({ notificationSettings: msg.settings }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (msg.type === 'GET_SETTINGS') {
    getNotificationSettings().then(settings => {
      sendResponse({ settings });
    });
    return true;
  }
  
  if (msg.type === 'CLEAR_BADGE') {
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ success: true });
    return false;
  }
  
  if (msg.type === 'CLEAR_EVENTS') {
    setStoredData({ events: [] }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (msg.type === 'FORCE_POLL') {
    pollEvents().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Run initial poll on startup
pollEvents();
console.log('[Voltiq] Background service worker initialized.');

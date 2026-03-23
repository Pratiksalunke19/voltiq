/**
 * Voltiq Chrome Extension — Popup Script
 * Handles UI rendering, event display, and settings management.
 */

// ═══════════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════════
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Tabs
const tabs = $$('.tab');
const tabContents = $$('.tab-content');

// Position Tab
const noAddressView = $('#no-address');
const positionDashboard = $('#position-dashboard');
const addressInput = $('#address-input');
const btnConnect = $('#btn-connect');
const btnDisconnect = $('#btn-disconnect');
const displayAddress = $('#display-address');

// Health Factor
const hfCard = $('#hf-card');
const hfValue = $('#hf-value');
const hfBadge = $('#hf-badge');
const hfProgress = $('#hf-progress');
const hfNote = $('#hf-note');

// Stats
const statCollateral = $('#stat-collateral');
const statBorrowed = $('#stat-borrowed');
const priceWeth = $('#price-weth');
const priceWbtc = $('#price-wbtc');

// Events
const eventsList = $('#events-list');
const btnClearEvents = $('#btn-clear-events');

// Settings
const setLiquidations = $('#set-liquidations');
const setHealth = $('#set-health');
const setPrices = $('#set-prices');
const setPosition = $('#set-position');
const setSound = $('#set-sound');

// Header
const btnRefresh = $('#btn-refresh');
const btnSettings = $('#btn-settings');

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
function truncateAddress(addr) {
  if (!addr) return '???';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2 
  }).format(val);
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function getHealthStatus(hf) {
  if (hf < 1.05) return 'danger';
  if (hf < 1.3) return 'warning';
  return 'safe';
}

function getHealthLabel(hf, hasBorrow) {
  if (!hasBorrow) return 'No Debt';
  if (hf < 1.0) return 'Liquidatable';
  if (hf < 1.05) return 'Critical';
  if (hf < 1.3) return 'At Risk';
  return 'Safe';
}

function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, resolve);
  });
}

// ═══════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));
    
    tab.classList.add('active');
    $(`#tab-${target}`).classList.add('active');
    
    if (target === 'events') loadEvents();
    if (target === 'settings') loadSettings();
  });
});

// ═══════════════════════════════════════════════
// POSITION UI
// ═══════════════════════════════════════════════
function renderPosition(position) {
  if (!position) return;
  
  const hasBorrow = position.borrowUsd > 0;
  const hf = position.healthFactor;
  const status = getHealthStatus(hf);
  
  // Health Factor Value
  hfValue.textContent = hasBorrow ? hf.toFixed(2) : '∞';
  hfValue.className = `hf-value ${hasBorrow ? status : 'safe'}`;
  
  // Health Factor Badge
  hfBadge.textContent = getHealthLabel(hf, hasBorrow);
  hfBadge.className = `badge badge-${hasBorrow ? status : 'safe'}`;
  
  // Health Factor Card border
  hfCard.className = `hf-card status-${hasBorrow ? status : 'safe'}`;
  
  // Progress bar
  const progressWidth = hasBorrow ? Math.min((hf / 2) * 100, 100) : 100;
  hfProgress.style.width = `${progressWidth}%`;
  hfProgress.className = `progress-fill ${hasBorrow ? status : 'safe'}`;
  
  // Note
  if (!hasBorrow) {
    hfNote.textContent = 'No active borrows — your position is clear.';
  } else if (status === 'danger') {
    const dropPct = (1 - (1 / hf)) * 100;
    hfNote.textContent = `⚠️ A ${dropPct.toFixed(1)}% price drop triggers liquidation!`;
    hfNote.style.color = 'var(--danger-red)';
  } else if (status === 'warning') {
    hfNote.textContent = 'Consider adding collateral to improve safety.';
    hfNote.style.color = 'var(--warning-yellow)';
  } else {
    hfNote.textContent = 'Position is healthy. Keep monitoring.';
    hfNote.style.color = 'var(--text-muted)';
  }
  
  // Stats
  statCollateral.textContent = formatCurrency(position.collateralUsd);
  statBorrowed.textContent = formatCurrency(position.borrowUsd);
  
  // Prices
  if (position.prices) {
    priceWeth.textContent = position.prices.WETH > 0 ? formatCurrency(position.prices.WETH) : '--';
    priceWbtc.textContent = position.prices.WBTC > 0 ? formatCurrency(position.prices.WBTC) : '--';
  }
}

async function showDashboard(address) {
  noAddressView.classList.add('hidden');
  positionDashboard.classList.remove('hidden');
  displayAddress.textContent = truncateAddress(address);
  
  // Fetch position from background
  const resp = await sendMsg({ type: 'GET_POSITION' });
  if (resp?.position) {
    renderPosition(resp.position);
  }
}

async function showConnectView() {
  noAddressView.classList.remove('hidden');
  positionDashboard.classList.add('hidden');
}

// ═══════════════════════════════════════════════
// EVENTS UI
// ═══════════════════════════════════════════════
function getEventTypeClass(type) {
  const map = {
    'LIQUIDATION': 'liquidation',
    'MY_LIQUIDATION': 'liquidation',
    'PRICE_UPDATE': 'price',
    'DEPOSITED': 'deposit',
    'WITHDRAWN': 'withdraw',
    'BORROWED': 'borrow',
    'REPAID': 'repay',
    'HF_WARNING': 'hf-warning'
  };
  return map[type] || '';
}

function getEventLabel(type) {
  const map = {
    'LIQUIDATION': '🚨 Liquidation',
    'MY_LIQUIDATION': '⚠️ My Liquidation',
    'PRICE_UPDATE': '📊 Price Update',
    'DEPOSITED': '📥 Deposit',
    'WITHDRAWN': '📤 Withdraw',
    'BORROWED': '💸 Borrow',
    'REPAID': '💰 Repay',
    'USER_CHECKED': '🔍 User Checked',
    'SYNC_SUCCESS': '🔄 Sync'
  };
  return map[type] || type;
}

function getEventDetail(event) {
  switch (event.type) {
    case 'LIQUIDATION':
      return `<strong>${event.isUser ? 'YOUR' : truncateAddress(event.user)}</strong> position liquidated at HF <strong>${event.healthFactor}</strong>`;
    case 'MY_LIQUIDATION':
      return `Collateral seized: <strong>${formatCurrency(parseFloat(event.collateralLiquidated))}</strong> • Debt covered: <strong>${formatCurrency(parseFloat(event.debtCovered))}</strong>`;
    case 'PRICE_UPDATE':
      return `<strong>${event.asset}</strong> → <strong>$${event.price}</strong>`;
    case 'DEPOSITED':
      return `Deposited <strong>${event.amount} ${event.asset}</strong>`;
    case 'WITHDRAWN':
      return `Withdrew <strong>${event.amount} ${event.asset}</strong>`;
    case 'BORROWED':
      return `Borrowed <strong>${event.amount} ${event.asset}</strong>`;
    case 'REPAID':
      return `Repaid <strong>${event.amount} ${event.asset}</strong>`;
    default:
      return JSON.stringify(event);
  }
}

function renderEvent(event) {
  const typeClass = getEventTypeClass(event.type);
  const div = document.createElement('div');
  div.className = `event-item ${typeClass ? `event-${typeClass}` : ''}`;
  div.innerHTML = `
    <div class="event-top">
      <span class="event-type type-${typeClass}">${getEventLabel(event.type)}</span>
      <span class="event-time">${timeAgo(event.timestamp)}</span>
    </div>
    <div class="event-detail">${getEventDetail(event)}</div>
  `;
  return div;
}

async function loadEvents() {
  const resp = await sendMsg({ type: 'GET_EVENTS' });
  const events = resp?.events || [];
  
  eventsList.innerHTML = '';
  
  if (events.length === 0) {
    eventsList.innerHTML = `
      <div class="empty-state mini">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
        <p>No events yet</p>
        <p class="text-xs text-muted">Events will appear as the protocol reacts</p>
      </div>
    `;
    return;
  }
  
  events.forEach(event => {
    eventsList.appendChild(renderEvent(event));
  });
}

// ═══════════════════════════════════════════════
// SETTINGS UI
// ═══════════════════════════════════════════════
async function loadSettings() {
  const resp = await sendMsg({ type: 'GET_SETTINGS' });
  const settings = resp?.settings || {};
  
  setLiquidations.checked = settings.liquidations !== false;
  setHealth.checked = settings.healthWarnings !== false;
  setPrices.checked = settings.priceUpdates === true;
  setPosition.checked = settings.positionChanges !== false;
  setSound.checked = settings.soundEnabled !== false;
}

async function saveSettings() {
  const settings = {
    liquidations: setLiquidations.checked,
    healthWarnings: setHealth.checked,
    priceUpdates: setPrices.checked,
    positionChanges: setPosition.checked,
    soundEnabled: setSound.checked
  };
  await sendMsg({ type: 'UPDATE_SETTINGS', settings });
}

// Settings change listeners
[setLiquidations, setHealth, setPrices, setPosition, setSound].forEach(el => {
  el.addEventListener('change', saveSettings);
});

// ═══════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════
btnConnect.addEventListener('click', async () => {
  const address = addressInput.value.trim();
  if (!address || !address.startsWith('0x') || address.length !== 42) {
    addressInput.style.borderColor = 'var(--danger-red)';
    addressInput.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
    setTimeout(() => {
      addressInput.style.borderColor = '';
      addressInput.style.boxShadow = '';
    }, 2000);
    return;
  }
  
  btnConnect.textContent = 'Connecting...';
  btnConnect.disabled = true;
  
  const resp = await sendMsg({ type: 'SET_ADDRESS', address });
  
  if (resp?.success) {
    await showDashboard(address);
    if (resp.position) renderPosition(resp.position);
  }
  
  btnConnect.textContent = 'Monitor';
  btnConnect.disabled = false;
});

addressInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnConnect.click();
});

btnDisconnect.addEventListener('click', async () => {
  await sendMsg({ type: 'SET_ADDRESS', address: '' });
  showConnectView();
});

btnRefresh.addEventListener('click', async () => {
  btnRefresh.classList.add('spinning');
  await sendMsg({ type: 'FORCE_POLL' });
  
  // Refresh current tab data
  const address = await new Promise(r => chrome.storage.local.get('watchedAddress', d => r(d.watchedAddress)));
  if (address) {
    const resp = await sendMsg({ type: 'GET_POSITION' });
    if (resp?.position) renderPosition(resp.position);
  }
  
  // Also refresh events if on that tab
  const eventsTab = document.querySelector('.tab[data-tab="events"]');
  if (eventsTab.classList.contains('active')) {
    await loadEvents();
  }
  
  setTimeout(() => btnRefresh.classList.remove('spinning'), 800);
});

btnSettings.addEventListener('click', () => {
  // Switch to settings tab
  tabs.forEach(t => t.classList.remove('active'));
  tabContents.forEach(tc => tc.classList.remove('active'));
  document.querySelector('.tab[data-tab="settings"]').classList.add('active');
  $('#tab-settings').classList.add('active');
  loadSettings();
});

btnClearEvents.addEventListener('click', async () => {
  await sendMsg({ type: 'CLEAR_EVENTS' });
  loadEvents();
});

// ═══════════════════════════════════════════════
// LISTEN FOR REAL-TIME UPDATES FROM BACKGROUND
// ═══════════════════════════════════════════════
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'POSITION_UPDATE' && msg.position) {
    renderPosition(msg.position);
  }
  if (msg.type === 'NEW_EVENT' && msg.event) {
    // If events tab is active, prepend the event
    const eventsTab = document.querySelector('.tab[data-tab="events"]');
    if (eventsTab.classList.contains('active')) {
      const emptyState = eventsList.querySelector('.empty-state');
      if (emptyState) eventsList.innerHTML = '';
      eventsList.prepend(renderEvent(msg.event));
    }
  }
});

// ═══════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════
async function init() {
  // Clear badge when popup opens
  sendMsg({ type: 'CLEAR_BADGE' });
  
  // Check if address is already stored
  chrome.storage.local.get('watchedAddress', async (data) => {
    if (data.watchedAddress) {
      await showDashboard(data.watchedAddress);
    } else {
      showConnectView();
    }
  });
}

init();

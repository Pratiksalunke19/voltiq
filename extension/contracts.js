// Voltiq Contract Addresses & ABIs (Somnia Testnet)
// Same subscription as Sub #21168 — no new subscription needed!

export const RPC_URL = 'https://dream-rpc.somnia.network/';

export const CONTRACT_ADDRESSES = {
  WETH: '0x9851f86680ec8b401f0B2943aaf6dd76c4a28031',
  WBTC: '0xcCD485A0e3B491D23ac9Dff6145871Be4566A440',
  USDC: '0x6C077F911aefD4B36343E1980f1a8ADD4F81bbd0',
  ORACLE: '0x150E90cF28B7dc5e05218BB1223801c096A99629',
  PositionManager: '0x2E06b0fecE65d9151E920669bE2508Cf365DbfDC',
  LendingPool: '0x365A77ef29e7360B23EBBE29c1147c1E54bDef2a',
  ReactiveLiquidationEngine: '0xAA593397B78Df1FD855d55De91a2AE2556009A25'
};

// Map token addresses to symbols for display
export const TOKEN_SYMBOLS = {
  [CONTRACT_ADDRESSES.WETH.toLowerCase()]: 'WETH',
  [CONTRACT_ADDRESSES.WBTC.toLowerCase()]: 'WBTC',
  [CONTRACT_ADDRESSES.USDC.toLowerCase()]: 'USDC'
};

// Minimal ABIs — only the events and read functions we need
export const ABIS = {
  ReactiveLiquidationEngine: [
    'event DebugUserChecked(address indexed user, uint256 hf)',
    'event DebugLiquidationTriggered(address indexed user, uint256 healthFactor)',
    'event DebugOnEventSuccess(address emitter, uint256 monitoredUsersCount)',
    'event UserAddedToMonitoring(address indexed user)'
  ],
  LendingPool: [
    'event Deposited(address indexed user, address indexed asset, uint256 amount)',
    'event Withdrawn(address indexed user, address indexed asset, uint256 amount)',
    'event Borrowed(address indexed user, address indexed asset, uint256 amount)',
    'event Repaid(address indexed user, address indexed asset, uint256 amount)',
    'event Liquidated(address indexed user, uint256 collateralLiquidated, uint256 debtCovered)'
  ],
  ChainlinkPriceOracle: [
    'event PriceUpdated(address indexed asset, uint256 price, uint256 timestamp)',
    'function getPrice(address asset) view returns (uint256)'
  ],
  PositionManager: [
    'function getPosition(address user) view returns (tuple(uint256 collateralValue, uint256 borrowValue, uint256 healthFactor))',
    'function sUserCollateral(address, address) view returns (uint256)',
    'function sUserDebt(address, address) view returns (uint256)'
  ]
};

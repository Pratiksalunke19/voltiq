import type { ProtocolData } from './types';

export const RPC_URL = "https://dream-rpc.somnia.network/";

export const BACKEND_PRIVATE_KEY = "0x22881bef74fc2b6931f6295155e5fb61918ff062c4e4080a80050786c94bcaa6";

export const MOCK_DATA: ProtocolData = {
  healthFactor: 1.15,
  collateralUsd: 2500.50,
  borrowUsd: 1739.47,
  liquidationThreshold: 0.8,
  protocolTvl: 1450200.00,
  activeLoans: 342,
  prices: {
    WETH: 2500.00,
    WBTC: 60000.00,
    LINK: 15.00,
  },
  liquidationQueue: [
    { user: '0x1A...89B2', healthFactor: 1.01, collateralValue: '$15,200', borrowValue: '$15,049' },
    { user: '0x7C...3D1A', healthFactor: 1.03, collateralValue: '$8,400', borrowValue: '$8,155' },
    { user: '0xB2...F9E4', healthFactor: 1.06, collateralValue: '$500', borrowValue: '$471' },
  ],
  collateralDistribution: [
    { asset: 'WETH', amount: 0, percentage: 0, color: '#3b82f6' },
    { asset: 'WBTC', amount: 0, percentage: 0, color: '#f59e0b' },
  ]
};

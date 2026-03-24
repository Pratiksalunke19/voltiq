export type Tab = 'dashboard' | 'borrow' | 'profile' | 'markets' | 'liquidations' | 'faucet' | 'activity' | 'settings';

export interface PriceData {
  WETH: number;
  WBTC: number;
  LINK: number;
  USDC?: number;
  [key: string]: number | undefined;
}

export interface CollateralItem {
  asset: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface ProtocolData {
  healthFactor: number;
  collateralUsd: number;
  borrowUsd: number;
  liquidationThreshold: number;
  protocolTvl: number;
  activeLoans: number;
  prices: PriceData;
  liquidationQueue: Array<{
    user: string;
    healthFactor: number;
    collateralValue: string;
    borrowValue: string;
  }>;
  collateralDistribution: CollateralItem[];
}

export interface ReactiveEvent {
  id: string;
  type: string;
  timestamp: string;
  user?: string;
  hf?: string;
  count?: string;
  [key: string]: any;
}

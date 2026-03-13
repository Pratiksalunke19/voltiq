import React, { useState, useEffect } from 'react';
import { 
  Wallet, Zap, ShieldAlert, ShieldCheck, TrendingDown, 
  PieChart, Sliders, AlertTriangle, LineChart, LayoutDashboard,
  BarChart3, RefreshCcw, LogOut, ArrowRightLeft, Database, Activity
} from 'lucide-react';
import { ethers } from 'ethers';
import './index.css';

import { CONTRACT_ADDRESSES, ABIS } from './contracts';

// Mock Data fallback
const MOCK_DATA = {
  healthFactor: 1.15,
  collateralUsd: 2500.50,
  borrowUsd: 1739.47,
  liquidationThreshold: 0.8, // 80%
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
    { asset: 'WETH', percentage: 65, color: '#3b82f6' },
    { asset: 'WBTC', percentage: 20, color: '#f59e0b' },
    { asset: 'LINK', percentage: 10, color: '#8b5cf6' },
    { asset: 'Other', percentage:  5, color: '#6b7280' },
  ]
};

function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [data, setData] = useState(MOCK_DATA);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [simDrop, setSimDrop] = useState(0);

  // Determine health status
  let healthStatus = 'safe';
  if (data.healthFactor < 1.05) healthStatus = 'danger';
  else if (data.healthFactor < 1.3) healthStatus = 'warning';

  const fetchUserData = async (address: string, provider: ethers.BrowserProvider) => {
    try {
      const positionManager = new ethers.Contract(
        CONTRACT_ADDRESSES['PositionManager'],
        ABIS['PositionManager'],
        provider
      );
      
      const pos = await positionManager.getPosition(address);
      
      const collateral = Number(ethers.formatUnits(pos.collateralValue.toString(), 18));
      const borrow = Number(ethers.formatUnits(pos.borrowValue.toString(), 18));
      
      let hf = 999;
      if (borrow > 0 && pos.healthFactor) {
        hf = Number(ethers.formatUnits(pos.healthFactor.toString(), 18));
      }

      setData(prev => ({
        ...prev,
        healthFactor: hf,
        collateralUsd: collateral,
        borrowUsd: borrow
      }));
    } catch(err) {
      console.error("Failed fetching user data", err);
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      // @ts-ignore
      if (window.ethereum) {
        // @ts-ignore
        const _provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(_provider);
        const accounts = await _provider.send("eth_requestAccounts", []);
        setWalletAddress(accounts[0]);
        await fetchUserData(accounts[0], _provider);
      } else {
        alert("Please install MetaMask to use Voltiq!");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDeposit = async () => {
    if (!walletAddress || !provider) return;
    try {
      const signer = await provider.getSigner();
      const weth = new ethers.Contract(CONTRACT_ADDRESSES['WETH'], ABIS['MockERC20'], signer);
      let tx = await weth.approve(CONTRACT_ADDRESSES['LendingPool'], ethers.MaxUint256);
      await tx.wait();

      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES['LendingPool'], ABIS['LendingPool'], signer);
      tx = await lendingPool.deposit(CONTRACT_ADDRESSES['WETH'], ethers.parseEther('1'));
      await tx.wait();
      
      await fetchUserData(walletAddress, provider);
    } catch(err) {
      console.error("Deposit failed!", err);
    }
  };

  const handleDevBorrow = async () => {
    if (!walletAddress || !provider) return;
    try {
      const signer = await provider.getSigner();
      const usdc = new ethers.Contract(CONTRACT_ADDRESSES['USDC'], ABIS['MockERC20'], signer);
      let tx = await usdc.mint(CONTRACT_ADDRESSES['LendingPool'], ethers.parseEther('100000'));
      await tx.wait();

      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES['LendingPool'], ABIS['LendingPool'], signer);
      tx = await lendingPool.borrow(CONTRACT_ADDRESSES['USDC'], ethers.parseEther('500'));
      await tx.wait();
      
      await fetchUserData(walletAddress, provider);
    } catch(err) {
      console.error("Borrow failed!", err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getSimImpact = (drop: number) => {
    if (drop === 0) return { estLiquidations: "$0", accounts: 0, risk: "None", riskClass: "badge-safe" };
    if (drop <= 5) return { estLiquidations: "$1.2M", accounts: 47, risk: "Low", riskClass: "badge-safe" };
    if (drop <= 10) return { estLiquidations: "$4.5M", accounts: 120, risk: "Medium", riskClass: "badge-warning" };
    if (drop <= 20) return { estLiquidations: "$12.8M", accounts: 350, risk: "High", riskClass: "badge-danger" };
    return { estLiquidations: "$35.2M", accounts: 890, risk: "Critical", riskClass: "badge-danger" };
  };

  const simImpact = getSimImpact(simDrop);

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <a href="/" className="brand">
            <Zap className="brand-icon" size={28} />
            <span className="brand-text">VOLTIQ</span>
          </a>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-item active">
            <LayoutDashboard size={20} />
            Dashboard
          </div>
          <div className="nav-item">
            <Database size={20} />
            Markets
          </div>
          <div className="nav-item">
            <ArrowRightLeft size={20} />
            Borrow / Repay
          </div>
          <div className="nav-item">
            <ShieldAlert size={20} />
            Liquidations
          </div>
          <div className="nav-item">
            <BarChart3 size={20} />
            Analytics
          </div>
        </nav>
        <div className="sidebar-footer">
          <p>Voltiq Protocol v1.0.0</p>
          <p className="mt-1 flex items-center gap-1 text-safe">
            <ShieldCheck size={14} /> Audited
          </p>
        </div>
      </aside>

      {/* Main Container */}
      <main className="main-wrapper">
        
        {/* Top App Bar */}
        <header className="topbar">
          <div className="topbar-title font-display flex items-center gap-4">
            <span>Overview</span>
            <div className="live-indicator">
              <span className="dot"></span>
              Somnia RPC Active
            </div>
          </div>
          
          <div className="topbar-actions">
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              <RefreshCcw size={16} />
            </button>
            
            {walletAddress ? (
              <div className="btn btn-secondary" style={{ cursor: 'default' }}>
                <span className="status-dot online mr-2"></span>
                <span className="font-mono">{truncateAddress(walletAddress)}</span>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={connectWallet} disabled={isConnecting}>
                <Wallet size={18} />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="content-area">
          <div className="dashboard-grid">
            
            {/* KPI STAT CARDS */}
            <div className="col-span-12 lg:col-span-3 stat-card">
              <h4 className="text-sm font-semibold text-secondary uppercase tracking-wide">Total Value Locked</h4>
              <div className="stat-value text-gradient">{formatCurrency(data.protocolTvl)}</div>
            </div>
            <div className="col-span-12 lg:col-span-3 stat-card">
              <h4 className="text-sm font-semibold text-secondary uppercase tracking-wide">Active Loans</h4>
              <div className="stat-value">{data.activeLoans}</div>
            </div>
            <div className="col-span-12 lg:col-span-3 stat-card">
              <h4 className="text-sm font-semibold text-secondary uppercase tracking-wide">Sys Health Factor</h4>
              <div className="stat-value text-safe">1.84</div>
            </div>
            <div className="col-span-12 lg:col-span-3 stat-card">
              <h4 className="text-sm font-semibold text-secondary uppercase tracking-wide">24h Liquidations</h4>
              <div className="stat-value text-danger">$124.5K</div>
            </div>

            {/* YOUR POSITION CARD */}
            <div className="col-span-12 lg:col-span-8 card">
              <div className="card-header">
                <h3 className="card-title">Your Position</h3>
                <span className={`badge badge-${healthStatus}`}>
                  {healthStatus === 'danger' && <ShieldAlert size={14} />}
                  {healthStatus === 'warning' && <Activity size={14} />}
                  {healthStatus === 'safe' && <ShieldCheck size={14} />}
                  {healthStatus === 'safe' ? 'Safe' : healthStatus === 'danger' ? 'Critical Risk' : 'Attention'}
                </span>
              </div>

              <div className="bg-panel rounded-xl p-6 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-secondary">Health Factor</span>
                  <span className={`text-xl font-bold font-mono text-${healthStatus}`}>
                    {data.borrowUsd === 0 ? '∞' : data.healthFactor.toFixed(2)}
                  </span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill"
                    style={{ 
                      width: `${Math.min((data.healthFactor / 2) * 100, 100)}%`,
                      backgroundColor: `var(--${healthStatus === 'danger' ? 'danger-red' : healthStatus === 'warning' ? 'warning-yellow' : 'safe-green'})`
                    }}
                  />
                </div>
                <p className="text-xs text-muted mt-3">Liquidation is publicly triggered if Health Factor drops below 1.0.</p>
              </div>

              <div className="flex gap-4 flex-col md:flex-row mb-6">
                <div className="flex-1 bg-surface-hover border rounded-xl p-4">
                  <span className="text-xs text-secondary font-semibold uppercase">Collateral Deposited</span>
                  <div className="text-2xl font-bold mt-1 font-mono">{formatCurrency(data.collateralUsd)}</div>
                </div>
                <div className="flex-1 bg-surface-hover border rounded-xl p-4">
                  <span className="text-xs text-secondary font-semibold uppercase">Total Borrowed</span>
                  <div className="text-2xl font-bold mt-1 font-mono">{formatCurrency(data.borrowUsd)}</div>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="btn btn-primary flex-1 pl-4 pr-4" onClick={handleDeposit}>
                  Deposit 1 WETH
                </button>
                <button className="btn btn-secondary flex-1 pl-4 pr-4 border hover:bg-white/5" onClick={handleDevBorrow}>
                  Test Borrow 500 USDC
                </button>
              </div>
            </div>

            {/* PRICE MONITOR */}
            <div className="col-span-12 lg:col-span-4 card">
              <div className="card-header">
                <h3 className="card-title"><LineChart size={18} className="text-accent" /> Live Prices</h3>
                <span className="badge badge-safe">Oracle Sync</span>
              </div>
              <div className="flex flex-col gap-3">
                {Object.entries(data.prices).map(([asset, price]) => (
                  <div key={asset} className="flex justify-between items-center bg-surface-hover border rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-panel flex items-center justify-center font-bold text-xs">{asset[0]}</div>
                      <span className="font-semibold">{asset}</span>
                    </div>
                    <span className="font-mono font-bold">{formatCurrency(price)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* LIQUIDATION QUEUE */}
            <div className="col-span-12 lg:col-span-8 card">
              <div className="card-header">
                <h3 className="card-title"><AlertTriangle size={18} className="text-warning" /> At-Risk Queue</h3>
                <span className="badge badge-warning">Monitoring active</span>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User Account</th>
                      <th>Health Factor</th>
                      <th>Collateral</th>
                      <th>Debt</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.liquidationQueue.map((item, i) => (
                      <tr key={i}>
                        <td className="font-mono">{item.user}</td>
                        <td className="text-danger font-bold text-lg font-mono">
                          {item.healthFactor.toFixed(2)}
                        </td>
                        <td className="text-muted">{item.collateralValue}</td>
                        <td className="text-muted">{item.borrowValue}</td>
                        <td className="text-right">
                          <button className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }} disabled>
                            Liquidate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DISTRIBUTION AND SIMULATOR COLUMN */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              
              {/* COLLATERAL DISTRIBUTION */}
              <div className="card" style={{ paddingBottom: '1.5rem', flex: 'none' }}>
                <div className="card-header">
                  <h3 className="card-title"><PieChart size={18} className="text-accent" /> Asset Distribution</h3>
                </div>
                
                <div className="chart-container mb-6">
                  {data.collateralDistribution.map((item, i) => (
                    <div 
                      key={i} 
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color }} 
                      title={`${item.asset}: ${item.percentage}%`} 
                    />
                  ))}
                </div>
                
                <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {data.collateralDistribution.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-surface-hover rounded-lg p-2 px-3 border border-transparent">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-secondary">{item.asset}</span>
                      </div>
                      <span className="text-sm font-bold font-mono">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SIMULATION TOOL */}
              <div className="card" style={{ flex: '1' }}>
                <div className="card-header">
                  <h3 className="card-title text-accent"><Sliders size={18} /> Simulation Tool</h3>
                </div>
                
                <div className="bg-panel rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-secondary">Simulate ETH Price Drop</span>
                    <span className="font-bold text-danger font-mono text-lg">-{simDrop}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="50" 
                    step="5" 
                    value={simDrop} 
                    onChange={(e) => setSimDrop(Number(e.target.value))}
                    className="range-slider"
                  />
                </div>

                <div className="bg-surface-hover border rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-secondary">Est. Liquidations</span>
                    <span className="font-mono font-bold text-lg">{simImpact.estLiquidations}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-secondary">Affected Accounts</span>
                    <span className="font-mono font-bold text-lg">{simImpact.accounts}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2" style={{ borderTop: '1px dashed var(--border-color)' }}>
                    <span className="text-secondary">Protocol Risk</span>
                    <span className={`badge ${simImpact.riskClass}`}>{simImpact.risk}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

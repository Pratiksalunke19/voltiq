import React, { useState, useEffect } from 'react';
import { 
  Wallet, Zap, ShieldAlert, ShieldCheck, TrendingDown, 
  PieChart, Sliders, AlertTriangle, LineChart, LayoutDashboard,
  BarChart3, RefreshCcw, LogOut, ArrowRightLeft, Database, Activity,
  ArrowUpRight, ArrowDownLeft, Coins, Info
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

type Tab = 'dashboard' | 'borrow' | 'markets' | 'liquidations' | 'faucet';

function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [data, setData] = useState(MOCK_DATA);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [simDrop, setSimDrop] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showWarning, setShowWarning] = useState(true);
  
  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [depositAsset, setDepositAsset] = useState('WETH');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [borrowAsset, setBorrowAsset] = useState('USDC');
  const [mintAmount, setMintAmount] = useState('1000');
  const [mintAsset, setMintAsset] = useState('USDC');

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

  const importMockTokens = async () => {
    // @ts-ignore
    if (!window.ethereum) {
      alert("Please install MetaMask");
      return;
    }

    const tokensToImport = [
      { symbol: 'WETH', address: CONTRACT_ADDRESSES['WETH'] },
      { symbol: 'WBTC', address: CONTRACT_ADDRESSES['WBTC'] },
      // { symbol: 'LINK', address: CONTRACT_ADDRESSES['LINK'] },
      { symbol: 'USDC', address: CONTRACT_ADDRESSES['USDC'] },
    ];

    for (const token of tokensToImport) {
      try {
        // @ts-ignore
        await window.ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: token.address,
              symbol: token.symbol,
              decimals: 18,
            },
          },
        });
      } catch (err) {
        console.error(`Failed to import ${token.symbol}`, err);
      }
    }
  };

  const handleDeposit = async () => {
    if (!walletAddress || !provider || !depositAmount) return;
    try {
      const signer = await provider.getSigner();
      // @ts-ignore
      const assetAddr = CONTRACT_ADDRESSES[depositAsset];
      const token = new ethers.Contract(assetAddr, ABIS['MockERC20'], signer);
      
      console.log(`Approving ${depositAsset}...`);
      let tx = await token.approve(CONTRACT_ADDRESSES['LendingPool'], ethers.MaxUint256);
      await tx.wait();

      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES['LendingPool'], ABIS['LendingPool'], signer);
      console.log(`Depositing ${depositAmount} ${depositAsset}...`);
      tx = await lendingPool.deposit(assetAddr, ethers.parseEther(depositAmount));
      await tx.wait();
      
      await fetchUserData(walletAddress, provider);
      setDepositAmount('');
      alert("Deposit successful!");
    } catch(err) {
      console.error("Deposit failed!", err);
      alert("Deposit failed. Check console.");
    }
  };

  const handleBorrow = async () => {
    if (!walletAddress || !provider || !borrowAmount) return;
    try {
      const signer = await provider.getSigner();
      // @ts-ignore
      const assetAddr = CONTRACT_ADDRESSES[borrowAsset];
      
      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES['LendingPool'], ABIS['LendingPool'], signer);
      console.log(`Borrowing ${borrowAmount} ${borrowAsset}...`);
      let tx = await lendingPool.borrow(assetAddr, ethers.parseEther(borrowAmount));
      await tx.wait();
      
      await fetchUserData(walletAddress, provider);
      setBorrowAmount('');
      alert("Borrow successful!");
    } catch(err) {
      console.error("Borrow failed!", err);
      alert("Borrow failed. Check console.");
    }
  };

  const handleMint = async () => {
    if (!walletAddress || !provider || !mintAmount) return;
    try {
      const signer = await provider.getSigner();
      // @ts-ignore
      const assetAddr = CONTRACT_ADDRESSES[mintAsset];
      const token = new ethers.Contract(assetAddr, ABIS['MockERC20'], signer);
      
      console.log(`Minting ${mintAmount} ${mintAsset}...`);
      let tx = await token.mint(walletAddress, ethers.parseEther(mintAmount));
      await tx.wait();
      
      alert(`Minted ${mintAmount} ${mintAsset} to your wallet!`);
    } catch(err) {
      console.error("Mint failed!", err);
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
          <div className="brand" onClick={() => setActiveTab('dashboard')} style={{cursor: 'pointer'}}>
            <Zap className="brand-icon" size={28} />
            <span className="brand-text">VOLTIQ</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} />
            Dashboard
          </div>
          <div className={`nav-item ${activeTab === 'markets' ? 'active' : ''}`} onClick={() => setActiveTab('markets')}>
            <Database size={20} />
            Markets
          </div>
          <div className={`nav-item ${activeTab === 'borrow' ? 'active' : ''}`} onClick={() => setActiveTab('borrow')}>
            <ArrowRightLeft size={20} />
            Borrow / Repay
          </div>
          <div className={`nav-item ${activeTab === 'liquidations' ? 'active' : ''}`} onClick={() => setActiveTab('liquidations')}>
            <ShieldAlert size={20} />
            Liquidations
          </div>
          <div className={`nav-item ${activeTab === 'faucet' ? 'active' : ''}`} onClick={() => setActiveTab('faucet')}>
            <Coins size={20} />
            Faucet
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
            <span style={{textTransform: 'capitalize'}}>{activeTab}</span>
            <div className="live-indicator">
              <span className="dot"></span>
              Somnia RPC Active
            </div>
          </div>
          
          <div className="topbar-actions">
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              <RefreshCcw size={16} />
            </button>

            {walletAddress && (
              <button className="btn btn-secondary" onClick={importMockTokens}>
                <Coins size={16} /> Import Tokens
              </button>
            )}
            
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

        {/* Warning Banner */}
        {showWarning && (
          <div className="warning-banner" style={{ background: 'rgba(245, 158, 11, 0.1)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex items-center gap-2 text-warning text-sm font-semibold">
              <AlertTriangle size={16} />
              <span>TESTNET NOTICE: We are currently utilizing custom mock WETH, WBTC, LINK, and USDC tokens to provide flexibility when testing the reactive liquidation engine. You can import these custom assets directly into your wallet.</span>
            </div>
            <button onClick={() => setShowWarning(false)} style={{ background: 'none', border: 'none', color: 'var(--warning-yellow)', cursor: 'pointer', padding: '0.25rem' }}>
              &times;
            </button>
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="content-area">
          
          {activeTab === 'dashboard' && (
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
                  <button className="btn btn-primary flex-1 pl-4 pr-4" onClick={() => setActiveTab('borrow')}>
                    Manage Assets
                  </button>
                  <button className="btn btn-secondary flex-1 pl-4 pr-4 border hover:bg-white/5" onClick={() => setActiveTab('markets')}>
                    View Markets
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
          )}

          {activeTab === 'borrow' && (
            <div className="max-width-1000" style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <div className="flex gap-6 flex-col md:flex-row">
                
                {/* DEPOSIT CARD */}
                <div className="flex-1 card">
                  <div className="card-header">
                    <h3 className="card-title"><ArrowUpRight size={20} className="text-safe" /> Supply Assets</h3>
                  </div>
                  <p className="text-sm text-secondary mb-6">Supply assets as collateral to start borrowing against them.</p>
                  
                  <div className="form-group">
                    <label className="input-label">Select Asset</label>
                    <select 
                      className="select-field" 
                      value={depositAsset} 
                      onChange={(e) => setDepositAsset(e.target.value)}
                    >
                      <option value="WETH">WETH</option>
                      <option value="WBTC">WBTC</option>
                      <option value="LINK">LINK</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="input-label">Amount</label>
                    <div className="input-group">
                      <input 
                        type="number" 
                        className="input-field" 
                        placeholder="0.00" 
                        value={depositAmount} 
                        onChange={(e) => setDepositAmount(e.target.value)}
                      />
                      <span className="input-suffix">{depositAsset}</span>
                    </div>
                  </div>

                  <div className="bg-panel border rounded-lg p-4 mb-6">
                    <div className="flex justify-between text-xs text-secondary mb-1">
                      <span>Protocol Fee</span>
                      <span>0.00%</span>
                    </div>
                    <div className="flex justify-between text-xs text-secondary">
                      <span>Supply APY</span>
                      <span className="text-safe">+2.4%</span>
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary w-full" 
                    onClick={handleDeposit}
                    disabled={!walletAddress || !depositAmount}
                  >
                    Supply {depositAsset}
                  </button>
                </div>

                {/* BORROW CARD */}
                <div className="flex-1 card">
                  <div className="card-header">
                    <h3 className="card-title"><ArrowDownLeft size={20} className="text-accent" /> Borrow Assets</h3>
                  </div>
                  <p className="text-sm text-secondary mb-6">Borrow stablecoins against your supplied collateral value.</p>
                  
                  <div className="form-group">
                    <label className="input-label">Select Asset</label>
                    <select 
                      className="select-field" 
                      value={borrowAsset} 
                      onChange={(e) => setBorrowAsset(e.target.value)}
                    >
                      <option value="USDC">USDC (Stable)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="input-label">Amount</label>
                    <div className="input-group">
                      <input 
                        type="number" 
                        className="input-field" 
                        placeholder="0.00" 
                        value={borrowAmount} 
                        onChange={(e) => setBorrowAmount(e.target.value)}
                      />
                      <span className="input-suffix">USDC</span>
                    </div>
                  </div>

                  <div className="bg-panel border rounded-lg p-4 mb-6">
                    <div className="flex justify-between text-xs text-secondary mb-1">
                      <span>Borrow Rate</span>
                      <span className="text-danger">5.2% APY</span>
                    </div>
                    <div className="flex justify-between text-xs text-secondary">
                      <span>Available Liquidity</span>
                      <span>$1.2M</span>
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary w-full" 
                    onClick={handleBorrow}
                    disabled={!walletAddress || !borrowAmount}
                  >
                    Borrow USDC
                  </button>
                </div>
              </div>

              <div className="card mt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-accent-blue/10 rounded-lg text-accent">
                    <Info size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Risk Management Info</h4>
                    <p className="text-sm text-secondary">
                      Ensure your Health Factor stays above 1.0 to avoid liquidation. Liquidations on Voltiq are **reactive**, meaning they are automatically triggered by the Somnia network the moment your position becomes underwater.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faucet' && (
            <div className="max-width-600" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title"><Coins size={22} className="text-warning" /> Testnet Faucet</h3>
                </div>
                <p className="text-sm text-secondary mb-6">
                  Voltiq is currently on testnet. Use this faucet to mint mock tokens so you can test the supply and borrow functionality.
                </p>

                <div className="form-group">
                  <label className="input-label">Asset to Mint</label>
                  <select 
                    className="select-field" 
                    value={mintAsset} 
                    onChange={(e) => setMintAsset(e.target.value)}
                  >
                    <option value="WETH">WETH</option>
                    <option value="WBTC">WBTC</option>
                    <option value="LINK">LINK</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="input-label">Amount</label>
                  <div className="input-group">
                    <input 
                      type="number" 
                      className="input-field" 
                      value={mintAmount} 
                      onChange={(e) => setMintAmount(e.target.value)}
                    />
                    <span className="input-suffix">{mintAsset}</span>
                  </div>
                </div>

                <button 
                  className="btn btn-primary w-full mt-2" 
                  onClick={handleMint}
                  disabled={!walletAddress || !mintAmount}
                >
                  Mint Mock {mintAsset}
                </button>

                <div className="mt-8 border-t border-dashed border-white/10 pt-6">
                  <h4 className="text-xs font-bold text-secondary uppercase mb-3 text-center">Your Balances</h4>
                  <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="bg-panel p-3 rounded-lg flex justify-between">
                      <span className="text-sm">WETH</span>
                      <span className="font-mono text-sm">--</span>
                    </div>
                    <div className="bg-panel p-3 rounded-lg flex justify-between">
                      <span className="text-sm">USDC</span>
                      <span className="font-mono text-sm">--</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'markets' || activeTab === 'liquidations') && (
            <div className="flex flex-col items-center justify-center p-20 opacity-40">
              <Database size={64} className="mb-4" />
              <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h3>
              <p>Coming soon to Voltiq Protocol</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;

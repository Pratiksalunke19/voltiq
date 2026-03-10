import React, { useState, useEffect } from 'react';
import { Wallet, Activity, Zap, RefreshCcw, ShieldAlert, ShieldCheck } from 'lucide-react';
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
};

function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [data, setData] = useState(MOCK_DATA);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

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
      
      // Formatting from 18 decimals
      const collateral = Number(ethers.formatUnits(pos.collateralValue.toString(), 18));
      const borrow = Number(ethers.formatUnits(pos.borrowValue.toString(), 18));
      
      // Format HF if borrow > 0, otherwise it's type(uint256).max which is safe
      let hf = 999;
      if (borrow > 0 && pos.healthFactor) {
        hf = Number(ethers.formatUnits(pos.healthFactor.toString(), 18));
      }

      setData(prev => ({
        ...prev,
        healthFactor: hf === 999 ? 0 : hf,
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

  const handleDevSetup = async () => {
    if (!walletAddress || !provider) return;
    try {
      const signer = await provider.getSigner();
      
      const weth = new ethers.Contract(CONTRACT_ADDRESSES['WETH'], ABIS['MockERC20'], signer);
      
      console.log("Minting WETH for testing...");
      let tx = await weth.mint(walletAddress, ethers.parseEther('10'));
      await tx.wait();

      console.log("Approving WETH...");
      tx = await weth.approve(CONTRACT_ADDRESSES['LendingPool'], ethers.MaxUint256);
      await tx.wait();

      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES['LendingPool'], ABIS['LendingPool'], signer);
      console.log("Depositing 1 WETH...");
      tx = await lendingPool.deposit(CONTRACT_ADDRESSES['WETH'], ethers.parseEther('1'));
      await tx.wait();
      
      console.log("Fetching new data...");
      await fetchUserData(walletAddress, provider);
    } catch(err) {
      console.error("Setup failed!", err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar glass-panel">
        <div className="nav-brand">
          <Zap className="brand-icon" size={28} />
          <h1 className="gradient-text">VOLTIQ</h1>
        </div>
        <div className="nav-actions">
          <button className="btn-secondary" onClick={() => window.location.reload()}>
            <RefreshCcw size={16} style={{ marginRight: '8px' }} />
            Refresh
          </button>
          {walletAddress ? (
            <div className="wallet-badge glass-panel">
              <span className="dot online"></span>
              {truncateAddress(walletAddress)}
            </div>
          ) : (
            <button className="btn-primary" onClick={connectWallet} disabled={isConnecting}>
              <Wallet size={18} style={{ marginRight: '8px' }} />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <header className="page-header animate-fade-in">
          <h2 className="title">Reactive Dashboard</h2>
          <p className="subtitle">Real-time risk monitoring & auto-liquidations</p>
        </header>

        <div className="dashboard-grid">
          {/* User Position Card */}
          <div className="glass-panel card animate-fade-in delay-100 position-card">
            <div className="card-header">
              <h3>Your Position</h3>
              {healthStatus === 'danger' ? (
                <div className="badge danger"><ShieldAlert size={14} /> Critical Risk</div>
              ) : healthStatus === 'warning' ? (
                <div className="badge warning"><Activity size={14} /> Attention</div>
              ) : (
                <div className="badge safe"><ShieldCheck size={14} /> Safe</div>
              )}
            </div>

            <div className="health-factor-section">
              <div className="hf-label">
                <span>Health Factor</span>
                <span className={`hf-value status-${healthStatus}`}>{data.healthFactor.toFixed(2)}</span>
              </div>
              <div className="progress-bg mt-2">
                <div 
                  className={`progress-fill progress-${healthStatus}`} 
                  style={{ width: `${Math.min((data.healthFactor / 2) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="hint mt-2">Liquidation triggered if HF drops below 1.0</p>
            </div>

            <div className="stats-row mt-4">
              <div className="stat-box">
                <div className="stat-label">Collateral</div>
                <div className="stat-value text-xl">{formatCurrency(data.collateralUsd)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Borrowed</div>
                <div className="stat-value text-xl">{formatCurrency(data.borrowUsd)}</div>
              </div>
            </div>

            <div className="action-buttons mt-4">
              <button className="btn-primary flex-1" onClick={handleDevSetup}>Test: Deposit 1 WETH</button>
              <button className="btn-secondary flex-1">Repay Debt</button>
            </div>
          </div>

          {/* Protocol Stats Card */}
          <div className="glass-panel card animate-fade-in delay-200 protocol-card">
            <div className="card-header">
              <h3>Protocol Overview</h3>
            </div>
            <div className="stats-grid mt-4">
              <div className="glass-panel inner-card">
                <div className="stat-label">Total Value Locked</div>
                <div className="stat-value gradient-text">{formatCurrency(data.protocolTvl)}</div>
              </div>
              <div className="glass-panel inner-card">
                <div className="stat-label">Active Loans</div>
                <div className="stat-value">{data.activeLoans}</div>
              </div>
              <div className="glass-panel inner-card">
                <div className="stat-label">Reactivity Status</div>
                <div className="stat-value status-safe flex-center" style={{fontSize: '1.25rem'}}>
                  <span className="dot online ripple mr-2"></span> Somnia Active
                </div>
              </div>
              <div className="glass-panel inner-card">
                <div className="stat-label">Liquidation Limit</div>
                <div className="stat-value">{data.liquidationThreshold * 100}%</div>
              </div>
            </div>
          </div>
          
          {/* Recent Activity / Liquidation Log */}
          <div className="glass-panel card animate-fade-in delay-300 activity-card span-full">
            <div className="card-header">
              <h3>Reactive Liquidation Engine Log</h3>
            </div>
            <div className="table-responsive mt-3">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>User</th>
                    <th>Trigger HF</th>
                    <th>Seized / Repaid</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="badge danger">Liquidated</span></td>
                    <td>0x4f...8a2b</td>
                    <td>0.98</td>
                    <td>$340.50 / $320.00</td>
                    <td>2 mins ago</td>
                  </tr>
                  <tr>
                    <td><span className="badge danger">Liquidated</span></td>
                    <td>0x9c...1e45</td>
                    <td>0.95</td>
                    <td>$1250.00 / $1190.47</td>
                    <td>15 mins ago</td>
                  </tr>
                  <tr>
                    <td><span className="badge warning">Warning</span></td>
                    <td>0x2a...7c99</td>
                    <td>1.02</td>
                    <td>--</td>
                    <td>1 hr ago</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

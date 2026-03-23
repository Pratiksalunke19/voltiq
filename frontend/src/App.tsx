import { useState, useEffect } from 'react';
import { 
  Wallet, Zap, ShieldAlert, ShieldCheck, 
  PieChart, Sliders, AlertTriangle, LineChart, LayoutDashboard,
  RefreshCcw, ArrowRightLeft, Database, Activity,
  ArrowUpRight, ArrowDownLeft, Coins, Info,
  Menu, Moon, Sun, Settings, Download, User
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
    { asset: 'WETH', amount: 0, percentage: 0, color: '#3b82f6' },
    { asset: 'WBTC', amount: 0, percentage: 0, color: '#f59e0b' },
  ]
};

type Tab = 'dashboard' | 'borrow' | 'profile' | 'markets' | 'liquidations' | 'faucet' | 'activity' | 'settings';

function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [data, setData] = useState(MOCK_DATA);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [simPriceDrop, setSimPriceDrop] = useState(0);
  const [simRepayAmount, setSimRepayAmount] = useState(0);
  const [simBorrowDebt, setSimBorrowDebt] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showWarning, setShowWarning] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [walletBalances, setWalletBalances] = useState<Record<string, string>>({
    WETH: '--',
    WBTC: '--',
    USDC: '--'
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);

  // Fetch real on-chain price on initial load
  useEffect(() => {
    let active = true;
    const fetchOraclePrice = async () => {
      try {
        const jsonRpcProvider = new ethers.JsonRpcProvider("https://dream-rpc.somnia.network/");
        const oracle = new ethers.Contract(CONTRACT_ADDRESSES['ORACLE'], ABIS['ChainlinkPriceOracle'], jsonRpcProvider);
        
        // Fetch WETH Price
        const wethPriceBN = await oracle.getPrice(CONTRACT_ADDRESSES['WETH']);
        const wethPriceNum = Number(ethers.formatUnits(wethPriceBN, 18));
        
        // Fetch WBTC Price
        const wbtcPriceBN = await oracle.getPrice(CONTRACT_ADDRESSES['WBTC']);
        const wbtcPriceNum = Number(ethers.formatUnits(wbtcPriceBN, 18));
        
        // Fetch LINK Price
        const linkPriceBN = await oracle.getPrice(CONTRACT_ADDRESSES['LINK']);
        const linkPriceNum = Number(ethers.formatUnits(linkPriceBN, 18));
        
        if (active) {
          if (wethPriceNum > 0) setSimEthPrice(wethPriceNum);
          
          setData(prev => ({
            ...prev,
            prices: {
              ...prev.prices,
              WETH: wethPriceNum > 0 ? wethPriceNum : prev.prices.WETH,
              WBTC: wbtcPriceNum > 0 ? wbtcPriceNum : prev.prices.WBTC,
              LINK: linkPriceNum > 0 ? linkPriceNum : prev.prices.LINK,
              USDC: 1.00
            }
          }));
        }
      } catch (err) {
        console.error("Failed to fetch initial oracle prices", err);
      }
    };
    fetchOraclePrice();
    return () => { active = false; };
  }, []);
  
  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [depositAsset, setDepositAsset] = useState('WETH');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [borrowAsset, setBorrowAsset] = useState('USDC');
  const [mintAmount, setMintAmount] = useState('1000');
  const [mintAsset, setMintAsset] = useState('USDC');

  // Multi-converter states
  const [converterAmount, setConverterAmount] = useState('1');
  const [converterAsset, setConverterAsset] = useState('WETH');
  const [converterToUsd, setConverterToUsd] = useState(true);

  // Get status based on health factor
  const getHealthStatus = (hf: number) => {
    if (hf < 1.05) return 'danger';
    if (hf < 1.3) return 'warning';
    return 'safe';
  };

  const healthStatus = getHealthStatus(data.healthFactor);

  // Risk Assessment Calculations:
  // DROP % = (1 - 1/HF) * 100
  const dropToLiquidate = data.borrowUsd > 0 && data.healthFactor > 1 
    ? (1 - (1 / data.healthFactor)) * 100 
    : 0;

  // HF 1.3 = ((Collateral + Extra) * 0.8) / Debt
  // 1.3 * Debt / 0.8 = Collateral + Extra
  // 1.625 * Debt = Collateral + Extra
  // Extra = (1.625 * Debt) - Collateral
  const collateralToSafeZone = data.borrowUsd > 0 
    ? Math.max(0, (1.625 * data.borrowUsd) - data.collateralUsd) 
    : 0;

  // Live Activity State
  const [reactiveEvents, setReactiveEvents] = useState<any[]>([]);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [simEthPrice, setSimEthPrice] = useState(2500);
  const [liquidationCountdown, setLiquidationCountdown] = useState<number | null>(null);
  const [hasLiquidated, setHasLiquidated] = useState(false);

  // Listen for Reactive Events
  useEffect(() => {
    if (!provider || !walletAddress) return;

    const engine = new ethers.Contract(
      CONTRACT_ADDRESSES['ReactiveLiquidationEngine'],
      ABIS['ReactiveLiquidationEngine'],
      provider
    );

    const handleEvent = (type: string, details: any, eventData?: any) => {
      setReactiveEvents(prev => {
        // Create a unique key for the event if possible
        const eventId = eventData?.log?.transactionHash && eventData?.log?.index !== undefined
          ? `${eventData.log.transactionHash}-${eventData.log.index}`
          : `${type}-${Date.now()}`;

        // Deduplication check
        if (prev.some(e => e.id === eventId)) return prev;

        return [{
          id: eventId,
          type,
          timestamp: new Date().toLocaleTimeString(),
          ...details
        }, ...prev].slice(0, 50);
      });
    };

    // Subscriptions
    const onUserChecked = (user: string, hf: bigint, event: any) => {
      console.log("Reactivity: User Checked", user, hf);
      handleEvent('USER_CHECKED', { 
        user, 
        hf: Number(ethers.formatUnits(hf, 18)).toFixed(4) 
      }, event);
      if (user.toLowerCase() === walletAddress.toLowerCase()) {
        fetchUserData(walletAddress, provider);
      }
    };

    const onLiquidation = (user: string, hf: bigint, event: any) => {
      console.log("Reactivity: LIQUIDATION TRIGGERED", user);
      handleEvent('LIQUIDATION', { 
        user, 
        hf: Number(ethers.formatUnits(hf, 18)).toFixed(4) 
      }, event);
      if (user.toLowerCase() === walletAddress?.toLowerCase()) {
        setHasLiquidated(true);
      }
    };

    const onEventSuccess = (_emitter: string, count: bigint, event: any) => {
      handleEvent('SYNC_SUCCESS', { count: count.toString() }, event);
    };

    engine.on("DebugUserChecked", onUserChecked);
    engine.on("DebugLiquidationTriggered", onLiquidation);
    engine.on("DebugOnEventSuccess", onEventSuccess);

    return () => {
      engine.off("DebugUserChecked", onUserChecked);
      engine.off("DebugLiquidationTriggered", onLiquidation);
      engine.off("DebugOnEventSuccess", onEventSuccess);
    };
  }, [provider, walletAddress]);

  // Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (liquidationCountdown !== null && liquidationCountdown > 0) {
      timer = setTimeout(() => {
        setLiquidationCountdown(liquidationCountdown - 1);
      }, 1000);
    } else if (liquidationCountdown === 0) {
      setLiquidationCountdown(null);
      executeReactivity();
    }
    return () => clearTimeout(timer);
  }, [liquidationCountdown]);

  const executeReactivity = async () => {
    if (!walletAddress || !provider) return;
    setIsUpdatingPrice(true);
    try {
      const jsonRpcProvider = new ethers.JsonRpcProvider("https://dream-rpc.somnia.network/");
      const backendSigner = new ethers.Wallet("0x22881bef74fc2b6931f6295155e5fb61918ff062c4e4080a80050786c94bcaa6", jsonRpcProvider);
      const oracle = new ethers.Contract(CONTRACT_ADDRESSES['ORACLE'], ABIS['ChainlinkPriceOracle'], backendSigner);
      
      console.log("Notifying Oracle of price update [AUTO-SIGNER]...");
      let tx = await oracle.notifyPriceUpdate(CONTRACT_ADDRESSES['WETH']);
      await tx.wait();
      
      await fetchUserData(walletAddress, provider);
    } catch (err) {
      console.error("Reactivity trigger failed", err);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

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

      // 1. Fetch individual collateral amounts
      const wethCollateralBN = await positionManager.sUserCollateral(address, CONTRACT_ADDRESSES['WETH']);
      const wbtcCollateralBN = await positionManager.sUserCollateral(address, CONTRACT_ADDRESSES['WBTC']);
      
      const wethAmount = Number(ethers.formatUnits(wethCollateralBN, 18));
      const wbtcAmount = Number(ethers.formatUnits(wbtcCollateralBN, 18));

      // 2. Fetch Wallet Balances
      const wethToken = new ethers.Contract(CONTRACT_ADDRESSES['WETH'], ABIS['MockERC20'], provider);
      const wbtcToken = new ethers.Contract(CONTRACT_ADDRESSES['WBTC'], ABIS['MockERC20'], provider);
      const usdcToken = new ethers.Contract(CONTRACT_ADDRESSES['USDC'], ABIS['MockERC20'], provider);
      
      const [wethWallet, wbtcWallet, usdcWallet] = await Promise.all([
        wethToken.balanceOf(address),
        wbtcToken.balanceOf(address),
        usdcToken.balanceOf(address)
      ]);

      setWalletBalances({
        WETH: Number(ethers.formatUnits(wethWallet, 18)).toFixed(4),
        WBTC: Number(ethers.formatUnits(wbtcWallet, 18)).toFixed(4),
        USDC: Number(ethers.formatUnits(usdcWallet, 18)).toFixed(4)
      });

      // 3. Use prices from current state or fetch fresh
      const oracle = new ethers.Contract(CONTRACT_ADDRESSES['ORACLE'], ABIS['ChainlinkPriceOracle'], provider);
      const wethPriceBN = await oracle.getPrice(CONTRACT_ADDRESSES['WETH']);
      const wbtcPriceBN = await oracle.getPrice(CONTRACT_ADDRESSES['WBTC']);
      const linkPriceBN = await oracle.getPrice(CONTRACT_ADDRESSES['LINK']);
      
      const wethPrice = Number(ethers.formatUnits(wethPriceBN, 18));
      const wbtcPrice = Number(ethers.formatUnits(wbtcPriceBN, 18));
      const linkPrice = Number(ethers.formatUnits(linkPriceBN, 18));
      
      const wethValueUsd = wethAmount * wethPrice;
      const wbtcValueUsd = wbtcAmount * wbtcPrice;
      const totalValue = wethValueUsd + wbtcValueUsd;

      let wethPercentage = 0;
      let wbtcPercentage = 0;
      
      if (totalValue > 0) {
        // Calculate percentages based on USD value
        wethPercentage = Math.round((wethValueUsd / totalValue) * 100);
        wbtcPercentage = 100 - wethPercentage; // Ensure it sums to exactly 100
      }

      const collateralDistribution = [
        { asset: 'WETH', amount: wethAmount, percentage: wethPercentage, color: '#3b82f6' },
        { asset: 'WBTC', amount: wbtcAmount, percentage: wbtcPercentage, color: '#f59e0b' },
      ];

      setData(prev => ({
        ...prev,
        healthFactor: hf,
        collateralUsd: collateral,
        borrowUsd: borrow,
        collateralDistribution,
        prices: {
          ...prev.prices,
          WETH: wethPrice,
          WBTC: wbtcPrice,
          LINK: linkPrice,
          USDC: 1.00
        }
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
      
      await fetchUserData(walletAddress, provider);
      alert(`Minted ${mintAmount} ${mintAsset} to your wallet!`);
    } catch(err) {
      console.error("Mint failed!", err);
    }
  };

  const handlePriceChange = async (newPrice: number) => {
    setSimEthPrice(newPrice);
    setHasLiquidated(false);
    
    // Optimistic UI update logic...
    if (!walletAddress || !provider) {
      alert("Please connect your wallet first!");
      return;
    }
    setIsUpdatingPrice(true);
    try {
      const jsonRpcProvider = new ethers.JsonRpcProvider("https://dream-rpc.somnia.network/");
      const backendSigner = new ethers.Wallet("0x22881bef74fc2b6931f6295155e5fb61918ff062c4e4080a80050786c94bcaa6", jsonRpcProvider);
      
      const oracle = new ethers.Contract(CONTRACT_ADDRESSES['ORACLE'], ABIS['ChainlinkPriceOracle'], backendSigner);
      const assetAddr = CONTRACT_ADDRESSES['WETH'];
      const feedAddr = await oracle.sPriceFeeds(assetAddr);
      
      const feed = new ethers.Contract(feedAddr, ABIS['MockChainlinkAggregator'], backendSigner);
      
      // Chainlink mocks use 8 decimals for USD feeds
      const price8Decimals = Math.round(newPrice * 1e8);
      console.log(`Setting ETH price to ${newPrice} (${price8Decimals}) [AUTO-SIGNER]...`);
      
      let tx = await feed.setPrice(price8Decimals);
      await tx.wait();
      
      // Update local UI price immediately for better UX
      setData(prev => {
        const priceRatio = newPrice / prev.prices.WETH;
        const newCollateral = prev.collateralUsd * priceRatio;
        const newHf = prev.borrowUsd > 0 ? (newCollateral * prev.liquidationThreshold) / prev.borrowUsd : 999;
        
        return {
          ...prev,
          healthFactor: newHf,
          collateralUsd: newCollateral,
          prices: {
            ...prev.prices,
            WETH: newPrice
          }
        };
      });

      // Start 10 seconds countdown -> executeReactivity runs at 0!
      setLiquidationCountdown(10);
    } catch(err) {
      console.error("Price update failed", err);
      alert("Transaction failed.");
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const simCollateral = data.collateralUsd * (1 - simPriceDrop / 100);
  const simDebt = Math.max(0, data.borrowUsd + simBorrowDebt - simRepayAmount);
  const simHf = simDebt > 0 ? (simCollateral * 0.8) / simDebt : (simCollateral > 0 ? 9.99 : 0);
  const simStatus = getHealthStatus(simHf);

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand" onClick={() => setActiveTab('dashboard')} style={{cursor: 'pointer'}}>
            <Zap className="brand-icon" size={28} />
            <span className="brand-text">VOLTIQ</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} title="Dashboard">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </div>
          {/* <div className={`nav-item ${activeTab === 'markets' ? 'active' : ''}`} onClick={() => setActiveTab('markets')} title="Markets">
            <Database size={20} />
            <span>Markets</span>
          </div> */}
          <div className={`nav-item ${activeTab === 'borrow' ? 'active' : ''}`} onClick={() => setActiveTab('borrow')} title="Borrow / Repay">
            <ArrowRightLeft size={20} />
            <span>Borrow / Repay</span>
          </div>
          <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')} title="Profile">
            <User size={20} />
            <span>Profile</span>
          </div>
          {/* <div className={`nav-item ${activeTab === 'liquidations' ? 'active' : ''}`} onClick={() => setActiveTab('liquidations')} title="Liquidations">
            <ShieldAlert size={20} />
            <span>Liquidations</span>
          </div> */}
          <div className={`nav-item ${activeTab === 'faucet' ? 'active' : ''}`} onClick={() => setActiveTab('faucet')} title="Faucet">
            <Coins size={20} />
            <span>Faucet</span>
          </div>
          <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} title="Settings">
            <Settings size={20} />
            <span>Settings</span>
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
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="btn btn-secondary border-none" style={{ padding: '0.4rem', border: 'none' }}>
              <Menu size={20} />
            </button>
            <div className="live-indicator hidden md:flex">
              <span className="dot"></span>
              Somnia RPC Active
            </div>
            {hasLiquidated && (
              <span className="badge badge-danger text-[10px] animate-pulse">
                <ShieldAlert size={12} /> PARTIAL LIQUIDATION EXECUTED
              </span>
            )}
          </div>
          
          <div className="topbar-actions">
            <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={() => setIsLightMode(!isLightMode)}>
              {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
            </button>
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
{/* LIQUIDATION DEMO COUNTDOWN */}
              {liquidationCountdown !== null && (
                <div className="col-span-12 card border-warning/50 bg-warning/10 mb-2 flex flex-col justify-center animate-in" style={{ borderColor: 'var(--warning-yellow)', backgroundColor: 'var(--warning-bg)' }}>
                  <div className="flex justify-between w-full items-center mb-2">
                    <h3 className="card-title text-warning flex items-center gap-2">
                      <AlertTriangle size={18} className="animate-pulse" /> 
                      Demonstration: Reactivity will liquidate in {liquidationCountdown}s...
                    </h3>
                    <div className="flex gap-4 items-center">
                      <span className="text-xs text-warning font-semibold uppercase tracking-wider hidden sm:block">
                        (Real-world execution is instant)
                      </span>
                      <button 
                        style={{ background: 'var(--warning-yellow)', color: 'black', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                        onClick={() => setLiquidationCountdown(0)}
                      >
                         Skip Timer
                      </button>
                    </div>
                  </div>
                  <div className="progress-bar-bg h-2 w-full" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}>
                    <div 
                      className="progress-bar-fill transition-all duration-1000 ease-linear"
                      style={{ 
                        width: `${(liquidationCountdown / 10) * 100}%`,
                        backgroundColor: 'var(--warning-yellow)'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* YOUR POSITION CARD */}
              <div className="col-span-12 lg:col-span-12 card">
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
                      {data.borrowUsd === 0 ? (data.collateralUsd > 0 ? '>9.99' : '0.00') : (data.healthFactor > 9.9 ? '>9.99' : data.healthFactor.toFixed(2))}
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
                  
                  {healthStatus !== 'safe' && data.borrowUsd > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2 p-3 bg-white/5 rounded-lg animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle size={16} className={`text-${healthStatus}`} />
                        <span className={`font-bold text-${healthStatus}`}>
                          {healthStatus === 'danger' ? 'Liquidation imminent' : 'Position at Risk'} — Health Factor at {data.healthFactor.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm text-secondary leading-relaxed flex flex-col gap-1">
                        <div>Price drop of <span className="text-white font-bold font-mono">{dropToLiquidate.toFixed(1)}%</span> will trigger automatic liquidation.</div>
                        <div className="flex items-center gap-1">
                          <ShieldCheck size={12} className="text-safe" />
                          <span>Add <span className="text-safe font-bold font-mono">{formatCurrency(collateralToSafeZone)}</span> collateral to reach safe zone (HF 1.3).</span>
                        </div>
                      </div>
                    </div>
                  )}
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

              {/* LIVE REACTIVITY FEED (Moved to Profile) */}
              
              {/* ADVANCED SIMULATOR */}
              <div className="col-span-12 lg:col-span-12 card">
                <div className="card-header">
                  <h3 className="card-title"><Sliders size={18} className="text-accent" /> Position Simulator</h3>
                  <div className="badge badge-neutral">Draft Model</div>
                </div>
                
                <p className="text-secondary text-xs px-2 mb-4">Drag sliders to model how market volatility or balance changes affect your safety factor.</p>
                
                <div className="flex flex-col gap-6 p-2">
                  {/* Price Drop Slider */}
                  <div className="flex items-center gap-6">
                    <span className="w-40 text-sm font-semibold text-secondary">Collateral price drop</span>
                    <input 
                      type="range" min="0" max="100" step="1" 
                      value={simPriceDrop} onChange={(e) => setSimPriceDrop(Number(e.target.value))}
                      className="flex-1 range-slider"
                    />
                    <span className="w-12 text-sm font-mono font-bold text-right">{simPriceDrop}%</span>
                  </div>

                  {/* Extra Collateral Slider */}
                  <div className="flex items-center gap-6">
                    <span className="w-40 text-sm font-semibold text-secondary">Repay Debt</span>
                    <input 
                      type="range" min="0" max={Math.max(10000, Math.round(data.borrowUsd))} step={Math.max(10, Math.round(data.borrowUsd / 100))} 
                      value={simRepayAmount} onChange={(e) => setSimRepayAmount(Number(e.target.value))}
                      className="flex-1 range-slider"
                    />
                    <span className="w-20 text-sm font-mono font-bold text-right">${simRepayAmount.toLocaleString()}</span>
                  </div>

                  {/* Borrow Extra Slider */}
                  <div className="flex items-center gap-6">
                    <span className="w-40 text-sm font-semibold text-secondary">Borrow extra</span>
                    <input 
                      type="range" min="0" max={Math.max(10000, Math.round(data.collateralUsd))} step={Math.max(1, Math.round(data.collateralUsd / 100))} 
                      value={simBorrowDebt} onChange={(e) => setSimBorrowDebt(Number(e.target.value))}
                      className="flex-1 range-slider"
                    />
                    <span className="w-20 text-sm font-mono font-bold text-right">${simBorrowDebt.toLocaleString()}</span>
                  </div>

                  {/* Result area */}
                  <div className="bg-panel rounded-xl p-6 mt-4 border border-white/5">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-secondary uppercase tracking-wider">Simulated Health Factor</p>
                          <span className={`badge badge-${simStatus} text-[10px] py-0 px-2 h-5`}>
                             {simStatus === 'safe' ? 'Safe' : simStatus === 'danger' ? 'Critical' : 'Warning'}
                          </span>
                        </div>
                        <p className="text-xs text-muted mb-0">
                          {simHf < 1.0 ? 'Position will be liquidated' : simHf < 1.3 ? 'Position is at risk' : 'Healthy position buffer'}
                        </p>
                      </div>
                      <div className={`text-4xl font-bold font-mono text-${simStatus}`}>
                        {simHf > 9.9 ? '>9.99' : simHf.toFixed(2)}
                      </div>
                    </div>

                    <div className="progress-bar-bg h-2">
                      <div 
                        className="progress-bar-fill"
                        style={{ 
                          width: `${Math.min((simHf / 2) * 100, 100)}%`,
                          backgroundColor: `var(--${simStatus === 'danger' ? 'danger-red' : simStatus === 'warning' ? 'warning-yellow' : 'safe-green'})`
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-2">
                    <button className="flex-1 p-3 rounded-lg border border-white/5 bg-surface-hover hover:border-accent/40 transition-all text-left group">
                      <div className="text-accent font-bold text-sm flex items-center gap-1 group-hover:text-white transition-colors">
                        Get exact recommendation <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                      <div className="text-[10px] text-muted">AI-powered safe amount</div>
                    </button>
                    <button className="flex-1 p-3 rounded-lg border border-white/5 bg-surface-hover hover:border-white/20 transition-all text-left group">
                      <div className="text-white font-bold text-sm flex items-center gap-1">
                        Explain my risk <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                      <div className="text-[10px] text-muted">Plain-language breakdown</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* COLLATERAL DISTRIBUTION (Moved to Profile) */}

              {/* LIVE PRICE FEED CONTROLLER */}
              <div className="col-span-12 lg:col-span-8 card border-accent/20 bg-accent/5">
                <div className="card-header">
                  <h3 className="card-title text-accent flex items-center gap-2">
                    <Zap size={18} /> Live Price Controller (Simulate Reactivity)
                  </h3>
                  {isUpdatingPrice && (
                    <span className="flex items-center gap-2 text-xs text-accent animate-pulse">
                      <RefreshCcw size={12} className="animate-spin" /> Processing On-Chain...
                    </span>
                  )}
                </div>
                <p className="text-xs text-secondary mb-4">
                  Adjust the ETH price below. This will execute <b>on-chain transactions</b> to update the Mock Oracle and trigger the <b>Reactive Liquidation Engine</b>.
                </p>
                
                <div className="flex items-center gap-6 bg-panel rounded-xl p-6 border border-white/5">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold">WETH Price Feed</span>
                      <span className="font-mono font-bold text-xl text-accent">${simEthPrice}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1000" 
                      max="4000" 
                      step="50" 
                      value={simEthPrice} 
                      onChange={(e) => setSimEthPrice(Number(e.target.value))}
                      className="range-slider accent-primary"
                      disabled={isUpdatingPrice}
                    />
                    <div className="flex justify-between text-[10px] text-muted mt-2 uppercase tracking-tighter">
                      <span>Min: $1,000</span>
                      <span>Current: $2,500</span>
                      <span>Max: $4,000</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {[1200, 2000, 2500, 3500].map(price => (
                        <button 
                          key={price}
                          className="btn btn-secondary px-2 py-1 text-[10px] min-w-0"
                          onClick={() => setSimEthPrice(price)}
                        >
                          ${price}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="w-full h-full flex items-center justify-center">
                  <button 
                    className={`btn ${simEthPrice < 2000 ? 'btn-danger' : 'btn-primary'} h-full px-8 py-4 flex flex-col items-center justify-center gap-1`}
                    onClick={() => handlePriceChange(simEthPrice)}
                    disabled={isUpdatingPrice || !walletAddress}
                    style={{ minWidth: '160px' }}
                  >
                    <Activity size={20} />
                    <span className="text-xs font-bold">PUSH UPDATE</span>
                  </button>
                  </div>
                </div>
                
                {!walletAddress && (
                  <p className="text-[10px] text-danger mt-3 text-center font-semibold">
                    * Wallet connection required to push on-chain updates
                  </p>
                )}
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

              {/* TOKEN PRICE CONVERTER */}
              <div className="card mt-6 border-accent/10 bg-accent/5">
                <div className="card-header mb-6">
                  <div className="flex flex-col">
                    <h3 className="card-title text-accent">
                      <RefreshCcw size={18} /> Price Converter
                    </h3>
                    <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Real-time Oracle Rates</p>
                  </div>
                  <div className="badge badge-neutral text-[10px]">Somnia Feed Sync</div>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-4">
                  {/* FROM */}
                  <div className="flex-1 w-full bg-panel p-4 rounded-xl border border-white/5">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2 block">
                      {converterToUsd ? 'You Convert' : 'You Provide'}
                    </label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        className="bg-transparent border-none text-xl font-bold font-mono text-white outline-none w-full"
                        value={converterAmount} 
                        onChange={(e) => setConverterAmount(e.target.value)}
                        placeholder="0.00"
                      />
                      <div className="flex items-center gap-1 bg-surface-hover px-2 py-1 rounded-lg border border-white/10">
                        {converterToUsd ? (
                          <select 
                            className="bg-transparent border-none text-xs font-bold text-white outline-none cursor-pointer pr-4 uppercase"
                            value={converterAsset}
                            onChange={(e) => setConverterAsset(e.target.value)}
                            style={{ backgroundImage: 'none', paddingRight: '0.25rem' }}
                          >
                            <option value="WETH">WETH</option>
                            <option value="WBTC">WBTC</option>
                            <option value="LINK">LINK</option>
                            <option value="USDC">USDC</option>
                          </select>
                        ) : (
                          <span className="text-xs font-bold px-1">USD</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SWAP ICON */}
                  <button 
                    className="p-3 rounded-full bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent transition-all group"
                    onClick={() => setConverterToUsd(!converterToUsd)}
                  >
                    <ArrowRightLeft size={18} className={`transition-transform duration-300 ${converterToUsd ? 'rotate-0' : 'rotate-180'}`} />
                  </button>

                  {/* TO */}
                  <div className="flex-1 w-full bg-accent/10 p-4 rounded-xl border border-accent/20">
                    <label className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2 block">
                      {converterToUsd ? 'Estimated Value' : `Resulting ${converterAsset}`}
                    </label>
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold font-mono text-white">
                        {(() => {
                          const price = data.prices[converterAsset as keyof typeof data.prices] || 0;
                          const amount = parseFloat(converterAmount) || 0;
                          if (converterToUsd) {
                            const val = (amount * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            if (isNaN(amount * price)) return "$0.00";
                            return "$" + val;
                          } else {
                            const res = price > 0 ? (amount / price).toFixed(6) : "0.000000";
                            return res;
                          }
                        })()}
                      </span>
                      <span className="text-[10px] font-bold text-accent uppercase">
                        {converterToUsd ? 'USD' : converterAsset}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card mt-6 border-white/5">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-accent-blue/10 rounded-lg text-accent">
                    <Info size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1 text-primary">Risk Management Info</h4>
                    <p className="text-xs text-secondary leading-relaxed">
                      Ensure your Health Factor stays above 1.0 to avoid liquidation. Liquidations on Voltiq are <b>reactive</b>, meaning they are automatically triggered by the Somnia network the moment your position becomes underwater. Use the converter above to ensure your deposits meet minimum safety requirements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-px-1000 mx-auto">
              <div className="grid grid-cols-12 gap-8">
                
                {/* USER INFO HEADER - Centered Hero Style */}
                <div className="col-span-12 card flex flex-col items-center text-center p-10 bg-panel relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>
                  <div className="w-24 h-24 rounded-full bg-surface border-4 border-white/5 flex items-center justify-center mb-6 shadow-2xl">
                    <User size={48} className="text-accent" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold mb-2">User Profile</h2>
                    <p className="text-xs font-mono text-secondary mb-8 transition-colors hover:text-primary">
                      {walletAddress || '0x5c157083e40688aa91d92ffcf6b2f94c3641c8c2' /* Fallback for demo */}
                    </p>
                    <div className="flex justify-center gap-4">
                      <span className="badge badge-safe px-4">Verified User</span>
                      <span className="badge badge-neutral px-4">Somnia Mainnet</span>
                    </div>
                  </div>
                </div>

                {/* ASSET DISTRIBUTION */}
                <div className="col-span-12 lg:col-span-5 card">
                  <div className="card-header">
                    <h3 className="card-title text-lg"><PieChart size={20} className="text-accent" /> Asset Distribution</h3>
                  </div>
                  
                  <div className="chart-container mb-8">
                    {data.collateralDistribution.map((item, i) => (
                      <div 
                        key={i} 
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }} 
                        title={`${item.asset}: ${item.percentage}%`} 
                      />
                    ))}
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {data.collateralDistribution.map((item, i) => (
                      <div key={i} className="flex flex-col bg-surface-hover rounded-xl p-4 border border-white/5 transition-all hover:border-white/10">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-semibold text-secondary">{item.asset}</span>
                          </div>
                          <span className="font-bold font-mono">{item.percentage}%</span>
                        </div>
                        <div className="text-xs text-muted font-mono flex justify-end">
                          {item.amount?.toFixed(4) || "0.0000"} {item.asset}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* USER ACTIVITY */}
                <div className="col-span-12 lg:col-span-7 card border-accent/20">
                  <div className="card-header">
                    <h3 className="card-title text-lg text-accent"><Activity size={20} /> User Activity Feed</h3>
                    <div className="live-indicator">
                      <span className="dot pulse"></span>
                      Direct Sync
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 min-h-[300px]">
                    {reactiveEvents.length === 0 ? (
                      <div className="text-center py-20 opacity-40">
                        <Database size={40} className="mx-auto mb-4" />
                        <p className="text-base font-semibold">No Recent Activity</p>
                        <p className="text-xs mt-2 text-secondary uppercase tracking-widest px-10 leading-loose">On-chain actions will appear here automatically via Somnia Reactivity</p>
                      </div>
                    ) : (
                      <>
                        {reactiveEvents.slice(0, 8).map(event => (
                          <div key={event.id} className={`p-4 rounded-xl border bg-surface-hover flex flex-col gap-2 transition-all animate-in slide-in-from-right-4 duration-300 ${event.type === 'LIQUIDATION' ? 'border-danger/30 bg-danger/5' : 'border-white/5'} hover:border-white/10`}>
                            <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-extrabold uppercase tracking-widest ${event.type === 'LIQUIDATION' ? 'text-danger' : 'text-accent'}`}>
                                {event.type.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] text-muted font-mono">{event.timestamp}</span>
                            </div>
                            {event.type === 'USER_CHECKED' && (
                              <div className="text-xs leading-relaxed">
                                <span className="text-secondary">Vault status changed:</span> Detected Health Factor <span className={`font-mono font-bold ${Number(event.hf) < 1.1 ? 'text-danger' : 'text-safe'}`}>{event.hf}</span>
                              </div>
                            )}
                            {event.type === 'LIQUIDATION' && (
                              <div className="text-xs font-bold text-danger">
                                ⚠️ PROTOCOL ACTION: COLLATERAL SEIZED DUE TO RISK
                              </div>
                            )}
                            {event.type === 'SYNC_SUCCESS' && (
                              <div className="text-xs text-secondary">
                                Monitored portfolio status successfully on-chain
                              </div>
                            )}
                          </div>
                        ))}
                        {reactiveEvents.length > 8 && (
                          <button 
                            className="btn btn-secondary w-full border border-white/5 bg-panel mt-2 py-3" 
                            onClick={() => setActiveTab('activity')}
                          >
                            Explore Complete Records ({reactiveEvents.length})
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* STATS SUMMARY */}
                <div className="col-span-12 grid grid-cols-12 gap-6 mt-2">
                   <div className="col-span-4 card flex flex-col items-center justify-center py-8 hover:bg-white/5 transition-colors">
                      <span className="text-[10px] text-secondary font-bold uppercase mb-2 tracking-widest">Total Assets</span>
                      <span className="text-2xl font-bold font-mono text-gradient">{formatCurrency(data.collateralUsd)}</span>
                   </div>
                   <div className="col-span-4 card flex flex-col items-center justify-center py-8 hover:bg-white/5 transition-colors">
                      <span className="text-[10px] text-secondary font-bold uppercase mb-2 tracking-widest">Total Debt</span>
                      <span className="text-2xl font-bold font-mono">{formatCurrency(data.borrowUsd)}</span>
                   </div>
                   <div className="col-span-4 card flex flex-col items-center justify-center py-8 hover:bg-white/5 transition-colors">
                      <span className="text-[10px] text-secondary font-bold uppercase mb-2 tracking-widest">Reliability</span>
                      <span className="text-2xl font-bold font-mono text-safe">99.99%</span>
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
                      <span className="font-mono text-sm">{walletBalances.WETH}</span>
                    </div>
                    <div className="bg-panel p-3 rounded-lg flex justify-between">
                      <span className="text-sm">WBTC</span>
                      <span className="font-mono text-sm">{walletBalances.WBTC}</span>
                    </div>
                    <div className="bg-panel p-3 rounded-lg flex justify-between">
                      <span className="text-sm">USDC</span>
                      <span className="font-mono text-sm">{walletBalances.USDC}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <div className="card-header border-b pb-4 mb-4" style={{ borderBottomColor: 'var(--border-color)'}}>
                <div className="flex items-center gap-3">
                  <button className="btn btn-secondary p-2 border-none" onClick={() => setActiveTab('dashboard')} style={{ padding: '0.25rem' }}>
                    <ArrowDownLeft size={20} style={{ transform: 'rotate(45deg)' }} />
                  </button>
                  <h3 className="card-title text-accent m-0" style={{ margin: 0 }}><Activity size={18} /> Full Reactivity Log</h3>
                </div>
                <span className="badge badge-safe">Monitoring Events</span>
              </div>
              
              <div className="flex flex-col gap-3">
                {reactiveEvents.length === 0 ? (
                  <div className="text-center py-10 opacity-40">
                    <Database size={32} className="mx-auto mb-2" />
                    <p className="text-sm">No recorded events generated in this session.</p>
                  </div>
                ) : (
                  reactiveEvents.map(event => (
                    <div key={event.id} className={`p-4 rounded-xl border bg-surface-hover flex flex-col gap-2 ${event.type === 'LIQUIDATION' ? 'border-danger/30 bg-danger/5' : 'border-white/5'}`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold uppercase tracking-wider ${event.type === 'LIQUIDATION' ? 'text-danger' : 'text-accent'}`}>
                          {event.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-muted font-mono">{event.timestamp}</span>
                      </div>
                      
                      {event.type === 'USER_CHECKED' && (
                        <div className="text-sm text-secondary">
                          Vault monitored for User <span className="text-primary font-mono bg-panel px-2 py-1 rounded">{event.user}</span>
                          <span className="mx-2">→</span> Detected Health Factor: <span className={`font-mono font-bold ${Number(event.hf) < 1 ? 'text-danger' : 'text-safe'}`}>{event.hf}</span>
                        </div>
                      )}
                      {event.type === 'LIQUIDATION' && (
                        <div className="text-sm font-bold text-danger">
                          ⚠️ PROTOCOL ACTION: AUTO-LIQUIDATING {event.user} 
                          <span className="ml-2 font-mono">(Trigger HF: {event.hf})</span>
                        </div>
                      )}
                      {event.type === 'SYNC_SUCCESS' && (
                        <div className="text-sm text-secondary">
                          Reactivity Engine cycle finished smoothly. Successfully evaluated {event.count} vaulted accounts.
                        </div>
                      )}
                    </div>
                  ))
                )}
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

          {activeTab === 'settings' && (
            <div className="card max-w-3xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="card-header border-b border-white/5 pb-4 mb-6">
                <h3 className="card-title text-xl text-primary"><Settings size={22} className="text-secondary" /> Protocol Settings</h3>
              </div>
              
              <div className="flex flex-col gap-8">
                {/* Interface Settings */}
                <div className="flex flex-col gap-3">
                  <h4 className="font-semibold text-secondary text-xs uppercase tracking-widest pl-1">Interface Preferences</h4>
                  <div className="p-4 bg-surface-hover border rounded-xl flex justify-between items-center transition-colors">
                    <div>
                      <p className="font-semibold text-primary mb-1">Theme Mode</p>
                      <p className="text-xs text-secondary">Switch between Dark and Light appearance</p>
                    </div>
                    <button className="btn btn-secondary border p-2 rounded-lg" onClick={() => setIsLightMode(!isLightMode)}>
                      {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                  </div>
                </div>

                {/* Chrome Extension Settings */}
                <div className="flex flex-col gap-3">
                  <h4 className="font-semibold text-secondary text-xs uppercase tracking-widest pl-1">Notifications</h4>
                  <div className="p-6 bg-surface-hover border rounded-xl flex flex-col md:flex-row gap-6 items-start relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary opacity-5 rounded-full blur-3xl -mr-10 -mt-20 pointer-events-none"></div>
                    
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 shrink-0 relative z-10">
                      <Download className="text-accent drop-shadow-lg" size={32} />
                    </div>
                    
                    <div className="flex-1 relative z-10">
                      <h5 className="font-bold text-lg mb-2 text-primary">Voltiq Chrome Extension</h5>
                      <p className="text-sm text-secondary mb-5 leading-relaxed">
                        Stay protected. Get real-time browser alerts connected directly to your positions via Somnia Sub #21168.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                        <div className="flex items-center gap-2 text-xs text-secondary">
                          <ShieldCheck size={14} className="text-safe" /> Instant liquidation alerts
                        </div>
                        <div className="flex items-center gap-2 text-xs text-secondary">
                          <AlertTriangle size={14} className="text-warning" /> Health factor warnings (HF &lt; 1.3)
                        </div>
                        <div className="flex items-center gap-2 text-xs text-secondary">
                          <LineChart size={14} className="text-accent" /> Live oracle price updates
                        </div>
                        <div className="flex items-center gap-2 text-xs text-secondary">
                          <Zap size={14} className="text-safe" /> No extra subscriptions needed
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <a 
                          href="https://github.com/Pratiksalunke19/voltiq/tree/main/extension" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-primary"
                          style={{ textDecoration: 'none' }}
                        >
                          <Download size={16} /> Download Extension
                        </a>
                        <a 
                          href="https://github.com/Pratiksalunke19/voltiq/blob/main/extension/walkthrough.md" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-secondary border"
                          style={{ textDecoration: 'none' }}
                        >
                          <Info size={16} className="text-secondary" /> Install Guide
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Advanced Settings */}
                <div className="flex flex-col gap-3 opacity-60 hover:opacity-100 transition-opacity">
                  <h4 className="font-semibold text-secondary text-xs uppercase tracking-widest pl-1">Advanced</h4>
                  <div className="p-4 bg-surface border rounded-xl flex justify-between items-center cursor-not-allowed">
                    <div>
                      <p className="font-semibold text-primary mb-1">Default Slippage Tolerance</p>
                      <p className="text-xs text-secondary">Advanced routing setting (Coming soon)</p>
                    </div>
                    <span className="badge badge-neutral bg-white/5 border-white/10 text-xs px-3">1.0%</span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;

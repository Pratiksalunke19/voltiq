import { useState, useEffect } from 'react';
import './index.css';

// Types
import type { Tab } from './types';

// Hooks
import { useWallet } from './hooks/useWallet';
import { useProtocolData } from './hooks/useProtocolData';
import { useReactivity } from './hooks/useReactivity';
import { useTransactions } from './hooks/useTransactions';

// Layout Components
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import WarningBanner from './components/WarningBanner';

// Tab Components
import DashboardTab from './components/tabs/DashboardTab';
import BorrowTab from './components/tabs/BorrowTab';
import ProfileTab from './components/tabs/ProfileTab';
import FaucetTab from './components/tabs/FaucetTab';
import ActivityTab from './components/tabs/ActivityTab';
import SettingsTab from './components/tabs/SettingsTab';
import PlaceholderTab from './components/tabs/PlaceholderTab';

function App() {
  // UI State
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showWarning, setShowWarning] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [borrowMode, setBorrowMode] = useState<'borrow' | 'repay'>('borrow');

  // Simulator State
  const [simPriceDrop, setSimPriceDrop] = useState(0);
  const [simRepayAmount, setSimRepayAmount] = useState(0);
  const [simBorrowDebt, setSimBorrowDebt] = useState(0);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);

  // Custom Hooks
  const { walletAddress, isConnecting, provider, connectWallet, importMockTokens } = useWallet();
  const { data, setData, simEthPrice, setSimEthPrice, walletBalances, fetchUserData } = useProtocolData();

  const {
    reactiveEvents,
    isUpdatingPrice,
    setIsUpdatingPrice,
    liquidationCountdown,
    setLiquidationCountdown,
    hasLiquidated,
    setHasLiquidated,
  } = useReactivity({ provider, walletAddress, fetchUserData });

  const {
    handleDeposit,
    handleWithdraw,
    handleBorrow,
    handleRepay,
    handleMint,
    handlePriceChange,
  } = useTransactions({
    walletAddress,
    provider,
    fetchUserData,
    setData,
    setIsUpdatingPrice,
    setLiquidationCountdown,
    setHasLiquidated,
    setSimEthPrice,
  });

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
      />

      {/* Main Container */}
      <main className="main-wrapper">
        
        {/* Top App Bar */}
        <Topbar
          walletAddress={walletAddress}
          isConnecting={isConnecting}
          isLightMode={isLightMode}
          hasLiquidated={hasLiquidated}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onToggleTheme={() => setIsLightMode(!isLightMode)}
          onConnectWallet={() => connectWallet(fetchUserData)}
          onImportTokens={importMockTokens}
        />

        {/* Warning Banner */}
        <WarningBanner visible={showWarning} onDismiss={() => setShowWarning(false)} />

        {/* Scrollable Content Area */}
        <div className="content-area">
          
          {activeTab === 'dashboard' && (
            <DashboardTab
              data={data}
              reactiveEvents={reactiveEvents}
              simEthPrice={simEthPrice}
              isUpdatingPrice={isUpdatingPrice}
              liquidationCountdown={liquidationCountdown}
              walletAddress={walletAddress}
              setSimEthPrice={setSimEthPrice}
              setLiquidationCountdown={setLiquidationCountdown}
              setActiveTab={setActiveTab}
              setBorrowMode={setBorrowMode}
              handlePriceChange={handlePriceChange}
              simPriceDrop={simPriceDrop}
              setSimPriceDrop={setSimPriceDrop}
              simRepayAmount={simRepayAmount}
              setSimRepayAmount={setSimRepayAmount}
              simBorrowDebt={simBorrowDebt}
              setSimBorrowDebt={setSimBorrowDebt}
            />
          )}

          {activeTab === 'borrow' && (
            <BorrowTab
              data={data}
              walletAddress={walletAddress}
              walletBalances={walletBalances}
              borrowMode={borrowMode}
              setBorrowMode={setBorrowMode}
              handleDeposit={handleDeposit}
              handleWithdraw={handleWithdraw}
              handleBorrow={handleBorrow}
              handleRepay={handleRepay}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileTab
              data={data}
              walletAddress={walletAddress}
            />
          )}

          {activeTab === 'faucet' && (
            <FaucetTab
              walletAddress={walletAddress}
              walletBalances={walletBalances}
              handleMint={handleMint}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityTab
              reactiveEvents={reactiveEvents}
              setActiveTab={setActiveTab}
            />
          )}

          {(activeTab === 'markets' || activeTab === 'liquidations') && (
            <PlaceholderTab tabName={activeTab} />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              isLightMode={isLightMode}
              onToggleTheme={() => setIsLightMode(!isLightMode)}
            />
          )}

        </div>
      </main>
    </div>
  );
}

export default App;

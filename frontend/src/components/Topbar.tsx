import {
  Wallet, Menu, Moon, Sun, RefreshCcw,
  Coins, ShieldAlert
} from 'lucide-react';
import { truncateAddress } from '../utils';

interface TopbarProps {
  walletAddress: string | null;
  isConnecting: boolean;
  isLightMode: boolean;
  hasLiquidated: boolean;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onConnectWallet: () => void;
  onImportTokens: () => void;
}

export default function Topbar({
  walletAddress,
  isConnecting,
  isLightMode,
  hasLiquidated,
  onToggleSidebar,
  onToggleTheme,
  onConnectWallet,
  onImportTokens,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-title font-display flex items-center gap-4">
        <button onClick={onToggleSidebar} className="btn btn-secondary border-none" style={{ padding: '0.4rem', border: 'none' }}>
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
        <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={onToggleTheme}>
          {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button className="btn btn-secondary" onClick={() => window.location.reload()}>
          <RefreshCcw size={16} />
        </button>

        {walletAddress && (
          <button className="btn btn-secondary" onClick={onImportTokens}>
            <Coins size={16} /> Import Tokens
          </button>
        )}
        
        {walletAddress ? (
          <div className="btn btn-secondary" style={{ cursor: 'default' }}>
            <span className="status-dot online mr-2"></span>
            <span className="font-mono">{truncateAddress(walletAddress)}</span>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={onConnectWallet} disabled={isConnecting}>
            <Wallet size={18} />
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  );
}

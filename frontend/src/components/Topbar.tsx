import { useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ABIS } from '../contracts';
import { BACKEND_PRIVATE_KEY, RPC_URL } from '../constants';
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

  useEffect(() => {
    const checkAndAddMonitoredUser = async () => {
      if (!walletAddress) return;
      
      try {
        const jsonRpcProvider = new ethers.JsonRpcProvider(RPC_URL);
        const engine = new ethers.Contract(
          CONTRACT_ADDRESSES['ReactiveLiquidationEngine'],
          ABIS['ReactiveLiquidationEngine'],
          jsonRpcProvider
        );

        let userExists = false;
        let index = 0;
        
        while (true) {
          try {
            const user = await engine.sMonitoredUsers(index);
            if (user.toLowerCase() === walletAddress.toLowerCase()) {
              userExists = true;
              break;
            }
            index++;
          } catch (err) {
            // Reached out of bounds
            break;
          }
        }

        if (!userExists) {
          console.log(`Adding ${walletAddress} to sMonitoredUsers...`);
          const backendSigner = new ethers.Wallet(BACKEND_PRIVATE_KEY, jsonRpcProvider);
          const engineWithSigner = new ethers.Contract(
            CONTRACT_ADDRESSES['ReactiveLiquidationEngine'],
            ABIS['ReactiveLiquidationEngine'],
            backendSigner
          );
          const tx = await engineWithSigner.addMonitoredUser(walletAddress);
          await tx.wait();
          console.log(`Successfully added ${walletAddress} to sMonitoredUsers`);
        } else {
          console.log(`${walletAddress} is already monitored.`);
        }
      } catch (error) {
        console.error("Error in checkAndAddMonitoredUser:", error);
      }
    };

    checkAndAddMonitoredUser();
  }, [walletAddress]);

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

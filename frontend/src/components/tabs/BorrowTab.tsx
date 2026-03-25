import { useState } from 'react';
import {
  ArrowUpRight, ArrowDownLeft, ArrowRightLeft,
  RefreshCcw, Info
} from 'lucide-react';
import type { ProtocolData } from '../../types';
import { formatCurrency } from '../../utils';

interface BorrowTabProps {
  data: ProtocolData;
  walletAddress: string | null;
  walletBalances: Record<string, string>;
  borrowMode: 'borrow' | 'repay';
  setBorrowMode: (mode: 'borrow' | 'repay') => void;
  handleDeposit: (amount: string, asset: string, onSuccess: () => void) => void;
  handleWithdraw: (amount: string, asset: string, onSuccess: () => void) => void;
  handleBorrow: (amount: string, asset: string, onSuccess: () => void) => void;
  handleRepay: (amount: string, asset: string, onSuccess: () => void) => void;
}

export default function BorrowTab({
  data,
  walletAddress,
  walletBalances,
  borrowMode,
  setBorrowMode,
  handleDeposit,
  handleWithdraw,
  handleBorrow,
  handleRepay,
}: BorrowTabProps) {
  const [depositAmount, setDepositAmount] = useState('');
  const [depositAsset, setDepositAsset] = useState('WETH');
  const [supplyMode, setSupplyMode] = useState<'supply' | 'withdraw'>('supply');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAsset, setWithdrawAsset] = useState('WETH');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [borrowAsset, setBorrowAsset] = useState('USDC');
  const [repayAmount, setRepayAmount] = useState('');
  const [repayAsset, setRepayAsset] = useState('USDC');

  // Converter states
  const [converterAmount, setConverterAmount] = useState('1');
  const [converterAsset, setConverterAsset] = useState('WETH');
  const [converterToUsd, setConverterToUsd] = useState(true);

  return (
    <div className="max-width-1000" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="flex gap-6 flex-col md:flex-row">
        
        {/* DEPOSIT CARD */}
        <div className="flex-1 card">
          <div className="mode-toggle">
            <div 
              className="mode-toggle-indicator" 
              style={{ transform: supplyMode === 'withdraw' ? 'translateX(100%)' : 'translateX(0)' }} 
            />
            <button 
              className={`mode-toggle-btn ${supplyMode === 'supply' ? 'active' : ''}`}
              onClick={() => setSupplyMode('supply')}
            >
              Supply
            </button>
            <button 
              className={`mode-toggle-btn ${supplyMode === 'withdraw' ? 'active' : ''}`}
              onClick={() => setSupplyMode('withdraw')}
            >
              Withdraw
            </button>
          </div>

          {supplyMode === 'supply' ? (
            <>
              <div className="card-header border-none p-0 mb-4">
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
                  <span>Wallet Balance</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{walletBalances[depositAsset] || "0.00"}</span>
                    <button 
                      className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded hover:bg-accent/30 transition-colors"
                      onClick={() => setDepositAmount(walletBalances[`${depositAsset}_FULL`] || '')}
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-secondary">
                  <span>Supply APY</span>
                  <span className="text-safe">+2.4%</span>
                </div>
              </div>

              <button 
                className="btn btn-primary w-full" 
                onClick={() => handleDeposit(depositAmount, depositAsset, () => setDepositAmount(''))}
                disabled={!walletAddress || !depositAmount}
              >
                Supply {depositAsset}
              </button>
            </>
          ) : (
            <>
              <div className="card-header border-none p-0 mb-4">
                <h3 className="card-title"><ArrowDownLeft size={20} className="text-safe" /> Withdraw Assets</h3>
              </div>
              <p className="text-sm text-secondary mb-6">Withdraw your supplied collateral assets from the protocol.</p>
              
              <div className="form-group">
                <label className="input-label">Select Asset</label>
                <select 
                  className="select-field" 
                  value={withdrawAsset} 
                  onChange={(e) => setWithdrawAsset(e.target.value)}
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
                    value={withdrawAmount} 
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <span className="input-suffix">{withdrawAsset}</span>
                </div>
              </div>

              <div className="bg-panel border rounded-lg p-4 mb-2">
                <div className="flex justify-between text-xs text-secondary mb-1">
                  <span>Supplied Balance</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{data.collateralDistribution.find(d => d.asset === withdrawAsset)?.amount?.toFixed(4) || "0.00"}</span>
                    <button 
                      className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded hover:bg-accent/30 transition-colors"
                      onClick={() => setWithdrawAmount(data.collateralDistribution.find(d => d.asset === withdrawAsset)?.fullAmount || '')}
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-secondary">
                  <span>Wallet Balance</span>
                  <span className="font-mono">{walletBalances[withdrawAsset] || "0.00"}</span>
                </div>
              </div>

              {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-secondary">Simulated Health Factor</span>
                    {(() => {
                      const price = data.prices[withdrawAsset as keyof typeof data.prices] || 0;
                      const amountToWithdraw = parseFloat(withdrawAmount) || 0;
                      const simulatedCollateral = data.collateralUsd - (amountToWithdraw * price);
                      const simulatedHf = data.borrowUsd > 0 ? (simulatedCollateral * 0.8) / data.borrowUsd : 999;
                      const status = simulatedHf < 1.0 ? 'danger' : simulatedHf < 1.3 ? 'warning' : 'safe';
                      
                      return (
                        <span className={`font-bold font-mono text-${status}`}>
                          {simulatedHf > 9.9 ? '>9.99' : simulatedHf.toFixed(2)}
                        </span>
                      );
                    })()}
                  </div>
                  {(() => {
                    const price = data.prices[withdrawAsset as keyof typeof data.prices] || 0;
                    const amountToWithdraw = parseFloat(withdrawAmount) || 0;
                    const simulatedCollateral = data.collateralUsd - (amountToWithdraw * price);
                    const simulatedHf = data.borrowUsd > 0 ? (simulatedCollateral * 0.8) / data.borrowUsd : 999;
                    
                    if (simulatedHf < 1.0) {
                      return <p className="text-[10px] text-danger">⚠️ This withdrawal will trigger immediate liquidation.</p>;
                    } else if (simulatedHf < 1.3) {
                      return <p className="text-[10px] text-warning">⚠️ This withdrawal makes your position high-risk.</p>;
                    }
                    return null;
                  })()}
                </div>
              )}

              <button 
                className="btn btn-primary w-full" 
                onClick={() => handleWithdraw(withdrawAmount, withdrawAsset, () => setWithdrawAmount(''))}
                disabled={!walletAddress || !withdrawAmount}
              >
                Withdraw {withdrawAsset}
              </button>
            </>
          )}
        </div>

        {/* BORROW / REPAY CARD */}
        <div className="flex-1 card">
          <div className="mode-toggle">
            <div 
              className="mode-toggle-indicator" 
              style={{ transform: borrowMode === 'repay' ? 'translateX(100%)' : 'translateX(0)' }} 
            />
            <button 
              className={`mode-toggle-btn ${borrowMode === 'borrow' ? 'active' : ''}`}
              onClick={() => setBorrowMode('borrow')}
            >
              Borrow
            </button>
            <button 
              className={`mode-toggle-btn ${borrowMode === 'repay' ? 'active' : ''}`}
              onClick={() => setBorrowMode('repay')}
            >
              Repay
            </button>
          </div>

          {borrowMode === 'borrow' ? (
            <>
              <div className="card-header border-none p-0 mb-4">
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
                onClick={() => handleBorrow(borrowAmount, borrowAsset, () => setBorrowAmount(''))}
                disabled={!walletAddress || !borrowAmount}
              >
                Borrow USDC
              </button>
            </>
          ) : (
            <>
              <div className="card-header border-none p-0 mb-4">
                <h3 className="card-title"><ArrowUpRight size={20} className="text-accent" /> Repay Debt</h3>
              </div>
              <p className="text-sm text-secondary mb-6">Repay your borrowed stablecoins to improve health factor.</p>
              
              <div className="form-group">
                <label className="input-label">Select Asset</label>
                <select 
                  className="select-field" 
                  value={repayAsset} 
                  onChange={(e) => setRepayAsset(e.target.value)}
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
                    value={repayAmount} 
                    onChange={(e) => setRepayAmount(e.target.value)}
                  />
                  <span className="input-suffix">USDC</span>
                </div>
              </div>

              <div className="bg-panel border rounded-lg p-4 mb-6">
                <div className="flex justify-between text-xs text-secondary mb-1">
                  <span>Current Debt</span>
                  <span className="text-danger font-mono">{formatCurrency(data.borrowUsd)}</span>
                </div>
                <div className="flex justify-between text-xs text-secondary">
                  <span>Wallet Balance</span>
                  <span className="font-mono">{walletBalances.USDC}</span>
                </div>
              </div>

              <button 
                className="btn btn-primary w-full" 
                onClick={() => handleRepay(repayAmount, repayAsset, () => setRepayAmount(''))}
                disabled={!walletAddress || !repayAmount}
              >
                Repay USDC
              </button>
            </>
          )}
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
          <div className="flex-1 w-full">
            <div className="form-group mb-0">
              <label className="input-label">
                {converterToUsd ? 'You Convert' : 'You Provide'}
              </label>
              <div className="input-group">
                <input 
                  type="number" 
                  className="input-field"
                  value={converterAmount} 
                  onChange={(e) => setConverterAmount(e.target.value)}
                  placeholder="0.00"
                />
                {converterToUsd ? (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <select 
                      className="bg-panel border border-white/10 rounded-lg text-xs font-bold text-white px-2 py-1 outline-none cursor-pointer uppercase appearance-none"
                      value={converterAsset}
                      onChange={(e) => setConverterAsset(e.target.value)}
                      style={{ backgroundImage: 'none', paddingRight: '0.5rem' }}
                    >
                      <option value="WETH">WETH</option>
                      <option value="WBTC">WBTC</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>
                ) : (
                  <span className="input-suffix">USD</span>
                )}
              </div>
            </div>
          </div>

          {/* SWAP ICON */}
          <div className="md:pt-6">
            <button 
              className="p-3 rounded-full bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent transition-all group"
              onClick={() => setConverterToUsd(!converterToUsd)}
            >
              <ArrowRightLeft size={18} className={`transition-transform duration-300 ${converterToUsd ? 'rotate-0' : 'rotate-180'}`} />
            </button>
          </div>

          {/* TO */}
          <div className="flex-1 w-full">
            <div className="form-group mb-0">
              <label className="input-label">
                {converterToUsd ? 'Estimated Value' : `Resulting ${converterAsset}`}
              </label>
              <div className="input-group">
                <div className="input-field flex justify-between items-center bg-accent/5 border-accent/20 cursor-default">
                  <span className="font-mono font-bold text-white">
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
  );
}

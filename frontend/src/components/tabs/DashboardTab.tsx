import {
  ShieldAlert, ShieldCheck, Activity, Sliders,
  AlertTriangle, LineChart, Zap, RefreshCcw,
  ArrowUpRight, Database
} from 'lucide-react';
import type { ProtocolData, ReactiveEvent, Tab } from '../../types';
import { formatCurrency, getHealthStatus } from '../../utils';

interface DashboardTabProps {
  data: ProtocolData;
  reactiveEvents: ReactiveEvent[];
  simEthPrice: number;
  isUpdatingPrice: boolean;
  liquidationCountdown: number | null;
  walletAddress: string | null;
  setSimEthPrice: (v: number) => void;
  setLiquidationCountdown: (v: number | null) => void;
  setActiveTab: (tab: Tab) => void;
  setBorrowMode: (mode: 'borrow' | 'repay') => void;
  handlePriceChange: (price: number) => void;
  // Simulator state
  simPriceDrop: number;
  setSimPriceDrop: (v: number) => void;
  simRepayAmount: number;
  setSimRepayAmount: (v: number) => void;
  simBorrowDebt: number;
  setSimBorrowDebt: (v: number) => void;
}

export default function DashboardTab({
  data,
  reactiveEvents,
  simEthPrice,
  isUpdatingPrice,
  liquidationCountdown,
  walletAddress,
  setSimEthPrice,
  setLiquidationCountdown,
  setActiveTab,
  setBorrowMode,
  handlePriceChange,
  simPriceDrop,
  setSimPriceDrop,
  simRepayAmount,
  setSimRepayAmount,
  simBorrowDebt,
  setSimBorrowDebt,
}: DashboardTabProps) {
  const healthStatus = getHealthStatus(data.healthFactor);

  // Risk Assessment Calculations
  const dropToLiquidate = data.borrowUsd > 0 && data.healthFactor > 1 
    ? (1 - (1 / data.healthFactor)) * 100 
    : 0;

  const collateralToSafeZone = data.borrowUsd > 0 
    ? Math.max(0, (1.625 * data.borrowUsd) - data.collateralUsd) 
    : 0;

  // Simulator calculations
  const simCollateral = data.collateralUsd * (1 - simPriceDrop / 100);
  const simDebt = Math.max(0, data.borrowUsd + simBorrowDebt - simRepayAmount);
  const simHf = simDebt > 0 ? (simCollateral * 0.8) / simDebt : (simCollateral > 0 ? 9.99 : 0);
  const simStatus = getHealthStatus(simHf);

  return (
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
          <button className="btn btn-secondary flex-1 pl-4 pr-4 border hover:bg-white/5" onClick={() => { setActiveTab('borrow'); setBorrowMode('repay'); }}>
            Repay Debt
          </button>
        </div>
      </div>

      {/* LIVE REACTIVITY FEED */}
      <div className="col-span-12 lg:col-span-12 card border-accent/20">
        <div className="card-header">
          <h3 className="card-title text-lg text-accent"><Activity size={20} /> Live Reactivity Feed</h3>
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
              {reactiveEvents.slice(0, 4).map(event => (
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
              {reactiveEvents.length > 4 && (
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
              <span className="font-mono font-bold">{formatCurrency(price as number)}</span>
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
  );
}

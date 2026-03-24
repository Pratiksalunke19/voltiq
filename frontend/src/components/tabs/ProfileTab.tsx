import {
  User, PieChart, Activity, Database
} from 'lucide-react';
import type { ProtocolData, ReactiveEvent, Tab } from '../../types';
import { formatCurrency } from '../../utils';

interface ProfileTabProps {
  data: ProtocolData;
  walletAddress: string | null;
  reactiveEvents: ReactiveEvent[];
  setActiveTab: (tab: Tab) => void;
}

// Helper functions for event rendering
const getEventTypeClass = (type: string) => {
  const map: Record<string, string> = {
    'LIQUIDATION': 'liquidation', 'MY_LIQUIDATION': 'liquidation',
    'PRICE_UPDATE': 'price', 'DEPOSITED': 'deposit',
    'WITHDRAWN': 'withdraw', 'BORROWED': 'borrow',
    'REPAID': 'repay', 'HF_WARNING': 'hf-warning',
    'USER_CHECKED': 'hf-warning', 'SYNC_SUCCESS': 'deposit'
  };
  return map[type] || '';
};

const getEventLabel = (type: string) => {
  const map: Record<string, string> = {
    'LIQUIDATION': '🚨 Liquidation', 'MY_LIQUIDATION': '⚠️ My Liquidation',
    'PRICE_UPDATE': '📊 Price Update', 'DEPOSITED': '📥 Deposit',
    'WITHDRAWN': '📤 Withdraw', 'BORROWED': '💸 Borrow',
    'REPAID': '💰 Repay', 'USER_CHECKED': '🔍 User Checked',
    'SYNC_SUCCESS': '🔄 Sync'
  };
  return map[type] || type.replace('_', ' ');
};

const getEventDetail = (e: any) => {
  switch (e.type) {
    case 'LIQUIDATION':
      return <span><strong>{e.user ? e.user.slice(0, 6) + '...' + e.user.slice(-4) : 'User'}</strong> position liquidated at HF <strong>{e.hf}</strong></span>;
    case 'USER_CHECKED':
      return <span>Vault status changed: Detected Health Factor <strong className={Number(e.hf) < 1.1 ? 'text-danger' : 'text-safe'}>{e.hf}</strong></span>;
    case 'SYNC_SUCCESS':
      return <span>Monitored portfolio status successfully on-chain</span>;
    default:
      return <span>{JSON.stringify(e)}</span>;
  }
};

export default function ProfileTab({
  data,
  walletAddress,
  reactiveEvents,
  setActiveTab,
}: ProfileTabProps) {
  return (
    <div className="max-w-px-1000 mx-auto">
      <div className="grid grid-cols-12 gap-8">
        
        {/* USER INFO HEADER */}
        <div className="col-span-12 card flex flex-col items-center text-center p-10 bg-panel relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>
          <div className="w-24 h-24 rounded-full bg-surface border-4 border-white/5 flex items-center justify-center mb-6 shadow-2xl">
            <User size={48} className="text-accent" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-2">User Profile</h2>
            <p className="text-xs font-mono text-secondary mb-8 transition-colors hover:text-primary">
              {walletAddress || '0x5c157083e40688aa91d92ffcf6b2f94c3641c8c2'}
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
                {reactiveEvents.slice(0, 8).map(event => {
                  const typeClass = getEventTypeClass(event.type);
                  
                  return (
                    <div key={event.id} className={`event-item ${typeClass ? `event-${typeClass}` : ''}`}>
                      <div className="event-top">
                        <span className={`event-type type-${typeClass}`}>{getEventLabel(event.type)}</span>
                        <span className="event-time">{event.timestamp}</span>
                      </div>
                      <div className="event-detail">{getEventDetail(event)}</div>
                    </div>
                  );
                })}
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
  );
}

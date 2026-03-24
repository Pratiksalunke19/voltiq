import {
  User, PieChart
} from 'lucide-react';
import type { ProtocolData } from '../../types';
import { formatCurrency } from '../../utils';

interface ProfileTabProps {
  data: ProtocolData;
  walletAddress: string | null;
}

export default function ProfileTab({
  data,
  walletAddress,
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
            <p className="text-md font-mono text-secondary mb-8 transition-colors hover:text-primary">
              {walletAddress || '0x5c157083e40688aa91d92ffcf6b2f94c3641c8c2'}
            </p>
            {/* <div className="flex justify-center gap-4">
              <span className="badge badge-safe px-4">Verified User</span>
              <span className="badge badge-neutral px-4">Somnia Mainnet</span>
            </div> */}
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
        {/* <div className="col-span-12 lg:col-span-7 card p-0 border-accent/20 bg-[#0d0d12]">
          <div className="events-header p-4 border-b border-white/5 flex justify-between items-center">
            <span className="section-label uppercase tracking-widest text-[11px] font-bold text-secondary">User Activity</span>
            <button 
              className="px-2 py-0.5 text-[10px] font-medium border border-white/20 rounded-md text-secondary hover:text-white hover:border-white/40 hover:bg-white/5 transition-all" 
              onClick={() => setIsCleared(true)}
            >
              Clear All
            </button>
          </div>
          <div className="events-list p-2 flex flex-col gap-2 min-h-[300px] overflow-y-auto max-h-[400px]">
            {(isCleared || reactiveEvents.length === 0) ? (
              <div className="empty-state mini text-center py-10 opacity-60">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="mx-auto mb-2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                <p className="text-sm font-semibold mb-1">No events yet</p>
                <p className="text-xs text-muted">Events will appear as the protocol reacts</p>
              </div>
            ) : (
              <>
                {reactiveEvents.slice(0, 8).map(event => {
                  const typeClass = getEventTypeClass(event.type);
                  
                  return (
                    <div key={event.id} className={`event-item ${typeClass ? `event-${typeClass}` : ''} bg-panel rounded-xl p-3 border border-white/5`}>
                      <div className="event-top flex justify-between items-center mb-1">
                        <span className={`event-type type-${typeClass} font-bold text-xs uppercase tracking-wider`}>{getEventLabel(event.type)}</span>
                        <span className="event-time text-xs font-mono text-muted">{timeAgo(event.timestamp)}</span>
                      </div>
                      <div className="event-detail text-sm text-secondary">{getEventDetail(event)}</div>
                    </div>
                  );
                })}
                {reactiveEvents.length > 8 && (
                  <button 
                    className="btn btn-secondary w-full border border-white/5 bg-surface mt-2 py-3 text-xs" 
                    onClick={() => setActiveTab('activity')}
                  >
                    Explore Complete Records ({reactiveEvents.length})
                  </button>
                )}
              </>
            )}
          </div>
        </div> */}

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

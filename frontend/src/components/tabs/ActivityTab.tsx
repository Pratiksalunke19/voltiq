import { Activity, ArrowDownLeft, Database, ExternalLink } from 'lucide-react';
import type { ReactiveEvent, Tab } from '../../types';

interface ActivityTabProps {
  reactiveEvents: ReactiveEvent[];
  setActiveTab: (tab: Tab) => void;
}

export default function ActivityTab({
  reactiveEvents,
  setActiveTab,
}: ActivityTabProps) {
  return (
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-mono">{event.timestamp}</span>
                  {event.txHash && (
                    <a 
                      href={`https://shannon-explorer.somnia.network/tx/${event.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted hover:text-accent transition-colors"
                      title="View on Shannon Explorer"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
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
  );
}

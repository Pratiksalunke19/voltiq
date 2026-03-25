import {
  Settings, Moon, Sun, Download,
  ShieldCheck, AlertTriangle, LineChart, Zap
} from 'lucide-react';

interface SettingsTabProps {
  isLightMode: boolean;
  onToggleTheme: () => void;
}

export default function SettingsTab({
  isLightMode,
  onToggleTheme,
}: SettingsTabProps) {
  return (
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
            <button className="btn btn-secondary border p-2 rounded-lg" onClick={onToggleTheme}>
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
                  href="https://github.com/Pratiksalunke19/voltiq/releases/tag/v1.0.0" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  <Download size={16} /> Download Extension
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
  );
}

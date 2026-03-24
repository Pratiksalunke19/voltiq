import {
  Zap, LayoutDashboard, ArrowRightLeft, User,
  Coins, Settings
} from 'lucide-react';
import type { Tab } from '../types';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isCollapsed: boolean;
}

export default function Sidebar({ activeTab, setActiveTab, isCollapsed }: SidebarProps) {
  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
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
        <div className={`nav-item ${activeTab === 'borrow' ? 'active' : ''}`} onClick={() => setActiveTab('borrow')} title="Borrow / Repay">
          <ArrowRightLeft size={20} />
          <span>Borrow / Repay</span>
        </div>
        <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')} title="Profile">
          <User size={20} />
          <span>Profile</span>
        </div>
        <div className={`nav-item ${activeTab === 'faucet' ? 'active' : ''}`} onClick={() => setActiveTab('faucet')} title="Faucet">
          <Coins size={20} />
          <span>Faucet</span>
        </div>
        <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} title="Settings">
          <Settings size={20} />
          <span>Settings</span>
        </div>
      </nav>
      {/* <div className="sidebar-footer">
        <p>Voltiq Protocol v1.0.0</p>
        <p className="mt-1 flex items-center gap-1 text-safe">
          <ShieldCheck size={14} /> Audited
        </p>
      </div> */}
    </aside>
  );
}

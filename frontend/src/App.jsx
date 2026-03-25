import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import History from './components/History';
import Analytics from './components/Analytics';
import { Bot, LayoutDashboard, Settings as SettingsIcon, History as HistoryIcon, BarChart2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemState, setSystemState] = useState({ isRunning: false, logs: [], stats: { pending: 0, posted: 0, failed: 0 } });
  
  const fetchData = async () => {
    try {
      const res = await fetch('/api/status');
      if(res.ok) {
        const data = await res.json();
        setSystemState(data);
      }
    } catch {
      console.error('Failed to fetch stats');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    switch(activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'settings': return 'Configuration Settings';
      case 'history': return 'Post History';
      case 'analytics': return 'Analytics';
      default: return 'Automated Content System';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col pt-6 pb-6 shadow-xl z-10">
        <div className="flex items-center gap-3 px-6 mb-10 text-blue-500 font-bold text-2xl tracking-tight">
          <Bot size={32} className="text-blue-400" />
          <span>ContentBot</span>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'dashboard' ? 'bg-blue-500/15 text-blue-400 shadow-sm' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'history' ? 'bg-blue-500/15 text-blue-400 shadow-sm' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}
          >
            <HistoryIcon size={20} /> History
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'analytics' ? 'bg-blue-500/15 text-blue-400 shadow-sm' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}
          >
            <BarChart2 size={20} /> Analytics
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'settings' ? 'bg-blue-500/15 text-blue-400 shadow-sm' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}
          >
            <SettingsIcon size={20} /> Settings
          </button>
        </nav>
        <div className="px-6 border-t border-slate-700 pt-5 flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${systemState.isRunning ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></span>
          <span className="text-sm font-semibold tracking-wide text-slate-300">{systemState.isRunning ? 'System Running' : 'System Stopped'}</span>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-900">
        <div className="p-8 max-w-7xl mx-auto w-full">
          <header className="mb-10 flex justify-between items-center">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              {getPageTitle()}
            </h1>
          </header>
          
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'dashboard' && <Dashboard systemState={systemState} refreshData={fetchData} />}
            {activeTab === 'history' && <History />}
            {activeTab === 'analytics' && <Analytics />}
            {activeTab === 'settings' && <Settings />}
          </div>
        </div>
      </main>
    </div>
  );
}


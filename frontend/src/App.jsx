import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import History from './components/History';
import Analytics from './components/Analytics';
import Parse from './components/Parse';
import { Bot, LayoutDashboard, Settings as SettingsIcon, History as HistoryIcon, BarChart2, FilePen, Menu } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
      case 'parse': return 'Thêm bài viết mới';
      default: return 'Automated Content System';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">
      <aside className={`bg-slate-800 border-r border-slate-700 flex flex-col shadow-xl z-20 transition-all duration-300 overflow-hidden shrink-0 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="flex items-center justify-between px-4 pt-6 mb-10 h-10">
          <div className={`flex items-center gap-3 text-blue-500 font-bold text-2xl tracking-tight transition-all duration-300 whitespace-nowrap overflow-hidden ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
            <Bot size={32} className="text-blue-400 shrink-0" />
            <span>ContentBot</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex justify-center w-10 h-10 mx-auto"
          >
            <Menu size={24} />
          </button>
        </div>
        
        <nav className="flex-1 px-3 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center rounded-xl font-medium transition-all ${isSidebarOpen ? 'px-4 gap-3' : 'px-0 justify-center'} py-3 ${activeTab === 'analytics' ? 'bg-blue-500/15 text-blue-400 shadow-sm' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'} overflow-hidden whitespace-nowrap`}
          >
            <div className="shrink-0 flex items-center justify-center"><BarChart2 size={20} /></div>
            <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>Analytics</span>
          </button>

          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center rounded-xl font-medium transition-all ${isSidebarOpen ? 'px-4 gap-3' : 'px-0 justify-center'} py-3 ${activeTab === 'dashboard' ? 'bg-blue-500/15 text-blue-400 shadow-sm' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'} overflow-hidden whitespace-nowrap`}
          >
            <div className="shrink-0 flex items-center justify-center"><LayoutDashboard size={20} /></div>
            <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>Dashboard</span>
          </button>
  
          <button 
            onClick={() => setActiveTab('parse')}
            className={`flex items-center rounded-xl font-medium transition-all ${isSidebarOpen ? 'px-4 gap-3' : 'px-0 justify-center'} py-3 ${activeTab === 'parse' ? 'bg-blue-500/15 text-blue-400 shadow-sm' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'} overflow-hidden whitespace-nowrap`}
          >
            <div className="shrink-0 flex items-center justify-center"><FilePen size={20} /></div>
            <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>Thêm bài viết</span>
          </button>

          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center rounded-xl font-medium transition-all ${isSidebarOpen ? 'px-4 gap-3' : 'px-0 justify-center'} py-3 ${activeTab === 'history' ? 'bg-blue-500/15 text-blue-400 shadow-sm' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'} overflow-hidden whitespace-nowrap`}
          >
            <div className="shrink-0 flex items-center justify-center"><HistoryIcon size={20} /></div>
            <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>History</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center rounded-xl font-medium transition-all ${isSidebarOpen ? 'px-4 gap-3' : 'px-0 justify-center'} py-3 ${activeTab === 'settings' ? 'bg-blue-500/15 text-blue-400 shadow-sm' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'} overflow-hidden whitespace-nowrap`}
          >
            <div className="shrink-0 flex items-center justify-center"><SettingsIcon size={20} /></div>
            <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>Settings</span>
          </button>
        </nav>
        
        <div className={`border-t border-slate-700 pt-5 pb-6 flex items-center ${isSidebarOpen ? 'px-6 gap-3' : 'px-0 justify-center'} overflow-hidden whitespace-nowrap transition-all`}>
          <span className={`shrink-0 w-3 h-3 rounded-full ${systemState.isRunning ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></span>
          <span className={`text-sm font-semibold tracking-wide text-slate-300 transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>{systemState.isRunning ? 'System Running' : 'System Stopped'}</span>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-900">
        <div className="p-8 max-w-7xl mx-auto w-full">
          <header className="mb-10 flex items-center gap-4">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              {getPageTitle()}
            </h1>
          </header>
          
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'dashboard' && <Dashboard systemState={systemState} refreshData={fetchData} />}
            {activeTab === 'parse' && <Parse />}
            {activeTab === 'history' && <History />}
            {activeTab === 'analytics' && <Analytics />}
            {activeTab === 'settings' && <Settings />}
          </div>
        </div>
      </main>
    </div>
  );
}


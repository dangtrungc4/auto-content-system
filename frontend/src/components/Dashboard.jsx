import React, { useState } from 'react';
import { Play, Square, Zap, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function Dashboard({ systemState, refreshData }) {
  const [loadingAction, setLoadingAction] = useState(false);

  const toggleEngine = async () => {
    setLoadingAction(true);
    try {
      const endpoint = systemState.isRunning ? '/api/scheduler/stop' : '/api/scheduler/start';
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend returned HTML.' : `HTTP ${res.status}`);
      }
      await refreshData();
    } catch(err) {
      console.error('Engine toggle error:', err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const runNow = async () => {
    setLoadingAction(true);
    try {
      const res = await fetch('/api/run-now', { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend returned HTML.' : `HTTP ${res.status}`);
      }
      await refreshData();
    } catch(err) {
      console.error('Run now error:', err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Action Bar */}
      <div className="flex gap-4 p-6 glass-panel rounded-2xl flex-wrap">
        <button 
          onClick={runNow} 
          disabled={loadingAction}
          className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {loadingAction ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} className="text-amber-400" />} 
          Run Now
        </button>
        <button 
          onClick={toggleEngine} 
          disabled={loadingAction}
          className={`flex items-center gap-2 px-6 py-3 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 ${systemState.isRunning ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}
        >
          {systemState.isRunning ? <Square size={20} /> : <Play size={20} fill="currentColor" />}
          {systemState.isRunning ? 'Stop Engine' : 'Start Engine'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Pending Posts" value={systemState.stats?.pending || 0} icon={<Clock size={28} className="text-blue-400" />} color="blue" />
        <StatCard title="Total Posted" value={systemState.stats?.posted || 0} icon={<CheckCircle size={28} className="text-emerald-400" />} color="emerald" />
        <StatCard title="Failed Posts" value={systemState.stats?.failed || 0} icon={<AlertTriangle size={28} className="text-red-400" />} color="red" />
      </div>

      {/* Logs Viewer */}
      <div className="glass-panel rounded-2xl flex flex-col h-[400px] overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/80">
          <h3 className="font-semibold flex items-center gap-2"><RefreshCw size={18} className="text-slate-400"/> System Logs</h3>
          <button onClick={refreshData} className="text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-[#0a0f1a] p-4 font-mono text-sm leading-relaxed">
          {systemState.logs && systemState.logs.length > 0 ? (
            systemState.logs.map((log, i) => (
              <div key={i} className="mb-1 flex gap-3">
                <span className="text-slate-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className={`${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : 'text-blue-300'}`}>
                  {log.message}
                </span>
              </div>
            ))
          ) : (
            <div className="text-slate-500 italic">No logs generated yet...</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const bgColors = {
    blue: 'bg-blue-500/10 border-blue-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    red: 'bg-red-500/10 border-red-500/20'
  };
  
  return (
    <div className={`glass-panel p-6 rounded-2xl flex items-center gap-5 border ${bgColors[color]} hover:-translate-y-1 transition-transform duration-300`}>
      <div className={`p-4 rounded-xl ${bgColors[color].split(' ')[0]}`}>
        {icon}
      </div>
      <div>
        <h4 className="text-slate-400 font-medium text-sm mb-1">{title}</h4>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
      </div>
    </div>
  );
}

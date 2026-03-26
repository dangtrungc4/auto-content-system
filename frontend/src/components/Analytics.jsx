import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, ThumbsUp, MessageSquare, Share2, CheckCircle,
  XCircle, BarChart2, RefreshCw, Award, Calendar, ToggleLeft, ToggleRight, Users
} from 'lucide-react';

const PERIODS = [
  { key: 'day', label: 'Theo ngày' },
  { key: 'week', label: 'Theo tuần' },
  { key: 'month', label: 'Theo tháng' },
];

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 flex items-center gap-4 hover:border-slate-600 transition-all">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-slate-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-slate-100">{value.toLocaleString()}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-sm">
        <p className="font-semibold text-slate-300 mb-2">{label}</p>
        {payload.map(p => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: <span className="font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [topPosts, setTopPosts] = useState([]);
  const [period, setPeriod] = useState('day');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncRunning, setAutoSyncRunning] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [chartLoading, setChartLoading] = useState(false);

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/analytics/summary').then(r => r.json());
      if (res.success) setSummary(res);
    } catch (err) { console.error('Summary fetch error:', err); }
  };

  const fetchTopPosts = async () => {
    try {
      const res = await fetch('/api/analytics/top-posts').then(r => r.json());
      if (res.success) setTopPosts(res.posts);
    } catch (err) { console.error('Top posts fetch error:', err); }
  };

  const fetchChartData = async (p = period) => {
    setChartLoading(true);
    try {
      const res = await fetch(`/api/analytics/chart?period=${p}&limit=30`).then(r => r.json());
      if (res.success) setChartData(res.data);
    } catch (err) {
      console.error('Chart fetch error:', err);
    } finally {
      setChartLoading(false);
    }
  };

  const fetchAll = useCallback(async (p = period) => {
    setLoading(true);
    try {
      await Promise.all([fetchSummary(), fetchChartData(p), fetchTopPosts()]);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [period]);

  // Initial fetch on mount
  useEffect(() => { 
    fetchAll(period);
    // Fetch auto-sync status
    fetch('/api/analytics/auto-sync-status')
      .then(r => r.json())
      .then(res => { if (res.success) setAutoSyncRunning(res.isRunning); });
  }, []);

  // Refresh chart only when period changes
  useEffect(() => {
    fetchChartData(period);
  }, [period]);

  // Polling logic: fetch data every 30 seconds if autoSync is running
  useEffect(() => {
    let interval = null;
    if (autoSyncRunning) {
      interval = setInterval(() => {
        fetchAll(period);
      }, 300000); // 5 minutes (300,000ms)
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoSyncRunning, period, fetchAll]);

  const toggleAutoSync = async () => {
    setToggling(true);
    try {
      const endpoint = autoSyncRunning ? '/api/analytics/auto-sync/stop' : '/api/analytics/auto-sync/start';
      const res = await fetch(endpoint, { method: 'POST' }).then(r => r.json());
      if (res.success) setAutoSyncRunning(res.isRunning);
    } catch (err) {
      console.error('Toggle auto-sync error:', err);
    } finally {
      setToggling(false);
    }
  };

  const syncEngagement = async () => {
    setSyncing(true);
    try {
      await fetch('/api/analytics/sync-engagement', { method: 'POST' });
      await fetchAll(period);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <RefreshCw className="animate-spin text-blue-500" size={36} />
      </div>
    );
  }

  const s = summary || { total: 0, success: 0, failed: 0, totalLikes: 0, totalComments: 0, totalShares: 0, followersCount: 0, fanCount: 0 };
  const successRate = s.total > 0 ? Math.round((s.success / s.total) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm mt-1">Thống kê hiệu suất đăng bài</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-3 text-xs text-slate-500 hidden sm:block">
            Cập nhật lúc: {lastUpdated.toLocaleTimeString('vi-VN')}
          </div>
          <button
            onClick={toggleAutoSync}
            disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              autoSyncRunning 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                : 'bg-slate-700/50 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-300'
            }`}
          >
            {autoSyncRunning ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            Auto Sync: {autoSyncRunning ? 'On' : 'Off'}
          </button>

          <button
            onClick={syncEngagement}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            Sync Engagement
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        <StatCard icon={BarChart2} label="Tổng bài đăng" value={s.total} color="bg-blue-600" />
        <StatCard icon={CheckCircle} label="Thành công" value={s.success} color="bg-emerald-600"
          sub={`${successRate}% success rate`} />
        <StatCard icon={XCircle} label="Thất bại" value={s.failed} color="bg-red-600" />
        <StatCard icon={ThumbsUp} label="Tổng Likes" value={s.totalLikes} color="bg-violet-600" />
        <StatCard icon={MessageSquare} label="Tổng Comments" value={s.totalComments} color="bg-amber-600" />
        <StatCard icon={Share2} label="Tổng Shares" value={s.totalShares} color="bg-cyan-600" />
        <StatCard icon={Users} label="Người theo dõi" value={s.followersCount} color="bg-pink-600" sub={`${s.fanCount.toLocaleString()} lượt thích trang`} />
      </div>

      {/* Chart Section */}
      <div className={`bg-slate-800/70 border border-slate-700 rounded-2xl p-6 transition-opacity ${chartLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <TrendingUp size={20} className="text-blue-400" />
            Biểu đồ bài đăng & Engagement
          </div>
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  period === p.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Calendar size={40} className="mb-3 opacity-40" />
            <p>Chưa có dữ liệu</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Post count line chart */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Số bài đăng</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone" dataKey="count" name="Bài đăng"
                    stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Engagement bar chart */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Engagement</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                  <Bar dataKey="likes" name="Likes" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="comments" name="Comments" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="shares" name="Shares" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Top Posts */}
      <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-slate-200 font-semibold mb-5">
          <Award size={20} className="text-amber-400" />
          Top bài hiệu quả (Likes cao nhất)
        </div>

        {topPosts.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-3">
            {topPosts.map((post, idx) => (
              <div key={post.id}
                className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  idx === 0 ? 'bg-amber-500 text-white' :
                  idx === 1 ? 'bg-slate-400 text-slate-900' :
                  idx === 2 ? 'bg-amber-700 text-white' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  {idx + 1}
                </div>

                {post.imageUrl && (
                  <img src={post.imageUrl} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-sm line-clamp-2 leading-relaxed">
                    {post.caption || 'No caption'}
                  </p>
                  <p className="text-slate-600 text-xs mt-1">
                    {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>

                <div className="flex gap-3 flex-shrink-0 text-sm">
                  <span className="flex items-center gap-1 text-violet-400 font-semibold">
                    <ThumbsUp size={13} /> {post.likes}
                  </span>
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <MessageSquare size={13} /> {post.comments}
                  </span>
                  <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                    <Share2 size={13} /> {post.shares}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

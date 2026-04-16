import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, ThumbsUp, MessageSquare, Share2, CheckCircle,
  XCircle, BarChart2, RefreshCw, Award, Calendar, ToggleLeft, ToggleRight, Users, Clock
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
  const [topPage, setTopPage] = useState(1);
  const [hasMoreTop, setHasMoreTop] = useState(true);
  const [loadingTop, setLoadingTop] = useState(false);
  
  const [pendingPosts, setPendingPosts] = useState([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [hasMorePending, setHasMorePending] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);
  const [period, setPeriod] = useState('day');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncRunning, setAutoSyncRunning] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [chartLoading, setChartLoading] = useState(false);

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/analytics/summary');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend returned HTML.' : `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) setSummary(data);
    } catch (err) {
      console.error('Summary fetch error:', err.message);
    }
  };

  const fetchTopPosts = async (page = 1) => {
    if (loadingTop) return;
    setLoadingTop(true);
    try {
      const res = await fetch(`/api/analytics/top-posts?page=${page}&limit=5`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend returned HTML.' : `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        if (page === 1) {
          setTopPosts(data.posts);
        } else {
            setTopPosts(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newPosts = data.posts.filter(p => !existingIds.has(p.id));
              return [...prev, ...newPosts];
            });
        }
        setTopPage(page);
        if (page >= data.pagination.totalPages || data.posts.length === 0) {
          setHasMoreTop(false);
        } else {
          setHasMoreTop(true);
        }
      }
    } catch (err) { 
      console.error('Top posts fetch error:', err.message); 
    } finally {
      setLoadingTop(false);
    }
  };

  const fetchPendingPosts = async (page = 1) => {
    if (loadingPending) return;
    setLoadingPending(true);
    try {
      const res = await fetch(`/api/analytics/pending-posts?page=${page}&limit=5`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend returned HTML.' : `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        if (page === 1) {
          setPendingPosts(data.posts);
        } else {
            setPendingPosts(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newPosts = data.posts.filter(p => !existingIds.has(p.id));
              return [...prev, ...newPosts];
            });
        }
        setPendingPage(page);
        if (page >= data.pagination.totalPages || data.posts.length === 0) {
          setHasMorePending(false);
        } else {
          setHasMorePending(true);
        }
      }
    } catch (err) { 
      console.error('Pending posts fetch error:', err.message); 
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchChartData = async (p = period) => {
    setChartLoading(true);
    try {
      const res = await fetch(`/api/analytics/chart?period=${p}&limit=30`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend returned HTML.' : `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) setChartData(data.data);
    } catch (err) {
      console.error('Chart fetch error:', err.message);
    } finally {
      setChartLoading(false);
    }
  };

  const fetchAll = useCallback(async (p = period, isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      await Promise.all([fetchSummary(), fetchChartData(p), fetchTopPosts(1), fetchPendingPosts(1)]);
      setLastUpdated(new Date());
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [period]);

  // Initial fetch on mount
  useEffect(() => { 
    fetchAll(period);
    // Fetch auto-sync status
    fetch('/api/analytics/auto-sync-status')
      .then(async r => {
        if (!r.ok) return { success: false };
        return r.json();
      })
      .then(res => { if (res && res.success) setAutoSyncRunning(res.isRunning); })
      .catch(() => {});
  }, []);

  // Refresh chart only when period changes
  useEffect(() => {
    fetchChartData(period);
  }, [period]);

  // Polling logic: fetch data every 5 minutes if autoSync is running (Silent Refresh)
  useEffect(() => {
    let interval = null;
    if (autoSyncRunning) {
      interval = setInterval(() => {
        fetchAll(period, true); // Silent refresh
      }, 300000); // 5 minutes
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoSyncRunning, period, fetchAll]);

  const toggleAutoSync = async () => {
    setToggling(true);
    try {
      const endpoint = autoSyncRunning ? '/api/analytics/auto-sync/stop' : '/api/analytics/auto-sync/start';
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend returned HTML.' : `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) setAutoSyncRunning(data.isRunning);
    } catch (err) {
      console.error('Toggle auto-sync error:', err.message);
    } finally {
      setToggling(false);
    }
  };

  const syncEngagement = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/analytics/sync-engagement', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      // Hot Sync: Refresh data silently without blocking the UI
      await fetchAll(period, true);
      // alert(`Đã đồng bộ thành công ${data.updatedCount || 0} bài viết.`);
    } catch (err) {
      console.error('Sync engagement error:', err.message);
      alert(`Lỗi đồng bộ: ${err.message}`);
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
          <p className="text-slate-400 text-sm mt-1">
            Thống kê hiệu suất đăng bài
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-3 text-xs text-slate-500 hidden sm:block">
            Cập nhật lúc: {lastUpdated.toLocaleTimeString("vi-VN")}
          </div>
          <button
            onClick={toggleAutoSync}
            disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              autoSyncRunning
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                : "bg-slate-700/50 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-300"
            }`}
          >
            {autoSyncRunning ? (
              <ToggleRight size={18} />
            ) : (
              <ToggleLeft size={18} />
            )}
            Auto Sync: {autoSyncRunning ? "On" : "Off"}
          </button>

          <button
            onClick={syncEngagement}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            Sync Engagement
          </button>
        </div>
      </div>

      {/* Top Section: Summary Cards & Pending Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Summary Cards (2 per row) */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
          <StatCard
            icon={Users}
            label="Người theo dõi"
            value={s.followersCount}
            color="bg-pink-600"
            sub={`${s.fanCount.toLocaleString()} lượt thích trang`}
          />
          <StatCard
            icon={BarChart2}
            label="Tổng bài đăng"
            value={s.total}
            color="bg-blue-600"
          />
          {/* <StatCard icon={CheckCircle} label="Thành công" value={s.success} color="bg-emerald-600"
            sub={`${successRate}% success rate`} /> */}
          {/* <StatCard icon={XCircle} label="Thất bại" value={s.failed} color="bg-red-600" /> */}
          <StatCard
            icon={ThumbsUp}
            label="Tổng Likes"
            value={s.totalLikes}
            color="bg-violet-600"
          />
          <StatCard
            icon={MessageSquare}
            label="Tổng Comments"
            value={s.totalComments}
            color="bg-amber-600"
          />
          <StatCard
            icon={Share2}
            label="Tổng Shares"
            value={s.totalShares}
            color="bg-cyan-600"
          />
        </div>

        {/* Right Column: Tổng bài đăng & Pending Posts */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6 flex-1 max-h-[420px] overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 text-slate-200 font-semibold mb-5 flex-shrink-0">
              <Clock size={20} className="text-blue-400" />
              Bài đang chờ đăng ({pendingPosts.length})
            </div>

            <div
              className="overflow-y-auto pr-2 custom-scrollbar flex-1"
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.target;
                if (
                  scrollHeight - scrollTop <= clientHeight + 10 &&
                  hasMorePending &&
                  !loadingPending
                ) {
                  fetchPendingPosts(pendingPage + 1);
                }
              }}
            >
              {pendingPosts.length === 0 && !loadingPending ? (
                <p className="text-slate-500 text-sm text-center py-8">
                  Không có bài chờ đăng
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all"
                    >
                      {post.imageUrl ? (
                        <>
                          {post.imageUrl.split('\n').filter(u => u.trim())[0].match(/\.(mp4|mov|avi|wmv|webm)$/i) ? (
                            <video 
                              src={post.imageUrl.split('\n').filter(u => u.trim())[0]} 
                              className="w-14 h-14 object-cover rounded-lg flex-shrink-0" 
                              muted 
                            />
                          ) : (
                            <img
                              src={post.imageUrl.split('\n').filter(u => u.trim())[0]}
                              alt=""
                              className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                        </>
                      ) : (
                        <div className="w-14 h-14 bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center text-slate-600">
                          <Clock size={20} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-sm font-medium line-clamp-1">
                          {post.title || "No title"}
                        </p>
                        <p className="text-slate-500 text-xs mt-1 line-clamp-1">
                          {post.caption || "No caption"}
                        </p>
                        <p className="text-blue-400 text-xs mt-2 font-medium">
                          Lịch đăng:{" "}
                          {new Date(post.scheduledAt).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {loadingPending && (
                <div className="flex justify-center py-4">
                  <RefreshCw
                    size={16}
                    className="animate-spin text-slate-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div
        className={`bg-slate-800/70 border border-slate-700 rounded-2xl p-6 transition-opacity ${chartLoading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <TrendingUp size={20} className="text-blue-400" />
            Biểu đồ bài đăng & Engagement
          </div>
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  period === p.key
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-400 hover:text-slate-200"
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
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                Số bài đăng
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Bài đăng"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#3b82f6" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Engagement bar chart */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                Engagement
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                  <Bar
                    dataKey="likes"
                    name="Likes"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="comments"
                    name="Comments"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="shares"
                    name="Shares"
                    fill="#06b6d4"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: Top Posts */}
      <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6 h-[500px] flex flex-col">
        <div className="flex items-center gap-2 text-slate-200 font-semibold mb-5 flex-shrink-0">
          <Award size={20} className="text-amber-400" />
          Top bài hiệu quả (Likes cao nhất)
        </div>

        <div
          className="overflow-y-auto pr-2 custom-scrollbar flex-1"
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.target;
            if (
              scrollHeight - scrollTop <= clientHeight + 10 &&
              hasMoreTop &&
              !loadingTop
            ) {
              fetchTopPosts(topPage + 1);
            }
          }}
        >
          {topPosts.length === 0 && !loadingTop ? (
            <p className="text-slate-500 text-sm text-center py-8">
              Chưa có dữ liệu
            </p>
          ) : (
            <div className="space-y-3">
              {topPosts.map((post, idx) => (
                <div
                  key={post.id}
                  className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      idx === 0
                        ? "bg-amber-500 text-white"
                        : idx === 1
                          ? "bg-slate-400 text-slate-900"
                          : idx === 2
                            ? "bg-amber-700 text-white"
                            : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {idx + 1}
                  </div>

                  {post.imageUrl && (
                    <>
                      {post.imageUrl.split('\n').filter(u => u.trim())[0].match(/\.(mp4|mov|avi|wmv|webm)$/i) ? (
                        <video 
                          src={post.imageUrl.split('\n').filter(u => u.trim())[0]} 
                          className="w-14 h-14 object-cover rounded-lg flex-shrink-0" 
                          muted 
                        />
                      ) : (
                        <img
                          src={post.imageUrl.split('\n').filter(u => u.trim())[0]}
                          alt=""
                          className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                    </>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-sm line-clamp-2 leading-relaxed">
                      {post.caption || "No caption"}
                    </p>
                    <p className="text-slate-600 text-xs mt-1">
                      {post.content ? (post.content.length > 80 ? post.content.slice(0, 80) + "..." : post.content) : "Không có nội dung chính"}
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

          {loadingTop && (
            <div className="flex justify-center py-4">
              <RefreshCw size={16} className="animate-spin text-slate-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

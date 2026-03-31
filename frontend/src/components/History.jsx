import React, { useState, useEffect, useCallback } from 'react';
import { Clock, ExternalLink, Image as ImageIcon, MessageSquare, RefreshCw, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 9, totalPages: 1 });
  
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [filtersApplied, setFiltersApplied] = useState({ search: '', status: '' });

  const fetchHistory = useCallback(async (pageToFetch = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageToFetch,
        limit: 9,
        search: filtersApplied.search,
        status: filtersApplied.status
      });
      const res = await fetch(`/api/posts/history?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend returned HTML.' : `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  }, [filtersApplied]);

  // Use an effect to refetch when filtersApplied changes, fetching page 1
  useEffect(() => {
    fetchHistory(1);
  }, [filtersApplied, fetchHistory]);

  const handleApplyFilters = () => {
    setFiltersApplied({ search, status });
  };

  const currentLoading = loading && history.length === 0;

  return (
    <div className="space-y-6">
      {/* <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-100">Post History</h2>
        <button 
          onClick={() => fetchHistory(pagination.page)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-blue-400"
        >
          <RefreshCw size={20} className={loading && history.length > 0 ? "animate-spin text-blue-500" : ""} />
        </button>
      </div> */}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm nội dung bài đăng..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
            className="w-full bg-slate-800 border border-slate-700 text-sm rounded-xl py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-500"
          />
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-sm rounded-xl py-2.5 pl-10 pr-8 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all appearance-none outline-none cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="success">Thành công</option>
              <option value="Lỗi">Lỗi</option>
            </select>
          </div>
          <button 
            onClick={handleApplyFilters}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-500/20"
          >
            Lọc
          </button>
        </div>
      </div>

      {currentLoading ? (
        <div className="flex items-center justify-center p-20">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
        </div>
      ) : history.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
          <Clock className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">Không tìm thấy bài viết nào.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((post) => (
              <div key={post.id} className="glass-panel overflow-hidden rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-all group relative">
                {post.status !== 'success' && (
                  <div className="absolute top-2 right-2 bg-red-500/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md z-10 font-medium">
                    Lỗi
                  </div>
                )}
                {post.imageUrl ? (
                  <div className="aspect-video w-full overflow-hidden bg-slate-900 flex items-center justify-center">
                    <img src={post.imageUrl} alt="Post content" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-slate-900 flex items-center justify-center text-slate-700">
                    <ImageIcon size={32} />
                  </div>
                )}
                
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-slate-500 font-mono">
                      {new Date(post.createdAt).toLocaleString()}
                    </div>
                    {post.fbPostId && post.status === 'success' && (
                      <a 
                        href={`https://facebook.com/${post.fbPostId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500 hover:text-white transition-all"
                        title="View on Facebook"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <MessageSquare size={14} />
                      <span className="text-xs font-semibold uppercase tracking-wider">Caption</span>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-3 leading-relaxed">
                      {post.caption || 'No caption'}
                    </p>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {post.tags.map(tag => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                            style={{ borderColor: tag.color, backgroundColor: `${tag.color}22`, color: tag.color }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
              <p className="text-sm text-slate-400">
                Trang <span className="font-semibold text-slate-200">{pagination.page}</span> / <span className="font-semibold text-slate-200">{pagination.totalPages}</span> 
                {' '}(Tổng: {pagination.total})
              </p>
              <div className="flex items-center gap-2">
                <button 
                  disabled={pagination.page <= 1}
                  onClick={() => fetchHistory(pagination.page - 1)}
                  className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-1 hidden sm:flex">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => {
                    if (p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 1) {
                      return (
                        <button
                          key={p}
                          onClick={() => fetchHistory(p)}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all border ${
                            p === pagination.page 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    }
                    if (Math.abs(p - pagination.page) === 2) {
                      return <span key={p} className="w-9 h-9 flex items-center justify-center text-slate-500">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button 
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchHistory(pagination.page + 1)}
                  className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

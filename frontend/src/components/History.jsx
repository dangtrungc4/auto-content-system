import React, { useState, useEffect } from 'react';
import { Clock, ExternalLink, Image as ImageIcon, MessageSquare, RefreshCw } from 'lucide-react';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/posts/history');
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-100">Post History</h2>
        <button 
          onClick={fetchHistory}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-blue-400"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {history.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
          <Clock className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">No successful posts found yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((post) => (
            <div key={post.id} className="glass-panel overflow-hidden rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-all group">
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
                  <a 
                    href={`https://facebook.com/${post.fbPostId}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500 hover:text-white transition-all"
                    title="View on Facebook"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MessageSquare size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Caption</span>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-3 leading-relaxed">
                    {post.caption || 'No caption'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

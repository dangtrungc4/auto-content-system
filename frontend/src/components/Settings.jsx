import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle2, RefreshCw, Download } from 'lucide-react';

export default function Settings() {
  const [formData, setFormData] = useState({
    cronSchedule: '* * * * *',
    sheetId: '',
    googleClientEmail: '',
    googlePrivateKey: '',
    fbAppId: '',
    fbUserToken: '',
    fbPageToken: '',
    fbPageId: '',
    fbAppSecret: '',
    unsplashKey: '',
    bannedWords: '',
    geminiApiKey: ''
  });

  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);
  const [fetchingPages, setFetchingPages] = useState(false);
  const [pages, setPages] = useState([]);
  const [tokenInfo, setTokenInfo] = useState({ user: null, page: null });
  const [checkingToken, setCheckingToken] = useState(false);

  useEffect(() => {
    const loadConf = async () => {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) {
          const text = await res.text();
          if (text.includes('<!DOCTYPE')) {
            console.warn('Config fetch: Backend returned HTML.');
            return;
          }
          throw new Error('Could not load config');
        }
        const data = await res.json();
        setFormData(prev => ({ ...prev, ...data }));
      } catch(err) {
        console.error('Config fetch failed:', err.message);
      }
    };
    loadConf();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear token info if related fields change
    if (['fbUserToken', 'fbPageToken'].includes(e.target.name)) {
      setTokenInfo(prev => ({ ...prev, [e.target.name === 'fbUserToken' ? 'user' : 'page']: null }));
    }
  };

  const handleFetchPages = async () => {
    if (!formData.fbUserToken.trim()) {
      setStatus({ type: 'error', msg: 'Vui lòng nhập User Access Token trước.' });
      return;
    }
    setFetchingPages(true);
    setPages([]);
    try {
      const res = await fetch(`/api/facebook/pages?userToken=${encodeURIComponent(formData.fbUserToken)}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend returned HTML instead of data.' : `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.pages.length > 0) {
        setPages(data.pages);
        setStatus({ type: 'success', msg: `Tìm thấy ${data.pages.length} Fanpage. Hãy chọn page bên dưới.` });
      } else {
        setStatus({ type: 'error', msg: data.error || 'Không tìm thấy Fanpage nào.' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'Lỗi kết nối: ' + err.message });
    } finally {
      setFetchingPages(false);
      setTimeout(() => setStatus({ type: '', msg: '' }), 6000);
    }
  };

  const handleCheckToken = async (tokenType) => {
    const token = tokenType === 'user' ? formData.fbUserToken : formData.fbPageToken;
    if (!token) return;
    setCheckingToken(true);
    try {
      const res = await fetch(`/api/facebook/debug-token?token=${encodeURIComponent(token)}&appId=${formData.fbAppId}&appSecret=${formData.fbAppSecret}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend returned HTML.' : `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setTokenInfo(prev => ({ ...prev, [tokenType]: data.info }));
      } else {
        setStatus({ type: 'error', msg: `Lỗi kiểm tra token: ${data.error}` });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'Lỗi kết nối: ' + err.message });
    } finally {
      setCheckingToken(false);
    }
  };

  const handlePageSelect = (e) => {
    const selected = pages.find(p => p.id === e.target.value);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        fbPageId: selected.id,
        fbPageToken: selected.access_token
      }));
      setStatus({ type: 'success', msg: `Đã chọn: ${selected.name} — Page ID và Page Token đã được điền tự động.` });
      setTimeout(() => setStatus({ type: '', msg: '' }), 5000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', msg: '' });
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend returned HTML.' : `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', msg: 'Configuration saved successfully!' });
      } else {
        setStatus({ type: 'error', msg: data.error || 'Failed to save configuration.' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'Network error: ' + err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: '', msg: '' }), 5000);
    }
  };

  const renderTokenStatus = (info) => {
    if (!info) return null;
    const expiresAt = info.expires_at ? new Date(info.expires_at * 1000) : null;
    const dataAccessExpiresAt = info.data_access_expires_at ? new Date(info.data_access_expires_at * 1000) : null;
    const now = new Date();
    const isExpired = expiresAt && expiresAt < now;
    const daysLeft = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : null;

    return (
      <div className="mt-2 p-3 bg-slate-900/80 border border-slate-700/50 rounded-lg text-xs space-y-2 animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <span className="text-slate-400 font-medium">✨ {info.type === 'PAGE' ? 'Page Access Token' : 'User Access Token'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${info.is_valid && !isExpired ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {info.is_valid && !isExpired ? 'Active' : 'Expired/Invalid'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
          <div className="flex flex-col">
            <span className="text-slate-500 scale-90 origin-left uppercase font-bold tracking-tight">Hết hạn Token:</span>
            <span className={`font-mono ${daysLeft !== null && daysLeft < 7 ? 'text-amber-400' : 'text-slate-200'}`}>
              {info.expires_at === 0 ? 'Vĩnh viễn (Never)' : 
               isExpired ? `Hết hạn ${expiresAt.toLocaleDateString('vi-VN')}` :
               `${expiresAt.toLocaleDateString('vi-VN')} (${daysLeft} ngày)`}
            </span>
          </div>
          
          {dataAccessExpiresAt && (
            <div className="flex flex-col text-right">
              <span className="text-slate-500 scale-90 origin-right uppercase font-bold tracking-tight">Quyền truy cập dữ liệu:</span>
              <span className="text-slate-200 font-mono">
                {dataAccessExpiresAt.toLocaleDateString('vi-VN')}
              </span>
            </div>
          )}

          <div className="flex flex-col">
            <span className="text-slate-500 scale-90 origin-left uppercase font-bold tracking-tight">Ứng dụng (App ID):</span>
            <span className="text-slate-300 truncate">{info.application || info.app_id}</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-slate-500 scale-90 origin-right uppercase font-bold tracking-tight">ID Người dùng:</span>
            <span className="text-slate-300 font-mono">{info.user_id}</span>
          </div>
        </div>

        <div>
          <span className="text-slate-500 scale-90 origin-left uppercase font-bold tracking-tight block mb-1">Quyền hạn (Scopes):</span>
          <div className="flex flex-wrap gap-1">
            {info.scopes?.map(s => (
              <span key={s} className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700/50 hover:border-slate-600 transition-colors">{s}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const inputCls = 'w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono';
  const readonlyCls = 'w-full bg-slate-950/80 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-400 font-mono cursor-not-allowed';

  return (
    <div className="max-w-4xl">
      {status.msg && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'} animate-in slide-in-from-top-4`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {status.msg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 glass-panel p-8 rounded-2xl">

        {/* Scheduler */}
        <section>
          <h3 className="text-lg font-semibold text-blue-400 mb-4 border-b border-slate-700 pb-2">Automation Schedule</h3>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Cron Pattern</label>
            <input
              type="text"
              name="cronSchedule"
              value={formData.cronSchedule}
              onChange={handleChange}
              className={inputCls}
              placeholder="* * * * *"
            />
            <p className="mt-1.5 text-xs text-slate-500">How often the engine runs. Default * * * * * (every 1 min).</p>
          </div>
        </section>

        {/* Google Sheets */}
        <section>
          <h3 className="text-lg font-semibold text-emerald-400 mb-4 border-b border-slate-700 pb-2">Google Sheets Integration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Spreadsheet ID</label>
              <input type="text" name="sheetId" value={formData.sheetId} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Service Account Email</label>
              <input type="email" name="googleClientEmail" value={formData.googleClientEmail} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Private Key</label>
              <textarea name="googlePrivateKey" value={formData.googlePrivateKey} onChange={handleChange} rows="4" className={`${inputCls} text-xs`}></textarea>
            </div>
          </div>
        </section>

        {/* Facebook */}
        <section>
          <h3 className="text-lg font-semibold text-blue-500 mb-4 border-b border-slate-700 pb-2">Facebook API</h3>
          <div className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">App ID</label>
                <input type="text" name="fbAppId" value={formData.fbAppId} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">App Secret</label>
                <input type="password" name="fbAppSecret" value={formData.fbAppSecret} onChange={handleChange} className={inputCls} />
              </div>
            </div>

            {/* Step 1: Nhập User Token rồi bấm Fetch Pages */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                User Access Token <span className="text-slate-500 font-normal text-xs">(dùng để lấy Page Token)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  name="fbUserToken"
                  value={formData.fbUserToken}
                  onChange={handleChange}
                  className={`${inputCls} flex-1`}
                  placeholder="EAABxxx... (User Token từ Graph API Explorer)"
                />
                <button
                  type="button"
                  onClick={() => handleCheckToken('user')}
                  disabled={checkingToken || !formData.fbUserToken}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-all flex items-center gap-2"
                  title="Kiểm tra thời hạn token"
                >
                  {checkingToken ? <RefreshCw size={14} className="animate-spin" /> : <AlertCircle size={14} />}
                  Check
                </button>
                <button
                  type="button"
                  onClick={handleFetchPages}
                  disabled={fetchingPages}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all whitespace-nowrap disabled:opacity-50 border border-slate-600"
                >
                  {fetchingPages ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                  Fetch Pages
                </button>
              </div>
              {renderTokenStatus(tokenInfo.user)}
            </div>

            {/* Step 2: Dropdown chọn Page (chỉ hiện sau khi bấm Fetch) */}
            {pages.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Chọn Fanpage</label>
                <select
                  onChange={handlePageSelect}
                  defaultValue=""
                  className="w-full bg-slate-900/50 border border-blue-500/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="" disabled>-- Chọn Fanpage của bạn --</option>
                  {pages.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 3: Các trường tự động điền */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Page ID <span className="text-slate-500 font-normal text-xs">(tự động điền)</span>
                </label>
                <input type="text" value={formData.fbPageId} readOnly className={readonlyCls} placeholder="Chọn page ở trên..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Page Access Token <span className="text-slate-500 font-normal text-xs">(tự động điền)</span>
                </label>
                <div className="flex gap-2">
                  <input type="password" value={formData.fbPageToken} readOnly className={`${readonlyCls} flex-1`} placeholder="Chọn page ở trên..." />
                  <button
                    type="button"
                    onClick={() => handleCheckToken('page')}
                    disabled={checkingToken || !formData.fbPageToken}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-all flex items-center gap-2"
                  >
                    {checkingToken ? <RefreshCw size={14} className="animate-spin" /> : <AlertCircle size={14} />}
                    Check
                  </button>
                </div>
              </div>
            </div>
            {renderTokenStatus(tokenInfo.page)}
          </div>
        </section>

        {/* Unsplash */}
        <section>
          <h3 className="text-lg font-semibold text-amber-400 mb-4 border-b border-slate-700 pb-2">Unsplash Images (Optional)</h3>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">API Key</label>
            <input type="password" name="unsplashKey" value={formData.unsplashKey} onChange={handleChange} className={`${inputCls} focus:border-amber-500 focus:ring-amber-500`} />
          </div>
        </section>

        {/* AI Prompt Generator */}
        <section>
          <h3 className="text-lg font-semibold text-violet-400 mb-4 border-b border-slate-700 pb-2">AI Prompt Generator</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Gemini API Key</label>
              <input 
                type="password" 
                name="geminiApiKey" 
                value={formData.geminiApiKey} 
                onChange={handleChange} 
                className={`${inputCls} focus:border-violet-500 focus:ring-violet-500`}
                placeholder="Google AI Studio API Key"
              />
              <p className="mt-1.5 text-xs text-slate-500">Required for Vietnamese to English translation and prompt enhancement.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Banned Words Filter</label>
              <textarea 
                name="bannedWords" 
                value={formData.bannedWords} 
                onChange={handleChange} 
                rows="3" 
                className={`${inputCls} focus:border-violet-500 focus:ring-violet-500`}
                placeholder="e.g. nsfw, gore, violent (separated by comma)"
              ></textarea>
              <p className="mt-1.5 text-xs text-slate-500">Words to be automatically filtered out from generated prompts.</p>
            </div>
          </div>
        </section>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30 hover:translate-y-px disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
            Save Configuration
          </button>
        </div>

      </form>
    </div>
  );
}

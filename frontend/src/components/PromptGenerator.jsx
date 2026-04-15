import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, History, Trash2, Wand2, Type, Zap, Check, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';

export default function PromptGenerator() {
  const [subject, setSubject] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [library, setLibrary] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copying, setCopying] = useState(false);
  const [mode, setMode] = useState('builder'); // 'builder' or 'template'

  // Fetch library and history on mount
  useEffect(() => {
    fetchLibrary();
    fetchHistory();
  }, []);

  const fetchLibrary = async () => {
    try {
      const res = await fetch('/api/prompt/library');
      const data = await res.json();
      if (data.success) setLibrary(data.library);
    } catch (err) {
      console.error('Failed to fetch library', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/prompt/history');
      const data = await res.json();
      if (data.success) setHistory(data.history);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const toggleKeyword = (kw) => {
    if (selectedKeywords.includes(kw)) {
      setSelectedKeywords(selectedKeywords.filter(k => k !== kw));
    } else {
      setSelectedKeywords([...selectedKeywords, kw]);
    }
  };

  const handleGenerate = async () => {
    if (!subject.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/prompt/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          keywords: selectedKeywords,
          aspectRatio
        })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedPrompt(data.prompt);
        fetchHistory(); // Refresh history
        setSubject('');
        setSelectedKeywords([]);
      }
    } catch (err) {
      console.error('Generation failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const handleDeleteHistory = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Xóa mục này khỏi lịch sử?')) return;
    try {
      const res = await fetch(`/api/prompt/history/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchHistory();
    } catch (err) {
      console.error('Failed to delete history item', err);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Xóa TOÀN BỘ lịch sử generator?')) return;
    try {
      const res = await fetch('/api/prompt/history', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchHistory();
    } catch (err) {
      console.error('Failed to clear history', err);
    }
  };

  const applyPreset = (preset) => {
    setSubject(preset.subject);
    setSelectedKeywords(preset.keywords);
    setAspectRatio(preset.aspectRatio || '16:9');
  };

  const PRESETS = [
    { 
        name: 'Cinematic Portrait', 
        subject: 'Portrait of a mysterious woman', 
        keywords: ['cinematic lighting', '85mm lens', 'depth of field', 'rim lighting', 'highly detailed'],
        icon: <Zap size={16} />
    },
    { 
        name: 'Product Shot', 
        subject: 'Luxury fragrance bottle', 
        keywords: ['studio lighting', 'glass reflection', 'minimalist', 'softbox lighting', 'macro photography'],
        icon: <Zap size={16} />
    },
    { 
        name: 'Future Logistics', 
        subject: 'Autonomous delivery drone flying over city', 
        keywords: ['futuristic', 'neon lighting', 'blue hour', 'volumetric lighting', 'metallic finish'],
        icon: <Zap size={16} />
    }
  ];

  return (
    <div className="relative h-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Panel - Left Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-2xl shadow-xl border border-slate-700/50">
            <div className="flex items-center gap-2 mb-6 text-amber-400">
              <Sparkles size={24} />
              <h2 className="text-xl font-bold tracking-tight">AI Prompt Master</h2>
            </div>

            <div className="space-y-6">
              {/* Subject Input */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <Type size={14} /> Chủ thể chính (Subject)
                </label>
                <textarea
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all min-h-[100px] text-lg"
                />
                <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
                  <AlertCircle size={12} /> Hỗ trợ tiếng Việt (Tự động dịch sang tiếng Anh chuyên môn)
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="flex p-1 bg-slate-900 rounded-lg w-fit border border-slate-700">
                <button 
                  onClick={() => setMode('builder')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'builder' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Builder Mode
                </button>
                <button 
                  onClick={() => setMode('template')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'template' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Template Mode
                </button>
              </div>

              {/* Builder Mode - Compact */}
              {mode === 'builder' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {library.map(category => (
                    <div key={category.id} className="space-y-2">
                      <h3 className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-widest">
                        <ChevronRight size={12} className="text-amber-500/50" />
                        {category.name}
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {(category.keywords || []).map(kw => (
                          <button
                            key={kw.id}
                            onClick={() => toggleKeyword(kw.name)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                              selectedKeywords.includes(kw.name)
                                ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                                : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-500 hover:bg-slate-800/50'
                            }`}
                            title={kw.name}
                          >
                            {kw.label || kw.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Aspect Ratio - Integrated */}
                  <div className="pt-2 border-t border-slate-800/50">
                    <h3 className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Aspect Ratio</h3>
                    <div className="flex gap-2">
                      {['1:1', '16:9', '9:16', '4:5', '2:3'].map(ar => (
                        <button
                          key={ar}
                          onClick={() => setAspectRatio(ar)}
                          className={`w-12 py-1.5 rounded-lg text-[10px] font-mono border transition-all ${
                            aspectRatio === ar 
                              ? 'bg-slate-100 text-slate-900 border-white font-bold' 
                              : 'bg-slate-900/50 text-slate-500 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {ar}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Template Mode */}
              {mode === 'template' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in slide-in-from-left-4 duration-300">
                  {PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="p-3 rounded-xl border border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 hover:border-amber-500/50 text-left transition-all group"
                    >
                      <div className="p-1.5 w-fit rounded-lg bg-slate-900 text-amber-400 mb-2 group-hover:bg-amber-500 group-hover:text-slate-900 transition-colors">
                        {React.cloneElement(preset.icon, { size: 14 })}
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 mb-1">{preset.name}</h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{preset.subject}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action & Result - Right Column */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
          {/* Main Action Button */}
          <div className="glass-panel p-1 rounded-2xl border border-slate-700/50 shadow-xl">
            <button
              onClick={handleGenerate}
              disabled={loading || !subject.trim()}
              className="w-full py-6 bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm tracking-tighter rounded-xl shadow-lg shadow-amber-500/20 flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:grayscale overflow-hidden group"
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={24} />
              ) : (
                <Wand2 size={24} className="group-hover:rotate-12 group-hover:scale-110 transition-all" />
              )}
              GENERATE PROFESSIONAL PROMPT
            </button>
          </div>

          {/* Result Preview */}
          {generatedPrompt && (
            <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.03] animate-in slide-in-from-right-6 duration-500 group relative shadow-2xl shadow-amber-500/5">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-[0.2em] flex items-center gap-2 bg-amber-500/10 px-2 py-1 rounded">
                  <Zap size={10} className="fill-amber-500" /> Output Ready
                </span>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${
                    copying 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95 border border-slate-700'
                  }`}
                >
                  {copying ? <Check size={14} /> : <Copy size={14} />}
                  {copying ? 'COPIED!' : 'COPY TO CLIPBOARD'}
                </button>
              </div>
              
              <div className="relative">
                <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500/50 to-transparent rounded-full" />
                <p className="text-lg font-medium text-slate-100 leading-relaxed italic pl-4 pr-4 selection:bg-amber-500/30">
                  "{generatedPrompt}"
                </p>
              </div>

              <div className="mt-8 flex items-center gap-4 pt-6 border-t border-slate-800/50">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center">
                        <Sparkles size={10} className="text-amber-500/50" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">Fine-tuned for Midjourney & Stable Diffusion</p>
              </div>
            </div>
          )}

          {!generatedPrompt && (
            <div className="h-64 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 gap-3">
              <div className="p-4 rounded-full bg-slate-900/50">
                <Sparkles size={32} className="opacity-20" />
              </div>
              <p className="text-sm font-medium">Kết quả sẽ hiển thị tại đây</p>
            </div>
          )}
        </div>
      </div>


      {/* History Sidebar */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 z-50 transition-transform duration-500 transform ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-200 flex items-center gap-2">
              <History size={18} /> Lịch sử Generator
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleClearHistory}
                className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-slate-500 transition-colors"
                title="Xóa tất cả"
              >
                <Trash2 size={18} />
              </button>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto space-y-4 pr-2 custom-scrollbar">
            {!Array.isArray(history) || history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-500 opacity-50">
                <History size={48} className="mb-2" />
                <p className="text-sm">Chưa có lịch sử</p>
              </div>
            ) : (
              history.map((h, i) => (
                <div 
                  key={h.id} 
                  className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-amber-500/50 transition-colors group relative cursor-pointer"
                  onClick={() => {
                      setGeneratedPrompt(h.prompt);
                      setShowHistory(false);
                  }}
                >
                  <p className="text-xs text-slate-300 line-clamp-3 italic mb-2">"{h.prompt}"</p>
                  <div className="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(h.createdAt).toLocaleTimeString()}</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => handleDeleteHistory(e, h.id)}
                        className="p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                      <Copy size={12} className="text-slate-500" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* History Toggle Button (Floating) */}
      {!showHistory && (
        <button 
          onClick={() => setShowHistory(true)}
          className="fixed bottom-10 right-10 w-14 h-14 bg-slate-800 text-amber-500 rounded-full shadow-2xl border border-slate-700 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
        >
          <History size={24} />
          <span className="absolute right-full mr-3 px-2 py-1 bg-slate-800 text-xs text-slate-300 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Xem lịch sử</span>
        </button>
      )}
    </div>
  );
}

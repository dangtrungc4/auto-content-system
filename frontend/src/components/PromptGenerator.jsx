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
    <div className="flex gap-6 relative h-full">
      {/* Main Panel */}
      <div className="flex-1 space-y-6">
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
                placeholder="Ví dụ: Chân dung một phi hành gia trên sao hỏa..."
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

            {/* Builder Mode */}
            {mode === 'builder' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {library.map(category => (
                  <div key={category.id} className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <ChevronRight size={14} className="text-amber-500" />
                      {category.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(category.keywords || []).map(kw => (
                        <button
                          key={kw.id}
                          onClick={() => toggleKeyword(kw.name)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            selectedKeywords.includes(kw.name)
                              ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                              : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                          title={kw.name}
                        >
                          {kw.label || kw.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Aspect Ratio */}
                <div className="pt-2">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-tight">Aspect Ratio</h3>
                  <div className="flex gap-3">
                    {['1:1', '16:9', '9:16', '4:5', '2:3'].map(ar => (
                      <button
                        key={ar}
                        onClick={() => setAspectRatio(ar)}
                        className={`w-14 py-2 rounded-lg text-xs font-mono border transition-all ${
                          aspectRatio === ar 
                            ? 'bg-slate-200 text-slate-900 border-white font-bold' 
                            : 'bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-500'
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-left-4 duration-300">
                {PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="p-4 rounded-xl border border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 hover:border-amber-500/50 text-left transition-all group"
                  >
                    <div className="p-2 w-fit rounded-lg bg-slate-900 text-amber-400 mb-3 group-hover:bg-amber-500 group-hover:text-slate-900 transition-colors">
                      {preset.icon}
                    </div>
                    <h4 className="font-bold text-slate-200 mb-1">{preset.name}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{preset.subject}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="pt-6 border-t border-slate-800/50">
              <button
                onClick={handleGenerate}
                disabled={loading || !subject.trim()}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:grayscale overflow-hidden group"
              >
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <Wand2 size={20} className="group-hover:rotate-12 transition-transform" />}
                GENERATE PROFESSIONAL PROMPT
              </button>
            </div>
          </div>
        </div>

        {/* Result Preview */}
        {generatedPrompt && (
          <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 animate-in slide-in-from-bottom-6 group relative">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <Check size={14} /> Ready for Generation
              </span>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  copying 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95'
                }`}
              >
                {copying ? <Check size={14} /> : <Copy size={14} />}
                {copying ? 'COPIED!' : 'COPY TO CLIPBOARD'}
              </button>
            </div>
            <p className="text-lg font-medium text-slate-100 leading-relaxed italic pr-12">
              "{generatedPrompt}"
            </p>
          </div>
        )}
      </div>

      {/* History Sidebar */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 z-50 transition-transform duration-500 transform ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-200 flex items-center gap-2">
              <History size={18} /> Lịch sử Generator
            </h3>
            <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
               <ChevronRight size={20} />
            </button>
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
                    <Copy size={12} className="text-slate-500" />
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

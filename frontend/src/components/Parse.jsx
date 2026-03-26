import React, { useState } from 'react';
import { FileText, Wand2, Image, Quote, AlignLeft, Hash, Calendar, Clock, AlertCircle, Save, Check, CheckCircle } from 'lucide-react';

export default function Parse() {
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  // default text for hint
  const placeholder = `[ SG • 2026 . 03 . 25 ]\n\n"ĐÊM CÓ ĐOM ĐÓM"\n\nNgày xưa, đêm không tối hẳn.\nCứ vào hồi nhá nhem, lũ đom đóm bắt đầu thắp đèn...\n\n#gocnhocuamia #miake`;

  const handleParse = async () => {
    if (!text.trim()) {
      setError("Vui lòng nhập nội dung bài viết");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, imageUrl })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setIsSaved(false);
      } else {
        setError(data.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      setError("Lỗi kết nối server: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || isSaved) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
      const data = await res.json();
      if (data.success) {
        setIsSaved(true);
        setSuccess("Đã lưu nội dung vào Google Sheet thành công!");
        setText('');
        setImageUrl('');
        // Tự động xóa preview sau 3 giây để sẵn sàng cho bài mới
        setTimeout(() => {
          setResult(null);
          setIsSaved(false);
          setSuccess(null);
        }, 3000);
      } else {
        setError(data.error || "Có lỗi khi lưu vào Sheet");
      }
    } catch (err) {
      setError("Lỗi kết nối server: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Panel */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <FileText size={20} />
          </div>
          <h2 className="text-xl font-semibold text-slate-100">Dán nội dung bài viết</h2>
        </div>
        
        <p className="text-slate-400 text-sm mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
          Format: <code className="text-emerald-400 font-mono">[ Địa điểm • Ngày ]</code> → <code className="text-blue-400 font-mono">"Tên bài"</code> → Nội dung → <code className="text-purple-400 font-mono">#hashtag</code>
        </p>

        <div className="flex items-center gap-3 mb-2 px-1">
          <Image size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-400">Link ảnh (Không bắt buộc)</span>
        </div>
        <input 
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Dán link ảnh tại đây (Ví dụ: https://unsplash.com/...)"
          className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans mb-4"
        />

        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="w-full flex-1 min-h-[400px] bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans resize-none mb-6"
        ></textarea>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-start gap-2 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-start gap-2 text-sm">
            <CheckCircle size={16} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <button 
          onClick={handleParse}
          disabled={loading}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Wand2 size={18} />
          )}
          {loading ? 'Đang xử lý...' : 'Bước 1: Parse & Xem trước'}
        </button>
      </div>

      {/* Preview Panel */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col h-full min-h-[600px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <span className="font-bold font-mono">KẾT QUẢ</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-100">Bản xem trước</h2>
          </div>
          <div className="flex items-center gap-3">
            {result && (
              <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-xs font-semibold uppercase tracking-wider">
                {result.status || 'Chưa đăng'}
              </span>
            )}
          </div>
        </div>

        {!result ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <FileText size={64} className="mb-4 text-slate-700 font-light stroke-[1]" />
            <p className="text-center font-medium">Nhấn "Parse & Lưu" để xem kết quả tại đây</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Image Preview */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center group">
              {result.imageUrl ? (
                <img src={result.imageUrl} alt="Result Image" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              ) : (
                <div className="text-slate-600 flex flex-col items-center gap-2">
                  <Image size={32} />
                  <span>Không tìm thấy ảnh</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 to-transparent p-4 flex gap-4 text-sm text-slate-300">
                 <div className="flex items-center gap-1.5"><Calendar size={14} className="text-blue-400"/> {result.date}</div>
                 <div className="flex items-center gap-1.5"><Clock size={14} className="text-emerald-400"/> {result.time}</div>
              </div>
            </div>

            {/* Field: Caption */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                <Quote size={14} /> Caption
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 text-slate-200 whitespace-pre-wrap font-medium">
                {result.caption}
              </div>
            </div>

            {/* Field: Content */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                <AlignLeft size={14} /> Content
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 text-slate-300 whitespace-pre-wrap leading-relaxed">
                {result.content}
              </div>
            </div>

            {/* Field: Hashtag */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                <Hash size={14} /> Hashtag
              </div>
              <div className="bg-blue-500/5 px-4 py-3 rounded-xl border border-blue-500/20 text-blue-400 font-mono text-sm break-all">
                {result.hashtag || <span className="text-slate-500 italic">Không có hashtag</span>}
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={saving || isSaved}
              className={`w-full py-3.5 px-4 rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                isSaved 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
              }`}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isSaved ? (
                <Check size={18} />
              ) : (
                <Save size={18} />
              )}
              {isSaved ? 'Đã lưu thành công' : (saving ? 'Đang lưu...' : 'Bước 2: Xác nhận & Lưu vào Sheet')}
            </button>

          </div>
        )}
      </div>
    </div>
  );
}

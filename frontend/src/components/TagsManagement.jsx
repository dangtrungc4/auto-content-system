import { useState, useEffect } from 'react';
import { useModal } from '../contexts/ModalContext';
import { Tag, Plus, X, Check, Trash2, RefreshCw, Pencil, Link, Hash } from 'lucide-react';

const TAG_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#f59e0b', '#10b981', '#06b6d4', '#64748b', '#84cc16',
];

function ColorDot({ color, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-6 h-6 rounded-full border-2 transition-all shrink-0 hover:scale-110"
      style={{
        backgroundColor: color,
        borderColor: selected ? 'white' : 'transparent',
        boxShadow: selected ? `0 0 0 2px ${color}` : 'none',
      }}
      title={color}
    />
  );
}

function TagBadge({ tag }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border select-none"
      style={{
        backgroundColor: tag.color + '22',
        borderColor: tag.color + '55',
        color: tag.color,
      }}
    >
      <Hash size={10} />
      {tag.name}
    </span>
  );
}

export default function TagsManagement() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3b82f6');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [error, setError] = useState('');
  
  const { showAlert, showConfirm } = useModal();

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tags');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend is not responding correctly (returned HTML).' : 'Lỗi lấy danh sách tag.');
      }
      const data = await res.json();
      if (data.success) setTags(data.tags);
      else setError(data.error || 'Lỗi lấy tag.');
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTags(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) { setError('Tên tag không được để trống.'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend is not responding correctly (returned HTML).' : 'Lỗi tạo tag.');
      }
      const data = await res.json();
      if (data.success) {
        setNewName('');
        setNewColor('#3b82f6');
        setIsAdding(false);
        fetchTags();
      } else {
        setError(data.error || 'Lỗi tạo tag.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id) => {
    if (!editName.trim()) { setError('Tên tag không được để trống.'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), color: editColor })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend is not responding correctly (returned HTML).' : 'Lỗi cập nhật tag.');
      }
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        fetchTags();
      } else {
        setError(data.error || 'Lỗi cập nhật tag.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      'Xóa thẻ Tag?',
      'Thẻ Tag này sẽ bị gỡ khỏi tất cả các bài viết liên quan. Hành động này không thể hoàn tác.',
      async () => {
        setDeletingId(id);
        try {
          const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' }).then(r => r.json());
          if (res.success) fetchTags();
          else showAlert('Lỗi hệ thống', res.error, 'error');
        } catch (e) { showAlert('Lỗi kết nối', e.message, 'error'); }
        finally { setDeletingId(null); }
      }
    );
  };

  const handleBulkAssign = (id) => {
    showConfirm(
      'Áp dụng hàng loạt?',
      'Hệ thống sẽ tự động gán toàn bộ ảnh/bài viết CÒN TRỐNG TAG vào phân loại này. Đồng ý chứ?',
      async () => {
        setAssigningId(id);
        try {
          const res = await fetch(`/api/tags/${id}/bulk-assign`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignAll: false })
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text.includes('<!DOCTYPE') ? 'Hãy khởi động lại Backend Server (API mới chưa có mặt).' : `HTTP ${res.status}`);
          }
          const data = await res.json();
          
          if (data.success) {
            showAlert(
              'Gán thành công', 
              data.updatedCount > 0 
                ? `Đã liên kết hoàn tất ${data.updatedCount} bài viết.` 
                : 'Tất cả bài viết hiện tại đều đã được gắn Tag.',
              'success'
            );
            fetchTags();
          } else {
            showAlert('Lỗi báo cáo', data.error || 'Có lỗi xảy ra.', 'error');
          }
        } catch (e) { 
          showAlert('Lỗi hệ thống', e.message, 'error'); 
        } finally { 
          setAssigningId(null); 
        }
      },
      { confirmText: 'Áp dụng', variant: 'info' }
    );
  };

  const startEdit = (tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setIsAdding(false);
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <Tag size={20} className="text-violet-400" />
          <span className="font-semibold text-lg">{tags.length} tags</span>
        </div>
        <button
          onClick={() => { setIsAdding(true); setEditingId(null); setError(''); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-500/25"
        >
          <Plus size={16} />
          Thêm tag mới
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-slate-800/60 border border-violet-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
          <p className="text-sm font-bold text-violet-400 uppercase tracking-widest">Thêm tag mới</p>
          {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 items-center">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Tên tag..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-violet-500 transition-all text-sm"
            />
            <div
              className="w-9 h-9 rounded-xl border-2 border-slate-600 shrink-0 cursor-pointer shadow"
              style={{ backgroundColor: newColor }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {TAG_COLORS.map(c => (
              <ColorDot key={c} color={c} selected={newColor === c} onClick={() => setNewColor(c)} />
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setIsAdding(false); setError(''); }} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 text-sm font-semibold transition-all">Huỷ</button>
            <button onClick={handleCreate} disabled={saving} className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              Tạo tag
            </button>
          </div>
        </div>
      )}

      {/* Tags List */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw size={28} className="animate-spin text-violet-400" />
          </div>
        ) : tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
            <Tag size={40} className="opacity-30" />
            <p>Chưa có tag nào. Tạo tag đầu tiên!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {tags.map(tag => (
              <div key={tag.id} className="group px-5 py-4 hover:bg-slate-700/20 transition-colors">
                {editingId === tag.id ? (
                  <div className="space-y-3">
                    {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
                    <div className="flex gap-3 items-center">
                      <input
                        autoFocus
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleEdit(tag.id)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:border-violet-500 transition-all text-sm"
                      />
                      <div className="w-8 h-8 rounded-lg border border-slate-600 shrink-0" style={{ backgroundColor: editColor }} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {TAG_COLORS.map(c => (
                        <ColorDot key={c} color={c} selected={editColor === c} onClick={() => setEditColor(c)} />
                      ))}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setEditingId(null); setError(''); }} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all"><X size={16} /></button>
                      <button onClick={() => handleEdit(tag.id)} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all disabled:opacity-50">
                        {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <TagBadge tag={tag} />
                    <span className="text-xs text-slate-600 ml-1">{tag._count?.posts ?? 0} bài viết</span>
                    <div className="ml-auto flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleBulkAssign(tag.id)}
                        disabled={assigningId === tag.id}
                        className="p-2 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                        title="Gán các bài viết chưa có tag vào đây"
                      >
                        {assigningId === tag.id ? <RefreshCw size={15} className="animate-spin" /> : <Link size={15} />}
                      </button>
                      <button
                        onClick={() => startEdit(tag)}
                        className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                        title="Sửa tag"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id)}
                        disabled={deletingId === tag.id}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        title="Xóa tag"
                      >
                        {deletingId === tag.id ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

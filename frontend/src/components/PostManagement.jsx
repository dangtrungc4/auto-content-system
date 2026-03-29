import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  ExternalLink, 
  Image as ImageIcon, 
  MessageSquare, 
  RefreshCw, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Plus, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Eye,
  ThumbsUp,
  Share2
} from 'lucide-react';

export default function PostManagement() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [filtersApplied, setFiltersApplied] = useState({ search: '', status: '' });
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [previewPost, setPreviewPost] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPosts = useCallback(async (pageToFetch = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageToFetch,
        limit: 10,
        search: filtersApplied.search,
        status: filtersApplied.status
      });
      const res = await fetch(`/api/posts?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch posts', err);
    } finally {
      setLoading(false);
    }
  }, [filtersApplied]);

  useEffect(() => {
    fetchPosts(1);
  }, [filtersApplied, fetchPosts]);

  const handleApplyFilters = () => {
    setFiltersApplied({ search, status });
  };

  const handleDelete = (post) => {
    setPostToDelete(post);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!postToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setIsDeleteModalOpen(false);
        setPostToDelete(null);
        fetchPosts(pagination.page);
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      alert('Lỗi kết nối: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (post) => {
    setEditingPost({ ...post });
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const url = editingPost.id ? `/api/posts/${editingPost.id}` : '/api/posts';
      const method = editingPost.id ? 'PUT' : 'POST';
      
      // Đảm bảo dữ liệu sạch trước khi gửi
      const payload = { ...editingPost };
      if (method === 'POST') {
        delete payload.id; // Luôn xóa id khi tạo mới
      }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Kiểm tra nếu response không phải JSON (tránh lỗi Unexpected token <)
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Mã lỗi ${res.status}`);
      }

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Máy chủ không trả về JSON hợp lệ.");
      }
      
      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        fetchPosts(pagination.page);
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Lỗi khi lưu bài viết: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFindImage = async () => {
    // Ưu tiên dùng Tiêu đề, sau đó mới dùng Địa điểm hoặc Chủ đề để tìm ảnh
    const query = editingPost.title || editingPost.location || editingPost.topic;
    
    if (!query || query.trim() === '') {
      alert('Vui lòng nhập "Tiêu đề", "Địa điểm" hoặc "Chủ đề" để hệ thống lấy từ khóa tìm ảnh.');
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/images/search?query=${encodeURIComponent(query)}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Lỗi server (${res.status}): ${errorText.substring(0, 100)}`);
      }
      
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setEditingPost({ ...editingPost, imageUrl: data.imageUrl });
      } else {
        alert('Không tìm thấy ảnh từ Unsplash phù hợp với từ khóa: "' + query + '". Bạn vui lòng thử dùng Tiêu đề ngắn gọn hơn (tiếng Anh sẽ cho kết quả tốt hơn).');
      }
    } catch (err) {
      console.error('Find image error:', err);
      alert('Lỗi khi tìm ảnh: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };




  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getStatusBadge = (status) => {

    switch (status) {
      case 'PUBLISHED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit"><CheckCircle2 size={12}/> Đã đăng</span>;
      case 'SCHEDULED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 w-fit"><Calendar size={12}/> Chờ đăng</span>;
      case 'FAILED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 w-fit"><AlertCircle size={12}/> Lỗi</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20 flex items-center gap-1 w-fit"><Edit size={12}/> Bản nháp</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm bài viết..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              className="w-full bg-slate-800 border border-slate-700 text-sm rounded-xl py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-500"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-sm rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="SCHEDULED">Chờ đăng</option>
              <option value="PUBLISHED">Đã đăng</option>
              <option value="FAILED">Lỗi</option>
            </select>
            <button 
              onClick={handleApplyFilters}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-500/20"
            >
              Lọc
            </button>
          </div>
        </div>
        <button 
          onClick={() => { 
            const d = new Date();
            const loc = `[ SG • ${d.getFullYear()} . ${String(d.getMonth()+1).padStart(2,'0')} . ${String(d.getDate()).padStart(2,'0')} ]`;
            setEditingPost({ title: '', content: '', caption: '', location: loc, status: 'DRAFT' }); 
            setIsEditModalOpen(true); 
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 shrink-0"
        >
          <Plus size={18} />
          Thêm bài mới
        </button>
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl border border-slate-800 shadow-xl bg-slate-800/30 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Bài viết</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tác giả</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Lập lịch</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <RefreshCw className="animate-spin text-blue-500 mx-auto" size={32} />
                    <p className="mt-4 text-slate-400 text-sm">Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <MessageSquare className="text-slate-600 mx-auto mb-4" size={48} />
                    <p className="text-slate-400">Không tìm thấy bài viết nào.</p>
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-700/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0 group-hover:ring-2 ring-blue-500/30 transition-all">
                          {post.imageUrl ? (
                            <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <ImageIcon size={20} />
                            </div>
                          )}
                        </div>
                        <div className="max-w-xs truncate">
                          <h3 className="text-sm font-semibold text-slate-100 mb-0.5 truncate">
                            {post.title || post.caption?.split('\n')[0] || 'Chưa có tiêu đề'}
                          </h3>
                          <p className="text-xs text-slate-500 truncate">{post.caption || 'Không có mô tả'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(post.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
                          {post.authorId ? 'A' : 'S'}
                        </div>
                        <span className="text-xs font-medium text-slate-300">{post.authorId ? 'Admin' : 'System'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-500"/>
                          {post.scheduledAt ? new Date(post.scheduledAt).toLocaleDateString('vi-VN') : 'Chưa đặt'}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <Clock size={10} className="text-slate-600"/>
                          {post.scheduledAt ? new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setPreviewPost(post)}
                          className="p-2 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 rounded-lg transition-all"
                          title="Xem trước giao diện FB"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleEdit(post)}
                          className="p-2 hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 rounded-lg transition-all"
                          title="Chỉnh sửa"
                        >
                          <Edit size={16} />
                        </button>
                        {post.fbPostId && (
                          <a 
                            href={`https://facebook.com/${post.fbPostId}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                            title="Xem trên Facebook"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                        <button 
                          onClick={() => handleDelete(post)}
                          className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                          title="Xóa bài viết"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50 bg-slate-800/20">
            <p className="text-xs text-slate-400">
              Trang <span className="font-semibold text-slate-200">{pagination.page}</span> / <span className="font-semibold text-slate-200">{pagination.totalPages}</span> 
              {' '}(Tổng: {pagination.total})
            </p>
            <div className="flex items-center gap-2">
              <button 
                disabled={pagination.page <= 1}
                onClick={() => fetchPosts(pagination.page - 1)}
                className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all disabled:opacity-30 border border-slate-700"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchPosts(pagination.page + 1)}
                className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all disabled:opacity-30 border border-slate-700"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                {editingPost.id ? <Edit size={20} className="text-blue-400"/> : <Plus size={20} className="text-emerald-400"/>}
                {editingPost.id ? 'Sửa bài viết' : 'Thêm bài viết mới'}
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Địa điểm (Format: [ Địa điểm • Ngày ])</label>
                <input 
                  type="text" 
                  value={editingPost.location || ''}
                  onChange={(e) => setEditingPost({...editingPost, location: e.target.value})}
                  placeholder="Ví dụ: Đà Lạt, TP.HCM..."
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Tiêu đề (Sẽ hiển thị dạng "Tên bài")</label>
                <input 
                  type="text" 
                  value={editingPost.title || ''}
                  onChange={(e) => setEditingPost({...editingPost, title: e.target.value})}
                  placeholder="Tiêu đề bài viết..."
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Caption (Tự động tạo từ Địa điểm & Tiêu đề nếu để trống)</label>
                <textarea 
                  value={editingPost.caption || ''}
                  onChange={(e) => setEditingPost({...editingPost, caption: e.target.value})}
                  placeholder='[ Địa điểm • Ngày ]&#10;"Tên bài"'
                  className="w-full h-20 bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nội dung chính</label>
                <textarea 
                  value={editingPost.content || ''}
                  onChange={(e) => setEditingPost({...editingPost, content: e.target.value})}
                  placeholder="Nội dung chính..."
                  className="w-full h-32 bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Hashtag</label>
                <input 
                  type="text" 
                  value={editingPost.hashtag || ''}
                  onChange={(e) => setEditingPost({...editingPost, hashtag: e.target.value})}
                  placeholder="#hashtag1 #hashtag2..."
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Trạng thái</label>
                  <select 
                    value={editingPost.status || 'DRAFT'}
                    onChange={(e) => setEditingPost({...editingPost, status: e.target.value})}
                    className="w-full bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all appearance-none outline-none"
                  >
                    <option value="DRAFT">Bản nháp</option>
                    <option value="SCHEDULED">Chờ đăng (Lập lịch)</option>
                    <option value="PUBLISHED">Đã đăng</option>
                    <option value="FAILED">Lỗi</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Ngày đăng bài</label>
                  <input 
                    type="datetime-local" 
                    value={formatDateTimeLocal(editingPost.scheduledAt)}
                    onChange={(e) => setEditingPost({...editingPost, scheduledAt: e.target.value})}
                    className="w-full bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                  />

                </div>
              </div>

              <div className="space-y-2">

                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Link ảnh</label>

                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={editingPost.imageUrl || ''}
                    onChange={(e) => setEditingPost({...editingPost, imageUrl: e.target.value})}
                    placeholder="URL ảnh (Unsplash, FB, etc.)..."
                    className="flex-1 bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                  />
                  <button 
                    onClick={handleFindImage}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-3 rounded-xl border border-slate-700 transition-all flex items-center gap-2"
                    title="Tìm ảnh tự động"
                  >
                    <Search size={18} />
                    <span className="text-xs font-medium">Tìm ảnh</span>
                  </button>
                  {editingPost.imageUrl && (
                    <div className="w-12 h-12 rounded-xl border border-slate-700 overflow-hidden shrink-0">
                      <img src={editingPost.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                Hủy
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>}
                Lưu bài viết
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Modal */}
      {isDeleteModalOpen && postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Xóa bài viết?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Bạn có chắc chắn muốn xóa <span className="text-slate-200 font-semibold">{postToDelete.title ? `"${postToDelete.title}"` : 'bài viết này'}</span> không? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all border border-slate-700 hover:border-slate-600"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 transition-all flex items-center gap-2 shadow-lg shadow-red-500/30 disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {isDeleting ? 'Đang xóa...' : 'Xóa bài viết'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-[500px] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Eye size={18} className="text-blue-600" /> Xem trước bài viết
              </h3>
              <button 
                onClick={() => setPreviewPost(null)}
                className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Facebook Post Preview Area */}
            <div className="overflow-y-auto bg-gray-200 flex-1 p-4 md:p-6 custom-scrollbar">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 pb-2">
                {/* FB Post Header */}
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden border border-gray-200 flex-shrink-0">
                    <img src="https://ui-avatars.com/api/?name=Fanpage+Name&background=0D8ABC&color=fff" alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[15px] text-gray-900 leading-tight cursor-pointer hover:underline">Tên Fanpage Của Bạn</h4>
                    <div className="flex items-center gap-1 text-[13px] text-gray-500">
                      <span className="cursor-pointer hover:underline">{previewPost.scheduledAt ? new Date(previewPost.scheduledAt).toLocaleString('vi-VN') : 'Vừa xong'}</span>
                      <span>·</span>
                      <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                        <g fillRule="evenodd" transform="translate(-448 -544)">
                          <path fillRule="nonzero" d="M452.709 555.084c0-2.31 1.082-4.364 2.766-5.719A7.95 7.95 0 01456 544c4.418 0 8 3.582 8 8s-3.582 8-8 8a7.95 7.95 0 01-5.115-1.859c-1.353-1.684-2.176-3.83-2.176-6.057zm1.657-3.951A6.471 6.471 0 00449.5 552c0 .248.016.491.045.729.13-.19.273-.367.433-.526a1.5 1.5 0 012.336-.073l1.858 2.062a.5.5 0 00.37.168h1.231a.5.5 0 00.5-.5v-1.127a.5.5 0 00-.146-.353l-1.077-1.077c-.504-.504-.504-1.321 0-1.825l.443-.443a.5.5 0 01.353-.146h1.56a1.5 1.5 0 011.5 1.5.5.5 0 00.5.5h1.22c.162-.977.01-1.996-.454-2.883l-1.99 1.99a.5.5 0 01-.354.146h-1.67a1.5 1.5 0 01-1.5-1.5v-1.611a6.45 6.45 0 00-2.951-.62Z"></path>
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* FB Post Content */}
                <div className="px-4 pb-3">
                  <div className="text-[15px] text-gray-900 whitespace-pre-wrap font-normal leading-normal">
{previewPost.caption && `${previewPost.caption}

`}
{previewPost.content && `${previewPost.content}

`}
{previewPost.hashtag && <span className="text-[#0866FF] cursor-pointer hover:underline">{previewPost.hashtag}</span>}
                  </div>
                </div>

                {/* FB Post Image */}
                {previewPost.imageUrl && (
                  <div className="w-full bg-gray-100 border-y border-gray-200">
                    <img src={previewPost.imageUrl} alt="Post" className="w-full h-auto object-cover max-h-[500px]" />
                  </div>
                )}
                
                {/* FB Post Footer */}
                <div className="px-4 py-1 border-t border-gray-200 mt-2 mx-4 flex justify-between gap-1">
                  <button className="flex-1 flex items-center justify-center gap-2 py-1.5 hover:bg-gray-100 rounded-md text-gray-500 font-semibold text-[15px] transition-colors">
                    <ThumbsUp size={18} strokeWidth={2.5} className="text-gray-500" /> Thích
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-1.5 hover:bg-gray-100 rounded-md text-gray-500 font-semibold text-[15px] transition-colors">
                    <MessageSquare size={18} strokeWidth={2.5} className="text-gray-500" /> Bình luận
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-1.5 hover:bg-gray-100 rounded-md text-gray-500 font-semibold text-[15px] transition-colors">
                    <Share2 size={18} strokeWidth={2.5} className="text-gray-500" /> Chia sẻ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

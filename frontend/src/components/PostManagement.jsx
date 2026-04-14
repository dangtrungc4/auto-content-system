import React, { useState, useEffect, useCallback } from 'react';
import { useModal } from '../contexts/ModalContext';
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
  Share2,
  Tag
} from 'lucide-react';

export default function PostManagement() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [filtersApplied, setFiltersApplied] = useState({ search: '', status: '' });
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');
  const [quickPasteText, setQuickPasteText] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [previewPost, setPreviewPost] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const { showAlert, showConfirm } = useModal();
  const [availableTags, setAvailableTags] = useState([]);
  
  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then(data => {
      if (data.success) setAvailableTags(data.tags);
    }).catch(console.error);
  }, []);

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
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend returned HTML.' : `HTTP ${res.status}`);
      }
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

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsImageLightboxOpen(false);
        setPreviewPost(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleApplyFilters = () => {
    setFiltersApplied({ search, status });
  };

  const handleDelete = (post) => {
    showConfirm(
      'Xóa bài viết?',
      `Bạn có chắc chắn muốn xóa bài viết "${post.title || 'này'}" không? Thao tác này không thể hoàn tác.`,
      async () => {
        setIsDeleting(true);
        try {
          const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text.includes('<!DOCTYPE') ? 'Backend returned HTML.' : `HTTP ${res.status}`);
          }
          const data = await res.json();
          if (data.success) {
            fetchPosts(pagination.page);
          } else {
            showAlert('Lỗi xóa bài', data.error, 'error');
          }
        } catch (err) {
          showAlert('Lỗi hệ thống', err.message, 'error');
        } finally {
          setIsDeleting(false);
        }
      }
    );
  };

  const handleEdit = (post) => {
    setEditingPost({ ...post, tagIds: post.tags?.map(t => t.id) || [] });
    setActiveTab('manual');
    setQuickPasteText('');
    setIsEditModalOpen(true);
  };

  const handleParseQuickPaste = (textArg) => {
    const textToParse = typeof textArg === 'string' ? textArg : quickPasteText;
    if (!textToParse || !textToParse.trim()) {
      showAlert("Dữ liệu trống", "Vui lòng dán nội dung vào ô văn bản.", "error");
      return;
    }
    const lines = textToParse.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      showAlert("Nội dung không đủ", "Yêu cầu ít nhất 2 dòng (Địa điểm và Tiêu đề).", "error");
      return;
    }

    const location = lines[0];
    let title = lines[1];
    if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith('“') && title.endsWith('”'))) {
      title = title.substring(1, title.length - 1);
    }

    const lastLine = lines[lines.length - 1];
    const isHashtagLine = lastLine.startsWith('#');
    const hashtag = isHashtagLine ? lastLine : '';

    const contentLines = isHashtagLine ? lines.slice(2, lines.length - 1) : lines.slice(2);
    const content = contentLines.join('\n\n');

    const caption = `${location}\n"${title}"`;

    let parsedScheduledAt = editingPost?.scheduledAt;
    const dateMatch = location.match(/(\d{4})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})/);
    if (dateMatch) {
       const year = parseInt(dateMatch[1]);
       const month = parseInt(dateMatch[2]) - 1;
       const day = parseInt(dateMatch[3]);
       const d = new Date();
       d.setFullYear(year, month, day);
       parsedScheduledAt = d.toISOString();
    }

    setEditingPost(prev => ({
      ...prev,
      location,
      title,
      content,
      caption,
      hashtag,
      status: prev?.status || 'DRAFT',
      scheduledAt: parsedScheduledAt,
      tagIds: prev?.tagIds || []
    }));

    setActiveTab('manual');
    setQuickPasteText('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const url = editingPost.id ? `/api/posts/${editingPost.id}` : '/api/posts';
      const method = editingPost.id ? 'PUT' : 'POST';
      
      // Đảm bảo dữ liệu sạch trước khi gửi
      const payload = { ...editingPost };
      
      // Bọc title trong ngoặc kép trước khi lưu DB
      if (payload.title) {
        const cleanTitle = payload.title.replace(/(^["“”]+|["“”]+$)/g, '');
        if (cleanTitle) {
          payload.title = `"${cleanTitle}"`;
        } else {
          payload.title = "";
        }
      }

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
        showAlert('Lỗi', data.error, 'error');
      }
    } catch (err) {
      console.error('Save error:', err);
      showAlert('Lỗi khi lưu bài viết', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFindImage = async (forceRefresh = false) => {
    // Ưu tiên dùng Tiêu đề, sau đó mới dùng Địa điểm hoặc Chủ đề để tìm ảnh
    const baseQuery = editingPost.title || editingPost.location || editingPost.topic;
    
    if (!baseQuery || baseQuery.trim() === '') {
      showAlert('Vui lòng nhập từ khóa', 'Hệ thống cần ít nhất là "Tiêu đề", "Địa điểm" hoặc "Chủ đề" để lấy từ khóa tìm ảnh.', 'error');
      return;
    }

    // Thêm "Vietnam" để ưu tiên ảnh phù hợp nội dung Việt Nam
    const query = `${baseQuery} Vietnam`;
    // Khi refresh, thêm timestamp ngẫu nhiên để tránh cache / lấy ảnh khác
    const cacheBust = forceRefresh ? `&_t=${Date.now()}` : '';
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/images/search?query=${encodeURIComponent(query)}${cacheBust}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes('<!DOCTYPE') ? 'Backend returned HTML instead of data.' : `HTTP ${res.status}`);
      }
      
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setEditingPost(prev => {
          const currentUrls = prev.imageUrl ? prev.imageUrl.trim() : '';
          const newUrls = currentUrls ? `${currentUrls}\n${data.imageUrl}` : data.imageUrl;
          return { ...prev, imageUrl: newUrls };
        });
      } else {
        showAlert('Tìm ảnh thất bại', 'Không tìm thấy ảnh phù hợp với từ khóa: "' + baseQuery + '". Vui lòng thử dùng Tiêu đề ngắn gọn hơn.', 'error');
      }
    } catch (err) {
      console.error('Find image error:', err);
      showAlert('Lỗi khi tìm ảnh', err.message, 'error');
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

  // ISO / scheduledAt → dd/mm/yyyy
  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // dd/mm/yyyy → yyyy-mm-dd (cho internal value)
  const parseDateInput = (ddmmyyyy) => {
    const match = ddmmyyyy.replace(/[^0-9/]/g, '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
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
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
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
            const loc = `[ SG • ${d.getFullYear()} . ${String(d.getMonth() + 1).padStart(2, "0")} . ${String(d.getDate()).padStart(2, "0")} ]`;
            setEditingPost({
              title: "",
              content: "",
              caption: "",
              location: loc,
              status: "DRAFT",
              tagIds: []
            });
            setActiveTab("quick_paste");
            setQuickPasteText("");
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
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Bài viết
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tác giả
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Lập lịch
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <RefreshCw
                      className="animate-spin text-blue-500 mx-auto"
                      size={32}
                    />
                    <p className="mt-4 text-slate-400 text-sm">
                      Đang tải dữ liệu...
                    </p>
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <MessageSquare
                      className="text-slate-600 mx-auto mb-4"
                      size={48}
                    />
                    <p className="text-slate-400">
                      Không tìm thấy bài viết nào.
                    </p>
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr
                    key={post.id}
                    className="hover:bg-slate-700/20 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0 group-hover:ring-2 ring-blue-500/30 transition-all relative">
                          {post.imageUrl ? (
                            <>
                              {post.imageUrl.split('\n').filter(u => u.trim())[0].match(/\.(mp4|mov|avi|wmv|webm)$/i) ? (
                                <video src={post.imageUrl.split('\n').filter(u => u.trim())[0]} className="w-full h-full object-cover" muted />
                              ) : (
                                <img
                                  src={post.imageUrl.split('\n').filter(u => u.trim())[0]}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              )}
                              {post.imageUrl.split('\n').filter(u => u.trim()).length > 1 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <span className="text-white text-[10px] font-bold">+{post.imageUrl.split('\n').filter(u => u.trim()).length - 1}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <ImageIcon size={20} />
                            </div>
                          )}
                        </div>
                        <div className="max-w-xs">
                          <h3 className="text-sm font-semibold text-slate-100 mb-0.5 truncate">
                            {post.title ||
                              post.caption?.split("\n")[0] ||
                              "Chưa có tiêu đề"}
                          </h3>
                          <p className="text-xs text-slate-500 truncate">
                            {post.caption || "Không có mô tả"}
                          </p>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {post.tags.map(tag => (
                                <span
                                  key={tag.id}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border"
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
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(post.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
                          {post.authorId ? "A" : "S"}
                        </div>
                        <span className="text-xs font-medium text-slate-300">
                          {post.authorId ? "Admin" : "System"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-500" />
                          {post.scheduledAt
                            ? new Date(post.scheduledAt).toLocaleDateString(
                                "vi-VN",
                              )
                            : "Chưa đặt"}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <Clock size={10} className="text-slate-600" />
                          {post.scheduledAt
                            ? new Date(post.scheduledAt).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : "--:--"}
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
              Trang{" "}
              <span className="font-semibold text-slate-200">
                {pagination.page}
              </span>{" "}
              /{" "}
              <span className="font-semibold text-slate-200">
                {pagination.totalPages}
              </span>{" "}
              (Tổng: {pagination.total})
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
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                {editingPost.id ? (
                  <Edit size={20} className="text-blue-400" />
                ) : (
                  <Plus size={20} className="text-emerald-400" />
                )}
                {editingPost.id ? "Sửa bài viết" : "Thêm bài viết mới"}
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex border-b border-slate-800 bg-slate-800/20">
              <button
                className={`flex-1 py-3 text-sm font-semibold transition-all ${activeTab === "quick_paste" ? "text-blue-400 border-b-2 border-slate-800 border-b-blue-400 bg-blue-500/5" : "text-slate-500 hover:text-slate-300"}`}
                onClick={() => setActiveTab("quick_paste")}
              >
                Paste nội dung nhanh
              </button>
              <button
                className={`flex-1 py-3 text-sm font-semibold transition-all ${activeTab === "manual" ? "text-blue-400 border-b-2 border-slate-800 border-b-blue-400 bg-blue-500/5" : "text-slate-500 hover:text-slate-300"}`}
                onClick={() => setActiveTab("manual")}
              >
                Nhập thủ công
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-5">
              {activeTab === "quick_paste" ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-200/90 shadow-inner">
                    <p className="font-semibold mb-2 text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      Cấu trúc dán mẫu:
                    </p>
                    <pre className="font-mono text-[13px] opacity-80 whitespace-pre-wrap pl-2 border-l-2 border-emerald-500/30">
                      <p className="text-slate-400 text-sm mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                        <code className="text-emerald-400 font-mono">
                          [ Địa điểm • Ngày ]
                        </code>{" "}
                        →{" "}
                        <code className="text-blue-400 font-mono">
                          "Tên bài"
                        </code>{" "}
                        → Nội dung →{" "}
                        <code className="text-purple-400 font-mono">
                          #hashtag
                        </code>
                      </p>
                    </pre>
                  </div>
                  <textarea
                    value={quickPasteText}
                    onChange={(e) => setQuickPasteText(e.target.value)}
                    onPaste={(e) => {
                      const element = e.target;
                      setTimeout(() => {
                        handleParseQuickPaste(element.value);
                      }, 50);
                    }}
                    placeholder="Dán nội dung vào đây..."
                    className="w-full h-64 bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                  />
                  <button
                    onClick={handleParseQuickPaste}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={18} />
                    Phân tích và Điền Tự Động
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Cột Trái: Nội dung chính (Rộng 8/12) */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* Dòng 1: Địa điểm & Tiêu đề */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                          Địa điểm (Format: [ Địa điểm • Ngày ])
                        </label>
                        <input
                          type="text"
                          value={editingPost.location || ""}
                          onChange={(e) =>
                            setEditingPost({
                              ...editingPost,
                              location: e.target.value,
                            })
                          }
                          placeholder="Ví dụ: Đà Lạt, TP.HCM..."
                          className="w-full bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                          Tiêu đề (Sẽ hiển thị dạng "Tên bài")
                        </label>
                        <input
                          type="text"
                          value={editingPost.title ? `"${editingPost.title.replace(/(^["“”]+|["“”]+$)/g, '')}"` : ""}
                          onChange={(e) =>
                            setEditingPost({
                              ...editingPost,
                              title: e.target.value.replace(/(^["“”]+|["“”]+$)/g, ''),
                            })
                          }
                          placeholder='"Tiêu đề bài viết..."'
                          className="w-full bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Dòng 2: Nội dung chính */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                        Nội dung chính
                      </label>
                      <textarea
                        value={editingPost.content || ""}
                        onChange={(e) =>
                          setEditingPost({
                            ...editingPost,
                            content: e.target.value,
                          })
                        }
                        placeholder="Nội dung bài viết chi tiết..."
                        className="w-full h-56 bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all resize-none shadow-inner custom-scrollbar"
                      />
                    </div>

                    {/* Dòng 3: Caption tự động & Hashtag */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                          Caption (Tuỳ chỉnh - để trống để tạo tự động)
                        </label>
                        <textarea
                          value={editingPost.caption || ""}
                          onChange={(e) =>
                            setEditingPost({
                              ...editingPost,
                              caption: e.target.value,
                            })
                          }
                          placeholder='[ Địa điểm • Ngày ]&#10;"Tên bài"'
                          className="w-full h-24 bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all resize-none shadow-inner custom-scrollbar"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                          Hashtag
                        </label>
                        <input
                          type="text"
                          value={editingPost.hashtag || ""}
                          onChange={(e) =>
                            setEditingPost({
                              ...editingPost,
                              hashtag: e.target.value,
                            })
                          }
                          placeholder="#hashtag1 #hashtag2..."
                          className="w-full bg-slate-850 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cột Phải: Meta & Cài đặt (Rộng 4/12) */}
                  <div className="lg:col-span-4 space-y-6 bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50 shadow-inner">
                    {/* Trạng thái */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                        <MoreHorizontal size={14} className="text-amber-400" /> Trạng thái
                      </label>
                      <select
                        value={editingPost.status || "DRAFT"}
                        onChange={(e) =>
                          setEditingPost({ ...editingPost, status: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-all appearance-none outline-none shadow-sm"
                      >
                        <option value="DRAFT">Bản nháp</option>
                        <option value="SCHEDULED">Chờ đăng (Lập lịch)</option>
                        <option value="PUBLISHED">Đã đăng</option>
                        <option value="FAILED">Lỗi</option>
                      </select>
                    </div>

                    {/* Ngày đăng bài (Moved up for better flow) */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                        <Calendar size={13} className="text-emerald-400" /> Lập lịch đăng
                      </label>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={editingPost.scheduledAt ? formatDateTimeLocal(editingPost.scheduledAt).split('T')[0] : ''}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              if (!newDate) return;
                              setEditingPost(prev => {
                                const timePart = prev.scheduledAt
                                  ? formatDateTimeLocal(prev.scheduledAt).split('T')[1]
                                  : '08:00';
                                return { ...prev, scheduledAt: `${newDate}T${timePart}` };
                              });
                            }}
                            style={{ colorScheme: 'dark' }}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-all text-sm shadow-sm"
                          />
                          <div className="flex gap-1 items-center bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 shadow-sm">
                            <select
                              value={editingPost.scheduledAt ? formatDateTimeLocal(editingPost.scheduledAt).split('T')[1]?.split(':')[0] ?? '08' : '08'}
                              onChange={(e) => {
                                const newHour = e.target.value;
                                setEditingPost(prev => {
                                  const dt = formatDateTimeLocal(prev.scheduledAt || new Date().toISOString());
                                  const datePart = dt.split('T')[0];
                                  const minPart = dt.split('T')[1]?.split(':')[1] ?? '00';
                                  return { ...prev, scheduledAt: `${datePart}T${newHour}:${minPart}` };
                                });
                              }}
                              className="bg-transparent text-slate-100 focus:outline-none text-sm text-center outline-none appearance-none cursor-pointer"
                            >
                              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                                <option key={h} value={h} className="bg-slate-900">{h}</option>
                              ))}
                            </select>
                            <span className="text-slate-600 font-bold">:</span>
                            <select
                              value={editingPost.scheduledAt ? formatDateTimeLocal(editingPost.scheduledAt).split('T')[1]?.split(':')[1] ?? '00' : '00'}
                              onChange={(e) => {
                                const newMin = e.target.value;
                                setEditingPost(prev => {
                                  const dt = formatDateTimeLocal(prev.scheduledAt || new Date().toISOString());
                                  const datePart = dt.split('T')[0];
                                  const hourPart = dt.split('T')[1]?.split(':')[0] ?? '08';
                                  return { ...prev, scheduledAt: `${datePart}T${hourPart}:${newMin}` };
                                });
                              }}
                              className="bg-transparent text-slate-100 focus:outline-none text-sm text-center outline-none appearance-none cursor-pointer"
                            >
                              {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                                <option key={m} value={m} className="bg-slate-900">{m}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {['09:00', '12:00', '17:00', '21:00'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                const datePart = editingPost.scheduledAt
                                  ? formatDateTimeLocal(editingPost.scheduledAt).split('T')[0]
                                  : formatDateTimeLocal(new Date().toISOString()).split('T')[0];
                                setEditingPost({ ...editingPost, scheduledAt: `${datePart}T${t}` });
                              }}
                              className="px-2.5 py-1 text-[10px] font-mono font-semibold rounded-lg bg-slate-900 border border-slate-700 text-slate-500 hover:bg-emerald-600 hover:border-emerald-500 hover:text-white transition-all shadow-sm"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Gắn Tag */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pl-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Tag size={13} className="text-violet-400" /> Gắn Tag
                        </label>
                        {availableTags.length > 5 && (
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600" size={10} />
                            <input 
                              type="text"
                              placeholder="Tìm tag..."
                              value={tagSearch}
                              onChange={(e) => setTagSearch(e.target.value)}
                              className="bg-slate-900/50 border border-slate-700/50 rounded-lg py-1 pl-6 pr-2 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all w-24 md:w-32"
                            />
                            {tagSearch && (
                              <button 
                                onClick={() => setTagSearch('')}
                                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-sm">
                        <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                          {availableTags.length === 0 ? (
                            <p className="text-slate-500 text-sm italic">Chưa có tag nào.</p>
                          ) : (
                            availableTags
                              .filter(tag => tag.name.toLowerCase().includes(tagSearch.toLowerCase()) || (editingPost.tagIds?.includes(tag.id)))
                              .sort((a, b) => {
                                // Đưa các tag đã chọn lên đầu
                                const aSelected = editingPost.tagIds?.includes(a.id);
                                const bSelected = editingPost.tagIds?.includes(b.id);
                                if (aSelected && !bSelected) return -1;
                                if (!aSelected && bSelected) return 1;
                                return 0;
                              })
                              .map(tag => {
                                const isSelected = editingPost.tagIds?.includes(tag.id);
                                return (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => {
                                      setEditingPost(prev => ({
                                        ...prev,
                                        tagIds: isSelected 
                                          ? prev.tagIds.filter(id => id !== tag.id)
                                          : [...(prev.tagIds || []), tag.id]
                                      }));
                                    }}
                                    className={`px-2 py-1 rounded-full text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${
                                      isSelected 
                                        ? '' 
                                        : 'bg-transparent text-slate-400 border-slate-800 hover:border-slate-500 hover:text-slate-300'
                                    }`}
                                    style={isSelected ? { 
                                      borderColor: tag.color,
                                      backgroundColor: `${tag.color}33`,
                                      color: tag.color
                                    } : {}}
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                                    {tag.name}
                                  </button>
                                );
                              })
                          )}
                          {availableTags.filter(tag => tag.name.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && tagSearch && (
                            <p className="text-slate-600 text-[10px] italic py-2 w-full text-center">Không tìm thấy tag phù hợp.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dòng 4: Link Media (Hình ảnh & Video) - Full width bên dưới */}
                  <div className="lg:col-span-12 space-y-3 bg-slate-800/20 p-5 rounded-2xl border border-slate-700/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50"></div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-blue-400" /> Hình ảnh & Video
                    </label>

                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <textarea
                            value={editingPost.imageUrl || ""}
                            onChange={(e) =>
                              setEditingPost({ ...editingPost, imageUrl: e.target.value })
                            }
                            placeholder="Dán URL ảnh hoặc video vào đây (mỗi link nằm trên một dòng)..."
                            className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 pr-8 text-slate-100 focus:outline-none focus:border-blue-500 transition-all text-sm shadow-inner resize-none custom-scrollbar"
                          />
                          {editingPost.imageUrl && (
                            <button
                              type="button"
                              onClick={() => setEditingPost({ ...editingPost, imageUrl: '' })}
                              className="absolute right-3 top-3 text-slate-500 hover:text-red-400 p-0.5 bg-slate-800 rounded-md transition-colors"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleFindImage(false)}
                          disabled={isSaving}
                          className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white disabled:opacity-50 px-5 rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 shrink-0 font-bold text-xs shadow-sm"
                        >
                          <Search size={18} />
                        </button>
                      </div>

                      {editingPost.imageUrl && (
                        <div className={`grid gap-3 ${editingPost.imageUrl.split('\n').filter(u => u.trim()).length > 3 ? 'grid-cols-4' : (editingPost.imageUrl.split('\n').filter(u => u.trim()).length === 3 ? 'grid-cols-3' : (editingPost.imageUrl.split('\n').filter(u => u.trim()).length === 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-sm'))}`}>
                          {editingPost.imageUrl.split('\n').filter(u => u.trim()).map((url, idx) => {
                            const isVideo = url.match(/\.(mp4|mov|avi|wmv|webm)$/i);
                            return (
                              <div
                                key={idx}
                                className="relative group cursor-pointer w-full aspect-video md:h-48 rounded-xl border border-slate-700 overflow-hidden bg-slate-900 shadow-md transition-transform hover:-translate-y-0.5"
                                onClick={() => setIsImageLightboxOpen(url)}
                              >
                                {isVideo ? (
                                  <video src={url} className="w-full h-full object-cover" muted />
                                ) : (
                                  <img src={url} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                                  <Eye size={24} className="text-white drop-shadow-md" />
                                  <span className="text-[11px] text-white font-medium">Phóng to</span>
                                </div>
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const urls = editingPost.imageUrl.split('\n').filter(u => u.trim());
                                    urls.splice(idx, 1);
                                    setEditingPost({ ...editingPost, imageUrl: urls.join('\n') });
                                  }}
                                  className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-lg shadow-xl hover:bg-red-400 transition-all scale-0 group-hover:scale-100 backdrop-blur-sm"
                                  title="Xóa media này"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                {isSaving ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                Lưu bài viết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {isImageLightboxOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setIsImageLightboxOpen(false)}
        >
          <div className="relative max-w-4xl w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsImageLightboxOpen(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all"
            >
              <X size={24} />
            </button>
            {typeof isImageLightboxOpen === 'string' && isImageLightboxOpen.match(/\.(mp4|mov|avi|wmv|webm)$/i) ? (
              <video
                src={isImageLightboxOpen}
                controls
                className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl bg-black"
              />
            ) : (
              <img
                src={typeof isImageLightboxOpen === 'string' ? isImageLightboxOpen : editingPost.imageUrl?.split('\n').filter(u => u.trim())[0]}
                alt="Xem ảnh lớn"
                className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl bg-black/50"
              />
            )}
            <p className="text-center text-white/50 text-xs mt-3">Nhấn ra ngoài hoặc ✕ để đóng</p>
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
                    <img
                      src="https://ui-avatars.com/api/?name=Fanpage+Name&background=0D8ABC&color=fff"
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[15px] text-gray-900 leading-tight cursor-pointer hover:underline">
                      Góc Nhỏ Của Mía
                    </h4>
                    <div className="flex items-center gap-1 text-[13px] text-gray-500">
                      <span className="cursor-pointer hover:underline">
                        {previewPost.scheduledAt
                          ? new Date(previewPost.scheduledAt).toLocaleString(
                              "vi-VN",
                            )
                          : "Vừa xong"}
                      </span>
                      <span>·</span>
                      <svg
                        viewBox="0 0 16 16"
                        width="12"
                        height="12"
                        fill="currentColor"
                      >
                        <g fillRule="evenodd" transform="translate(-448 -544)">
                          <path
                            fillRule="nonzero"
                            d="M452.709 555.084c0-2.31 1.082-4.364 2.766-5.719A7.95 7.95 0 01456 544c4.418 0 8 3.582 8 8s-3.582 8-8 8a7.95 7.95 0 01-5.115-1.859c-1.353-1.684-2.176-3.83-2.176-6.057zm1.657-3.951A6.471 6.471 0 00449.5 552c0 .248.016.491.045.729.13-.19.273-.367.433-.526a1.5 1.5 0 012.336-.073l1.858 2.062a.5.5 0 00.37.168h1.231a.5.5 0 00.5-.5v-1.127a.5.5 0 00-.146-.353l-1.077-1.077c-.504-.504-.504-1.321 0-1.825l.443-.443a.5.5 0 01.353-.146h1.56a1.5 1.5 0 011.5 1.5.5.5 0 00.5.5h1.22c.162-.977.01-1.996-.454-2.883l-1.99 1.99a.5.5 0 01-.354.146h-1.67a1.5 1.5 0 01-1.5-1.5v-1.611a6.45 6.45 0 00-2.951-.62Z"
                          ></path>
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* FB Post Content */}
                <div className="px-4 pb-3">
                  <div className="text-[15px] text-gray-900 whitespace-pre-wrap font-normal leading-normal">
                    {previewPost.caption &&
                      `${previewPost.caption}

`}
                    {previewPost.content &&
                      `${previewPost.content}

`}
                    {previewPost.hashtag && (
                      <span className="text-[#0866FF] cursor-pointer hover:underline">
                        {previewPost.hashtag}
                      </span>
                    )}
                  </div>
                </div>

                {/* FB Post Image */}
                {previewPost.imageUrl && (
                  <div className="w-full bg-gray-100 border-y border-gray-200">
                    <div className={`grid gap-0.5 ${previewPost.imageUrl.split('\n').filter(u => u.trim()).length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {previewPost.imageUrl.split('\n').filter(u => u.trim()).map((url, idx) => {
                        const isVideo = url.match(/\.(mp4|mov|avi|wmv|webm)$/i);
                        // Only show up to 4 items in preview to keep it clean, common in FB previews
                        if (idx >= 4) return null;
                        
                        return (
                          <div key={idx} className={`relative ${previewPost.imageUrl.split('\n').filter(u => u.trim()).length === 1 ? '' : 'aspect-square'} overflow-hidden bg-slate-200`}>
                            {isVideo ? (
                              <video src={url} className="w-full h-full object-cover" muted />
                            ) : (
                              <img
                                src={url}
                                alt={`Post media ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                            {idx === 3 && previewPost.imageUrl.split('\n').filter(u => u.trim()).length > 4 && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="text-white text-xl font-bold">+{previewPost.imageUrl.split('\n').filter(u => u.trim()).length - 4}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* FB Post Footer */}
                <div className="px-4 py-1 border-t border-gray-200 mt-2 mx-4 flex justify-between gap-1">
                  <button className="flex-1 flex items-center justify-center gap-2 py-1.5 hover:bg-gray-100 rounded-md text-gray-500 font-semibold text-[15px] transition-colors">
                    <ThumbsUp
                      size={18}
                      strokeWidth={2.5}
                      className="text-gray-500"
                    />{" "}
                    Thích
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-1.5 hover:bg-gray-100 rounded-md text-gray-500 font-semibold text-[15px] transition-colors">
                    <MessageSquare
                      size={18}
                      strokeWidth={2.5}
                      className="text-gray-500"
                    />{" "}
                    Bình luận
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-1.5 hover:bg-gray-100 rounded-md text-gray-500 font-semibold text-[15px] transition-colors">
                    <Share2
                      size={18}
                      strokeWidth={2.5}
                      className="text-gray-500"
                    />{" "}
                    Chia sẻ
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

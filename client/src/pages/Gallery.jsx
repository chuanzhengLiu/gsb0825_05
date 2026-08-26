import React, { useEffect, useState } from 'react';
import { Heart, ThumbsUp, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

function Gallery() {
  const { user } = useAuth();
  const [works, setWorks] = useState([]);
  const [myWorks, setMyWorks] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [activeTab, setActiveTab] = useState('feed');
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', pattern_id: '', is_public: true });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchFeed();
    fetchPatterns();
    if (user) fetchMyWorks();
  }, [user]);

  const fetchFeed = async () => {
    try {
      const res = await apiClient.get('/social/feed');
      setWorks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyWorks = async () => {
    try {
      const res = await apiClient.get('/works/my');
      setMyWorks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPatterns = async () => {
    try {
      const res = await apiClient.get('/patterns');
      setPatterns(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !uploadForm.title) return alert('请填写标题并选择图片');
    setUploading(true);
    try {
      const data = new FormData();
      data.append('image', file);
      data.append('title', uploadForm.title);
      data.append('description', uploadForm.description);
      data.append('pattern_id', uploadForm.pattern_id);
      data.append('is_public', uploadForm.is_public);
      await apiClient.post('/works', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadForm({ title: '', description: '', pattern_id: '', is_public: true });
      setFile(null);
      fetchMyWorks();
      fetchFeed();
      setActiveTab('my');
    } catch (err) {
      alert(err.response?.data?.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (work) => {
    if (!user) return alert('请先登录');
    try {
      if (work.liked) {
        await apiClient.delete(`/social/like/${work.id}`);
      } else {
        await apiClient.post('/social/like', { work_id: work.id });
      }
      fetchFeed();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除该作品？')) return;
    try {
      await apiClient.delete(`/works/${id}`);
      fetchMyWorks();
      fetchFeed();
    } catch (err) {
      alert(err.response?.data?.message || '删除失败');
    }
  };

  const renderWorkCard = (work, isMine = false) => (
    <div key={work.id} className="card">
      <img
        src={work.image_url || '/placeholder.jpg'}
        alt={work.title}
        className="w-full h-56 object-cover bg-gray-100"
      />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-flytie-primary text-white flex items-center justify-center text-xs">
            {work.author_name?.[0] || 'U'}
          </div>
          <div className="text-sm">
            <div className="font-medium">{work.author_name}</div>
            <div className="text-gray-400 text-xs">{new Date(work.created_at).toLocaleDateString()}</div>
          </div>
        </div>
        <h3 className="font-semibold">{work.title}</h3>
        <p className="text-sm text-gray-500 mb-3">{work.description}</p>
        {work.pattern_name && <div className="text-xs text-flytie-primary mb-3">款式：{work.pattern_name}</div>}
        <div className="flex items-center gap-4">
          {!isMine && (
            <button
              onClick={() => handleLike(work)}
              className={`flex items-center gap-1 text-sm ${work.liked ? 'text-flytie-primary font-medium' : 'text-gray-600 hover:text-flytie-primary'}`}
            >
              <ThumbsUp size={16} fill={work.liked ? 'currentColor' : 'none'} /> {work.like_count || 0}
            </button>
          )}
          <span className="flex items-center gap-1 text-sm text-gray-600">
            <Heart size={16} /> {work.favorite_count || 0}
          </span>
          {isMine && (
            <button onClick={() => handleDelete(work.id)} className="text-red-600 text-sm hover:underline ml-auto">删除</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">社区分享</h1>
          <p className="text-gray-500">展示你的绑制成品，发现其他爱好者的作品</p>
        </div>
        {user && (
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('feed')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'feed' ? 'bg-flytie-primary text-white' : 'bg-white border border-gray-300'}`}>社区动态</button>
            <button onClick={() => setActiveTab('my')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'my' ? 'bg-flytie-primary text-white' : 'bg-white border border-gray-300'}`}>我的作品</button>
            <button onClick={() => setActiveTab('upload')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'upload' ? 'bg-flytie-primary text-white' : 'bg-white border border-gray-300'}`}>上传作品</button>
          </div>
        )}
      </div>

      {!user && (
        <div className="text-center py-20 text-gray-500">请先登录以参与社区分享</div>
      )}

      {user && activeTab === 'upload' && (
        <div className="card p-6 max-w-2xl">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Upload size={20} /> 上传作品
          </h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">标题</label>
              <input value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">描述</label>
              <textarea value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} className="input" rows="3" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">关联款式</label>
              <select value={uploadForm.pattern_id} onChange={(e) => setUploadForm({ ...uploadForm, pattern_id: e.target.value })} className="input">
                <option value="">不关联</option>
                {patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">成品照片</label>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} className="input py-2" required />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_public"
                checked={uploadForm.is_public}
                onChange={(e) => setUploadForm({ ...uploadForm, is_public: e.target.checked })}
              />
              <label htmlFor="is_public" className="text-sm text-gray-700">公开到社区</label>
            </div>
            <button type="submit" disabled={uploading} className="btn-primary flex items-center gap-2">
              {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              上传
            </button>
          </form>
        </div>
      )}

      {user && activeTab === 'my' && (
        <>
          {myWorks.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <ImageIcon className="mx-auto mb-2 text-gray-300" size={48} />
              还没有上传作品
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myWorks.map((w) => renderWorkCard(w, true))}
            </div>
          )}
        </>
      )}

      {(!user || activeTab === 'feed') && (
        <>
          {works.length === 0 ? (
            <div className="text-center py-20 text-gray-500">社区暂无公开作品</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {works.map((w) => renderWorkCard(w))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Gallery;

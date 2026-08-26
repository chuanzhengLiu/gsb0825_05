import React, { useEffect, useState } from 'react';
import { User, Save, Loader2, Clock, Heart, Image as ImageIcon } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

function Profile() {
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState({ nickname: '', bio: '', avatar_url: '' });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ sessions: 0, favorites: 0, works: 0 });

  useEffect(() => {
    if (user) {
      setForm({ nickname: user.nickname || '', bio: user.bio || '', avatar_url: user.avatar_url || '' });
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const [sRes, fRes, wRes] = await Promise.all([
        apiClient.get('/timers'),
        apiClient.get('/favorites'),
        apiClient.get('/works/my')
      ]);
      setStats({
        sessions: sRes.data.length,
        favorites: fRes.data.length,
        works: wRes.data.length
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient.patch('/auth/me', form);
      updateUser(res.data);
      alert('资料已更新');
    } catch (err) {
      alert(err.response?.data?.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="text-center py-20 text-gray-500">请先登录</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">个人中心</h1>
        <p className="text-gray-500">管理你的绑制档案与账号信息</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-flytie-primary text-white flex items-center justify-center text-2xl font-bold mb-4">
            {user.nickname?.[0] || 'U'}
          </div>
          <h2 className="text-xl font-bold">{user.nickname}</h2>
          <p className="text-gray-500 text-sm">{user.email}</p>
          <div className="grid grid-cols-3 gap-2 mt-6">
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-bold">{stats.sessions}</div>
              <div className="text-xs text-gray-500">计时</div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-bold">{stats.favorites}</div>
              <div className="text-xs text-gray-500">收藏</div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-bold">{stats.works}</div>
              <div className="text-xs text-gray-500">作品</div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 card p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <User size={20} /> 编辑资料
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">昵称</label>
              <input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">头像 URL</label>
              <input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} className="input" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">个人简介</label>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="input" rows="4" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                保存资料
              </button>
              <button type="button" onClick={logout} className="btn-secondary">退出登录</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;

import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import PatternCard from '../components/PatternCard';

function Favorites() {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchFavorites();
    else setLoading(false);
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const res = await apiClient.get('/favorites');
      setPatterns(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="text-center py-20 text-gray-500">请先登录以查看收藏夹</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">我的收藏</h1>
        <p className="text-gray-500">快速查看常用款式</p>
      </div>

      {loading ? (
        <div className="text-center py-20">加载中...</div>
      ) : patterns.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Heart className="mx-auto mb-2 text-gray-300" size={48} />
          还没有收藏任何毛钩
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {patterns.map((p) => <PatternCard key={p.id} pattern={p} />)}
        </div>
      )}
    </div>
  );
}

export default Favorites;

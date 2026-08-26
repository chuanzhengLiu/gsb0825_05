import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import apiClient from '../api/client';
import PatternCard from '../components/PatternCard';

function Patterns() {
  const [patterns, setPatterns] = useState([]);
  const [filters, setFilters] = useState({ target_fish: [], water_type: [], difficulty: [] });
  const [selected, setSelected] = useState({ target_fish: '', water_type: '', difficulty: '', search: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatterns();
    fetchFilters();
  }, [selected]);

  const fetchPatterns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(selected).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res = await apiClient.get(`/patterns?${params.toString()}`);
      setPatterns(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const res = await apiClient.get('/patterns/meta/filters');
      setFilters(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">毛钩库</h1>
          <p className="text-gray-500">按鱼种、水域和难度筛选你需要的款式</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索毛钩..."
            value={selected.search}
            onChange={(e) => setSelected({ ...selected, search: e.target.value })}
            className="input pl-10 w-full md:w-64"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={selected.target_fish}
          onChange={(e) => setSelected({ ...selected, target_fish: e.target.value })}
          className="input w-auto"
        >
          <option value="">全部鱼种</option>
          {filters.target_fish.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={selected.water_type}
          onChange={(e) => setSelected({ ...selected, water_type: e.target.value })}
          className="input w-auto"
        >
          <option value="">全部水域</option>
          {filters.water_type.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
        <select
          value={selected.difficulty}
          onChange={(e) => setSelected({ ...selected, difficulty: e.target.value })}
          className="input w-auto"
        >
          <option value="">全部难度</option>
          {filters.difficulty.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">加载中...</div>
      ) : patterns.length === 0 ? (
        <div className="text-center py-20 text-gray-500">没有找到符合条件的毛钩</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {patterns.map((p) => <PatternCard key={p.id} pattern={p} />)}
        </div>
      )}
    </div>
  );
}

export default Patterns;

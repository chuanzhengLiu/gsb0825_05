import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, Heart, Fish, Droplets, ArrowLeft, Anchor } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import SvgPatternStep from '../components/SvgPatternStep';
import Timer from '../components/Timer';
import MaterialEstimator from '../components/MaterialEstimator';

function PatternDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [pattern, setPattern] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchPattern();
  }, [slug]);

  useEffect(() => {
    if (pattern && user) {
      checkFavorite();
      fetchStats();
    }
  }, [pattern, user]);

  const fetchPattern = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/patterns/${slug}`);
      setPattern(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    try {
      const res = await apiClient.get(`/favorites/check/${pattern.id}`);
      setIsFavorite(res.data.isFavorite);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get(`/timers/stats/${pattern.id}`);
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFavorite = async () => {
    if (!user) return alert('请先登录');
    try {
      if (isFavorite) {
        await apiClient.delete(`/favorites/${pattern.id}`);
      } else {
        await apiClient.post('/favorites', { pattern_id: pattern.id });
      }
      setIsFavorite(!isFavorite);
    } catch (err) {
      alert(err.response?.data?.message || '操作失败');
    }
  };

  const formatSeconds = (s) => {
    if (!s) return '-';
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}分${sec}秒`;
  };

  if (loading) return <div className="text-center py-20">加载中...</div>;
  if (!pattern) return <div className="text-center py-20">毛钩不存在</div>;

  const allMaterials = pattern.steps.flatMap((s) => s.materials || []);

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-flytie-primary hover:underline">
        <ArrowLeft size={18} /> 返回毛钩库
      </Link>

      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="w-full md:w-64 h-64 bg-gradient-to-br from-teal-50 to-amber-50 rounded-xl flex items-center justify-center">
            {pattern.image_url ? (
              <img src={pattern.image_url} alt={pattern.name} className="h-full w-full object-cover rounded-xl" />
            ) : (
              <svg viewBox="0 0 160 200" className="h-40">
                <line x1="80" y1="40" x2="80" y2="160" stroke="#9ca3af" strokeWidth="3" />
                <ellipse cx="80" cy="100" rx="14" ry="38" fill="#0f766e" opacity="0.2" />
                <path d="M 80 65 L 60 30 L 80 60 L 100 30 Z" fill="#78350f" opacity="0.3" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{pattern.name}</h1>
                <p className="text-gray-600 mb-4">{pattern.description}</p>
              </div>
              <button
                onClick={toggleFavorite}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg border transition-colors ${
                  isFavorite
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                {isFavorite ? '已收藏' : '收藏'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm">
                <Fish size={14} /> {pattern.target_fish}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                <Droplets size={14} /> {pattern.water_type}
              </span>
              {pattern.difficulty && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  <Anchor size={14} /> {pattern.difficulty}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500">平均耗时</div>
                <div className="font-semibold flex items-center gap-1">
                  <Clock size={14} /> {formatSeconds(pattern.avg_time_seconds)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500">绑制次数</div>
                <div className="font-semibold">{pattern.tie_count || 0}</div>
              </div>
              {stats && (
                <>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">我的最快</div>
                    <div className="font-semibold">{formatSeconds(stats.min_seconds)}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">我的平均</div>
                    <div className="font-semibold">{formatSeconds(stats.avg_seconds)}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Timer patternId={pattern.id} patternName={pattern.name} onSaved={fetchStats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold">绑制步骤</h2>
          {pattern.steps.map((step, idx) => (
            <div key={step.id} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-flytie-primary text-white flex items-center justify-center font-bold">
                  {step.step_number}
                </span>
                <h3 className="font-semibold text-lg">{step.title}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SvgPatternStep svgData={step.svg_data} />
                <div className="space-y-3">
                  <p className="text-gray-700">{step.instruction}</p>
                  {step.materials.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">本步材料：</div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {step.materials.map((m, i) => (
                          <li key={i}>• {m.name} {m.amount && `（${m.amount}）`} {m.notes && <span className="text-gray-400">- {m.notes}</span>}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <MaterialEstimator materials={allMaterials} />

          <div className="card p-4">
            <h3 className="font-semibold text-lg mb-3">材料清单汇总</h3>
            <ul className="space-y-2 text-sm">
              {allMaterials.map((m, i) => (
                <li key={i} className="flex justify-between">
                  <span className="text-gray-700">{m.name}</span>
                  <span className="text-gray-500">{m.amount || '适量'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatternDetail;

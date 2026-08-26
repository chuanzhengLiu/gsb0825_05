import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

// 秒 → “x分x秒”，供平均/极值展示
function formatTime(s) {
  const total = Math.round(Number(s) || 0);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}分${sec.toString().padStart(2, '0')}秒`;
}

// “2026-01” → “2026年1月”
function formatMonth(month) {
  if (!month) return '';
  const [y, m] = month.split('-');
  return `${y}年${Number(m)}月`;
}

function Stats() {
  const { user } = useAuth();
  const [monthly, setMonthly] = useState([]);
  const [statPatterns, setStatPatterns] = useState([]);
  const [selected, setSelected] = useState('');
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOverview();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const [monthlyRes, patternsRes] = await Promise.all([
        apiClient.get('/timers/stats/monthly'),
        apiClient.get('/timers/stats/patterns')
      ]);
      setMonthly(monthlyRes.data);
      setStatPatterns(patternsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !selected) {
      setTrend([]);
      return;
    }
    const fetchTrend = async () => {
      try {
        const res = await apiClient.get(`/timers/stats/${selected}/trend`);
        setTrend(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTrend();
  }, [user, selected]);

  if (!user) {
    return <div className="text-center py-20 text-gray-500">请先登录以查看统计</div>;
  }

  // 用于柱状条的最大平均用时，避免除以 0
  const maxAvg = monthly.reduce((max, m) => Math.max(max, Number(m.avg_seconds) || 0), 0);

  // 趋势对比：最早一次 vs 最近一次的平均用时
  const firstAvg = trend.length ? Number(trend[0].avg_seconds) : null;
  const lastAvg = trend.length ? Number(trend[trend.length - 1].avg_seconds) : null;
  const improvement = firstAvg != null && lastAvg != null ? firstAvg - lastAvg : null;

  // 关联款式的选项 value：未关联款式用 "none"
  const optionValue = (row) => (row.pattern_id == null ? 'none' : String(row.pattern_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">绑制统计</h1>
        <p className="text-gray-500">按月回顾绑制频率与平均用时，也能追踪单个款式的效率变化</p>
      </div>

      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : monthly.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无计时记录，先去计时器记录几次吧</div>
      ) : (
        <>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={20} />
              <h2 className="font-semibold text-lg">按月概览</h2>
            </div>
            <div className="space-y-3">
              {monthly.map((m) => (
                <div key={m.month}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{formatMonth(m.month)}</span>
                    <span className="text-gray-500">
                      {m.total_sessions} 次 · 平均 {formatTime(m.avg_seconds)}
                      {Number(m.unlinked_sessions) > 0 && (
                        <span className="text-gray-400">（含 {m.unlinked_sessions} 次未关联款式）</span>
                      )}
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-flytie-primary h-full"
                      style={{ width: `${maxAvg ? (Number(m.avg_seconds) / maxAvg) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={20} />
              <h2 className="font-semibold text-lg">单款式用时趋势</h2>
            </div>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="input w-full md:w-80 mb-4"
            >
              <option value="">选择一个款式</option>
              {statPatterns.map((row) => (
                <option key={optionValue(row)} value={optionValue(row)}>
                  {row.pattern_name}（{row.total_sessions} 次）
                </option>
              ))}
            </select>

            {selected && trend.length === 0 && (
              <div className="text-gray-500">该款式暂无计时记录</div>
            )}

            {trend.length > 0 && (
              <>
                {improvement != null && (
                  <div className="flex items-center gap-2 mb-4 text-sm">
                    {improvement > 0 ? (
                      <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded">
                        <TrendingDown size={14} /> 相比最早快了 {formatTime(improvement)}
                      </span>
                    ) : improvement < 0 ? (
                      <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded">
                        <TrendingUp size={14} /> 相比最早慢了 {formatTime(-improvement)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        <Minus size={14} /> 与最早持平
                      </span>
                    )}
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2">月份</th>
                        <th className="text-left px-4 py-2">次数</th>
                        <th className="text-left px-4 py-2">平均用时</th>
                        <th className="text-left px-4 py-2">最快</th>
                        <th className="text-left px-4 py-2">最慢</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {trend.map((row) => (
                        <tr key={row.month}>
                          <td className="px-4 py-2 font-medium">{formatMonth(row.month)}</td>
                          <td className="px-4 py-2">{row.total_sessions}</td>
                          <td className="px-4 py-2">{formatTime(row.avg_seconds)}</td>
                          <td className="px-4 py-2 text-gray-500">{formatTime(row.min_seconds)}</td>
                          <td className="px-4 py-2 text-gray-500">{formatTime(row.max_seconds)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Stats;

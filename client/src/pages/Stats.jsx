import React, { useEffect, useState, useRef } from 'react';
import { BarChart3, TrendingUp, Clock, Hash, Calendar } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

function formatDuration(s) {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  if (m === 0) return `${sec}秒`;
  return `${m}分${sec.toString().padStart(2, '0')}秒`;
}

function formatMonth(year, month) {
  return `${year}年${month}月`;
}

function MonthlyChart({ monthly }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || monthly.length === 0) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const padLeft = 50;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 40;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;
    const barGap = 8;
    const barWidth = Math.max((chartW / monthly.length) - barGap, 4);

    const maxCount = Math.max(...monthly.map(m => m.total_sessions), 1);
    const niceMax = Math.ceil(maxCount / 5) * 5 || 5;

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = padTop + chartH - (chartH * i / 4);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();
      const val = Math.round(niceMax * i / 4);
      ctx.fillText(val, padLeft - 8, y + 4);
    }

    monthly.forEach((m, i) => {
      const x = padLeft + i * (barWidth + barGap) + barGap / 2;
      const barH = (m.total_sessions / niceMax) * chartH;
      const y = padTop + chartH - barH;

      const hasUnlinked = m.unlinked_sessions > 0 && m.linked_sessions > 0;
      if (hasUnlinked) {
        const linkedH = (m.linked_sessions / niceMax) * chartH;
        const unlinkedH = (m.unlinked_sessions / niceMax) * chartH;
        ctx.fillStyle = '#0f766e';
        ctx.fillRect(x, padTop + chartH - linkedH, barWidth, linkedH);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x, padTop + chartH - linkedH - unlinkedH, barWidth, unlinkedH);
      } else if (m.total_sessions > 0) {
        ctx.fillStyle = m.pattern_id === null || (m.linked_sessions === 0 && m.unlinked_sessions > 0)
          ? '#fbbf24'
          : '#0f766e';
        ctx.fillRect(x, y, barWidth, barH);
      } else {
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(x, padTop + chartH - 2, barWidth, 2);
      }

      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      const label = monthly.length > 12 ? `${m.month}月` : formatMonth(m.year, m.month);
      ctx.fillText(label, x + barWidth / 2, padTop + chartH + 16);

      if (m.total_sessions > 0) {
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(m.total_sessions, x + barWidth / 2, y - 6);
      }
    });
  }, [monthly]);

  if (monthly.length === 0) return null;

  return (
    <div>
      <canvas ref={canvasRef} className="w-full h-56 bg-gray-50 rounded-lg" />
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-teal-700" /> 有关联款式
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" /> 未关联款式
        </span>
      </div>
    </div>
  );
}

function TrendChart({ trend }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || trend.length < 2) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const padLeft = 60;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 40;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    const durations = trend.map(t => t.duration_seconds);
    const minVal = Math.min(...durations);
    const maxVal = Math.max(...durations);
    const range = maxVal - minVal || 1;
    const yMin = Math.max(0, minVal - range * 0.15);
    const yMax = maxVal + range * 0.15;
    const yRange = yMax - yMin || 1;

    ctx.strokeStyle = '#e5e7eb';
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = padTop + chartH - (chartH * i / 4);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();
      const val = yMin + (yRange * i / 4);
      ctx.fillText(formatDuration(Math.round(val)), padLeft - 8, y + 4);
    }

    const stepX = chartW / (trend.length - 1);
    const points = trend.map((t, i) => ({
      x: padLeft + i * stepX,
      y: padTop + chartH - ((t.duration_seconds - yMin) / yRange) * chartH,
    }));

    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    points.forEach((p, i) => {
      ctx.fillStyle = i === 0 ? '#f59e0b' : i === points.length - 1 ? '#10b981' : '#0f766e';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const labelEvery = Math.max(1, Math.ceil(trend.length / 8));
    trend.forEach((t, i) => {
      if (i % labelEvery === 0 || i === trend.length - 1) {
        const d = new Date(t.created_at);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        ctx.fillText(label, points[i].x, padTop + chartH + 16);
      }
    });
  }, [trend]);

  if (trend.length < 2) return null;

  return <canvas ref={canvasRef} className="w-full h-56 bg-gray-50 rounded-lg" />;
}

function Stats() {
  const { user } = useAuth();
  const [monthlyData, setMonthlyData] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [selectedPatternId, setSelectedPatternId] = useState('');
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiClient.get('/timers/stats/monthly'),
      apiClient.get('/timers/stats/patterns/list'),
    ]).then(([monthlyRes, patternsRes]) => {
      setMonthlyData(monthlyRes.data);
      setPatterns(patternsRes.data);
      if (patternsRes.data.length > 0) {
        setSelectedPatternId(String(patternsRes.data[0].id));
      }
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!selectedPatternId) {
      setTrendData(null);
      return;
    }
    setTrendLoading(true);
    apiClient.get(`/timers/stats/trend/${selectedPatternId}`)
      .then(res => setTrendData(res.data))
      .catch(err => console.error(err))
      .finally(() => setTrendLoading(false));
  }, [selectedPatternId]);

  if (!user) {
    return <div className="text-center py-20 text-gray-500">请先登录以查看统计数据</div>;
  }

  if (loading) {
    return <div className="text-center py-20">加载中...</div>;
  }

  const overall = monthlyData?.overall;
  const monthly = monthlyData?.monthly || [];
  const hasData = overall && overall.total_sessions > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">绑制统计</h1>
        <p className="text-gray-500">查看你的绑制次数、用时变化和进步轨迹</p>
      </div>

      {!hasData ? (
        <div className="card p-12 text-center text-gray-500">
          <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
          <p>还没有计时记录，去计时器页面开始第一次绑制吧</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Hash size={16} /> 总绑制次数
              </div>
              <div className="text-2xl font-bold text-flytie-dark">{overall.total_sessions}</div>
              {overall.unlinked_sessions > 0 && (
                <div className="text-xs text-amber-600 mt-1">其中 {overall.unlinked_sessions} 次未关联款式</div>
              )}
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Clock size={16} /> 平均用时
              </div>
              <div className="text-2xl font-bold text-flytie-dark">{formatDuration(overall.avg_seconds)}</div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <TrendingUp size={16} /> 最快记录
              </div>
              <div className="text-2xl font-bold text-green-600">{formatDuration(overall.min_seconds)}</div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Clock size={16} /> 最慢记录
              </div>
              <div className="text-2xl font-bold text-amber-600">{formatDuration(overall.max_seconds)}</div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} />
              <h2 className="font-semibold text-lg">按月统计</h2>
            </div>
            <MonthlyChart monthly={monthly} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2">月份</th>
                    <th className="text-right px-4 py-2">绑制次数</th>
                    <th className="text-right px-4 py-2">平均用时</th>
                    <th className="text-right px-4 py-2">关联款式</th>
                    <th className="text-right px-4 py-2">未关联</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...monthly].reverse().map((m) => (
                    <tr key={`${m.year}-${m.month}`} className={m.total_sessions === 0 ? 'text-gray-400' : ''}>
                      <td className="px-4 py-2 font-medium">{formatMonth(m.year, m.month)}</td>
                      <td className="px-4 py-2 text-right">{m.total_sessions}</td>
                      <td className="px-4 py-2 text-right">{formatDuration(m.avg_seconds)}</td>
                      <td className="px-4 py-2 text-right">{m.linked_sessions}</td>
                      <td className="px-4 py-2 text-right">
                        {m.unlinked_sessions > 0 ? (
                          <span className="text-amber-600">{m.unlinked_sessions}</span>
                        ) : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} />
                <h2 className="font-semibold text-lg">款式用时趋势</h2>
              </div>
              <select
                value={selectedPatternId}
                onChange={(e) => setSelectedPatternId(e.target.value)}
                className="input w-auto min-w-[200px]"
              >
                {patterns.length === 0 && <option value="">暂未有关联款式的记录</option>}
                {patterns.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}（{p.session_count} 次）
                  </option>
                ))}
              </select>
            </div>

            {trendLoading ? (
              <div className="text-center py-12 text-gray-500">加载中...</div>
            ) : !trendData || !trendData.summary ? (
              <div className="text-center py-12 text-gray-500">该款式暂无计时记录</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">首次用时</div>
                    <div className="font-semibold text-amber-600">{formatDuration(trendData.summary.first_seconds)}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">最近用时</div>
                    <div className="font-semibold text-green-600">{formatDuration(trendData.summary.last_seconds)}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">进步幅度</div>
                    <div className={`font-semibold ${trendData.summary.improvement_seconds > 0 ? 'text-green-600' : trendData.summary.improvement_seconds < 0 ? 'text-red-500' : 'text-gray-600'}`}>
                      {trendData.summary.improvement_seconds > 0 ? '↓ ' : trendData.summary.improvement_seconds < 0 ? '↑ ' : ''}
                      {formatDuration(Math.abs(trendData.summary.improvement_seconds))}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">平均 / 最快</div>
                    <div className="font-semibold text-flytie-dark">
                      {formatDuration(trendData.summary.avg_seconds)} / {formatDuration(trendData.summary.min_seconds)}
                    </div>
                  </div>
                </div>

                {trendData.trend.length >= 2 ? (
                  <TrendChart trend={trendData.trend} />
                ) : (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    至少需要 2 次记录才能绘制趋势图，当前 {trendData.trend.length} 次
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2">#</th>
                        <th className="text-left px-4 py-2">日期</th>
                        <th className="text-right px-4 py-2">用时</th>
                        <th className="text-left px-4 py-2">备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...trendData.trend].reverse().map((t, idx) => {
                        const realIdx = trendData.trend.length - idx;
                        return (
                          <tr key={t.id}>
                            <td className="px-4 py-2 text-gray-500">{realIdx}</td>
                            <td className="px-4 py-2">{new Date(t.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-2 text-right font-medium">{formatDuration(t.duration_seconds)}</td>
                            <td className="px-4 py-2 text-gray-500 max-w-xs truncate">{t.notes || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Stats;

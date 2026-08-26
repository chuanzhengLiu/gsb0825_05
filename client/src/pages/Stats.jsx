import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

function formatDuration(seconds) {
  const s = Math.round(Number(seconds));
  if (!Number.isFinite(s) || s <= 0) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}分${sec.toString().padStart(2, '0')}秒`;
}

function formatMonth(month) {
  const [y, m] = month.split('-');
  return `${y}年${Number(m)}月`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

// 从首个有记录的月份连续补到当前月，缺失月份补 0，跨年自动衔接
function buildMonthlyRows(rows) {
  if (!rows || rows.length === 0) return [];
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const [startY, startM] = rows[0].month.split('-').map(Number);
  const now = new Date();
  const endY = now.getFullYear();
  const endM = now.getMonth() + 1;

  const result = [];
  let y = startY;
  let m = startM;
  while (y < endY || (y === endY && m <= endM)) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const row = byMonth.get(key);
    result.push({
      month: key,
      year: y,
      monthNum: m,
      total: row ? Number(row.total_sessions) : 0,
      noPattern: row ? Number(row.no_pattern_sessions) : 0,
      avgSeconds: row && row.avg_seconds != null ? Number(row.avg_seconds) : null,
      totalSeconds: row ? Number(row.total_seconds) : 0,
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return result;
}

function MonthlyChart({ months }) {
  const maxCount = Math.max(...months.map((m) => m.total), 1);
  const slot = 40;
  const padL = 8;
  const chartH = 150;
  const labelH = 22;
  const width = Math.max(600, months.length * slot + padL);
  const height = chartH + labelH;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="block">
        <line x1={padL} y1={chartH} x2={width} y2={chartH} stroke="#e5e7eb" />
        {months.map((m, i) => {
          const cx = padL + i * slot + slot / 2;
          const barW = 22;
          const h = m.total > 0 ? Math.max(4, Math.round((m.total / maxCount) * (chartH - 24))) : 2;
          const y = chartH - h;
          const showYear = m.monthNum === 1 || i === 0;
          return (
            <g key={m.month}>
              <rect
                x={cx - barW / 2}
                y={y}
                width={barW}
                height={h}
                rx={3}
                fill={m.total > 0 ? '#0f766e' : '#d1d5db'}
              />
              {m.total > 0 && (
                <text x={cx} y={y - 5} textAnchor="middle" fontSize="10" fill="#374151">
                  {m.total}
                </text>
              )}
              <text x={cx} y={chartH + 15} textAnchor="middle" fontSize="9" fill="#6b7280">
                {showYear ? `${m.year}年${m.monthNum}月` : `${m.monthNum}月`}
              </text>
              <title>{`${formatMonth(m.month)}：${m.total} 次，平均 ${formatDuration(m.avgSeconds)}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TrendChart({ sessions }) {
  const durs = sessions.map((s) => Number(s.duration_seconds));
  const maxSec = Math.max(...durs, 60);
  const yMax = Math.ceil(maxSec / 60) * 60;
  const w = 640;
  const h = 240;
  const padL = 48;
  const padR = 20;
  const padT = 18;
  const padB = 34;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const x = (i) =>
    sessions.length === 1 ? padL + innerW / 2 : padL + (i / (sessions.length - 1)) * innerW;
  const y = (v) => padT + innerH - (v / yMax) * innerH;
  const points = durs.map((d, i) => `${x(i)},${y(d)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {[0, 0.5, 1].map((r) => (
        <g key={r}>
          <line
            x1={padL}
            y1={padT + innerH * (1 - r)}
            x2={w - padR}
            y2={padT + innerH * (1 - r)}
            stroke="#e5e7eb"
          />
          <text
            x={padL - 6}
            y={padT + innerH * (1 - r) + 3}
            textAnchor="end"
            fontSize="9"
            fill="#9ca3af"
          >
            {Math.round((yMax * r) / 60)}分
          </text>
        </g>
      ))}
      <polyline points={points} fill="none" stroke="#0f766e" strokeWidth={2} />
      {durs.map((d, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(d)}
          r={i === 0 || i === durs.length - 1 ? 5 : 3}
          fill={i === durs.length - 1 ? '#f59e0b' : '#0f766e'}
          stroke="#fff"
          strokeWidth={1.5}
        >
          <title>{`${formatDate(sessions[i].created_at)}：${formatDuration(d)}`}</title>
        </circle>
      ))}
      <text x={x(0)} y={h - 10} textAnchor="middle" fontSize="9" fill="#6b7280">
        首次 {formatDate(sessions[0].created_at)}
      </text>
      <text x={x(durs.length - 1)} y={h - 10} textAnchor="middle" fontSize="9" fill="#6b7280">
        最近 {formatDate(sessions[durs.length - 1].created_at)}
      </text>
    </svg>
  );
}

function Stats() {
  const { user } = useAuth();
  const [monthly, setMonthly] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [noPatternCount, setNoPatternCount] = useState(0);
  const [selected, setSelected] = useState('');
  const [trend, setTrend] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchStats();
    else setLoading(false);
  }, [user]);

  const fetchStats = async () => {
    try {
      const [monthlyRes, patternsRes] = await Promise.all([
        apiClient.get('/timers/stats/monthly'),
        apiClient.get('/timers/stats/patterns'),
      ]);
      setMonthly(monthlyRes.data);
      setPatterns(patternsRes.data.patterns || []);
      setNoPatternCount(Number(patternsRes.data.no_pattern_count) || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrend = async (patternId) => {
    setTrendLoading(true);
    try {
      const res = await apiClient.get(`/timers/stats/trend/${patternId}`);
      setTrend(res.data);
    } catch (err) {
      console.error(err);
      setTrend([]);
    } finally {
      setTrendLoading(false);
    }
  };

  const handleSelect = (e) => {
    const value = e.target.value;
    setSelected(value);
    setTrend([]);
    if (value) fetchTrend(value);
  };

  const months = useMemo(() => buildMonthlyRows(monthly), [monthly]);

  const trendSummary = useMemo(() => {
    if (trend.length === 0) return null;
    const durs = trend.map((s) => Number(s.duration_seconds));
    const first = durs[0];
    const recent = durs.slice(-3);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    return {
      count: durs.length,
      first,
      recentAvg,
      min: Math.min(...durs),
      max: Math.max(...durs),
      diff: first - recentAvg,
    };
  }, [trend]);

  if (!user) {
    return <div className="text-center py-20 text-gray-500">请先登录以查看绑制统计</div>;
  }

  if (loading) {
    return <div className="text-center py-20">加载中...</div>;
  }

  if (months.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">绑制统计</h1>
          <p className="text-gray-500">按月回顾绑制次数与用时变化</p>
        </div>
        <div className="text-center py-20 text-gray-500">
          <BarChart3 className="mx-auto mb-2 text-gray-300" size={48} />
          还没有计时记录，先去计时器完成一次绑制吧
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">绑制统计</h1>
        <p className="text-gray-500">按月回顾绑制次数与用时变化，看看自己有没有进步</p>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={20} />
          <h2 className="font-semibold text-lg">月度统计</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          月度次数与平均用时包含未关联款式的记录，次数旁会单独标注；没有记录的月份补 0 显示。
        </p>

        <MonthlyChart months={months} />

        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="text-gray-500 border-b border-gray-200">
              <th className="text-left py-2 font-medium">月份</th>
              <th className="text-right py-2 font-medium">绑制次数</th>
              <th className="text-right py-2 font-medium">平均用时</th>
              <th className="text-right py-2 font-medium">累计用时</th>
            </tr>
          </thead>
          <tbody>
            {[...months].reverse().map((m) => (
              <tr
                key={m.month}
                className={`border-b border-gray-100 ${m.total === 0 ? 'text-gray-400' : ''}`}
              >
                <td className="py-2">{formatMonth(m.month)}</td>
                <td className="py-2 text-right">
                  {m.total}
                  {m.noPattern > 0 && (
                    <span className="text-xs text-gray-400">（含未关联 {m.noPattern}）</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  {m.avgSeconds != null ? formatDuration(m.avgSeconds) : '—'}
                </td>
                <td className="py-2 text-right">
                  {m.total > 0 ? formatDuration(m.totalSeconds) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={20} />
          <h2 className="font-semibold text-lg">款式用时趋势</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          选择一个款式，查看每次绑制的用时变化；未关联款式的记录可在下拉框中单独查看。
        </p>

        <select value={selected} onChange={handleSelect} className="input w-full md:w-80 mb-4">
          <option value="">选择款式查看用时变化</option>
          {patterns.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}（{Number(p.tie_count)} 次）
            </option>
          ))}
          {noPatternCount > 0 && (
            <option value="none">未关联款式（{noPatternCount} 次）</option>
          )}
        </select>

        {!selected ? (
          <div className="text-gray-500 py-8 text-center">请先选择一个款式</div>
        ) : trendLoading ? (
          <div className="text-gray-500 py-8 text-center">加载中...</div>
        ) : trend.length === 0 ? (
          <div className="text-gray-500 py-8 text-center">该款式暂无计时记录</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">绑制次数</div>
                <div className="font-semibold text-lg">{trendSummary.count} 次</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">首次用时</div>
                <div className="font-semibold text-lg">{formatDuration(trendSummary.first)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">
                  {trendSummary.count >= 3 ? '近 3 次平均' : '最近平均'}
                </div>
                <div className="font-semibold text-lg">{formatDuration(trendSummary.recentAvg)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">最快 / 最慢</div>
                <div className="font-semibold text-lg">
                  {formatDuration(trendSummary.min)} / {formatDuration(trendSummary.max)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">相比首次</div>
                <div
                  className={`font-semibold text-lg ${
                    trendSummary.diff > 0
                      ? 'text-flytie-primary'
                      : trendSummary.diff < 0
                        ? 'text-red-600'
                        : ''
                  }`}
                >
                  {trendSummary.diff > 0
                    ? `快 ${formatDuration(trendSummary.diff)}`
                    : trendSummary.diff < 0
                      ? `慢 ${formatDuration(-trendSummary.diff)}`
                      : '基本持平'}
                </div>
              </div>
            </div>
            <TrendChart sessions={trend} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Stats;

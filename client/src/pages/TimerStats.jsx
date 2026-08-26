import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

// 把按月聚合的结果补全为连续月份（按 year*12+month 递增，跨年安全）：
// 没有记录的月份次数为 0、平均为 null，页面显示空柱和 "—"
const fillMonths = (rows) => {
  if (rows.length === 0) return [];
  const byMonth = {};
  rows.forEach((r) => { byMonth[r.month] = r; });
  const [startY, startM] = rows[0].month.split('-').map(Number);
  const now = new Date();
  const end = now.getFullYear() * 12 + now.getMonth();
  const result = [];
  for (let i = startY * 12 + (startM - 1); i <= end; i++) {
    const y = Math.floor(i / 12);
    const m = (i % 12) + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    result.push(byMonth[key] || { month: key, total_sessions: 0, unlinked_sessions: 0, avg_seconds: null });
  }
  return result;
};

const formatTime = (s) => {
  if (s === null || s === undefined) return '—';
  const total = Math.round(Number(s));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}分${sec.toString().padStart(2, '0')}秒`;
};

// "2026-01" -> "26/01"，跨年也能一眼分清
const shortMonth = (key) => {
  const [y, m] = key.split('-');
  return `${y.slice(2)}/${m}`;
};

function MonthBars({ months, getValue, getTop, getBottom }) {
  const max = Math.max(...months.map((m) => getValue(m) || 0), 1);
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-3 min-w-max px-1">
        {months.map((m) => {
          const v = getValue(m);
          const height = v ? Math.max((v / max) * 120, 4) : 2;
          return (
            <div key={m.month} className="flex flex-col items-center gap-1 w-12">
              <div className="text-xs font-medium text-flytie-primary h-4">{getTop(m)}</div>
              <div
                className={`w-6 rounded-t ${v ? 'bg-flytie-primary' : 'bg-gray-200'}`}
                style={{ height: `${height}px` }}
              />
              <div className="text-xs text-gray-500">{shortMonth(m.month)}</div>
              <div className="text-xs text-gray-400">{getBottom(m)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimerStats() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [selectedPattern, setSelectedPattern] = useState('');
  const [patternRows, setPatternRows] = useState([]);

  useEffect(() => {
    if (user) {
      fetchMonthly();
    }
    fetchPatterns();
  }, [user]);

  useEffect(() => {
    if (user && selectedPattern) {
      fetchMonthly(selectedPattern);
    } else {
      setPatternRows([]);
    }
  }, [user, selectedPattern]);

  const fetchMonthly = async (patternId) => {
    try {
      const res = await apiClient.get('/timers/stats/monthly', {
        params: patternId ? { pattern_id: patternId } : {},
      });
      if (patternId) {
        setPatternRows(res.data);
      } else {
        setRows(res.data);
      }
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

  if (!user) {
    return <div className="text-center py-20 text-gray-500">请先登录以查看统计</div>;
  }

  const months = fillMonths(rows);
  const patternMonths = fillMonths(patternRows);
  const totalUnlinked = months.reduce((sum, m) => sum + Number(m.unlinked_sessions || 0), 0);

  // 单款式进步幅度：对比最早和最近一个有记录的月份
  const active = patternMonths.filter((m) => Number(m.total_sessions) > 0);
  let trend = null;
  if (active.length >= 2) {
    const first = active[0];
    const last = active[active.length - 1];
    const diff = Number(first.avg_seconds) - Number(last.avg_seconds);
    trend = {
      first,
      last,
      faster: diff > 0,
      same: diff === 0,
      pct: Math.round((Math.abs(diff) / Number(first.avg_seconds)) * 100),
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">绑制统计</h1>
        <p className="text-gray-500">按月查看绑制次数与平均用时，追踪每个款式的进步曲线</p>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} />
          <h2 className="font-semibold text-lg">月度总览</h2>
        </div>
        {months.length === 0 ? (
          <div className="text-gray-500">暂无计时记录</div>
        ) : (
          <>
            <MonthBars
              months={months}
              getValue={(m) => Number(m.total_sessions)}
              getTop={(m) => (Number(m.total_sessions) > 0 ? `${m.total_sessions}次` : '')}
              getBottom={(m) => formatTime(m.avg_seconds)}
            />
            <div className="mt-3 text-sm text-gray-500">
              柱高为当月绑制次数，底部为平均用时。
              {totalUnlinked > 0 && (
                <>其中有 {totalUnlinked} 次未关联款式：计入上面的总次数与平均，但不参与下方单款式统计。</>
              )}
            </div>
          </>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={20} />
          <h2 className="font-semibold text-lg">单款式用时趋势</h2>
        </div>
        <select
          value={selectedPattern}
          onChange={(e) => setSelectedPattern(e.target.value)}
          className="input w-full md:w-80 mb-4"
        >
          <option value="">选择要查看的款式</option>
          {patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {!selectedPattern ? (
          <div className="text-gray-500">选择一个款式，查看每月平均用时的变化</div>
        ) : patternMonths.length === 0 ? (
          <div className="text-gray-500">该款式还没有计时记录</div>
        ) : (
          <>
            <MonthBars
              months={patternMonths}
              getValue={(m) => (m.avg_seconds ? Number(m.avg_seconds) : 0)}
              getTop={(m) => (Number(m.total_sessions) > 0 ? formatTime(m.avg_seconds) : '')}
              getBottom={(m) => `${m.total_sessions}次`}
            />
            <div className="mt-3 text-sm text-gray-500">柱高为当月平均用时（越矮越快），底部为当月次数。</div>
            {trend && (
              <div className="mt-2 flex items-center gap-1 text-sm">
                {trend.faster || trend.same ? (
                  <TrendingDown size={16} className="text-flytie-primary" />
                ) : (
                  <TrendingUp size={16} className="text-orange-500" />
                )}
                <span className="text-gray-600">
                  最早（{trend.first.month}）平均 {formatTime(trend.first.avg_seconds)}，
                  最近（{trend.last.month}）平均 {formatTime(trend.last.avg_seconds)}，
                  {trend.same ? '基本持平' : trend.faster ? `快了 ${trend.pct}%` : `慢了 ${trend.pct}%`}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default TimerStats;

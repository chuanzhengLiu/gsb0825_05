import React, { useEffect, useState } from 'react';
import { History, Clock } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import Timer from '../components/Timer';

function TimerPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [selectedPattern, setSelectedPattern] = useState('');

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
    fetchPatterns();
  }, [user]);

  const fetchSessions = async () => {
    try {
      const res = await apiClient.get('/timers');
      setSessions(res.data);
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

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}分${sec.toString().padStart(2, '0')}秒`;
  };

  if (!user) {
    return <div className="text-center py-20 text-gray-500">请先登录以使用计时器</div>;
  }

  const selectedName = patterns.find((p) => String(p.id) === selectedPattern)?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">绑制计时器</h1>
        <p className="text-gray-500">记录每次绑制花费的时间，积累历史数据以提升效率</p>
      </div>

      <div className="card p-5">
        <label className="block text-sm text-gray-700 mb-2">关联款式（可选）</label>
        <select
          value={selectedPattern}
          onChange={(e) => setSelectedPattern(e.target.value)}
          className="input w-full md:w-80"
        >
          <option value="">不关联具体款式</option>
          {patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <Timer
        patternId={selectedPattern ? Number(selectedPattern) : null}
        patternName={selectedName}
        onSaved={fetchSessions}
      />

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <History size={20} />
          <h2 className="font-semibold text-lg">历史记录</h2>
        </div>
        {sessions.length === 0 ? (
          <div className="text-gray-500">暂无计时记录</div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div>
                  <div className="font-medium">{s.pattern_name || '未关联款式'}</div>
                  <div className="text-xs text-gray-500">{new Date(s.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-1 text-flytie-primary font-semibold">
                  <Clock size={16} /> {formatTime(s.duration_seconds)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TimerPage;

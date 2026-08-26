import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Save, CheckCircle } from 'lucide-react';
import apiClient from '../api/client';

function Timer({ patternId, patternName, onSaved }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (seconds <= 0) return;
    try {
      await apiClient.post('/timers', {
        pattern_id: patternId || null,
        duration_seconds: seconds,
        notes,
      });
      setSaved(true);
      setRunning(false);
      setSeconds(0);
      setNotes('');
      if (onSaved) onSaved();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data?.message || '保存失败');
    }
  };

  return (
    <div className="card p-6">
      <div className="text-center">
        {patternName && <p className="text-sm text-gray-500 mb-2">当前款式：{patternName}</p>}
        <div className="text-6xl font-mono font-bold text-flytie-dark tracking-wider mb-6">
          {formatTime(seconds)}
        </div>
        <div className="flex justify-center gap-3 mb-4">
          <button
            onClick={() => setRunning(!running)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white ${
              running ? 'bg-amber-500 hover:bg-amber-600' : 'bg-flytie-primary hover:bg-teal-800'
            }`}
          >
            {running ? <Pause size={20} /> : <Play size={20} />}
            {running ? '暂停' : '开始'}
          </button>
          <button
            onClick={() => { setRunning(false); setSeconds(0); }}
            className="btn-secondary flex items-center gap-2"
          >
            <RotateCcw size={20} /> 重置
          </button>
          <button
            onClick={handleSave}
            disabled={seconds <= 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={20} /> 保存
          </button>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="记录本次绑制心得（可选）"
          className="input max-w-md mx-auto"
          rows="2"
        />

        {saved && (
          <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
            <CheckCircle size={18} /> 计时记录已保存
          </div>
        )}
      </div>
    </div>
  );
}

export default Timer;

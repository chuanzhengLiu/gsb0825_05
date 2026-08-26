import React, { useRef, useEffect, useState } from 'react';

function MaterialEstimator({ materials = [] }) {
  const canvasRef = useRef(null);
  const [hookCount, setHookCount] = useState(12);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // 绘制材料用量条形图
    const barHeight = 24;
    const gap = 12;
    const startY = 24;
    const startX = 120;
    const maxBarWidth = Math.max(width - startX - 24, 100);

    materials.forEach((m, index) => {
      const y = startY + index * (barHeight + gap);
      const amount = parseFloat(m.amount) || 1;
      const estimate = amount * hookCount;
      const maxEstimate = Math.max(estimate, amount * 24);
      const barWidth = (estimate / maxEstimate) * maxBarWidth;

      ctx.fillStyle = '#374151';
      ctx.font = '13px sans-serif';
      ctx.fillText(m.name, 12, y + 16);

      ctx.fillStyle = '#0f766e';
      ctx.fillRect(startX, y, Math.max(barWidth, 4), barHeight);

      ctx.fillStyle = '#111827';
      ctx.fillText(`${estimate.toFixed(1)} 单位`, startX + barWidth + 8, y + 16);
    });

    // 底部说明
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText(`基于 ${hookCount} 只毛钩估算，数字仅供参考`, 12, height - 16);
  }, [materials, hookCount]);

  const totalMaterials = materials.reduce((sum, m) => sum + (parseFloat(m.amount) || 1) * hookCount, 0);

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-lg mb-3">Canvas 材料用量估算</h3>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-600">计划绑制数量：</label>
        <input
          type="range"
          min="1"
          max="50"
          value={hookCount}
          onChange={(e) => setHookCount(Number(e.target.value))}
          className="w-32"
        />
        <span className="font-mono font-medium">{hookCount}</span> 只
      </div>
      <canvas ref={canvasRef} className="w-full h-48 bg-gray-50 rounded-lg" />
      <div className="mt-3 text-sm text-gray-600">
        预计总消耗：<span className="font-medium text-flytie-primary"> {totalMaterials.toFixed(1)} </span> 单位
      </div>
    </div>
  );
}

export default MaterialEstimator;

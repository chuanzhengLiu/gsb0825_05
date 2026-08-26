import React from 'react';

function SvgPatternStep({ svgData }) {
  const { type, color = '#374151' } = svgData || {};

  const renderContent = () => {
    switch (type) {
      case 'base_thread':
        return (
          <>
            <line x1="80" y1="60" x2="80" y2="140" stroke="#9ca3af" strokeWidth="3" />
            <line x1="70" y1="75" x2="90" y2="75" stroke={color} strokeWidth="2" />
            <line x1="70" y1="90" x2="90" y2="90" stroke={color} strokeWidth="2" />
            <line x1="70" y1="105" x2="90" y2="105" stroke={color} strokeWidth="2" />
            <line x1="70" y1="120" x2="90" y2="120" stroke={color} strokeWidth="2" />
            <text x="80" y="165" textAnchor="middle" className="text-xs fill-gray-500">缠绕基线</text>
          </>
        );
      case 'tail':
        return (
          <>
            <line x1="80" y1="60" x2="80" y2="140" stroke="#9ca3af" strokeWidth="3" />
            <path d="M 80 140 Q 60 155 50 170" stroke={color} strokeWidth="3" fill="none" />
            <path d="M 80 140 Q 100 155 110 170" stroke={color} strokeWidth="3" fill="none" />
            <text x="80" y="190" textAnchor="middle" className="text-xs fill-gray-500">尾羽</text>
          </>
        );
      case 'body':
        return (
          <>
            <line x1="80" y1="60" x2="80" y2="140" stroke="#9ca3af" strokeWidth="3" />
            <ellipse cx="80" cy="100" rx="14" ry="32" fill={color} opacity="0.85" />
            <line x1="66" y1="85" x2="94" y2="85" stroke="#d1d5db" strokeWidth="1" />
            <line x1="66" y1="100" x2="94" y2="100" stroke="#d1d5db" strokeWidth="1" />
            <line x1="66" y1="115" x2="94" y2="115" stroke="#d1d5db" strokeWidth="1" />
            <text x="80" y="165" textAnchor="middle" className="text-xs fill-gray-500">身体</text>
          </>
        );
      case 'wings':
        return (
          <>
            <line x1="80" y1="60" x2="80" y2="140" stroke="#9ca3af" strokeWidth="3" />
            <path d="M 80 95 L 55 55 L 80 85 L 105 55 Z" fill={color} opacity="0.9" />
            <text x="80" y="165" textAnchor="middle" className="text-xs fill-gray-500">翅</text>
          </>
        );
      case 'hackle':
        return (
          <>
            <line x1="80" y1="60" x2="80" y2="140" stroke="#9ca3af" strokeWidth="3" />
            <g stroke={color} strokeWidth="2" fill="none">
              <path d="M 68 75 Q 80 65 92 75" />
              <path d="M 66 85 Q 80 70 94 85" />
              <path d="M 65 95 Q 80 78 95 95" />
              <path d="M 66 105 Q 80 90 94 105" />
              <path d="M 68 115 Q 80 105 92 115" />
            </g>
            <text x="80" y="165" textAnchor="middle" className="text-xs fill-gray-500">颈羽</text>
          </>
        );
      default:
        return (
          <>
            <line x1="80" y1="60" x2="80" y2="140" stroke="#9ca3af" strokeWidth="3" />
            <circle cx="80" cy="100" r="20" stroke={color} strokeWidth="2" fill="none" />
            <text x="80" y="165" textAnchor="middle" className="text-xs fill-gray-500">步骤示意</text>
          </>
        );
    }
  };

  return (
    <svg viewBox="0 0 160 200" className="w-full h-48 bg-gray-50 rounded-lg border border-gray-200">
      {renderContent()}
    </svg>
  );
}

export default SvgPatternStep;

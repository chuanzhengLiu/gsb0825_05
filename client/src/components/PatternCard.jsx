import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Heart, Fish, Droplets } from 'lucide-react';

function PatternCard({ pattern }) {
  return (
    <Link to={`/patterns/${pattern.slug}`} className="card hover:shadow-md transition-shadow block">
      <div className="h-40 bg-gradient-to-br from-teal-50 to-amber-50 flex items-center justify-center">
        {pattern.image_url ? (
          <img src={pattern.image_url} alt={pattern.name} className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 160 200" className="h-28">
            <line x1="80" y1="40" x2="80" y2="160" stroke="#9ca3af" strokeWidth="3" />
            <ellipse cx="80" cy="100" rx="14" ry="38" fill="#0f766e" opacity="0.2" />
            <path d="M 80 65 L 60 30 L 80 60 L 100 30 Z" fill="#78350f" opacity="0.3" />
          </svg>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg text-flytie-dark mb-1 truncate">{pattern.name}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3 h-10">{pattern.description || '暂无描述'}</p>
        <div className="flex flex-wrap gap-2 text-xs mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded">
            <Fish size={12} /> {pattern.target_fish}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
            <Droplets size={12} /> {pattern.water_type}
          </span>
          {pattern.difficulty && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">{pattern.difficulty}</span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> {pattern.avg_time_seconds > 0 ? `${Math.round(pattern.avg_time_seconds / 60)} min` : '暂无数据'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart size={12} /> {pattern.favorite_count || 0}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default PatternCard;

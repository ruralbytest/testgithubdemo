import React from 'react';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';

interface TodoStatsProps {
  stats: {
    total: number;
    active: number;
    completed: number;
  };
  onClearCompleted: () => void;
  onToggleAll: () => void;
}

export const TodoStats: React.FC<TodoStatsProps> = ({ stats, onClearCompleted, onToggleAll }) => {
  const completionPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-green-500" size={20} />
            <span className="text-sm font-medium text-gray-700">Progress</span>
          </div>
          <span className="text-lg font-bold text-gray-800">{completionPercentage}%</span>
        </div>
        
        {stats.total > 0 && (
          <button
            onClick={onToggleAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 
                     hover:bg-blue-50 rounded-lg transition-all duration-200"
          >
            {stats.active === 0 ? <Circle size={16} /> : <CheckCircle2 size={16} />}
            {stats.active === 0 ? 'Uncheck all' : 'Check all'}
          </button>
        )}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {stats.active} of {stats.total} tasks remaining
        </div>
        
        {stats.completed > 0 && (
          <button
            onClick={onClearCompleted}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 
                     hover:bg-red-50 rounded-lg transition-all duration-200"
          >
            <Trash2 size={14} />
            Clear completed
          </button>
        )}
      </div>
    </div>
  );
};
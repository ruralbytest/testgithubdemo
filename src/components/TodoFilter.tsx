import React from 'react';
import { FilterType } from '../types';

interface TodoFilterProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  stats: {
    total: number;
    active: number;
    completed: number;
  };
}

export const TodoFilter: React.FC<TodoFilterProps> = ({ currentFilter, onFilterChange, stats }) => {
  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'active', label: 'Active', count: stats.active },
    { key: 'completed', label: 'Completed', count: stats.completed }
  ];

  return (
    <div className="flex items-center justify-center gap-2 p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100">
      {filters.map(({ key, label, count }) => (
        <button
          key={key}
          onClick={() => onFilterChange(key)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                     ${currentFilter === key
                       ? 'bg-blue-500 text-white shadow-md'
                       : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}
        >
          {label}
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                          ${currentFilter === key
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-200 text-gray-600'}`}>
            {count}
          </span>
        </button>
      ))}
    </div>
  );
};
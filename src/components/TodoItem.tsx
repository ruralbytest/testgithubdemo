import React, { useState } from 'react';
import { Check, Edit3, Trash2, X } from 'lucide-react';
import { Todo } from '../types';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

export const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);

  const handleSave = () => {
    if (editText.trim() && editText !== todo.text) {
      onUpdate(todo.id, editText);
    }
    setIsEditing(false);
    setEditText(todo.text);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditText(todo.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className={`group bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 
                    border border-gray-100 hover:border-gray-200 ${todo.completed ? 'opacity-75' : ''}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onToggle(todo.id)}
          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 
                     ${todo.completed 
                       ? 'bg-green-500 border-green-500 text-white' 
                       : 'border-gray-300 hover:border-green-400 hover:bg-green-50'}`}
        >
          {todo.completed && <Check size={14} />}
        </button>

        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleCancel}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <span
              className={`flex-1 text-gray-800 transition-all duration-200 ${
                todo.completed ? 'line-through text-gray-500' : ''
              }`}
            >
              {todo.text}
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => onDelete(todo.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
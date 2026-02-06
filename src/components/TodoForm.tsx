import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface TodoFormProps {
  onAddTodo: (text: string) => void;
}

export const TodoForm: React.FC<TodoFormProps> = ({ onAddTodo }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAddTodo(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a new todo..."
          className="w-full pl-6 pr-14 py-4 text-lg bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl 
                   focus:border-blue-400 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all duration-200
                   placeholder-gray-400 shadow-sm hover:shadow-md"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 
                   hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl 
                   flex items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95
                   disabled:cursor-not-allowed disabled:transform-none shadow-lg"
        >
          <Plus size={20} />
        </button>
      </div>
    </form>
  );
};
import React from 'react';
import { CheckSquare } from 'lucide-react';
import { useTodos } from './hooks/useTodos';
import { TodoForm } from './components/TodoForm';
import { TodoItem } from './components/TodoItem';
import { TodoFilter } from './components/TodoFilter';
import { TodoStats } from './components/TodoStats';

function App() {
  const {
    todos,
    filter,
    stats,
    setFilter,
    addTodo,
    toggleTodo,
    updateTodo,
    deleteTodo,
    clearCompleted,
    toggleAll
  } = useTodos();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
              <CheckSquare className="text-white" size={32} />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Habit Tracker
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Build better habits, one day at a time</p>
        </div>

        {/* Add Todo Form */}
        <div className="mb-6">
          <TodoForm onAddTodo={addTodo} />
        </div>

        {/* Stats */}
        {stats.total > 0 && (
          <div className="mb-6">
            <TodoStats
              stats={stats}
              onClearCompleted={clearCompleted}
              onToggleAll={toggleAll}
            />
          </div>
        )}

        {/* Filter */}
        {stats.total > 0 && (
          <div className="mb-6">
            <TodoFilter
              currentFilter={filter}
              onFilterChange={setFilter}
              stats={stats}
            />
          </div>
        )}

        {/* Todo List */}
        <div className="space-y-3">
          {todos.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl inline-block shadow-sm border border-gray-100">
                <CheckSquare className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-500 text-lg font-medium">
                  {filter === 'active' ? 'No active tasks' :
                   filter === 'completed' ? 'No completed tasks' :
                   'No todos yet'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {stats.total === 0 ? 'Add your first todo above!' : 'Try a different filter'}
                </p>
              </div>
            </div>
          ) : (
            todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={toggleTodo}
                onUpdate={updateTodo}
                onDelete={deleteTodo}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm">
            Built with React, TypeScript & Tailwind CSS
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
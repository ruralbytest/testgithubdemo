import { useState, useEffect, useCallback } from 'react';
import { Todo, FilterType } from '../types';
import { saveTodos, loadTodos } from '../utils/storage';

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    const loadedTodos = loadTodos();
    setTodos(loadedTodos);
  }, []);

  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  const addTodo = useCallback((text: string) => {
    if (!text.trim()) return;
    
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setTodos(prev => [newTodo, ...prev]);
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(todo => 
      todo.id === id 
        ? { ...todo, completed: !todo.completed, updatedAt: new Date() }
        : todo
    ));
  }, []);

  const updateTodo = useCallback((id: string, text: string) => {
    if (!text.trim()) return;
    
    setTodos(prev => prev.map(todo => 
      todo.id === id 
        ? { ...todo, text: text.trim(), updatedAt: new Date() }
        : todo
    ));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setTodos(prev => prev.filter(todo => !todo.completed));
  }, []);

  const toggleAll = useCallback(() => {
    const allCompleted = todos.every(todo => todo.completed);
    setTodos(prev => prev.map(todo => ({
      ...todo,
      completed: !allCompleted,
      updatedAt: new Date()
    })));
  }, [todos]);

  const filteredTodos = todos.filter(todo => {
    switch (filter) {
      case 'active':
        return !todo.completed;
      case 'completed':
        return todo.completed;
      default:
        return true;
    }
  });

  const stats = {
    total: todos.length,
    active: todos.filter(todo => !todo.completed).length,
    completed: todos.filter(todo => todo.completed).length
  };

  return {
    todos: filteredTodos,
    filter,
    stats,
    setFilter,
    addTodo,
    toggleTodo,
    updateTodo,
    deleteTodo,
    clearCompleted,
    toggleAll
  };
};
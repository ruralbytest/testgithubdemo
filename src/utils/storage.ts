import { Todo } from '../types';

const STORAGE_KEY = 'todos-app-data';

export const saveTodos = (todos: Todo[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (error) {
    console.error('Failed to save todos:', error);
  }
};

export const loadTodos = (): Todo[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return parsed.map((todo: any) => ({
      ...todo,
      createdAt: new Date(todo.createdAt),
      updatedAt: new Date(todo.updatedAt)
    }));
  } catch (error) {
    console.error('Failed to load todos:', error);
    return [];
  }
};
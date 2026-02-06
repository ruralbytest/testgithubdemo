# Database Migration Plan: localStorage → MongoDB + Express

## Context

Habit Tracker currently uses browser localStorage for data persistence, which has several limitations:
- **Critical Bug**: A race condition between useEffect hooks causes data loss on page reload (save effect overwrites data before load effect completes)
- **Limited Storage**: ~5-10MB browser quota
- **No Multi-Device Sync**: Data is isolated to single browser
- **No Query Capabilities**: Must load all todos to filter/search
- **Poor Scalability**: Not suitable for growing beyond POC stage

The user has MongoDB running locally and wants to migrate to a proper database solution while keeping this as a proof-of-concept (no complex authentication needed).

## Recommended Approach: MongoDB + Express Backend

**Architecture:**
```
React Frontend (Vite)
    ↓ (HTTP REST API)
Express Server (localhost:3001)
    ↓
MongoDB (localhost:27017)
```

**Why this approach:**
- ✅ Leverages user's existing MongoDB installation
- ✅ Minimal frontend changes (drop-in replacement for storage.ts)
- ✅ Fixes the localStorage persistence bug in the process
- ✅ No authentication complexity (localhost POC)
- ✅ Clean REST API pattern
- ✅ Easy to scale to production later

**Alternative considered but rejected:**
- IndexedDB: Still client-side only, doesn't enable multi-device features
- Direct MongoDB connection: Security risk, requires backend anyway
- Firebase/Firestore: Overkill for POC, introduces cloud dependency

## Critical Files to Modify

### Backend (New Files)
1. **`D:\0602demo\server\src\index.ts`** (~60 lines)
   - Express server entry point
   - MongoDB connection, CORS setup, route mounting

2. **`D:\0602demo\server\src\routes\todos.ts`** (~150 lines)
   - REST API endpoints: GET/POST/PUT/DELETE /api/todos
   - Business logic and error handling

3. **`D:\0602demo\server\src\models\Todo.ts`** (~40 lines)
   - Mongoose schema matching frontend Todo interface
   - Fields: id (UUID), text, completed, createdAt, updatedAt

4. **`D:\0602demo\server\src\config\database.ts`** (~30 lines)
   - MongoDB connection with retry logic

### Frontend (Existing Files)
5. **`D:\0602demo\src\utils\storage.ts`** (complete rewrite, ~120 lines)
   - Convert from localStorage to async HTTP client
   - Functions: fetchTodos(), createTodo(), updateTodo(), deleteTodo()
   - Include migration function to move old localStorage data to MongoDB

6. **`D:\0602demo\src\hooks\useTodos.ts`** (major refactor, ~150 lines)
   - **Fix localStorage bug**: Add `loaded` flag to prevent saving before load completes
   - Remove save useEffect (was causing the bug)
   - Convert all operations to async with API calls
   - Add optimistic updates for better UX

7. **`D:\0602demo\src\App.tsx`** (minor changes, ~10 lines)
   - Add loading state while data loads
   - Make event handlers async

8. **Component files** (TodoForm.tsx, TodoItem.tsx, TodoStats.tsx)
   - Add `async` keyword to event handlers (1-3 lines per file)

## Implementation Batches

Each batch is designed to stay under 10% of context window (~20k tokens) for optimal Claude Code performance. Tasks are ordered by dependency - complete each batch before moving to the next.

---

## BATCH 1: Backend Foundation Setup
**Estimated Context: ~6k tokens | Time: 45 minutes**

### Task 1.1: Initialize Server Project Structure
**Files Created:** 4 new files
**Context Usage:** ~2k tokens

1. Create directory structure:
```bash
mkdir server
cd server
npm init -y
mkdir -p src/config src/models src/routes src/middleware
```

2. Create `server/package.json`:
```json
{
  "name": "todoflow-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

3. Create `server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

4. Install dependencies:
```bash
npm install express cors mongoose
npm install --save-dev @types/express @types/cors @types/node tsx typescript
```

**Verification:**
- `npm install` completes without errors
- Directory structure exists: `server/src/{config,models,routes,middleware}/`

---

### Task 1.2: Database Connection Module
**Files:** `server/src/config/database.ts` (new, ~30 lines)
**Context Usage:** ~4k tokens

Create `server/src/config/database.ts`:
```typescript
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todoflow';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
};

// Connection event listeners
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});
```

**Verification:**
- Test connection by creating a temporary test file:
```bash
npx tsx -e "import('./src/config/database.ts').then(m => m.connectDatabase())"
```
- Should see "✅ Connected to MongoDB" in console
- Ensure MongoDB is running on localhost:27017

---

## BATCH 2: Backend Data Models
**Estimated Context: ~8k tokens | Time: 30 minutes**

### Task 2.1: Create Mongoose Todo Model
**Files:** `server/src/models/Todo.ts` (new, ~40 lines)
**Context Usage:** ~5k tokens
**Dependencies:** Batch 1 complete

Create `server/src/models/Todo.ts`:
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface ITodo extends Document {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TodoSchema = new Schema<ITodo>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Todo = mongoose.model<ITodo>('Todo', TodoSchema);
```

**Verification:**
- TypeScript compiles without errors: `npx tsc --noEmit`
- Model exports correctly

---

### Task 2.2: Error Handler Middleware
**Files:** `server/src/middleware/errorHandler.ts` (new, ~25 lines)
**Context Usage:** ~3k tokens

Create `server/src/middleware/errorHandler.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: 'Validation failed', details: err.message });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate entry' });
  }

  // Mongoose cast error (invalid ID format)
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  // Default server error
  res.status(500).json({ error: 'Internal server error' });
};
```

**Verification:**
- TypeScript compiles without errors

---

## BATCH 3: Backend API Routes - Part 1 (Read/Create)
**Estimated Context: ~12k tokens | Time: 45 minutes**

### Task 3.1: Implement GET and POST Endpoints
**Files:** `server/src/routes/todos.ts` (new, ~80 lines for Part 1)
**Context Usage:** ~10k tokens
**Dependencies:** Batch 1, 2 complete

Create `server/src/routes/todos.ts`:
```typescript
import { Router, Request, Response } from 'express';
import { Todo } from '../models/Todo.js';

const router = Router();

// GET /api/todos - Fetch all todos
router.get('/', async (req: Request, res: Response) => {
  try {
    const todos = await Todo.find()
      .sort({ createdAt: -1 }) // Newest first
      .lean();
    res.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// POST /api/todos - Create new todo
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, text, completed, createdAt, updatedAt } = req.body;

    // Validation
    if (!id || !text) {
      return res.status(400).json({ error: 'Missing required fields: id, text' });
    }

    const todo = new Todo({
      id,
      text: text.trim(),
      completed: completed || false,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
    });

    await todo.save();
    res.status(201).json(todo.toJSON());
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

export default router;
```

**Verification:**
- TypeScript compiles without errors
- Ready for Part 2 (update/delete endpoints)

---

## BATCH 4: Backend API Routes - Part 2 (Update/Delete)
**Estimated Context: ~14k tokens | Time: 45 minutes**

### Task 4.1: Implement PUT and DELETE Endpoints
**Files:** `server/src/routes/todos.ts` (append ~70 more lines)
**Context Usage:** ~12k tokens
**Dependencies:** Batch 3 complete

**Action:** Read `server/src/routes/todos.ts` and append these routes:

```typescript
// PUT /api/todos/:id - Update todo
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { text, completed, updatedAt } = req.body;

    const updateData: any = {
      updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
    };

    if (text !== undefined) updateData.text = text.trim();
    if (completed !== undefined) updateData.completed = completed;

    const todo = await Todo.findOneAndUpdate(
      { id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json(todo.toJSON());
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// DELETE /api/todos/:id - Delete single todo
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findOneAndDelete({ id });

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// DELETE /api/todos/completed - Clear all completed todos
router.delete('/completed/all', async (req: Request, res: Response) => {
  try {
    const result = await Todo.deleteMany({ completed: true });
    res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error clearing completed todos:', error);
    res.status(500).json({ error: 'Failed to clear completed todos' });
  }
});

// PUT /api/todos/toggle-all - Toggle all todos
router.put('/toggle-all/all', async (req: Request, res: Response) => {
  try {
    const { completed } = req.body;

    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'completed must be a boolean' });
    }

    await Todo.updateMany({}, { completed, updatedAt: new Date() });
    const todos = await Todo.find().sort({ createdAt: -1 }).lean();
    res.json(todos);
  } catch (error) {
    console.error('Error toggling todos:', error);
    res.status(500).json({ error: 'Failed to toggle todos' });
  }
});
```

**Verification:**
- All 6 endpoints defined
- TypeScript compiles without errors

---

## BATCH 5: Backend Server Entry Point
**Estimated Context: ~10k tokens | Time: 30 minutes**

### Task 5.1: Create Express Server
**Files:** `server/src/index.ts` (new, ~60 lines)
**Context Usage:** ~8k tokens
**Dependencies:** Batches 1-4 complete

Create `server/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import todoRoutes from './routes/todos.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/todos', todoRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api/todos`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await disconnectDatabase();
  process.exit(0);
});

startServer();
```

**Verification:**
- Start server: `npm run dev`
- Should see: "✅ Connected to MongoDB" and "🚀 Server running on http://localhost:3001"
- Test health check: `curl http://localhost:3001/health`

---

## BATCH 6: Backend Testing
**Estimated Context: ~8k tokens | Time: 30 minutes**

### Task 6.1: Test All API Endpoints
**No new files**
**Context Usage:** ~6k tokens
**Dependencies:** Batch 5 complete

**Test with curl or Postman:**

```bash
# 1. GET all todos (should return empty array initially)
curl http://localhost:3001/api/todos

# 2. POST create a todo
curl -X POST http://localhost:3001/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-uuid-123",
    "text": "Test todo from API",
    "completed": false,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }'

# 3. GET all todos again (should return 1 todo)
curl http://localhost:3001/api/todos

# 4. PUT update todo
curl -X PUT http://localhost:3001/api/todos/test-uuid-123 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# 5. DELETE todo
curl -X DELETE http://localhost:3001/api/todos/test-uuid-123

# 6. Verify MongoDB data
mongosh
use todoflow
db.todos.find().pretty()
```

**Verification Checklist:**
- [ ] GET returns empty array initially
- [ ] POST creates todo successfully
- [ ] GET returns created todo
- [ ] PUT updates todo
- [ ] DELETE removes todo
- [ ] MongoDB contains correct data (verify with mongosh)
- [ ] No errors in server console

---

## BATCH 7: Frontend Storage Layer - Core API Client
**Estimated Context: ~12k tokens | Time: 45 minutes**

### Task 7.1: Rewrite storage.ts - API Client Functions
**Files:** `src/utils/storage.ts` (complete rewrite, ~100 lines)
**Context Usage:** ~10k tokens
**Dependencies:** Backend (Batches 1-6) must be running

**Action:** Backup old file first, then rewrite:

```bash
# Backup
cp src/utils/storage.ts src/utils/storage.ts.backup
```

Create new `src/utils/storage.ts`:
```typescript
import { Todo } from '../types';

const API_BASE_URL = 'http://localhost:3001/api/todos';

// Helper to parse Date fields from API responses
const parseTodo = (todo: any): Todo => ({
  ...todo,
  createdAt: new Date(todo.createdAt),
  updatedAt: new Date(todo.updatedAt),
});

// Fetch all todos
export const fetchTodos = async (): Promise<Todo[]> => {
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.map(parseTodo);
  } catch (error) {
    console.error('Failed to fetch todos:', error);
    return [];
  }
};

// Create new todo
export const createTodo = async (todo: Omit<Todo, 'id'> & { id: string }): Promise<Todo> => {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(todo),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create todo');
  }

  const data = await response.json();
  return parseTodo(data);
};

// Update existing todo
export const updateTodo = async (
  id: string,
  updates: Partial<Pick<Todo, 'text' | 'completed'>>
): Promise<Todo> => {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...updates, updatedAt: new Date() }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update todo');
  }

  const data = await response.json();
  return parseTodo(data);
};

// Delete todo
export const deleteTodo = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete todo');
  }
};

// Clear all completed todos
export const clearCompletedTodos = async (): Promise<number> => {
  const response = await fetch(`${API_BASE_URL}/completed/all`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to clear completed todos');
  }

  const data = await response.json();
  return data.deletedCount;
};

// Toggle all todos
export const toggleAllTodos = async (completed: boolean): Promise<Todo[]> => {
  const response = await fetch(`${API_BASE_URL}/toggle-all/all`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to toggle todos');
  }

  const data = await response.json();
  return data.map(parseTodo);
};
```

**Verification:**
- TypeScript compiles without errors
- Backend server is running
- Ready for migration function (next batch)

---

## BATCH 8: Frontend Storage Layer - Migration Function
**Estimated Context: ~8k tokens | Time: 30 minutes**

### Task 8.1: Add localStorage Migration Function
**Files:** `src/utils/storage.ts` (append ~30 lines)
**Context Usage:** ~6k tokens
**Dependencies:** Batch 7 complete

**Action:** Append to `src/utils/storage.ts`:

```typescript
// Migration from localStorage to MongoDB
const MIGRATION_KEY = 'todos-migrated';
const OLD_STORAGE_KEY = 'todos-app-data';

export const migrateFromLocalStorage = async (): Promise<void> => {
  // Check if already migrated
  if (localStorage.getItem(MIGRATION_KEY)) {
    return;
  }

  try {
    // Read old localStorage data
    const oldData = localStorage.getItem(OLD_STORAGE_KEY);
    if (!oldData || oldData === '[]') {
      localStorage.setItem(MIGRATION_KEY, 'true');
      return;
    }

    const todos = JSON.parse(oldData);
    console.log(`Migrating ${todos.length} todos from localStorage...`);

    // Upload each todo to MongoDB
    for (const todo of todos) {
      await createTodo({
        id: todo.id,
        text: todo.text,
        completed: todo.completed,
        createdAt: new Date(todo.createdAt),
        updatedAt: new Date(todo.updatedAt),
      });
    }

    // Mark as migrated
    localStorage.setItem(MIGRATION_KEY, 'true');
    console.log('✅ Migration complete');

    // Optional: Keep old data as backup (don't delete)
    // localStorage.removeItem(OLD_STORAGE_KEY);
  } catch (error) {
    console.error('Migration failed:', error);
    // Don't set migration flag, will retry next time
  }
};
```

**Verification:**
- TypeScript compiles without errors
- Function exported from storage.ts

---

## BATCH 9: Frontend State Management - Fix localStorage Bug
**Estimated Context: ~15k tokens | Time: 60 minutes**

### Task 9.1: Refactor useTodos Hook - Core State Management
**Files:** `src/hooks/useTodos.ts` (major refactor, first half)
**Context Usage:** ~12k tokens
**Dependencies:** Batches 7-8 complete

**Action:** Read current `src/hooks/useTodos.ts` and make these changes:

**Step 1: Update imports**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { Todo, FilterType } from '../types';
import {
  fetchTodos,
  createTodo,
  updateTodo as updateTodoAPI,
  deleteTodo as deleteTodoAPI,
  clearCompletedTodos,
  toggleAllTodos,
  migrateFromLocalStorage,
} from '../utils/storage';
```

**Step 2: Add loaded state and fix the bug**

Replace lines 5-16 (old state and effects) with:
```typescript
export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loaded, setLoaded] = useState(false);

  // Load todos on mount (FIXES THE BUG)
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        // Run migration first
        await migrateFromLocalStorage();

        // Then fetch all todos from API
        const data = await fetchTodos();

        if (!cancelled) {
          setTodos(data);
          setLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load todos:', error);
        if (!cancelled) {
          setLoaded(true); // Still mark as loaded to show UI
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // REMOVE the old save useEffect (lines 14-16) - THIS WAS THE BUG!
  // Each operation now saves directly via API calls
```

**Verification:**
- Lines 14-16 (old save useEffect) are deleted
- New `loaded` state added
- Migration runs before fetching todos
- TypeScript compiles without errors

---

## BATCH 10: Frontend State Management - Async Operations
**Estimated Context: ~16k tokens | Time: 60 minutes**

### Task 10.1: Convert All Operations to Async API Calls
**Files:** `src/hooks/useTodos.ts` (continue refactor, second half)
**Context Usage:** ~14k tokens
**Dependencies:** Batch 9 complete

**Action:** Replace all callback functions (addTodo, toggleTodo, updateTodo, deleteTodo, clearCompleted, toggleAll):

```typescript
  const addTodo = useCallback(async (text: string) => {
    if (!text.trim()) return;

    try {
      const newTodo = await createTodo({
        id: crypto.randomUUID(),
        text: text.trim(),
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setTodos(prev => [newTodo, ...prev]);
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  }, []);

  const toggleTodo = useCallback(async (id: string) => {
    // Optimistic update
    const previousTodos = todos;
    setTodos(prev => prev.map(todo =>
      todo.id === id
        ? { ...todo, completed: !todo.completed, updatedAt: new Date() }
        : todo
    ));

    try {
      const todo = todos.find(t => t.id === id);
      if (todo) {
        await updateTodoAPI(id, { completed: !todo.completed });
      }
    } catch (error) {
      // Rollback on error
      setTodos(previousTodos);
      console.error('Failed to toggle todo:', error);
    }
  }, [todos]);

  const updateTodo = useCallback(async (id: string, text: string) => {
    if (!text.trim()) return;

    try {
      const updated = await updateTodoAPI(id, { text: text.trim() });
      setTodos(prev => prev.map(todo => (todo.id === id ? updated : todo)));
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    // Optimistic update
    const previousTodos = todos;
    setTodos(prev => prev.filter(todo => todo.id !== id));

    try {
      await deleteTodoAPI(id);
    } catch (error) {
      // Rollback on error
      setTodos(previousTodos);
      console.error('Failed to delete todo:', error);
    }
  }, [todos]);

  const clearCompleted = useCallback(async () => {
    // Optimistic update
    const previousTodos = todos;
    setTodos(prev => prev.filter(todo => !todo.completed));

    try {
      await clearCompletedTodos();
    } catch (error) {
      // Rollback on error
      setTodos(previousTodos);
      console.error('Failed to clear completed:', error);
    }
  }, [todos]);

  const toggleAll = useCallback(async () => {
    const allCompleted = todos.every(todo => todo.completed);
    const newCompletedState = !allCompleted;

    // Optimistic update
    const previousTodos = todos;
    setTodos(prev => prev.map(todo => ({
      ...todo,
      completed: newCompletedState,
      updatedAt: new Date(),
    })));

    try {
      const updatedTodos = await toggleAllTodos(newCompletedState);
      setTodos(updatedTodos);
    } catch (error) {
      // Rollback on error
      setTodos(previousTodos);
      console.error('Failed to toggle all:', error);
    }
  }, [todos]);

  // ... (filteredTodos and stats remain the same) ...

  return {
    todos: filteredTodos,
    filter,
    stats,
    loaded,  // NEW: export loading state
    setFilter,
    addTodo,
    toggleTodo,
    updateTodo,
    deleteTodo,
    clearCompleted,
    toggleAll,
  };
};
```

**Verification:**
- All functions are now async
- Optimistic updates with rollback on error
- `loaded` is returned from hook
- TypeScript compiles without errors

---

## BATCH 11: Frontend Components - App & Form
**Estimated Context: ~10k tokens | Time: 30 minutes**

### Task 11.1: Update App.tsx with Loading State
**Files:** `src/App.tsx` (minor changes, ~10 lines)
**Context Usage:** ~6k tokens
**Dependencies:** Batch 10 complete

**Action:** Read `src/App.tsx` and make these changes:

1. Destructure `loaded` from useTodos:
```typescript
const { todos, filter, stats, loaded, setFilter, addTodo, ... } = useTodos();
```

2. Add loading UI before the main content:
```typescript
if (!loaded) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">Loading todos...</p>
      </div>
    </div>
  );
}
```

**Verification:**
- App shows loading spinner while data loads
- TypeScript compiles without errors

---

### Task 11.2: Update TodoForm Component
**Files:** `src/components/TodoForm.tsx` (1-3 line change)
**Context Usage:** ~4k tokens

**Action:** Make `handleSubmit` async:

Change from:
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (inputValue.trim()) {
    onAddTodo(inputValue);
    setInputValue('');
  }
};
```

To:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (inputValue.trim()) {
    await onAddTodo(inputValue);
    setInputValue('');
  }
};
```

**Verification:**
- Form submits and calls async onAddTodo
- TypeScript compiles without errors

---

## BATCH 12: Frontend Components - Item & Stats
**Estimated Context: ~12k tokens | Time: 30 minutes**

### Task 12.1: Update TodoItem Component
**Files:** `src/components/TodoItem.tsx` (3-4 line changes)
**Context Usage:** ~7k tokens
**Dependencies:** Batch 11 complete

**Action:** Make all event handlers async:

```typescript
// Change these handlers to async:
const handleToggle = async () => {
  await onToggle(todo.id);
};

const handleSave = async () => {
  if (editedText.trim() && editedText !== todo.text) {
    await onUpdate(todo.id, editedText);
  }
  setIsEditing(false);
};

const handleDelete = async () => {
  await onDelete(todo.id);
};
```

**Verification:**
- All handlers are async
- TypeScript compiles without errors

---

### Task 12.2: Update TodoStats Component
**Files:** `src/components/TodoStats.tsx` (1-2 line changes)
**Context Usage:** ~5k tokens

**Action:** Make button handlers async:

```typescript
// Change these to async:
const handleClearCompleted = async () => {
  await onClearCompleted();
};

const handleToggleAll = async () => {
  await onToggleAll();
};
```

**Verification:**
- Handlers are async
- TypeScript compiles without errors

---

## BATCH 13: Development Environment Setup
**Estimated Context: ~8k tokens | Time: 20 minutes**

### Task 13.1: Configure Concurrent Development
**Files:** Root `package.json` (modify scripts)
**Context Usage:** ~6k tokens
**Dependencies:** All previous batches complete

**Action:**

1. Install concurrently:
```bash
npm install --save-dev concurrently
```

2. Update `package.json` scripts:
```json
{
  "scripts": {
    "dev": "concurrently -n \"CLIENT,SERVER\" -c \"cyan,magenta\" \"npm run dev:client\" \"npm run dev:server\"",
    "dev:client": "vite",
    "dev:server": "cd server && npm run dev",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  }
}
```

**Verification:**
- Run `npm run dev`
- Both servers start (Vite on :5173, Express on :3001)
- See colored output for each server

---

## BATCH 14: End-to-End Testing & Verification
**Estimated Context: ~10k tokens | Time: 45 minutes**

### Task 14.1: Complete Integration Testing
**No new files**
**Context Usage:** ~8k tokens
**Dependencies:** All batches complete

**Testing Checklist:**

1. **Server Health**
```bash
# Ensure both servers are running
npm run dev

# Test server health endpoint
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}
```

2. **CRUD Operations via UI**
- [ ] Open http://localhost:5173
- [ ] Loading spinner appears briefly
- [ ] Can add new todo
- [ ] Can mark todo as complete
- [ ] Can edit todo text
- [ ] Can delete todo
- [ ] Can use filters (All/Active/Completed)
- [ ] Can click "Check all" button
- [ ] Can click "Clear completed" button
- [ ] Stats update correctly (X of Y tasks remaining)
- [ ] Progress bar shows correct percentage

3. **Persistence Test**
- [ ] Add several todos with mixed complete/incomplete status
- [ ] Hard refresh page (Ctrl+Shift+R)
- [ ] Todos still appear after refresh
- [ ] Filter state persists

4. **MongoDB Verification**
```bash
mongosh
use todoflow
db.todos.find().pretty()
# Should show all todos from UI
db.todos.countDocuments()
# Should match count in UI
```

5. **Migration Test (if old localStorage data exists)**
- [ ] Open DevTools → Application → localStorage
- [ ] Check for `todos-migrated` flag
- [ ] If flag exists, migration already ran
- [ ] Old `todos-app-data` key preserved as backup

6. **Error Handling**
- [ ] Stop MongoDB server
- [ ] Try to add a todo - should show console error but not crash
- [ ] Restart MongoDB
- [ ] Refresh page - app should recover

7. **Performance Check**
- [ ] Network tab shows reasonable response times (<100ms for local API)
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] No console errors under normal operation

**Success Criteria:**
- ✅ All checklist items pass
- ✅ localStorage bug is fixed (data persists)
- ✅ MongoDB contains correct data
- ✅ UI is responsive and shows loading states
- ✅ Both servers start with single `npm run dev` command

---

## Implementation Summary

### Batch Overview

| Batch | Focus Area | Tasks | Est. Context | Est. Time | Status |
|-------|------------|-------|--------------|-----------|--------|
| 1 | Backend Foundation | 2 | ~6k tokens | 45 min | ⬜ Not Started |
| 2 | Backend Models | 2 | ~8k tokens | 30 min | ⬜ Not Started |
| 3 | API Routes Part 1 | 1 | ~12k tokens | 45 min | ⬜ Not Started |
| 4 | API Routes Part 2 | 1 | ~14k tokens | 45 min | ⬜ Not Started |
| 5 | Server Entry | 1 | ~10k tokens | 30 min | ⬜ Not Started |
| 6 | Backend Testing | 1 | ~8k tokens | 30 min | ⬜ Not Started |
| 7 | Storage API Client | 1 | ~12k tokens | 45 min | ⬜ Not Started |
| 8 | Storage Migration | 1 | ~8k tokens | 30 min | ⬜ Not Started |
| 9 | State Mgmt - Bug Fix | 1 | ~15k tokens | 60 min | ⬜ Not Started |
| 10 | State Mgmt - Async | 1 | ~16k tokens | 60 min | ⬜ Not Started |
| 11 | Components - App/Form | 2 | ~10k tokens | 30 min | ⬜ Not Started |
| 12 | Components - Item/Stats | 2 | ~12k tokens | 30 min | ⬜ Not Started |
| 13 | Dev Environment | 1 | ~8k tokens | 20 min | ⬜ Not Started |
| 14 | Testing & Verification | 1 | ~10k tokens | 45 min | ⬜ Not Started |
| **TOTAL** | **14 batches** | **18 tasks** | **~149k tokens** | **~9 hours** | |

### Critical Path

**Must complete in order:**
1. Batches 1-6: Backend (can test backend independently)
2. Batches 7-8: Storage layer (depends on backend running)
3. Batches 9-10: State management (depends on storage layer)
4. Batches 11-12: Components (depends on state management)
5. Batch 13: Dev environment (depends on everything)
6. Batch 14: Final testing (validates entire system)

**Parallel work opportunities:**
- While backend is being tested (Batch 6), can start planning storage layer (Batch 7)
- While working on App.tsx (Batch 11), can work on other components (Batch 12) in parallel

### Context Window Management

Each batch is designed to stay well under the 10% limit (~20k tokens):
- **Largest batch:** Batch 10 at ~16k tokens (8% of context)
- **Smallest batch:** Batch 1 at ~6k tokens (3% of context)
- **Average batch:** ~10.6k tokens (5.3% of context)

This allows comfortable room for:
- Reading existing files
- Claude's responses
- Error messages and debugging
- Tool outputs

### Phase 4: Verification

**Run through this checklist:**
- [ ] Server starts successfully and connects to MongoDB
- [ ] Frontend loads without console errors
- [ ] Can add new todos
- [ ] Can toggle todos complete/incomplete
- [ ] Can edit todo text
- [ ] Can delete todos
- [ ] Can use filters (All/Active/Completed)
- [ ] Can click "Check all" / "Uncheck all"
- [ ] Can click "Clear completed"
- [ ] Data persists after hard refresh (Ctrl+Shift+R)
- [ ] Old localStorage data migrates to MongoDB (if applicable)
- [ ] MongoDB contains correct data (verify with `mongosh`)

**MongoDB verification:**
```bash
mongosh
use todoflow
db.todos.find().pretty()  # Should show all todos
db.todos.countDocuments()  # Should match frontend count
```

## Data Migration Strategy

**Automatic migration on first load:**

The new `storage.ts` includes a `migrateFromLocalStorage()` function that:
1. Checks if migration already ran (via `todos-migrated` flag in localStorage)
2. Reads old data from `todos-app-data` key
3. Uploads each todo to MongoDB API
4. Sets migration flag to prevent re-running
5. Optionally clears old localStorage data

This runs automatically in `useTodos.ts` before loading todos from API, ensuring seamless transition for users with existing data.

## Technical Details

### API Endpoints

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| GET | `/api/todos` | Fetch all todos | - | `Todo[]` |
| POST | `/api/todos` | Create new todo | `{ text, completed, createdAt, updatedAt }` | `Todo` |
| PUT | `/api/todos/:id` | Update todo | `{ text?, completed?, updatedAt }` | `Todo` |
| DELETE | `/api/todos/:id` | Delete todo | - | `{ success: true }` |
| DELETE | `/api/todos/completed` | Clear completed | - | `{ deletedCount: number }` |
| PUT | `/api/todos/toggle-all` | Toggle all | `{ completed: boolean }` | `Todo[]` |

### Data Schema

**Todo interface (unchanged):**
```typescript
{
  id: string,           // UUID (client-generated)
  text: string,
  completed: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**MongoDB document:**
```javascript
{
  _id: ObjectId,        // MongoDB auto-generated (ignored by frontend)
  id: String,           // UUID from frontend (indexed, unique)
  text: String,
  completed: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### CORS Configuration

Server allows requests from Vite dev server:
```typescript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

### Error Handling

**Backend:**
- Mongoose validation errors → 400 Bad Request
- Not found errors → 404 Not Found
- Server errors → 500 Internal Server Error

**Frontend:**
- Log errors to console (sufficient for POC)
- Optimistic updates: Show change immediately, rollback on error
- Loading states: Show spinner while data loads

## Estimated Time

- Backend setup: 2-3 hours
- Frontend refactoring: 2-3 hours
- Integration & testing: 1-2 hours
- **Total: 6-9 hours**

## Rollback Plan

If migration fails:
1. Stop both servers
2. Restore backed-up `src/utils/storage.ts` and `src/hooks/useTodos.ts`
3. Remove `loaded` references from `App.tsx`
4. Start frontend only: `npm run dev:client`
5. Data is preserved in localStorage (unless explicitly cleared)

## Dependencies

**New root dependencies:**
```json
{
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

**New server dependencies:**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "mongoose": "^8.0.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.6",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

## Success Criteria

The migration is complete when:
1. ✅ All CRUD operations work via MongoDB
2. ✅ localStorage persistence bug is fixed
3. ✅ Data persists across page refreshes
4. ✅ Old localStorage data migrates automatically
5. ✅ Both servers start with single `npm run dev` command
6. ✅ No console errors under normal operation
7. ✅ MongoDB can be inspected with mongosh to verify data

## Quick Reference Guide

### When Working on Each Batch

**Before starting any batch:**
1. Check dependencies - ensure previous batches are complete
2. Verify MongoDB is running: `mongod` or check with `mongosh`
3. Note estimated context usage for the batch
4. Have the Technical Details section open for reference

**When asking Claude Code for help:**
- Mention the specific batch number (e.g., "I'm working on Batch 3")
- Provide the estimated context usage if needed
- Reference the task number (e.g., "Task 3.1")

**Example prompts for Claude Code:**
```
"Help me implement Batch 1, Task 1.1: Initialize Server Project Structure"

"I'm on Batch 9 (Fix localStorage Bug). The current useTodos.ts has X lines.
Help me refactor it to add the loaded state and fix the bug."

"Batch 14 - I've completed all batches. Help me run the end-to-end testing checklist."
```

### File Dependencies at a Glance

```
Backend Dependencies:
server/package.json → server/tsconfig.json → all server files
server/src/config/database.ts → used by server/src/index.ts
server/src/models/Todo.ts → used by server/src/routes/todos.ts
server/src/middleware/errorHandler.ts → used by server/src/index.ts
server/src/routes/todos.ts → mounted in server/src/index.ts

Frontend Dependencies:
src/utils/storage.ts → used by src/hooks/useTodos.ts
src/hooks/useTodos.ts → used by src/App.tsx
src/App.tsx → uses all components (TodoForm, TodoItem, TodoFilter, TodoStats)
```

### Common Issues & Solutions

**Issue:** "Cannot find module './config/database.js'"
- **Solution:** Ensure file extension is `.ts` and TypeScript is configured correctly
- Check `server/tsconfig.json` has `"moduleResolution": "bundler"`

**Issue:** "MongoDB connection failed"
- **Solution:** Ensure MongoDB is running: `mongod` in a separate terminal
- Check connection string: `mongodb://localhost:27017/todoflow`

**Issue:** "CORS error in browser"
- **Solution:** Verify server has CORS middleware with correct origin: `http://localhost:5173`
- Ensure both servers are running on correct ports

**Issue:** "TypeError: Cannot read property 'map' of undefined"
- **Solution:** Ensure `fetchTodos()` returns empty array on error, not undefined
- Check that `todos` state is initialized as `[]`

**Issue:** "Data not persisting after refresh"
- **Solution:** This is the localStorage bug! Ensure Batch 9 is complete
- Verify `loaded` state is used to prevent early saves
- Check that save useEffect is deleted

**Issue:** "Migration runs on every page load"
- **Solution:** Check that `todos-migrated` flag is set in localStorage
- Verify migration function checks for this flag before running

### Rollback Instructions

**If you need to rollback at any point:**

1. **Batches 1-6 (Backend only):**
   - Simply stop the server: Ctrl+C
   - Delete `server/` directory
   - No impact on frontend

2. **Batches 7-8 (Storage layer):**
   - Restore backup: `cp src/utils/storage.ts.backup src/utils/storage.ts`
   - Old localStorage data is preserved

3. **Batches 9-10 (State management):**
   - Restore backup: `cp src/hooks/useTodos.ts.backup src/hooks/useTodos.ts`
   - Revert storage.ts as well (step 2)

4. **Batches 11-12 (Components):**
   - Components only have 1-3 line changes - easy to manually revert
   - Or restore from git: `git checkout src/App.tsx src/components/*.tsx`

5. **Full rollback to localStorage:**
   - Delete `server/` directory
   - Restore all backups
   - Remove `loaded` references from App.tsx
   - Start only frontend: `npm run dev:client`

### Batch Completion Checklist

After completing each batch, verify:
- [ ] TypeScript compiles without errors: `npm run build` (or `tsc --noEmit`)
- [ ] No console errors
- [ ] Batch-specific verification passes (see each batch's "Verification" section)
- [ ] Git commit (optional but recommended): `git add . && git commit -m "Complete Batch X"`

---

## Notes for Production (Out of Scope)

This POC intentionally omits:
- User authentication/authorization
- Rate limiting
- Input sanitization beyond basic validation
- HTTPS/CSRF protection
- Error retry logic
- Offline support
- Connection pooling optimization
- Logging and monitoring
- Docker deployment
- CI/CD pipeline

These would add 2-4 weeks of work for production readiness.

---

## Appendix: Context Usage Breakdown

### Why Context Management Matters

Claude Code has a 200k token context window. Each conversation turn consumes tokens for:
- System prompts and tools (~25k tokens)
- Conversation history
- Files you're working with
- Your messages and Claude's responses

By keeping each batch under 10% (~20k tokens), you ensure:
- ✅ Fast response times
- ✅ No context limit errors
- ✅ Ability to have back-and-forth conversations
- ✅ Room for debugging and error messages

### Estimated Token Usage by Batch

| Batch | Files Read | Files Written | Code + Prompts | Total Est. |
|-------|-----------|---------------|----------------|------------|
| 1 | 0 | 4 small | ~4k | ~6k |
| 2 | 1 | 2 medium | ~5k | ~8k |
| 3 | 2 | 1 large | ~8k | ~12k |
| 4 | 1 | 1 (append) | ~10k | ~14k |
| 5 | 3 | 1 medium | ~6k | ~10k |
| 6 | 0 | 0 (testing) | ~6k | ~8k |
| 7 | 2 | 1 large | ~8k | ~12k |
| 8 | 1 | 1 (append) | ~5k | ~8k |
| 9 | 2 | 1 (refactor) | ~10k | ~15k |
| 10 | 1 | 1 (continue) | ~12k | ~16k |
| 11 | 2 | 2 small | ~6k | ~10k |
| 12 | 2 | 2 small | ~8k | ~12k |
| 13 | 1 | 1 tiny | ~5k | ~8k |
| 14 | 0 | 0 (testing) | ~8k | ~10k |

**Average per batch:** ~10.6k tokens (well under 20k limit)

---

## Getting Started

Ready to begin? Start with **Batch 1**:

```bash
# Open your terminal in the project directory
cd D:\0602demo

# Tell Claude Code:
"I'm ready to start the database migration. Let's begin with Batch 1:
Backend Foundation Setup. Please help me with Task 1.1: Initialize
Server Project Structure."
```

Good luck! 🚀

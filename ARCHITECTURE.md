# TodoFlow Architecture Diagrams

## 1. Component Hierarchy

```
App.tsx (Smart Component)
│
├─ Uses: useTodos() hook
│   └─ Returns: {todos, filter, stats, setFilter, addTodo, toggleTodo, updateTodo, deleteTodo, clearCompleted, toggleAll}
│
└─ Renders:
    │
    ├─ TodoForm
    │   └─ Props: onAddTodo
    │   └─ Local State: text (input value)
    │
    ├─ TodoStats (conditional: if stats.total > 0)
    │   └─ Props: stats, onClearCompleted, onToggleAll
    │
    ├─ TodoFilter (conditional: if stats.total > 0)
    │   └─ Props: currentFilter, onFilterChange, stats
    │
    └─ TodoItem[] (mapped from todos array)
        └─ Props: todo, onToggle, onUpdate, onDelete
        └─ Local State: isEditing, editText
```

## 2. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         useTodos Hook                        │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ State:                                                  │ │
│  │  • todos: Todo[]                                        │ │
│  │  • filter: FilterType ('all' | 'active' | 'completed') │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Effects:                                                │ │
│  │  • useEffect(() => loadTodos(), [])     <- on mount    │ │
│  │  • useEffect(() => saveTodos(todos), [todos]) <- sync  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Computed:                                               │ │
│  │  • filteredTodos (based on filter state)               │ │
│  │  • stats {total, active, completed}                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Operations (useCallback):                               │ │
│  │  • addTodo(text)                                        │ │
│  │  • toggleTodo(id)                                       │ │
│  │  • updateTodo(id, text)                                 │ │
│  │  • deleteTodo(id)                                       │ │
│  │  • clearCompleted()                                     │ │
│  │  • toggleAll()                                          │ │
│  │  • setFilter(filter)                                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          ↓
                    ┌──────────┐
                    │ App.tsx  │
                    └──────────┘
                          │
        ┌─────────────────┼─────────────────┬──────────────┐
        ↓                 ↓                  ↓              ↓
    TodoForm          TodoStats          TodoFilter    TodoItem[]
        │                 │                  │              │
        └─────────────────┴──────────────────┴──────────────┘
                          │
                    User Actions
                          │
                          ↓
              Callbacks flow back up to useTodos
                          │
                          ↓
                   State Updates
                          │
                          ↓
               localStorage Sync (automatic)
```

## 3. State Update Flow

```
User Action (e.g., "Add Todo")
    │
    ↓
Component calls callback prop
    │  (e.g., onAddTodo("Buy milk"))
    ↓
Callback invokes useTodos function
    │  (e.g., addTodo("Buy milk"))
    ↓
setTodos() updates state
    │  (creates new todo with crypto.randomUUID())
    ↓
useEffect detects todos change
    │
    ↓
saveTodos() called
    │
    ↓
localStorage.setItem('todos-app-data', JSON.stringify(todos))
    │
    ↓
React re-renders with new state
    │
    ↓
Filtered todos recalculated
    │
    ↓
Components receive new props
    │
    ↓
UI updates
```

## 4. Storage Layer Flow

```
┌────────────────────────────────────────────────────────┐
│              src/utils/storage.ts                       │
├────────────────────────────────────────────────────────┤
│                                                         │
│  saveTodos(todos: Todo[])                              │
│    │                                                    │
│    ├─ Serializes todos array to JSON                   │
│    ├─ Stores in localStorage with key 'todos-app-data' │
│    └─ Error handling (console.error on failure)        │
│                                                         │
│  loadTodos(): Todo[]                                   │
│    │                                                    │
│    ├─ Retrieves from localStorage                      │
│    ├─ Parses JSON                                      │
│    ├─ Converts date strings → Date objects             │
│    │    • createdAt: string → Date                     │
│    │    • updatedAt: string → Date                     │
│    └─ Returns empty array on error                     │
│                                                         │
└────────────────────────────────────────────────────────┘
```

## 5. Todo Data Model

```
interface Todo {
  id: string           // Generated by crypto.randomUUID()
  text: string         // The todo text content
  completed: boolean   // Completion status
  createdAt: Date      // Creation timestamp
  updatedAt: Date      // Last modification timestamp
}

type FilterType = 'all' | 'active' | 'completed'
```

## 6. File Structure Map

```
src/
├── main.tsx                    # App entry point
├── App.tsx                     # Main container component (uses useTodos)
├── index.css                   # Global styles + Tailwind imports
├── vite-env.d.ts              # Vite type definitions
│
├── types/
│   └── index.ts               # Todo & FilterType interfaces
│
├── hooks/
│   └── useTodos.ts            # Central state management hook
│
├── utils/
│   └── storage.ts             # localStorage abstraction layer
│
└── components/                # Presentational components
    ├── TodoForm.tsx           # Input form for new todos
    ├── TodoItem.tsx           # Individual todo item (with edit mode)
    ├── TodoFilter.tsx         # Filter buttons (all/active/completed)
    └── TodoStats.tsx          # Statistics display + bulk actions
```

## 7. Key Design Patterns

### Custom Hook Pattern
- **useTodos** encapsulates all state logic, effects, and operations
- Returns interface with state + operations
- Consumers (App.tsx) don't manage state directly

### Props Down, Events Up
- Data flows down as props
- User actions flow up as callback invocations
- No prop drilling (only 1 level deep: App → Components)

### Single Source of Truth
- All todo state lives in useTodos hook
- localStorage is kept in sync automatically via useEffect
- No duplicate state across components

### Presentational vs Container Pattern
- **Container** (App.tsx): Connects data to UI
- **Presentational** (components/*): Receive props, render UI, call callbacks
- Clear separation of concerns

### Optimized Re-renders
- useCallback for all operations (prevents unnecessary child re-renders)
- Local component state for transient UI (editing, form inputs)
- Only todos state changes trigger global re-renders

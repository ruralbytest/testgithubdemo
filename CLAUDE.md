# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TodoFlow is a React-based todo application with TypeScript, Vite, and Tailwind CSS. The app emphasizes beautiful, production-grade UI design with gradients, backdrop blur effects, and smooth transitions. Data is persisted in browser localStorage.

## Development Commands

```bash
# Start development server (default: http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

## Important Guidelines

- **File deletions**: Always ask for explicit permission before deleting any file.

## Architecture

### State Management Pattern
The app uses a custom hook architecture for state management rather than external libraries like Redux:

- **`src/hooks/useTodos.ts`**: Central state management hook that encapsulates all todo operations (CRUD, filtering, statistics). This hook manages todos array state, localStorage sync via effects, and provides memoized callback functions to prevent unnecessary re-renders.
- **Filter logic**: Lives in `useTodos` - it filters the todos array based on current filter state before returning to consumers.
- **Statistics computation**: Computed inline within `useTodos` and returned as a `stats` object with total, active, and completed counts.

### Data Flow
1. `App.tsx` consumes `useTodos()` hook which returns all state and operations
2. Props flow down to presentational components (`TodoForm`, `TodoItem`, `TodoFilter`, `TodoStats`)
3. User actions trigger callbacks passed as props, which update state in `useTodos`
4. State changes trigger localStorage persistence automatically via `useEffect` in `useTodos`

### Component Structure
- **Presentational components** (`src/components/*.tsx`): Pure UI components that receive data and callbacks via props
- **Smart component** (`App.tsx`): Container that wires up the `useTodos` hook to presentational components
- **No component-level state management**: Components only maintain local UI state (e.g., `isEditing`, form input values)

### Storage Layer
`src/utils/storage.ts` provides localStorage abstraction with serialization/deserialization, including Date object conversion. All persistence logic is isolated here, making it easy to swap storage backends.

## Technology Stack

- **Build tool**: Vite with React plugin
- **UI**: React 18 + TypeScript
- **Styling**: Tailwind CSS (with custom gradient themes)
- **Icons**: Lucide React (never install additional icon packages)
- **State**: Custom hooks with localStorage persistence

## Design Philosophy

This project was created with specific design instructions (see `.bolt/prompt`):

- **Beautiful, non-cookie-cutter designs**: Use gradients, backdrop blur, smooth transitions, and modern UI patterns
- **Production-ready features**: Fully functional components with polish
- **Default stack only**: Avoid installing additional packages for UI themes or icons unless absolutely necessary - use Tailwind + Lucide React
- **Lucide React for all icons**: Use `lucide-react` package exclusively for icons and logos

When adding features:
- Match the existing gradient color scheme (blue-500 to indigo-600)
- Use Tailwind's backdrop-blur and shadow utilities
- Apply smooth transitions (`transition-all duration-200`)
- Maintain the rounded-xl/rounded-2xl border radius style
- Keep the glassmorphism aesthetic (white/opacity with backdrop blur)

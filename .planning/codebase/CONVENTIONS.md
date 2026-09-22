# Codebase Conventions

This document outlines the coding standards, naming conventions, and architectural patterns followed in the RRCafe project.

## Architecture & Organization

*   **Monorepo Structure**: The repository uses npm workspaces to manage a monorepo setup.
    *   `apps/`: Contains the frontend applications (`admin`, `customer`, `delivery`).
    *   `packages/`: Contains shared libraries and utilities (e.g., `shared`).
*   **Frameworks**: The applications are built with **React** and bundled using **Vite**.
*   **Routing**: Client-side routing is handled using `react-router-dom`.
*   **Styling**: **Tailwind CSS (v4)** is used for styling, applied primarily via inline `className` attributes.
*   **Backend / BaaS**: **Supabase** is used for backend services, including authentication and database operations.
*   **Icons**: `lucide-react` is the standardized icon library.

## Naming Conventions

*   **React Components**: Use `PascalCase` for component files and function names (e.g., `ConfirmModal.tsx`, `Menu.tsx`).
*   **Pages and Layouts**: Use `PascalCase`, placed within the `src/pages/` and `src/layouts/` directories respectively.
*   **Contexts**: Use `PascalCase` with a `Context` suffix for React Context providers (e.g., `AuthContext.tsx`, `CartContext.tsx`).
*   **Utilities & Configuration Files**: Use `camelCase` or `kebab-case` depending on standard conventions (e.g., `supabase.ts`, `vite.config.ts`).
*   **File Extensions**: 
    *   `.tsx`: For files containing React components and JSX.
    *   `.ts`: For plain TypeScript utility functions, API calls, and configurations.

## State Management

*   **Local State**: Managed via standard React hooks (`useState`, `useEffect`).
*   **Global State**: Handled using React Context API (`src/contexts/`), typically grouped by domain (e.g., Auth, Cart).

## Typing

*   **TypeScript**: Interfaces are commonly defined within the same file as the component that consumes them, using `PascalCase` (e.g., `interface MenuItem { ... }`).
*   Cross-app types and models should be extracted to `packages/shared/` as the project grows.

## Linting

*   **Oxlint**: The project utilizes `oxlint` for fast, convention-based linting.

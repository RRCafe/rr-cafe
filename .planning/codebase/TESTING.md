# Testing

This document outlines the test frameworks, coverage, and organization for the RRCafe project.

## Current State

*   **Frameworks**: Currently, no formal testing framework (such as Vitest, Jest, or Cypress) is configured for the applications.
*   **Test Coverage**: The project currently has **0% test coverage** for application code. There are no test files (`*.test.ts`, `*.spec.ts`) present in the `apps/` or `packages/` directories.

## Future Testing Strategy (Recommended)

When introducing tests to this codebase, the following conventions should be adopted:

*   **Unit & Component Testing**: Use **Vitest** (given the Vite-based architecture) along with **React Testing Library** for component rendering and interaction testing.
*   **File Naming**: Test files should be named alongside the components they test, using the `*.test.tsx` or `*.test.ts` convention (e.g., `Menu.test.tsx`).
*   **Test Organization**: 
    *   For unit tests, place the test file in the same directory as the target file or inside a `__tests__` folder.
    *   For integration or end-to-end tests, a dedicated tool like **Playwright** or **Cypress** should be configured with a separate `e2e` directory at the app root.

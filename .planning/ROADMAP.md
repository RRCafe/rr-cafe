# Project Roadmap

## Phase 1: Security & Technical Debt Remediation
- Fix Razorpay payment payload verification to use HMAC signatures.
- Remove hardcoded Supabase Service Role JWTs from scripts.
- Refactor RLS policies to use role-based claims instead of hardcoded emails.
- Refactor payment verification edge function to use a transactional Postgres RPC.
- Clean up root directory scripts.

## Phase 2: Performance & Architecture Improvements
- Optimize image serving (resizing/WebP).
- Implement lazy-loading for heavy dependencies (e.g., Google Maps).
- Migrate shared types and UI components to the `packages/shared` workspace.

## Phase 3: Testing & Quality Assurance
- Setup Vitest and React Testing Library.
- Write unit tests for critical paths (e.g., checkout orchestration, cart state).
- Implement E2E testing for the three applications.

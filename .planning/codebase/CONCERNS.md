# Codebase Concerns

This document outlines the technical debt, security issues, performance bottlenecks, and areas for improvement found in the RR Cafe codebase.

## 1. Security Issues

### Tamperable Payment Payload (Critical)
In the `verify-razorpay-payment` edge function, the `verified_payload` (containing pricing, items, and delivery address) is accepted directly from the client request. Although the `create-razorpay-order` function computes this payload securely, bouncing it through the client allows a malicious user to intercept and modify the payload before verification. As long as the `grand_total` matches the Razorpay payment amount, the tampered data will be stored in the database.
**Fix**: The server must either cryptographically sign the `verified_payload` using HMAC before sending it to the client, or store the pre-order data in a staging database table/Redis cache.

### Hardcoded Service Role JWTs
Several test files in the root directory (`test_rls.py`, `test_query.py`, `test_columns.py`) contain hardcoded Supabase Service Role JWTs.
**Fix**: Revoke the leaked JWTs immediately and manage secrets strictly via `.env` files.

### Admin Bypass in Row Level Security (RLS)
Supabase migration scripts (e.g., `20260819134500_fix_all_admin_selects.sql`) hardcode a specific email address (`ashraqmohideen@gmail.com`) to bypass RLS policies.
**Fix**: Implement proper Role-Based Access Control (RBAC). Use custom JWT claims or an `admin` table query instead of hardcoding developer emails in database policies.

## 2. Technical Debt

### Non-Transactional Database Writes
The `verify-razorpay-payment` edge function inserts records into three separate tables (`orders`, `order_items`, and `payments`) using sequential RPC calls rather than a single database transaction. If one query fails, it risks creating partial, inconsistent data.
**Fix**: Refactor this logic into a Supabase Postgres function (RPC) to guarantee atomicity and rollback on failure.

### Cluttered Root Directory
The repository root is polluted with dozens of temporary, patch, and test scripts (`patch_*.py`, `rewrite_*.js`, `fix_*.py`, `test_*.py`). While many are git-ignored, they create a cluttered workspace.
**Fix**: Move all temporary or utility scripts to a dedicated `scripts/` or `scratch/` directory.

### Monolithic Components
Components like `Cart.tsx` handle excessive responsibilities, including cart rendering, complex distance calculation, and Razorpay payment orchestration.
**Fix**: Decouple the logic into custom hooks (e.g., `useCheckout`, `useDistanceCalculator`).

## 3. Performance Bottlenecks

### Unoptimized Images
Menu images are loaded directly from Supabase Storage via standard `<img src={...}>` tags without transformation. High-resolution unoptimized images will degrade performance, particularly on mobile clients.
**Fix**: Utilize Supabase Image Transformations to resize and convert images to efficient formats (like WebP) on the fly.

### Bundle Size & Map Loading
The Google Maps library (`@vis.gl/react-google-maps`) is loaded synchronously. If pages without map functionality import the same bundles, it delays the initial load time.
**Fix**: Lazy load heavy components like Maps to minimize initial bundle size.

## 4. Areas for Improvement

### Shared Workspace Utilization
The project uses a monorepo setup, but the `packages/shared` workspace is effectively empty.
**Action**: Extract shared Supabase database types, common utility functions, and shared UI components (buttons, modals) into the `shared` package to DRY up the `admin`, `customer`, and `delivery` apps.

### Automated Testing
There are currently no unit tests or end-to-end tests evident in the frontend apps or edge functions.
**Action**: Introduce Vitest/Jest for core logic (like price calculations) and Cypress/Playwright for critical flows (like the checkout process).

### Database Migrations Management
The database schema is distributed across multiple fix scripts and an `initial_schema.sql`.
**Action**: Consolidate and squash the migrations into a clean, reproducible history to make local database resetting and CI/CD smoother.

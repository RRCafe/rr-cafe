# Requirements

## Core Features
1. **Admin Dashboard**: Manage menu items, view live orders, handle billing, and manage delivery partners.
2. **Customer Experience**: Browse menu, cart management, checkout with Razorpay integration, and real-time order tracking.
3. **Delivery Partner Workflow**: Onboarding process, order assignment, routing (via Google/Ola maps), and status updates.
4. **Backend Infrastructure**: Secure data access (RLS), real-time updates for orders, and serverless edge functions for payments and delivery fee calculations.

## Non-Functional Requirements
- **Security**: Secure payment payload verification, proper RLS policies (avoid hardcoded emails), and secure handling of JWTs.
- **Performance**: Lazy-loading for heavy libraries, optimized image serving.
- **Code Quality**: Shared logic should be moved to `packages/shared`, and a testing framework (Vitest) should be introduced to increase test coverage.

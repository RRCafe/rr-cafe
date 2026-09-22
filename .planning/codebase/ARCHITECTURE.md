# Architecture of RRCafe

## High-Level System Architecture
RRCafe is a monorepo application containing three distinct front-end applications that interact with a unified backend powered by Supabase. 

### Frontend (Apps Layer)
The frontend is split into three separate React applications, each tailored for a specific user role. They are built using Vite, TypeScript, and TailwindCSS (v4) for styling. 
1. **Admin App (`apps/admin`)**: A dashboard for cafe owners/managers to manage live orders, billing, menu items, delivery partners, and general settings.
2. **Customer App (`apps/customer`)**: An online ordering interface for customers to view the menu, add items to the cart, checkout, and track their orders.
3. **Delivery App (`apps/delivery`)**: An interface for delivery partners to manage their active deliveries, view earnings, and handle onboarding/KYC.

**Cross-Platform Support**: All applications utilize Capacitor (`@capacitor/core`, `@capacitor/android`) to enable cross-platform native deployment, specifically for Android.
**State Management**: React Context API is heavily utilized across the apps for managing global states (e.g., `AuthProvider`, `CartProvider`).
**Maps and Routing**: Integrated with `@vis.gl/react-google-maps` for tracking and route calculations.

### Backend (Supabase Layer)
The backend is completely serverless, relying on Supabase for data storage, authentication, realtime subscriptions, and business logic via edge functions.

- **Database Structure**: PostgreSQL is used with a carefully designed schema that defines users (`profiles`), items (`menu_items`, `categories`), lifecycle (`orders`, `order_items`), payments, and config (`pricing_config`).
- **Access Control (RLS)**: Row Level Security (RLS) policies are extensively applied to secure data. The system categorizes users into three roles: `owner`, `customer`, and `delivery_partner`. Access boundaries are strictly maintained using these roles.
- **Realtime**: Supabase Realtime is used for live data updates, specifically for the `orders` and `delivery_partners` tables, ensuring that the admin dashboard and order tracking remain synced without polling.
- **Edge Functions**: Used for secure, server-side operations that should not be exposed to the client:
  - `calculate-delivery-fee`: Dynamically computes delivery charges.
  - `create-razorpay-order`: Initiates payment orders securely with Razorpay.
  - `verify-razorpay-payment`: Handles payment verification via webhooks.

## Design Patterns
1. **Monorepo Pattern**: npm workspaces separate concerns between different apps while allowing potential code-sharing via `packages/`.
2. **Role-Based Routing and Layouts**: The applications apply specific layout wrappers (e.g., `DashboardLayout`, `CustomerLayout`) and contexts based on user authentication and roles.
3. **Serverless & Edge Compute**: Offloading secure operations (payments, fee calculations) to Supabase Edge Functions.

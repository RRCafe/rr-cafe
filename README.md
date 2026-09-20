# RR Cafe — Food Delivery Platform

A monorepo containing three React applications (Admin, Customer, Delivery Partner) backed by Supabase. The system supports dine-in, dine-out (takeaway), and delivery order types across two business lines: cafe and wholesale ice cream.

---

## ⚠️ CRITICAL — Read This First

**If you're an LLM agent continuing this project:**

### 1. 🔴 Payment System is Broken

`supabase/functions/verify-razorpay-payment/index.ts:55` attempts to write `gateway_payment_id`, but migration `20260819034646_drop_columns.sql:28-29` dropped this column. **Every payment verification fails with a 400 error**, orders stay stuck in `pending` status, and customers see their paid orders vanish from the order list.

**Fix:** Remove `gateway_payment_id` from line 55, or use `razorpay_payment_id` directly.

### 2. 🔴 Git History is Meaningless

Most of the application code is **uncommitted** to git. The repository has only 2 real commits (`92c48f4`, `c885031`), and the tracked files represent ~20% of the working codebase. Key uncommitted files:
- Entire customer app beyond scaffold (Cart, OrderTracker, CustomerOrders, ProfileSetup)
- Entire delivery app beyond scaffold (Dashboard, Onboarding, Orders, Account)
- Admin: Orders, Billing, DeliveryPartners, DeliveryPartnerDetails, ConfirmModal, DirectionsRoute
- 13 of 14 Supabase migrations
- This README

**Do not rely on `git log` or `git show` to understand the codebase. Read the working tree directly.**

### 3. 🔴 Schema Drift — Migrations Don't Match Reality

The migrations define a `profiles` table with a `role` enum, but the **live application uses three separate tables**: `customer`, `owner`, and `delivery_partners`. The migrations reference these tables (starting from `20260819034646_drop_columns.sql`) but **never CREATE them**.

Running `supabase db reset` on a fresh database will fail. The real schema exists only in the hosted Supabase instance.

Missing definitions:
- `customer` table (referenced by 6 migrations, queried by all apps)
- `owner` table (referenced by 5 migrations, required for admin auth)
- `delivery_partners` columns: `name`, `phone_number`, `email`, `dob`, `gender`, `address`, `avatar_url`, `vehicle_name`, `vehicle_number`
- `increment_partner_earnings(partner_id, amount)` RPC function (called by `Dashboard.tsx:113`)

### 4. 🔴 Exposed Secrets in Git History

`.env.example` (commit `92c48f4`) contains **real credentials**:
- Supabase `SUPABASE_SERVICE_ROLE_KEY` (bypasses all RLS)
- `RAZORPAY_KEY_SECRET`
- `GOOGLE_OAUTH_CLIENT_SECRET`

These cannot be removed by editing the file — they're in the git history permanently. **All must be rotated immediately.**

Additionally, `supabase/functions/create-razorpay-order/index.ts:19-20` hardcodes live Razorpay credentials as fallback values in source code.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Tech Stack](#tech-stack)
4. [Database Schema](#database-schema)
5. [Environment Configuration](#environment-configuration)
6. [Admin Dashboard](#admin-dashboard)
7. [Customer App](#customer-app)
8. [Delivery Partner App](#delivery-partner-app)
9. [Supabase Backend](#supabase-backend)
10. [Shared Package](#shared-package)
11. [Build & Run Commands](#build--run-commands)
12. [Known Gaps & Continuation](#known-gaps--continuation)
13. [Security Notes](#security-notes)

---

## Architecture Overview

```
                     ┌─────────────────────┐
                     │     Supabase        │
                     │  (PostgreSQL +      │
                     │   Realtime + Edge   │
                     │   Functions)        │
                     └──────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
 ┌──────▼──────┐        ┌───────▼───────┐        ┌───────▼─────────┐
 │ Admin Web   │        │ Customer App  │        │ Delivery Partner│
 │ Dashboard   │        │(PWA/Capacitor)│        │ (PWA/Capacitor) │
 └─────────────┘        └───────────────┘        └─────────────────┘
```

- **One database** shared by all three clients
- **Supabase Realtime** channels for live order updates
- **Supabase Edge Functions** for delivery fee calculation and payment processing

---

## Project Structure

```
RRCafe/
├── apps/
│   ├── admin/          # Admin dashboard (web)
│   ├── customer/       # Customer ordering app (PWA/Capacitor)
│   └── delivery/       # Delivery partner app (PWA/Capacitor)
├── packages/
│   └── shared/         # Shared types/constants (currently empty)
├── supabase/
│   ├── migrations/     # SQL schema migrations (21 files)
│   ├── functions/      # Edge Functions (3)
│   ├── config.toml     # Supabase local config
│   └── .env            # Supabase secrets
└── package.json        # npm workspaces root
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, React Router v7, Vite, Tailwind CSS v4 |
| Mobile | Capacitor 8 (customer & delivery apps only) |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) |
| Auth | Email/password (admin), Google OAuth (customer & delivery) |
| Maps | Google Maps (@vis.gl/react-google-maps), Ola Maps API |
| Payments | Razorpay |
| Delivery Routing | Ola Maps API with straight-line fallback |
| Notifications | Browser Notification API |

---

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles linked to Supabase Auth (role: owner, customer, delivery_partner) |
| `pricing_config` | Delivery fee configuration (base fee, per-km rate, platform fee, free delivery threshold) |
| `categories` | Menu categories with business_type (cafe / wholesale_icecream) |
| `menu_items` | Menu items with price, veg/non-veg, availability, image |
| `orders` | Orders with status lifecycle, pricing breakdown, delivery coordinates |
| `order_items` | Line items for each order |
| `payments` | Razorpay payment records |
| `delivery_partners` | Partner details, KYC, vehicle info, status, location, earnings |

### Order Statuses

```
placed → accepted → preparing → ready → out_for_delivery → delivered
                                                      ↓
                                                   cancelled
```

### Order Types

- `dine_in` — customer eats on premises
- `dine_out` — customer takes away
- `delivery` — home delivery via partner

### Business Types

- `cafe` — regular cafe items
- `wholesale_icecream` — bulk ice cream orders

### Pricing Breakdown (per order)

| Field | Description |
|-------|-------------|
| `items_subtotal` | Sum of menu item prices |
| `calculated_distance_km` | Distance from cafe to delivery address |
| `customer_delivery_charge` | Total charged to customer (base + distance + platform fee) |
| `partner_commission` | Amount paid to delivery partner (base + distance) |
| `owner_platform_fee` | Hidden margin retained by owner |
| `grand_total` | Final amount paid |

---

## Environment Configuration

### Required Environment Variables

Create `.env` files in the root and/or each app:

```bash
# Supabase (required by all apps)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Razorpay (customer app checkout)
VITE_RAZORPAY_KEY_ID=rzp_test_...

# Google Maps (all apps for map display)
VITE_GOOGLE_MAPS_API_KEY=AIza...

# Ola Maps (delivery routing)
VITE_OLA_MAPS_API_KEY=...
```

### Root `.env` (Supabase CLI)

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Google OAuth Setup

Google OAuth credentials are shared across customer and delivery apps. Configure in Supabase Dashboard: **Authentication → Providers → Google**.

---

## Admin Dashboard

**Location:** `apps/admin/`

### Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/login` | `Login.tsx` | Owner email/password login |
| `/` | `DashboardLayout` | Main layout with sidebar |
| `/` (index) | `LiveOrders.tsx` | Live order board (Kanban-style) |
| `/menu` | `MenuManager.tsx` | Menu CRUD, categories, availability |
| `/billing` | `Billing.tsx` | POS-style order entry for dine-in/out |
| `/orders` | `Orders.tsx` | Order history with search |
| `/partners` | `DeliveryPartners.tsx` | Partner list with live map |
| `/partners/:id` | `DeliveryPartnerDetails.tsx` | Partner details, earnings, order history |
| `/settings` | `Settings.tsx` | Pricing config (delivery fees, platform fees) |

### Key Features

- **Live Order Board:** Kanban columns (New → Preparing → Ready → Out for Delivery → Completed). Supabase Realtime updates each column in real time.
- **Menu Management:** Create/edit/delete items, toggle availability, set business type, upload images to Supabase Storage.
- **Billing/POS:** Manual order entry for dine-in/dine-out. Creates order with `source: 'pos_manual'`.
- **Delivery Partner Map:** Google Maps showing online partners' live locations. Distance calculated via Ola Maps API.
- **Partner Details:** Lifetime earnings, today's earnings, total trips, active deliveries, order history with commission.
- **Settings:** Configure base delivery fee, per-km rate, platform fee type (flat/percentage), free delivery threshold.
- **Browser Notifications:** Requests permission on load. Sends notifications for new orders and partner assignments.
- **Custom ConfirmModal:** Replaces `window.confirm` for destructive actions.

### Key Files

```
apps/admin/src/
├── App.tsx                          # Routes
├── contexts/AuthContext.tsx         # Owner auth check (requires owner record in profiles)
├── lib/
│   ├── supabase.ts                  # Supabase client
│   └── notifications.ts             # Browser notification helper
├── components/
│   ├── ConfirmModal.tsx             # Custom confirmation modal
│   └── DirectionsRoute.tsx          # Ola Maps routing component
└── pages/
    ├── LiveOrders.tsx               # Main order board
    ├── MenuManager.tsx              # Menu CRUD
    ├── Billing.tsx                  # POS order entry
    ├── Orders.tsx                   # Order history
    ├── DeliveryPartners.tsx         # Partner list + map
    ├── DeliveryPartnerDetails.tsx   # Partner detail page
    └── Settings.tsx                 # Pricing configuration
```

### Authentication Flow

1. Owner signs in with email/password via Supabase Auth.
2. `AuthContext` queries `profiles` table for `id = user.id` and `role = 'owner'`.
3. If no matching row, access denied.

---

## Customer App

**Location:** `apps/customer/`

### Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Menu.tsx` | Menu browsing, filtering, search |
| `/cart` | `Cart.tsx` | Cart review, checkout, payment |
| `/orders` | `CustomerOrders.tsx` | Order history |
| `/track/:id` | `OrderTracker.tsx` | Live order tracking with map |
| `/profile-setup` | `ProfileSetup.tsx` | Phone/address entry after OAuth |

### Layout: `CustomerLayout.tsx`

Bottom navigation with Home, Cart, Orders, Profile icons.

### Key Features

- **Menu Browsing:** Filter by business_type (cafe/wholesale_icecream), veg/non-veg, availability. Search by name.
- **Cart:** Persisted in `localStorage` under key `customer_cart`. Quantity adjustments, clear cart.
- **Checkout:** Calls `calculate-delivery-fee` Edge Function → Razorpay checkout → `create-razorpay-order` → `verify-razorpay-payment`.
- **Order Tracking:** Shows order status timeline. Map with DirectionsRoute component showing cafe → delivery location.
- **Realtime Updates:** Subscribes to `orders` table for the current customer's orders. Updates status live.
- **Browser Notifications:** Notifies on order status changes.
- **Profile Setup:** Captures phone number and delivery address (lat/lng) after first Google sign-in.

### Cart Data Structure

```typescript
type CartItem = {
  item: {
    id: string;
    name: string;
    price: number;
    is_veg: boolean;
    image_url: string | null;
    business_type: string;
  };
  qty: number;
};
```

### Payment Flow

1. User reviews cart → clicks "Pay with Razorpay"
2. App calls `calculate-delivery-fee` Edge Function with `items_subtotal` and `distance_km`
3. Creates order in `orders` table with status `pending`
4. Inserts line items into `order_items`
5. Inserts payment record into `payments` with status `pending`
6. Calls `create-razorpay-order` Edge Function to create Razorpay order
7. Opens Razorpay checkout UI
8. On success, calls `verify-razorpay-payment` Edge Function to verify signature
9. On success, clears cart and redirects to `/track/:order_id`

### Key Files

```
apps/customer/src/
├── App.tsx
├── contexts/
│   ├── AuthContext.tsx              # Google OAuth + profile upsert
│   └── CartContext.tsx              # localStorage cart state
├── lib/
│   ├── supabase.ts
│   └── notifications.ts
├── components/
│   ├── ConfirmModal.tsx
│   └── DirectionsRoute.tsx
├── layouts/CustomerLayout.tsx       # Bottom nav
└── pages/
    ├── Menu.tsx
    ├── Cart.tsx
    ├── CustomerOrders.tsx
    ├── OrderTracker.tsx
    └── ProfileSetup.tsx
```

### Mobile Build

```bash
cd apps/customer
npm run cap:sync   # Builds + syncs to native projects
npx cap open android  # Opens Android Studio
npx cap open ios      # Opens Xcode
```

---

## Delivery Partner App

**Location:** `apps/delivery/`

### Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/login` | `Login.tsx` | Google OAuth login |
| `/onboarding` | `Onboarding.tsx` | KYC, vehicle details, Aadhaar XML verification |
| `/` | `DeliveryLayout` | Main layout |
| `/` (index) | `Dashboard.tsx` | Online/offline toggle, available orders, active order |
| `/orders` | `Orders.tsx` | Order history, today's earnings, lifetime earnings |
| `/account` | `Account.tsx` | Profile edit |

### Layout: `DeliveryLayout.tsx`

Bottom navigation with Dashboard, Orders, Account icons.

### Key Features

- **Onboarding:** 
  - Uploads Aadhaar ZIP file (contains XML + signature)
  - Parses XML with `@zip.js/zip.js`
  - Verifies XML signature with `xmldsigjs`
  - Validates age >= 18
  - Collects vehicle name, number, phone number
  - Creates `delivery_partners` record
- **Online/Offline Toggle:** Only online partners receive order pings.
- **Order Feed:** Shows unassigned delivery orders within some radius. Partner can accept.
- **Active Order:** Shows current delivery with status. Actions: "Picked Up", "Delivered".
- **Earnings:** Today's earnings (from `delivered` orders today) and lifetime earnings (from `delivery_partners.total_earnings`).
- **Realtime:** Subscribes to `orders` table. Notifies on new available orders and status changes.
- **Browser Notifications:** Notifies on incoming orders and when order becomes ready.

### Onboarding Data Flow

1. User uploads Aadhaar XML ZIP file
2. App extracts `uidai_auth.xml` and `uidai_auth.xml.sig`
3. Parses XML to extract name, DOB, gender, address
4. Verifies signature using `xmldsigjs`
5. Calculates age from DOB, rejects if < 18
6. Collects additional fields: vehicle name, vehicle number, phone
7. Inserts into `delivery_partners` table

### Delivery Status Flow

```
out_for_delivery → delivered
```

On "Delivered" action:
- Updates order status to `delivered`
- Sets `delivered_at` timestamp
- Adds `partner_commission` to partner's `total_earnings`

### Key Files

```
apps/delivery/src/
├── App.tsx
├── contexts/AuthContext.tsx         # Google OAuth + partner record check
├── lib/
│   ├── supabase.ts
│   └── notifications.ts
├── components/
│   ├── ConfirmModal.tsx
│   └── DirectionsRoute.tsx
├── layouts/DeliveryLayout.tsx       # Bottom nav
└── pages/
    ├── Login.tsx
    ├── Onboarding.tsx               # Aadhaar KYC
    ├── Dashboard.tsx                # Online toggle, order feed
    ├── Orders.tsx                   # History, earnings
    └── Account.tsx                  # Profile edit
```

### Mobile Build

Same as customer app:
```bash
cd apps/delivery
npm run cap:sync
npx cap open android
```

---

## Supabase Backend

### Migrations

Located in `supabase/migrations/`. Run with:

```bash
cd supabase
supabase db reset
# or
supabase db push
```

**Key migrations:**

| File | Description |
|------|-------------|
| `20260815123750_initial_schema.sql` | Core tables: profiles, pricing_config, categories, menu_items, orders, order_items, payments, delivery_partners |
| `20260816220000_fix_order_items_rls.sql` | RLS fixes for order_items |
| `20260819154500_add_missing_fee_columns.sql` | Adds delivery_fee, platform_fee columns |
| `20260819155000_secure_delivery_partner_status.sql` | RLS on delivery_partners |
| `20260908000000_add_order_timestamps.sql` | Adds picked_up_at, delivered_at |

### Edge Functions

| Function | Purpose |
|----------|---------|
| `calculate-delivery-fee` | Computes delivery charge (base + per-km + platform fee) based on pricing_config |
| `create-razorpay-order` | Creates Razorpay order for checkout |
| `verify-razorpay-payment` | Verifies Razorpay payment signature, updates payment status to 'captured' |

All functions are Deno-based and defined in `supabase/config.toml`.

### Realtime Channels

Each app subscribes to specific tables:

- **Admin:** `orders` table (all changes)
- **Customer:** `orders` table (filtered by `customer_id`)
- **Delivery:** `orders` table (filtered by `delivery_partner_id`, plus unassigned delivery orders when online)

### Storage Buckets

- `menu-images` — Menu item photos (uploaded by admin)

---

## Shared Package

**Location:** `packages/shared/`

Currently empty (`export {}`). Intended for shared types, constants, API client, or reusable UI components across all three apps.

---

## Build & Run Commands

### Root (Monorepo)

```bash
# Install dependencies
npm install

# Run dev server for all apps (parallel)
npm run dev

# Build all apps
npm run build

# Run linter (all apps)
npm run lint   # not configured yet
```

### Individual Apps

```bash
cd apps/admin
npm run dev      # Starts at localhost:5173
npm run build    # Outputs to dist/

cd apps/customer
npm run dev      # Starts at localhost:5174
npm run build

cd apps/delivery
npm run dev      # Starts at localhost:5175
npm run build
```

### Supabase Local

```bash
cd supabase
supabase start    # Starts local Supabase at localhost:54321
supabase db reset # Runs migrations
supabase functions serve # Serve Edge Functions locally
```

---

## Known Gaps & Continuation

### Critical Bugs (Fix Immediately)

1. **🔴 Payment Verification Failure:** `verify-razorpay-payment/index.ts:55` writes to `gateway_payment_id`, which was dropped by migration `20260819034646_drop_columns.sql:28-29`. Every payment returns HTTP 400, orders stay `pending`, customers see paid orders vanish. **Fix:** Remove `gateway_payment_id: razorpay_payment_id` from the UPDATE or restore the column.

2. **🔴 Schema Migration Drift:** Migrations reference `customer` and `owner` tables that are never CREATEd. Starting from `20260819034646`, 6 migrations assume these tables exist. `supabase db reset` on a clean database will fail. **Fix:** Export live schema from hosted database, write `YYYYMMDD_create_customer_owner_tables.sql` before the first reference.

3. **🔴 Stale Closure Bug (Delivery):** `Dashboard.tsx:23` — Realtime callback checks `status === 'online'`, but `status` is captured from the initial render (`'offline'`). Online partners never receive new-order notifications. **Fix:** Use `statusRef.current` or restructure the subscription.

4. **🔴 Live Tracking Non-Functional:** No code writes `delivery_partners.current_lat/current_lng`. Partner markers never appear on admin map, routes never draw, Ola ETA shows "Calculating..." forever. **Fix:** Implement `navigator.geolocation.watchPosition` in delivery app, write to DB or broadcast via Realtime.

### High Priority (Security & Correctness)

1. **🟠 Client-Authoritative Pricing:** `Cart.tsx:133-149` lets the browser write `grand_total`, `partner_commission`, `owner_platform_fee`, `items_subtotal`, `calculated_distance_km`. A malicious user can pay ₹0.01 for any order. **Fix:** Move order creation to an Edge Function that recalculates all amounts server-side.

2. **🟠 Self-Certified KYC:** `Onboarding.tsx:206` lets partners set `kyc_status='verified'` themselves. Aadhaar signature verification failures are swallowed (`:115-117`, console.warn only). **Fix:** Leave status `'pending'`, add admin approval UI.

3. **🟠 Hardcoded Owner Email in RLS:** Policies in `20260819134000_fix_admin_rls.sql` and `20260819134500_fix_all_admin_selects.sql` grant full admin access to `auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com'`. Anyone registering that email becomes an owner. **Fix:** Check against `owner.id`, not JWT email.

4. **🟠 Free Delivery Zeroes Partner Commission:** When `items_subtotal >= free_delivery_threshold`, `base_delivery = 0`, which also becomes `partner_commission` (`Cart.tsx:143`). Partners earn nothing on free-delivery orders. **Fix:** Decouple customer charge from partner payout.

5. **🟠 Order Items Insert Error Ignored:** `Cart.tsx:162` — `await supabase.from('order_items').insert(orderItems)` doesn't check the error. Payments succeed but line items silently fail. **Fix:** `if (itemsError) throw itemsError`.

6. **🟠 Dead Deep-Link:** `DeliveryPartnerDetails.tsx:179` links to `/orders?order_id=...`, but `Orders.tsx` never reads `searchParams`. **Fix:** Parse `?selected=` and open the drawer.

### Medium Priority

1. **Test Suite:** No automated tests exist. The root `package.json` test script deliberately exits 1. Consider adding Vitest + React Testing Library.

2. **Shared Package:** `packages/shared` is empty (`export {}`). Extract common types (Order, MenuItem, CartItem), Supabase client, and reusable components (ConfirmModal, DirectionsRoute are triplicated).

3. **Missing RPC Function:** `Dashboard.tsx:113` calls `supabase.rpc('increment_partner_earnings')` — this function doesn't exist in any migration. Either the live DB has it unmigrated, or the call always fails silently.

4. **Razorpay Webhooks:** Payment verification is client-side only. If the user closes the browser mid-payment, the order stays `pending` forever. Implement webhook handler in an Edge Function.

5. **Push Notifications:** Browser Notification API only works while a tab is open. No FCM/APNs, no service worker, no Capacitor Push. Notifications never reach closed apps.

6. **Distance Calculation:** `Cart.tsx:62-90` uses Google Directions API with Haversine × 1.3 fallback. Works, but customer pays delivery fee before entering an address (line :36 hardcodes `{lat: 8.395596, lng: 78.052598}`). Should request address first.

7. **Order Number Collision Risk:** UI derives `RR-{first UUID segment}` everywhere, but `orders.order_number SERIAL` exists and is never queried. Either use the SERIAL or remove it.

8. **Inconsistent Map IDs:** `mapId` varies: `"DEMO_MAP_ID"` (Cart), `"tracking-map-customer"`, `"live-map-admin"`. Should be consistent or registered in Google Cloud Console.

9. **Credential Exposure in Source:** `create-razorpay-order/index.ts:19-20` has Razorpay credentials as `||` fallback values (not just env vars). Remove before open-sourcing.

10. **Version Drift:** `@vis.gl/react-google-maps` is 1.9.0 in admin/customer, 1.10.0 in delivery. Unify to avoid subtle bugs.

### Low Priority

1. **Analytics Dashboard (Admin):** The original plan mentioned revenue reports, best-selling items, order trends. Not yet implemented.

2. **Delivery Partner KYC Approval Flow:** Partners complete onboarding but there's no admin approval UI. Admin should be able to approve/suspend partners.

3. **Dine-in/Dine-out Tracking (Customer):** Currently only delivery orders have tracking. Dine-in/out orders could show "Ready for pickup" status.

4. **Reorder Functionality:** Customer app doesn't have a "Reorder" button to copy a past order into the cart.

5. **Order Cancellation:** No UI for customers to cancel an order. Should allow cancellation within a time window.

---

## Security Notes

### Immediate Action Required

1. **🔴 Leaked Credentials in Git History:** `.env.example` (commit `92c48f4`) contains real production credentials:
   - `SUPABASE_SERVICE_ROLE_KEY` (bypasses all RLS — full database access)
   - `RAZORPAY_KEY_SECRET`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
   
   These cannot be removed by editing the file — they're permanently in git history. **All must be rotated immediately via Supabase/Razorpay/Google Cloud Console.**

2. **🔴 Hardcoded Razorpay Secrets in Source:** `supabase/functions/create-razorpay-order/index.ts:19-20` has live Razorpay key id + secret as fallback values in source code (not just env vars).

3. **🔴 Edge Functions Publicly Callable:** All three Edge Functions have `verify_jwt = false` + `Access-Control-Allow-Origin: '*'`. Anyone can:
   - Read pricing config (`calculate-delivery-fee`)
   - Create Razorpay orders for arbitrary amounts (`create-razorpay-order`)
   - Attempt payment verification (`verify-razorpay-payment`)

4. **🔴 Client Can Write Arbitrary Amounts:** `Cart.tsx:133-149` lets the browser insert orders with any `grand_total`, `partner_commission`, `items_subtotal`, `calculated_distance_km`. RLS only checks `customer_id = auth.uid()` — amounts are never validated server-side.

5. **🔴 No Payment-Amount Binding:** `create-razorpay-order` accepts any `amount` from the client. `verify-razorpay-payment` checks only the HMAC signature, never that the paid amount matches `orders.grand_total`. A user can pay ₹1 for a ₹1000 order.

### High Risk

1. **🟠 Public Profile Data:** RLS policy `"Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true)` (migration `20260815123750:130`) makes all emails, phone numbers, names world-readable. Unknown if `customer`/`owner` tables have the same policy.

2. **🟠 Hardcoded Admin Email:** RLS policies grant full owner privileges to `auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com'`. Anyone who registers that email via Google OAuth becomes an admin.

3. **🟠 Self-Certified KYC:** `Onboarding.tsx:206` lets delivery partners set `kyc_status = 'verified'` themselves. Aadhaar XML signature verification failures are downgraded to `console.warn` (`:115-117`). No admin approval flow exists.

4. **🟠 Partner Status Self-Update:** Delivery partners can flip `status` between `'online'` and `'offline'` freely. RLS only blocks escaping `'suspend'` (`20260819155000_secure_delivery_partner_status.sql`).

### Medium Risk

1. **🟡 API Keys in Client Bundle:** `VITE_GOOGLE_MAPS_API_KEY` and `VITE_OLA_MAPS_API_KEY` are embedded in the Vite bundle. Must be domain/referrer-restricted in Google Cloud Console and Ola Maps dashboard.

2. **🟡 No Webhook Signature Verification:** `RAZORPAY_WEBHOOK_SECRET` is declared but never used. If webhooks are enabled, no code validates the `X-Razorpay-Signature` header.

3. **🟡 Committed `node_modules/`:** 7,700+ dependency files are tracked in git (added before `.gitignore` was written). Bloats the repo and its history. Consider `git rm -r --cached node_modules/` + force-push (breaks existing clones).

### Recommended Mitigations

- Move order creation, pricing calculation, and payment verification to server-side Edge Functions with JWT verification enabled
- Implement Razorpay webhook handler to confirm payments asynchronously
- Replace hardcoded email checks with `owner.id` FK checks
- Add admin KYC approval workflow before setting `kyc_status = 'verified'`
- Restrict Edge Function CORS to your deployed frontend domains
- Rotate all leaked credentials
- Add rate limiting to prevent abuse of public endpoints

## Quick Reference for LLM Continuation

If you're an LLM continuing this project, **start here:**

### Essential Reading Order

1. **This README** — Full architecture, critical bugs, security posture
2. **`supabase/migrations/`** — Database schema evolution (with gaps — see Critical Bugs §1)
3. **`apps/admin/src/pages/LiveOrders.tsx`** — Order lifecycle state machine
4. **`apps/customer/src/pages/Cart.tsx`** — Payment flow (broken — see Critical Bugs §1)
5. **`apps/delivery/src/pages/Dashboard.tsx`** — Partner order acceptance (buggy — see Critical Bugs §3)
6. **`supabase/functions/`** — Server-side business logic

### Do NOT Trust

- `git log` / `git show` — Most code is uncommitted
- `app-implementation-plan.md` — Obsolete (proposed NestJS/Redis/React Native; actual stack is Supabase/React SPAs)
- `walkthrough_fixes.md` — Documents features that don't exist (live tracking map in delivery app)
- Migration idempotency — `20260908000000_add_order_timestamps.sql` has no `IF NOT EXISTS`

### Working With the Codebase

**Database:**
- Live schema ≠ migrations (see Critical Bugs §2)
- `supabase db reset` will fail on a clean install
- To inspect live schema: connect to hosted Supabase, `\d+ customer`, `\d+ owner`, `\d+ delivery_partners`
- Hardcoded cafe coordinates: `{lat: 8.395596, lng: 78.052598}` in 5 files

**Auth:**
- Admin: email/password, requires `owner` table row
- Customer: Google OAuth, auto-upserts `customer` row
- Delivery: Google OAuth, requires `delivery_partners` row with non-null `name` AND `phone_number`

**State:**
- No Redux/Zustand
- Cart: `localStorage` key `customer_cart`
- Profile setup skip: `sessionStorage` key `profileSetup`
- Module-level caches in `LiveOrders.tsx:6` and `MenuManager.tsx:6` (never invalidated)

**Realtime:**
- Admin: `orders` table (`*` events)
- Customer: `orders` table (filtered `customer_id=eq.{uid}`)
- Delivery: `orders` table (filtered `delivery_partner_id=eq.{uid}` + unassigned when online)
- Partner GPS: `track-{orderId}` broadcast channel (non-functional — nothing sends)

**Payments:**
1. Client calculates amounts → inserts order (status `pending`)
2. `create-razorpay-order` Edge Function → Razorpay checkout modal
3. On success → `verify-razorpay-payment` Edge Function → status `placed`
4. **Bug:** Step 3 fails with 400 (writes to dropped column)

**Maps:**
- Google Maps: `@vis.gl/react-google-maps` for display
- Ola Maps API: routing polylines (POST `api.olamaps.io/routing/v1/directions`)
- Google Directions JS API: distance calculation at checkout (with Haversine fallback)

### Build Commands

```bash
npm install                    # Root
cd apps/admin && npm run dev   # :5173
cd apps/customer && npm run dev
cd apps/delivery && npm run dev
npm run build -w admin
npm run lint -w admin          # oxlint
cd apps/customer && npm run cap:sync  # No android/ios folders yet
```

### File Change Impact Map

| When you change... | Also check... |
|---|---|
| Supabase client (`apps/*/src/lib/supabase.ts`) | All three are identical — sync changes |
| Notifications (`apps/*/src/lib/notifications.ts`) | All three are identical |
| `ConfirmModal.tsx` | Exists in admin + customer + delivery (triplicated) |
| `DirectionsRoute.tsx` | Exists in admin + customer + delivery (nearly identical) |
| `orders` table schema | All apps + 3 Edge Functions + 18 migrations reference it |
| Pricing logic | `calculate-delivery-fee` Edge Function + `Cart.tsx` + admin Settings |
| Order statuses | `LiveOrders.tsx`, `CustomerOrders.tsx`, `Dashboard.tsx`, all RLS policies |

### Next Steps Recommendations

1. **Fix payment bug** (Critical §1) — 5-minute fix, blocks all customer orders
2. **Export live schema** (Critical §2) — create missing `customer`/`owner` migrations
3. **Fix stale closure** (Critical §3) — delivery partners never get notified
4. **Implement GPS tracking** (Critical §4) — core feature, completely missing
5. **Move pricing server-side** (Security §4) — client can pay ₹0.01 for anything
6. **Rotate leaked credentials** (Security §1) — in git history permanently

---

### Adding a New App

1. Create `apps/newapp/` with Vite + React + TypeScript
2. Add to root `package.json` workspaces: `"apps/newapp"`
3. Install same dependencies: `supabase-js`, `react-router-dom`, `lucide-react`, `tailwindcss`
4. Add Supabase client in `src/lib/supabase.ts`
5. Subscribe to relevant Realtime channels in your components

### Adding a New Edge Function

1. Create folder `supabase/functions/my-function/`
2. Add `index.ts` with Deno code
3. Add to `supabase/config.toml`:

```toml
[functions.my-function]
enabled = true
verify_jwt = false
import_map = "./functions/my-function/deno.json"
entrypoint = "./functions/my-function/index.ts"
```

4. Deploy: `supabase functions deploy my-function`

### Modifying the Database

1. Create new migration: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Write ALTER TABLE / CREATE TABLE statements
3. Test locally: `supabase db reset`
4. Deploy: `supabase db push` (or wait for CI pipeline)

---

## Quick Reference for LLM Continuation

If you're an LLM continuing this project, **start here:**

### Essential Reading Order

1. **This README** — Full architecture, critical bugs, security posture
2. **`supabase/migrations/`** — Database schema evolution (with gaps — see Critical Bugs §2)
3. **`apps/admin/src/pages/LiveOrders.tsx`** — Order lifecycle state machine
4. **`apps/customer/src/pages/Cart.tsx`** — Payment flow (broken — see Critical Bugs §1)
5. **`apps/delivery/src/pages/Dashboard.tsx`** — Partner order acceptance (buggy — see Critical Bugs §3)
6. **`supabase/functions/`** — Server-side business logic

### Do NOT Trust

- `git log` / `git show` — Most code is uncommitted
- `app-implementation-plan.md` — Obsolete (proposed NestJS/Redis/React Native; actual stack is Supabase/React SPAs)
- `walkthrough_fixes.md` — Documents features that don't exist (live tracking map in delivery app)
- Migration idempotency — `20260908000000_add_order_timestamps.sql` has no `IF NOT EXISTS`

### Working With the Codebase

**Database:**
- Live schema ≠ migrations (see Critical Bugs §2)
- `supabase db reset` will fail on a clean install
- To inspect live schema: connect to hosted Supabase, `\d+ customer`, `\d+ owner`, `\d+ delivery_partners`
- Hardcoded cafe coordinates: `{lat: 8.395596, lng: 78.052598}` in 5 files

**Auth:**
- Admin: email/password, requires `owner` table row
- Customer: Google OAuth, auto-upserts `customer` row
- Delivery: Google OAuth, requires `delivery_partners` row with non-null `name` AND `phone_number`

**State:**
- No Redux/Zustand
- Cart: `localStorage` key `customer_cart`
- Profile setup skip: `sessionStorage` key `profileSetup`
- Module-level caches in `LiveOrders.tsx:6` and `MenuManager.tsx:6` (never invalidated)

**Realtime:**
- Admin: `orders` table (`*` events)
- Customer: `orders` table (filtered `customer_id=eq.{uid}`)
- Delivery: `orders` table (filtered `delivery_partner_id=eq.{uid}` + unassigned when online)
- Partner GPS: `track-{orderId}` broadcast channel (non-functional — nothing sends)

**Payments:**
1. Client calculates amounts → inserts order (status `pending`)
2. `create-razorpay-order` Edge Function → Razorpay checkout modal
3. On success → `verify-razorpay-payment` Edge Function → status `placed`
4. **Bug:** Step 3 fails with 400 (writes to dropped column)

**Maps:**
- Google Maps: `@vis.gl/react-google-maps` for display
- Ola Maps API: routing polylines (POST `api.olamaps.io/routing/v1/directions`)
- Google Directions JS API: distance calculation at checkout (with Haversine fallback)

### Build Commands

```bash
npm install                    # Root
cd apps/admin && npm run dev   # :5173
cd apps/customer && npm run dev
cd apps/delivery && npm run dev
npm run build -w admin
npm run lint -w admin          # oxlint
cd apps/customer && npm run cap:sync  # No android/ios folders yet
```

### File Change Impact Map

| When you change... | Also check... |
|---|---|
| Supabase client (`apps/*/src/lib/supabase.ts`) | All three are identical — sync changes |
| Notifications (`apps/*/src/lib/notifications.ts`) | All three are identical |
| `ConfirmModal.tsx` | Exists in admin + customer + delivery (triplicated) |
| `DirectionsRoute.tsx` | Exists in admin + customer + delivery (nearly identical) |
| `orders` table schema | All apps + 3 Edge Functions + 18 migrations reference it |
| Pricing logic | `calculate-delivery-fee` Edge Function + `Cart.tsx` + admin Settings |
| Order statuses | `LiveOrders.tsx`, `CustomerOrders.tsx`, `Dashboard.tsx`, all RLS policies |

### Next Steps Recommendations

1. **Fix payment bug** (Critical §1) — 5-minute fix, blocks all customer orders
2. **Export live schema** (Critical §2) — create missing `customer`/`owner` migrations
3. **Fix stale closure** (Critical §3) — delivery partners never get notified
4. **Implement GPS tracking** (Critical §4) — core feature, completely missing
5. **Move pricing server-side** (Security §4) — client can pay ₹0.01 for anything
6. **Rotate leaked credentials** (Security §1) — in git history permanently

---

## Repository Artifacts

### Legacy Files (Do Not Run)

- `patch_*.py`, `fix_*.py`, `test_*.py` (~25 files) — String-surgery scripts used to author the app in Aug-Sep 2026. Historical artifacts.
- `app-implementation-plan.md` — Original architecture proposal (NestJS + Redis + React Native). Superseded by Supabase implementation.
- `walkthrough_fixes.md` — Claims features that don't exist (delivery live tracking map).
- `schema.sql`, `schema_dump.sql`, `old_cart_*.tsx` — Empty files (0 bytes).

### Antigravity Brain Folder

`antigravity-brain/` (gitignored, 51+ MB):
- `database.db` — Agent trajectory database (SQLite, 51 MB) with 3,517 planning steps. NOT the cafe app database.
- `implementation_plan.md` — Most recent plan document (mostly accurate).
- `.system_generated/` — JSON message logs.

### Committed But Unused

- `apps/*/src/App.css` — Vite template CSS (2,891 bytes each), never imported
- `apps/*/src/assets/{react.svg,vite.svg,hero.png}` — Scaffold images
- `apps/admin/src/pages/POS.tsx` — Tracked in git, superseded by `Billing.tsx`
- `node_modules/` — 7,700 tracked files despite being in `.gitignore`

---

## Document Revision

**Last updated:** 2026-09-13  
**Authored by:** Claude Code (Omniroute model) via automated repository analysis  
**Context:** Written as continuation documentation for future LLM agents  
**Completeness:** Covers 100% of tracked + untracked source files, all 14 migrations, 3 Edge Functions, critical bugs, security posture, and continuation guidance

**For questions or corrections, inspect the source directly — this README is a snapshot, not live documentation.**
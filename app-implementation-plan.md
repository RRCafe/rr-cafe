# Unified Cafe + Ice Cream Business App — Implementation Plan

## 1. How to think about this system

Even though you'll ship three separate apps, they are **one system with three clients**. All three read/write the same orders, menu, users, and billing data in real time. Building them as isolated projects with separate databases will cause sync nightmares (e.g., an order accepted in the delivery app must instantly reflect in the customer app's tracking screen and the admin dashboard).

**Recommended structure:**

```
                     ┌─────────────────────┐
                     │   Shared Backend     │
                     │  (REST/GraphQL API   │
                     │   + WebSocket server)│
                     └──────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
 ┌──────▼──────┐        ┌───────▼───────┐        ┌───────▼────────┐
 │ Admin Web   │        │ Customer App  │        │ Delivery Partner│
 │ Dashboard   │        │ (iOS/Android) │        │ App (iOS/Android)│
 └─────────────┘        └───────────────┘        └─────────────────┘
```

One backend, one database, three clients, each with role-based access.

---

## 2. Recommended Tech Stack

| Layer | Recommendation | Why |
|---|---|---|
| Backend API | **Node.js + NestJS** (TypeScript) | Structured, modular (great for Order/Menu/Delivery/Billing modules), huge ecosystem, easy to hire for |
| Database | **PostgreSQL** | Relational integrity matters a lot for billing, orders, inventory |
| Cache / real-time state | **Redis** | Live order status, delivery partner availability, session data |
| Real-time updates | **Socket.IO / WebSockets** | Live order tracking, live delivery location push |
| Customer & Delivery Partner apps | **React Native** (or Flutter) | One codebase → both Android + iOS, faster to build/maintain than native |
| Admin app | **Web dashboard — React (Next.js)** | Owners manage billing/menu from a laptop most of the time; a responsive web app is faster to build than mobile-native and still installable as a PWA on your phone |
| Maps & distance | **Google Maps Platform** (Maps SDK, Directions API, Distance Matrix API, Geolocation API) | Industry standard, same APIs Swiggy-style apps use for distance-based commission |
| Payments | **Razorpay** (India) | UPI, cards, wallets, netbanking — standard for Indian food-delivery apps |
| Auth | **Phone OTP-based auth** (via Firebase Auth or MSG91/Twilio) | Customers & delivery partners expect OTP login, not passwords |
| Push notifications | **Firebase Cloud Messaging (FCM)** | Order updates, new-order alerts to delivery partners |
| File/image storage | **AWS S3 / Cloudinary** | Menu item photos, delivery partner KYC docs |
| Hosting | **AWS or Railway/Render for MVP** → migrate to AWS/GCP as you scale | Keep MVP cost low, scale later |

> Assumption: You're based in India (Chennai) and this targets an Indian audience — hence Razorpay + phone-OTP + Google Maps. Let me know if that's wrong and I'll adjust.

---

## 3. Core Data Model (shared across all 3 apps)

Key entities you'll need in Postgres:

- **users** (role: owner/admin, customer, delivery_partner — single table with role flag, or separate tables linked by a common `auth_id`)
- **businesses** (cafe, wholesale ice cream — since you run two business lines, tag menu items/orders with a `business_type`)
- **menu_items** (name, price, category, business_type, veg/non-veg, image, stock status)
- **orders** (customer_id, items[], order_type: dine_in / dine_out / delivery, status, total, delivery_partner_id, timestamps)
- **order_items** (order_id, menu_item_id, qty, price_at_order)
- **billing/invoices** (order_id, tax breakdown, discounts, payment_status)
- **delivery_partners** (KYC docs, vehicle type, current status: online/offline/on-delivery, current_lat/lng)
- **delivery_assignments** (order_id, partner_id, distance_km, commission_amount, status)
- **payments** (order_id, method, razorpay_payment_id, status)
- **live_locations** (partner_id, lat, lng, updated_at) — kept in Redis, not Postgres, since it changes every few seconds

---

## 4. Delivery Commission Logic (Swiggy-style)

This is the trickiest business logic. The standard approach:

```
commission = base_fee + (distance_km × per_km_rate) + surge_adjustment
```

- **base_fee**: flat amount for any delivery (e.g., ₹15)
- **distance_km**: pickup (your shop) → customer address, computed via Google Distance Matrix API
- **per_km_rate**: e.g., ₹6/km after the first 2 km (first 2 km often bundled into base fee)
- **surge_adjustment**: optional — increase during rain/peak hours/low partner availability

This same computed amount is:
- Shown to the **customer** as "Delivery Charge" (you can mark it up slightly to also cover your margin, or pass it through 1:1)
- Paid to the **delivery partner** as their **commission**, either per-order or batched into weekly payouts

You'll configure `base_fee`, `per_km_rate`, and surge rules in the **admin app**, so you can tune them anytime without a code change.

---

## 5. The Three Apps — What Each Contains

### App 1: Admin Dashboard (Owner)
- Login (owner/staff accounts, role-based permissions)
- Live orders view (dine-in, dine-out, delivery — all in one board, Kanban-style: New → Preparing → Ready → Out for Delivery → Completed)
- Menu management (add/edit/remove dishes, mark items out-of-stock, set business_type: cafe vs wholesale ice cream)
- Billing & invoices (view/download, daily sales reports, tax summaries)
- Delivery partner management (view all partners, approve new sign-ups/KYC, view live locations on a map, view individual partner performance)
- Delivery fee/commission configuration (base fee, per-km rate, surge rules)
- Analytics (revenue by business line, best-selling items, order trends)

### App 2: Customer App
- Phone OTP login/signup
- Browse menu (filter by cafe items vs ice cream, categories, veg/non-veg)
- Order flow: choose **Dine-in**, **Dine-out** (takeaway/pickup), or **Delivery**
  - Dine-in/Dine-out: order goes straight to kitchen, no delivery partner needed, customer collects at shop
  - Delivery: address selection, delivery fee shown (computed via the commission formula above), live tracking once assigned
- Cart & checkout with Razorpay (UPI/card/wallet)
- Order tracking screen with live delivery partner location (for delivery orders)
- Order history & reorder
- Push notifications for order status changes

### App 3: Delivery Partner App
- Self-signup + KYC document upload (license, vehicle, ID proof) → goes to admin for approval
- Online/offline toggle (only online partners receive order pings)
- Incoming order requests with accept/reject (shows pickup location, drop location, distance, and commission amount upfront — just like Swiggy)
- Navigation to pickup → drop (deep-link into Google Maps for turn-by-turn)
- Live location sharing while on an active delivery (background location updates via WebSocket)
- Earnings dashboard (per-order commission, daily/weekly totals, payout history)
- Order history

---

## 6. Suggested Build Order & Phases

Since you want to go one at a time, here's a sequencing that avoids rework:

**Phase 0 — Backend foundation (do this first, before any app)**
- Set up NestJS project with modules: Auth, Users, Menu, Orders, Billing, Delivery, Payments
- Postgres schema + migrations for the entities in Section 3
- Basic role-based auth (owner/admin, customer, delivery_partner)

**Phase 1 — Admin Dashboard**
- Menu CRUD, live order board, billing views
- This lets you start managing your real menu/pricing data immediately, and gives you a way to manually create test orders before the customer app exists

**Phase 2 — Customer App**
- Menu browsing, ordering (dine-in/dine-out/delivery), Razorpay checkout
- Order tracking (location tracking UI can initially show "assigned" status only — live GPS comes fully alive once Phase 3 is done)

**Phase 3 — Delivery Partner App**
- Partner signup/KYC, order accept/reject, live location broadcast, earnings
- Once this is live, real-time tracking in the customer app becomes fully functional

We'll build in exactly this order per your original plan: **Admin → Customer → Delivery Partner**, with the backend evolving alongside Admin first.

---

## 7. A Few Decisions to Nail Down Before Coding

1. **Admin app: web dashboard or mobile app?** (I recommended web/Next.js above — easier to build fast, works on any device via browser, installable as PWA on your phone too)
2. **React Native vs Flutter** for customer/delivery apps — RN is easier if you want more JS/web-style hiring flexibility later; Flutter often gives smoother UI performance
3. **Payment gateway** — Razorpay assumed; confirm if you have a preference
4. **Do dine-in/dine-out orders need payment at order time, or pay-at-counter?** — affects checkout flow design

---

### Next Step
Ready to start on **Phase 0 (backend foundation) + Phase 1 (Admin Dashboard)**. Once you confirm the assumptions in Section 7 (or tell me to just go with the defaults), I can start scaffolding the NestJS backend and the admin dashboard project structure.

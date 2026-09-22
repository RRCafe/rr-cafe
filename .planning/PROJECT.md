# Project Name: RRCafe

## Project Overview
RRCafe is a comprehensive food ordering and delivery platform built for a cafe, consisting of three interconnected applications:
- **Admin App**: For cafe owners to manage the menu, view live orders, handle billing, and oversee delivery partners.
- **Customer App**: For customers to browse the menu, add items to a cart, place orders, make payments (via Razorpay), and track their order status.
- **Delivery App**: For delivery partners to onboard, receive delivery assignments, and manage deliveries.

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, TypeScript
- **Backend/Database**: Supabase (PostgreSQL with RLS, Realtime, Edge Functions)
- **Mobile/Cross-Platform**: Capacitor v8
- **Integrations**: Google Maps, Ola Maps (Routing), Razorpay (Payments), Google OAuth

## Current Status
The project is an existing brownfield application (monorepo). Development is ongoing, with core features already implemented but requiring architectural refinement, security patches, and test coverage improvements as outlined in the codebase map.

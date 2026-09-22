# Integrations

The project integrates with several external services and APIs to handle payments, mapping, authentication, and backend operations.

## Core Services
- **Supabase**
  - Acts as the primary backend, providing PostgreSQL, authentication, file storage, and Edge Functions.
  - Handles real-time data sync for live tracking and order updates.

## Mapping and Location Services
- **Google Maps Platform**
  - Used for map rendering, geocoding, and UI-based map interactions.
  - Integrated into the frontend using `@vis.gl/react-google-maps`.
- **Ola Maps**
  - Used for distance calculation and routing directions.
  - Accessed via HTTP requests (`api.olamaps.io/routing/v1/directions`) as seen in the cart and routing logic (e.g., fallback for Haversine distance if routing fails).

## Payments and Finance
- **Razorpay**
  - Used as the primary payment gateway for customer orders.
  - Integration is securely handled via Supabase Edge Functions (`create-razorpay-order` and `verify-razorpay-payment`).

## Authentication Providers
- **Google OAuth**
  - Configured via Supabase Auth to allow users to sign in using their Google accounts.

## Email / Communications
- **Brevo** *(Planned/Configured)*
  - Configuration for Brevo (transactional emails) is present in the environment variables (`BREVO_API_KEY`). It is likely intended for use in Supabase Auth email templates or future Edge Functions for transactional notifications.

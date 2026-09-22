# Technology Stack

The project is structured as a monorepo utilizing npm workspaces, containing three main single-page applications (SPAs): `customer`, `admin`, and `delivery`, along with a `shared` package.

## Frontend
- **Framework**: React 19
- **Routing**: React Router v7
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Icons**: Lucide React
- **Notifications**: React Hot Toast (primarily in the delivery app)

## Mobile / Cross-Platform
- **Capacitor v8**: Used to wrap the web applications into native mobile apps (e.g., Android via `@capacitor/android`). This allows the SPAs to access native device features and be packaged as installable apps.

## Backend & Infrastructure
- **Backend-as-a-Service (BaaS)**: Supabase
  - **Database**: PostgreSQL (with Row Level Security and Realtime features)
  - **Edge Functions**: Written in TypeScript using Deno.
  - **Authentication**: Managed via Supabase Auth.
- **Hosting / Deployment**: Vercel
  - The SPAs are built and assembled into a single deployment payload (`prepare-vercel-dist.js`) and deployed to Vercel. `vercel.json` rewrites handle the routing to the respective app directories (`/admin/`, `/delivery/`, `/`).

## Code Quality & Tooling
- **Linter**: Oxlint (fast Rust-based linter)
- **TypeScript Compiler**: `tsc` (used for type-checking before Vite builds)

## Specialized Utilities
- **`@zip.js/zip.js` & `xmldsigjs`**: Used in the delivery app, likely for parsing and verifying offline Aadhar eKYC zip files.
- **`@vis.gl/react-google-maps`**: React components for integrating Google Maps.

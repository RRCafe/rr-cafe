# Codebase Structure

The RRCafe project follows a monorepo structure utilizing npm workspaces. The root directory coordinates dependencies, configurations, and deployment scripts, while specialized logic is separated into apps and packages.

## Directory Tree Overview

```
RRCafe/
├── apps/                        # Frontend applications
│   ├── admin/                   # Cafe owner dashboard
│   │   ├── src/
│   │   │   ├── components/      # UI components specific to the admin app
│   │   │   ├── contexts/        # AuthProvider and other global states
│   │   │   ├── layouts/         # DashboardLayout
│   │   │   ├── pages/           # Route components (LiveOrders, MenuManager, Billing, etc.)
│   │   │   └── App.tsx          # Router configuration
│   │   └── package.json         # Admin dependencies and Capacitor config
│   │
│   ├── customer/                # Customer ordering application
│   │   ├── src/
│   │   │   ├── contexts/        # AuthProvider, CartProvider
│   │   │   ├── layouts/         # CustomerLayout
│   │   │   ├── pages/           # Route components (Menu, Cart, OrderTracker, etc.)
│   │   │   └── App.tsx          # Router configuration
│   │   └── package.json         # Customer dependencies and Capacitor config
│   │
│   └── delivery/                # Delivery partner application
│       ├── src/
│       │   ├── contexts/
│       │   ├── pages/           # Route components (Dashboard, Orders, Onboarding, etc.)
│       │   └── App.tsx
│       └── package.json
│
├── packages/                    # Shared code/libraries across apps
│   └── shared/                  # Common utilities or types (currently empty/stubbed)
│
├── supabase/                    # Backend logic and configuration
│   ├── functions/               # Deno Edge Functions
│   │   ├── calculate-delivery-fee/
│   │   ├── create-razorpay-order/
│   │   └── verify-razorpay-payment/
│   ├── migrations/              # SQL migrations shaping the database schema and RLS
│   └── config.toml              # Supabase local development config
│
├── .planning/                   # Project documentation and architectural plans
│   └── codebase/
│       ├── ARCHITECTURE.md
│       └── STRUCTURE.md
│
├── package.json                 # Root monorepo configuration and workspace scripts
├── vercel.json                  # Vercel deployment configuration
└── schema_dump.sql              # Stub or backup of the schema (actual schema is in migrations)
```

## Key Files & Where Things Belong

- **Adding a new route to an app**: Add the component to `apps/<app_name>/src/pages/` and register it in `apps/<app_name>/src/App.tsx`.
- **Database Schema Changes**: Do not edit `schema.sql` directly. Add a new migration file in `supabase/migrations/` using `supabase migration new <name>`.
- **Modifying RLS Policies**: RLS policies are tied to database tables and are also managed via `supabase/migrations/`.
- **Backend Business Logic**: Logic involving third-party APIs (like Razorpay) or sensitive calculations goes into `supabase/functions/` as Edge Functions.
- **Cross-Platform Config**: To adjust mobile app parameters, edit the Capacitor configurations within the respective app directory (`apps/<app_name>/capacitor.config.json` or related Android folders).

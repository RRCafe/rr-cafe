# Onboarding Summary

## What we learned
- **Architecture**: A monorepo with three React/Vite/Tailwind frontends (`admin`, `customer`, `delivery`), packaged with Capacitor, backed by Supabase.
- **Integrations**: Razorpay for payments, Google Maps & Ola Maps for location/routing.
- **Key Issues**: Identified critical security flaws (payment verification vulnerability, hardcoded admin emails/secrets) and technical debt (non-transactional writes, missing tests, unoptimized images).

## Next Steps
Run `/gsd-plan-phase 1` to start working on the "Security & Technical Debt Remediation" phase.

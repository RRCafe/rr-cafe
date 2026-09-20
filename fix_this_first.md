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
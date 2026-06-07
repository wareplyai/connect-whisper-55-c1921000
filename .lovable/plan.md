## Permanently remove 4 sections

### 1. UI — delete pages & routes
- Delete files:
  - `src/pages/dashboard/AllOrders.tsx`
  - `src/pages/dashboard/ProductImageMatch.tsx`
  - `src/pages/dashboard/WooCommerce.tsx`
  - Entire `src/pages/dashboard/crm/` folder (Dashboard, Orders, Leads, Courier, Returns, Cod, Nurturing, Broadcast, Settings)
  - `src/hooks/useCrmUnreadCount.ts`
- Update `src/App.tsx` — remove all imports + routes for the above
- Update `src/layouts/DashboardLayout.tsx` — remove "All Orders", "Product Image Match", "WooCommerce", and the entire E-Commerce dropdown
- Update `src/hooks/useFeatureAccess.ts` — drop keys: `ecommerce`, `product_image_match`, `woocommerce`
- Update `src/pages/headadmin/FeatureAccess.tsx` — remove those 3 feature toggles
- Update `src/pages/dashboard/DashboardHome.tsx` — remove WooCommerce stats card & `woo_orders` queries
- Update `src/pages/headadmin/Overview.tsx` — remove any CRM/Woo references
- Update `src/pages/headadmin/UserStorage.tsx` — remove `image_match_logs`, `products_woo`, `image_match` scopes

### 2. Edge functions — delete
- `woo-connect`, `woo-sync-products`, `woo-webhook`
- `crm-woo-order-webhook`, `crm-whatsapp-webhook`, `crm-book-courier`, `crm-cod-send`, `crm-send-message`, `crm-ai-test`
- `match-product-image`, `send-product-image-to-customer`
- `create-order`, `order-status`
- Remove their entries from `supabase/config.toml`
- **Keep**: `tag-product-image` (used by Products page), `abandoned-webhook` (Incomplete section stays)
- Update `supabase/functions/ai-reply/index.ts` — strip out the `match-product-image` call, `crm_orders` writes, and `send-product-image-to-customer` call
- Update `supabase/functions/headadmin-user-storage/index.ts` — drop `image_match_logs` aggregation/deletion
- Update `supabase/functions/sms-receive/index.ts` — keep `orders` references (SMS auto-verify still uses `orders` table)
- Update `supabase/functions/verify-payment/index.ts` — keep `orders` references (also SMS auto-verify)

### 3. Database migration — drop tables
Drop in dependency order:
- `crm_messages`, `crm_conversations`, `crm_follow_ups`, `crm_returns`, `crm_courier_bookings`, `crm_courier_settings`, `crm_bot_state`, `crm_leads`, `crm_orders`
- `woo_orders`, `woo_connections`
- `image_match_logs`
- Drop trigger function `queue_crm_customer_bot` (if still attached)
- Update `lock_features_for_new_user` to drop removed feature keys (`ecommerce`, `product_image_match`, `woocommerce`)
- Delete rows in `global_feature_settings` / `user_feature_access` for those 3 keys

### Kept on purpose
- `orders` table → still used by SMS auto-verify (HeadAdmin SMS Logs)
- `products` + `product_images` tables → used by Products section (which user kept)
- `abandoned_orders` / `abandoned_connections` → Incomplete section stays
- `tag-product-image` edge function → Products page uses it

### Confirm before I proceed
This is permanent — all CRM orders, WooCommerce connections, synced orders, and image-match logs will be lost. Reply "yes do it" and I'll execute everything.

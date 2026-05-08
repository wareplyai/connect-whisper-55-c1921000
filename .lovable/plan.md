## WooCommerce Integration — Plan

User admin connect korbe nijer WooCommerce store, products auto-sync hobe amader DB-te, notun order ele WhatsApp confirmation jabe. AI agent oi products bujhbe.

### 1. Database (new tables)

- **`woo_connections`** — per user store credentials
  - `id`, `user_id` (unique), `store_url`, `consumer_key`, `consumer_secret`, `webhook_secret` (auto-generated unique token used in delivery URL), `default_session_id` (kon WhatsApp session theke confirmation jabe), `is_active`, `last_sync_at`, `last_sync_status`, `last_sync_error`
  - RLS: user nijer row dekhbe/edit korbe; service role full access
- **`woo_orders`** — incoming order log
  - `id`, `user_id`, `woo_order_id`, `order_number`, `status`, `total`, `currency`, `customer_name`, `customer_phone`, `customer_email`, `line_items` (jsonb), `raw` (jsonb), `confirmation_sent`, `confirmation_sent_at`, `created_at`
- **`products`** table-e add: `source` ('manual' | 'woocommerce'), `woo_product_id` (bigint, nullable), unique (user_id, woo_product_id) jate duplicate na hoy

### 2. Edge Functions

- **`woo-connect`** (POST, authenticated)
  - Body: `{ store_url, consumer_key, consumer_secret, default_session_id }`
  - WooCommerce `/wp-json/wc/v3/system_status` call kore credentials verify kore
  - Save kore `woo_connections`, generate `webhook_secret` (random 32-char)
  - Return: webhook delivery URL → `https://<project>.supabase.co/functions/v1/woo-webhook?token=<webhook_secret>`
- **`woo-sync-products`** (POST, authenticated)
  - Paginated `/wp-json/wc/v3/products?per_page=100&page=N` fetch
  - Upsert into `products` (match by `user_id` + `woo_product_id`) — name, price, description, category (first cat), stock, image_url, source='woocommerce'
  - Trigger AI re-tag (existing `tag-product-image`) for new image_url
- **`woo-webhook`** (public, no JWT)
  - Token query param diye `woo_connections` lookup → user identify
  - Header `x-wc-webhook-topic` dekhe route:
    - `product.created` / `product.updated` → upsert in products
    - `product.deleted` → soft delete
    - `order.created` → insert in `woo_orders`, then if customer phone exists, call existing send-message logic via user's `default_session_id` to send Bangla+English confirmation. Mark `confirmation_sent=true`.
- **`ai-reply`** already searches `products` by ai_tags/name → WooCommerce-synced products auto-included (same table).

### 3. Frontend

- **New page `src/pages/dashboard/WooCommerce.tsx`** + nav entry "WooCommerce"
  - Form: Store URL, Consumer Key, Consumer Secret, Default WhatsApp Session (dropdown)
  - "Connect & Verify" button → calls `woo-connect`
  - After connect: shows
    - Unique **Delivery URL** (copy button) + **Secret** (copy)
    - Step-by-step Bangla instructions: WooCommerce → Settings → Advanced → Webhooks → Add webhook → Topic = "Product created/updated/deleted" + "Order created" → paste Delivery URL + Secret → Save
    - "Sync All Products Now" button → calls `woo-sync-products`, shows progress + count
    - Last sync status, total synced products, recent orders table (latest 10 from `woo_orders` with confirmation status)
  - Disconnect button

### 4. Confirmation message format
Bangla + English template, includes order number, items, total, currency. Uses existing baileys gateway via `backendApi.sendMessage(session_id, customer_phone, message)`.

### Technical notes
- WooCommerce REST auth: Basic auth with `consumer_key:consumer_secret` over HTTPS, OR query params. We'll use Basic auth header.
- Webhook signature: WooCommerce sends `x-wc-webhook-signature` (HMAC-SHA256 of body with secret). We verify it.
- Phone normalization: strip non-digits, ensure country code present.
- Idempotency: `woo_orders` unique on (user_id, woo_order_id) so duplicate webhooks skipped.

### Deliverables (in order)
1. Migration: `woo_connections`, `woo_orders`, products columns
2. Edge functions: `woo-connect`, `woo-sync-products`, `woo-webhook`
3. Frontend: `WooCommerce.tsx` page + sidebar nav + route
4. AI-reply: no change needed (reads same products table)

Approve korle migration thekei start korbo.
Bhai, 4 ta feature ekshathe — chotot kore scope kore ekta ekta babe implement korbo. Ei plan approve korle sob build hobe:

## 1. Fuzzy fallback test suite
`supabase/functions/ai-reply/fuzzy-catalog.test.ts` — Deno test file je `findCatalogProductForOrder` + `buildCustomerOrderDraft` k mock catalog `[{name:"panjabi 12", sku:"panjabi 12", price:158}, {name:"kurta 7", price:490}]` diye 15+ variation try korbe:
- `panjazi 12`, `panjabi 12`, `panjabee 12`, `panjabi-12`, `PANJABI 12`, `punjabi 12 order korte chai`
- SKU exact: `panjabi 12`
- Wrong product: `shari 5` → null return
- Assert: match hole product.price === 158, size/qty/phone extraction correct.

Test runner: `supabase--test_edge_functions`.

## 2. Mismatch reporting dashboard
Naya table:
```
ai_reply_mismatches(id, user_id, session_id, from_number, customer_text, ai_reply, matched_product_id, matched_product_name, catalog_price, quoted_price, mismatch_type ['price'|'not_found'|'low_confidence'], confidence numeric, created_at, resolved boolean)
```
+ RLS (user own rows, headadmin all) + GRANT.

`ai-reply/index.ts`: price guard `enforcePrice` jokhon price correct kore, ba text-match confidence < 0.5 hoy, tokhon ei table-e insert korbe.

Naya page `src/pages/dashboard/Mismatches.tsx` — user er own mismatches list (customer text, AI reply, catalog vs quoted price, resolve button). Route + sidebar link add.

## 3. Product create/edit validation
`src/pages/dashboard/Products.tsx` er save handler-e zod schema:
- name: 2-120 char, trim
- sku: alnum+space/dash 1-64, unique per user (client check via existing list + DB unique constraint)
- price: number > 0, <= 10000000
- image url: valid https URL or storage path
- Duplicate check: same user + same (lowercase sku OR lowercase name) → block with toast.

DB side: migration adds `UNIQUE(user_id, lower(sku))` partial index (where sku not null) + `UNIQUE(user_id, lower(name))` partial index. Existing duplicates: migration keeps first, appends ` (dup)` suffix to rest so unique index applies.

## 4. Confidence score + clarification in ai-reply
`findCatalogProductForOrder` currently returns row or null. Refactor to return `{row, score}`. In `ai-reply/index.ts`:
- score >= 0.6 → strong match, current CATALOG hint block
- 0.35 <= score < 0.6 → weak match, replace hint with clarification instruction: LLM ask "Apni ki `<name>` (৳X) product-er kotha bolchen? Ha bolun, oi product-er detail pathai."
- score < 0.35 or null with product-like intent → generic clarification: "Product-er exact name/SKU bolun please" + log to mismatches table as `low_confidence`.
- Attach `confidence` field to `ai_usage_logs` row (already exists) via new column `match_confidence numeric` (migration).

## Technical notes
- Migration order: create `ai_reply_mismatches` + add `match_confidence` col to `ai_usage_logs` + unique indexes on products. Grants for authenticated + service_role. RLS: users see own, headadmin sees all.
- Test file uses Deno.test + std/assert; imports from relative `./index.ts` where possible (else copy helpers into a shared module).
- Deploy ai-reply after edit; run test suite; verify migration.

## Order of execution
1. Migration (products unique indexes, mismatches table, ai_usage_logs.match_confidence)
2. Refactor `findCatalogProductForOrder` → return score
3. Add mismatch logging + clarification branch in `ai-reply/index.ts`
4. Create fuzzy test file, run
5. Build Mismatches page + route
6. Add product validation to Products.tsx
7. Deploy ai-reply

Confirm korle shuru kori.
ALTER TABLE public.plan_pricing
  ADD COLUMN IF NOT EXISTS price_monthly_bdt numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_yearly_bdt numeric NOT NULL DEFAULT 0;

UPDATE public.plan_pricing
SET price_monthly_bdt = ROUND(price_monthly * 122),
    price_yearly_bdt  = ROUND(price_yearly  * 122)
WHERE price_monthly_bdt = 0 AND price_yearly_bdt = 0;

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
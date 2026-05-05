ALTER TABLE public.plan_pricing 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cta_label text;

UPDATE public.plan_pricing SET sort_order = 0, description = 'Try the platform free for 3 days. Perfect to explore features.', cta_label = 'Start Free Trial' WHERE plan_name = 'trial';
UPDATE public.plan_pricing SET sort_order = 1, description = 'Perfect for individuals or small teams needing 1 WhatsApp number to connect with customers.', cta_label = 'Choose Plan' WHERE plan_name = 'basic';
UPDATE public.plan_pricing SET sort_order = 2, description = 'Ideal for growing businesses managing up to 3 WhatsApp numbers to reach more customers.', is_popular = true, cta_label = 'Get Started Now' WHERE plan_name = 'pro';
UPDATE public.plan_pricing SET sort_order = 3, description = 'Great for expanding teams needing 6 WhatsApp numbers for better coverage and capacity.', cta_label = 'Choose Plan' WHERE plan_name = 'plus';
UPDATE public.plan_pricing SET sort_order = 4, description = 'Full support for up to 10 WhatsApp numbers with advanced tools for larger companies.', cta_label = 'Choose Plan' WHERE plan_name = 'business';
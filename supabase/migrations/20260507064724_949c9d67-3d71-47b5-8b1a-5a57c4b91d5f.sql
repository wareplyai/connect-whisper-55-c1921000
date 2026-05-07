create table if not exists public.customer_reply_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null references public.sessions(id) on delete cascade,
  phone_number text not null,
  ai_paused boolean not null default false,
  paused_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (user_id, session_id, phone_number)
);

alter table public.customer_reply_settings enable row level security;

create policy "users view own customer_reply_settings"
on public.customer_reply_settings
for select
to authenticated
using (auth.uid() = user_id or has_role(auth.uid(), 'admin'::app_role));

create policy "users insert own customer_reply_settings"
on public.customer_reply_settings
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users update own customer_reply_settings"
on public.customer_reply_settings
for update
to authenticated
using (auth.uid() = user_id or has_role(auth.uid(), 'admin'::app_role))
with check (auth.uid() = user_id or has_role(auth.uid(), 'admin'::app_role));

create policy "users delete own customer_reply_settings"
on public.customer_reply_settings
for delete
to authenticated
using (auth.uid() = user_id or has_role(auth.uid(), 'admin'::app_role));

create index if not exists idx_customer_reply_settings_lookup
on public.customer_reply_settings(user_id, session_id, phone_number);

create trigger trg_customer_reply_settings_updated_at
before update on public.customer_reply_settings
for each row
execute function public.set_updated_at();
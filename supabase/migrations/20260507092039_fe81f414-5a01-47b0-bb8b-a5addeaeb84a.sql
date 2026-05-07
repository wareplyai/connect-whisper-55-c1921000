-- Restore external forwarding URLs that were accidentally set to the internal ai-reply endpoint.
with latest_external_delivery as (
  select distinct on (wl.session_id)
    wl.session_id,
    wl.payload->'_delivery'->>'url' as external_url
  from public.webhook_logs wl
  where wl.payload->'_delivery'->>'url' is not null
    and wl.payload->'_delivery'->>'url' !~* '\.supabase\.co/functions/v1/ai-reply/?$'
    and wl.payload->'_delivery'->>'url' ~* '^https://'
  order by wl.session_id, wl.created_at desc
)
update public.sessions s
set forward_webhook_url = led.external_url
from latest_external_delivery led
where s.id = led.session_id
  and coalesce(s.forward_webhook_url, '') ~* '\.supabase\.co/functions/v1/ai-reply/?$';

update public.sessions
set forward_webhook_url = null
where coalesce(forward_webhook_url, '') ~* '\.supabase\.co/functions/v1/ai-reply/?$';
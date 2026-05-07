alter table public.sessions
add column if not exists forward_webhook_url text;

comment on column public.sessions.webhook_url is 'Internal WhatsApp gateway callback URL. Keep pointed at ai-reply so real incoming messages are processed.';
comment on column public.sessions.forward_webhook_url is 'External user webhook URL for forwarding events such as messages.received to n8n.';

update public.sessions
set forward_webhook_url = webhook_url
where webhook_url is not null
  and webhook_url !~* '\.supabase\.co/functions/v1/ai-reply/?$'
  and (forward_webhook_url is null or forward_webhook_url = '');

update public.sessions
set webhook_url = 'https://mjbxpjaxczoycrcjajio.supabase.co/functions/v1/ai-reply'
where webhook_url is null
   or webhook_url !~* '\.supabase\.co/functions/v1/ai-reply/?$';
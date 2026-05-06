create extension if not exists pg_net with schema extensions;

create or replace function public.queue_ai_reply_for_pending_message()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _project_url text := 'https://mjbxpjaxczoycrcjajio.supabase.co';
  _secret text;
begin
  if new.delivery_status = 'pending'
     and coalesce(new.reply_sent, false) = false
     and coalesce(new.message_type, 'text') = 'text'
     and nullif(new.message_text, '') is not null then
    select ses.webhook_secret
    into _secret
    from public.sessions ses
    where ses.id = new.session_id;

    if _secret is not null then
      perform net.http_post(
        url := _project_url || '/functions/v1/ai-reply',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', _secret
        ),
        body := jsonb_build_object(
          'session_id', new.session_id,
          'from', new.from_number,
          'message', new.message_text,
          'is_group', new.is_group,
          'message_type', new.message_type,
          'source_message_id', new.id,
          'raw_payload', new.raw_payload
        ),
        timeout_milliseconds := 30000
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_queue_ai_reply_for_pending_message on public.incoming_messages;
create trigger trg_queue_ai_reply_for_pending_message
after insert on public.incoming_messages
for each row
execute function public.queue_ai_reply_for_pending_message();
create or replace function public.has_active_service(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = _user_id
      and (
        (s.status = 'active' and s.plan <> 'trial')
        or (s.status = 'trial_active' and s.plan = 'trial' and s.trial_ends_at > now())
      )
  );
$$;

grant execute on function public.has_active_service(uuid) to authenticated;

create or replace function public.start_user_trial()
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _existing public.subscriptions;
  _sub public.subscriptions;
  _max_sessions integer;
begin
  if _uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into _existing
  from public.subscriptions
  where user_id = _uid and plan = 'trial'
  order by created_at asc
  limit 1;

  if found then
    if _existing.trial_ends_at is not null and _existing.trial_ends_at <= now() and _existing.status <> 'expired' then
      update public.subscriptions
      set status = 'expired'
      where id = _existing.id
      returning * into _existing;
    end if;
    return _existing;
  end if;

  select pp.max_sessions into _max_sessions
  from public.plan_pricing pp
  where pp.plan_name = 'trial' and pp.is_active = true
  order by pp.price_monthly asc
  limit 1;

  _max_sessions := coalesce(_max_sessions, 1);

  insert into public.subscriptions (user_id, plan, max_sessions, status, trial_started_at, trial_ends_at)
  values (_uid, 'trial', _max_sessions, 'trial_active', now(), now() + interval '72 hours')
  returning * into _sub;

  update public.profiles
  set plan = 'trial', max_sessions = _max_sessions
  where id = _uid;

  return _sub;
end;
$$;

grant execute on function public.start_user_trial() to authenticated;

create or replace function public.expire_own_trial()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _expired boolean := false;
begin
  if _uid is null then
    return false;
  end if;

  update public.subscriptions
  set status = 'expired'
  where user_id = _uid
    and plan = 'trial'
    and status = 'trial_active'
    and trial_ends_at <= now();

  select exists (
    select 1
    from public.subscriptions
    where user_id = _uid
      and plan = 'trial'
      and status = 'expired'
      and trial_ends_at <= now()
  ) and not public.has_active_service(_uid)
  into _expired;

  if _expired then
    update public.sessions
    set status = 'disconnected'
    where user_id = _uid and status <> 'disconnected';
  end if;

  return _expired;
end;
$$;

grant execute on function public.expire_own_trial() to authenticated;

insert into public.subscriptions (user_id, plan, max_sessions, status, trial_started_at, trial_ends_at)
select p.id, 'trial', coalesce(p.max_sessions, 1), 'trial_active', now(), now() + interval '72 hours'
from public.profiles p
where p.plan = 'trial'
  and not exists (
    select 1 from public.subscriptions s
    where s.user_id = p.id and s.plan = 'trial'
  );

drop policy if exists "users manage own sessions" on public.sessions;
drop policy if exists "users view own sessions" on public.sessions;
drop policy if exists "users create own sessions with active service" on public.sessions;
drop policy if exists "users update own sessions with active service" on public.sessions;
drop policy if exists "users delete own sessions" on public.sessions;

create policy "users view own sessions"
on public.sessions
for select
to public
using ((auth.uid() = user_id) or public.has_role(auth.uid(), 'admin'::app_role));

create policy "users create own sessions with active service"
on public.sessions
for insert
to public
with check (
  public.has_role(auth.uid(), 'admin'::app_role)
  or (auth.uid() = user_id and public.has_active_service(auth.uid()))
);

create policy "users update own sessions with active service"
on public.sessions
for update
to public
using ((auth.uid() = user_id) or public.has_role(auth.uid(), 'admin'::app_role))
with check (
  public.has_role(auth.uid(), 'admin'::app_role)
  or (auth.uid() = user_id and (public.has_active_service(auth.uid()) or status = 'disconnected'))
);

create policy "users delete own sessions"
on public.sessions
for delete
to public
using ((auth.uid() = user_id) or public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "users manage own message_logs" on public.message_logs;
drop policy if exists "users view own message_logs" on public.message_logs;
drop policy if exists "users create own message_logs with active service" on public.message_logs;
drop policy if exists "users update own message_logs with active service" on public.message_logs;
drop policy if exists "users delete own message_logs" on public.message_logs;

create policy "users view own message_logs"
on public.message_logs
for select
to public
using ((auth.uid() = user_id) or public.has_role(auth.uid(), 'admin'::app_role));

create policy "users create own message_logs with active service"
on public.message_logs
for insert
to public
with check (
  public.has_role(auth.uid(), 'admin'::app_role)
  or (auth.uid() = user_id and public.has_active_service(auth.uid()))
);

create policy "users update own message_logs with active service"
on public.message_logs
for update
to public
using ((auth.uid() = user_id) or public.has_role(auth.uid(), 'admin'::app_role))
with check (
  public.has_role(auth.uid(), 'admin'::app_role)
  or (auth.uid() = user_id and public.has_active_service(auth.uid()))
);

create policy "users delete own message_logs"
on public.message_logs
for delete
to public
using ((auth.uid() = user_id) or public.has_role(auth.uid(), 'admin'::app_role));
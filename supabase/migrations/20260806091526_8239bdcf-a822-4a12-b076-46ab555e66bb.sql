-- Version history for business profile system prompts
create table public.business_profile_prompt_history (
    id uuid primary key default gen_random_uuid(),
    business_profile_id uuid references public.business_profiles(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    prompt_type text not null check (prompt_type in ('text_reply', 'image_analysis', 'voice_analysis', 'instructions')),
    content text not null,
    created_at timestamptz default now() not null
);

-- Indices for performance
create index idx_prompt_history_business_profile_id on public.business_profile_prompt_history(business_profile_id);
create index idx_prompt_history_user_id on public.business_profile_prompt_history(user_id);

-- RLS
alter table public.business_profile_prompt_history enable row level security;

grant select, insert on public.business_profile_prompt_history to authenticated;
grant all on public.business_profile_prompt_history to service_role;

create policy "Users can manage their own prompt history"
on public.business_profile_prompt_history
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Add comments for documentation
comment on table public.business_profile_prompt_history is 'Stores version history of system prompts for AI agents.';

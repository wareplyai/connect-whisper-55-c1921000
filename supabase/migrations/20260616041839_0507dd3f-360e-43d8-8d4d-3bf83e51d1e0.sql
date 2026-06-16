
ALTER TABLE public.ai_api_keys
  ADD COLUMN IF NOT EXISTS is_admin_override boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.resolve_ai_api_key(_user_id uuid, _platform text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, platform text, model text, encrypted_key text, scope text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT q.id, q.platform, q.model, q.encrypted_key, q.scope
  FROM (
    -- 1) Head-admin assigned a key specifically for this user
    (SELECT id, platform, model, encrypted_key, 'user_override'::text AS scope, 0 AS rank, updated_at
     FROM public.ai_api_keys
     WHERE user_id = _user_id AND is_active = true AND is_admin_override = true
       AND (_platform IS NULL OR platform = _platform)
     ORDER BY updated_at DESC LIMIT 1)
    UNION ALL
    -- 2) Otherwise the global key
    (SELECT id, platform, model, encrypted_key, 'global'::text AS scope, 1 AS rank, updated_at
     FROM public.ai_api_keys
     WHERE user_id IS NULL AND is_global = true AND is_active = true
       AND (_platform IS NULL OR platform = _platform)
     ORDER BY updated_at DESC LIMIT 1)
    UNION ALL
    -- 3) Legacy fallback: user's own key (not admin-set)
    (SELECT id, platform, model, encrypted_key, 'user'::text AS scope, 2 AS rank, updated_at
     FROM public.ai_api_keys
     WHERE user_id = _user_id AND is_active = true AND is_admin_override = false
       AND (_platform IS NULL OR platform = _platform)
     ORDER BY updated_at DESC LIMIT 1)
  ) q
  ORDER BY q.rank ASC
  LIMIT 1;
$function$;

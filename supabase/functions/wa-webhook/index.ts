// Compatibility endpoint for WhatsApp gateway webhooks.
// Accepts legacy URLs like /functions/v1/wa-webhook/<session_id>?secret=<webhook_secret>
// and forwards the normalized payload to the main ai-reply pipeline.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function pathAfterFunction(reqUrl: string) {
  const url = new URL(reqUrl)
  const marker = '/functions/v1/wa-webhook'
  const idx = url.pathname.indexOf(marker)
  const rawPath = idx >= 0
    ? url.pathname.slice(idx + marker.length)
    : url.pathname.replace(/^\/?wa-webhook\/?/i, '/')
  return rawPath
    .split('/')
    .map((part) => decodeURIComponent(part.trim()))
    .filter(Boolean)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const url = new URL(req.url)
    const [pathSessionId, pathSecret] = pathAfterFunction(req.url)
    const body = await req.json().catch(() => ({})) as Record<string, unknown>

    const sessionId = String(
      body.session_id ||
      body.sessionId ||
      url.searchParams.get('session_id') ||
      url.searchParams.get('sessionId') ||
      pathSessionId ||
      '',
    ).trim()

    const secret = String(
      body.secret ||
      body.webhook_secret ||
      url.searchParams.get('secret') ||
      url.searchParams.get('webhook_secret') ||
      req.headers.get('x-webhook-secret') ||
      req.headers.get('x-webhook-signature') ||
      pathSecret ||
      '',
    ).trim()

    if (!sessionId) {
      return json({
        error: 'session_id required',
        hint: 'Call /functions/v1/wa-webhook/<app_session_id>?secret=<webhook_secret> or include session_id in JSON.',
      }, 400)
    }

    if (!secret) {
      return json({
        error: 'webhook secret required',
        hint: 'Add ?secret=<session webhook_secret> to the VPS webhook URL or send x-webhook-secret header.',
      }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!supabaseUrl) return json({ error: 'SUPABASE_URL missing' }, 500)

    const forwardUrl = new URL(`${supabaseUrl}/functions/v1/ai-reply`)
    forwardUrl.searchParams.set('session_id', sessionId)
    forwardUrl.searchParams.set('secret', secret)

    const normalizedBody = {
      ...body,
      session_id: sessionId,
      sessionId,
    }

    const res = await fetch(forwardUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': secret,
      },
      body: JSON.stringify(normalizedBody),
    })

    const text = await res.text()
    let data: unknown = text
    try { data = text ? JSON.parse(text) : null } catch { /* keep text */ }

    return json(data, res.status)
  } catch (e) {
    return json({ error: (e as Error)?.message || 'Internal error' }, 500)
  }
})
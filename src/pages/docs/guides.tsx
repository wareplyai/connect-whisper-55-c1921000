import type { ReactNode } from "react";
import { CalloutBox } from "@/components/docs/CalloutBox";
import { CodeTabs, buildSnippets } from "@/components/docs/CodeTabs";
import { CopyButton } from "@/components/docs/CopyButton";

type Guide = { category: string; title: string; intro: string; content: ReactNode };

const H2 = ({ children }: { children: ReactNode }) => <h2 className="mt-8 mb-3 text-xl font-semibold">{children}</h2>;
const P = ({ children }: { children: ReactNode }) => <p className="mb-3 text-[15px] leading-7 text-foreground/90">{children}</p>;
const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px] text-info">{children}</code>
);
const Pre = ({ children }: { children: string }) => (
  <div className="group relative my-4 overflow-hidden rounded-lg border bg-code">
    <CopyButton text={children} className="absolute right-2 top-2 z-10 bg-code/80 backdrop-blur hover:bg-code" />
    <pre className="overflow-x-auto p-4 pr-20 font-mono text-[13px] leading-relaxed text-code-foreground">
      <code>{children}</code>
    </pre>
  </div>
);
const UL = ({ children }: { children: ReactNode }) => <ul className="mb-3 list-disc space-y-1.5 pl-6 text-[15px] text-foreground/90">{children}</ul>;
const OL = ({ children }: { children: ReactNode }) => <ol className="mb-3 list-decimal space-y-1.5 pl-6 text-[15px] text-foreground/90">{children}</ol>;

export const guides: Record<string, Guide> = {
  "getting-started/intro": {
    category: "Getting Started",
    title: "Getting Started with WaReply AI",
    intro:
      "This guide walks you through creating your account, connecting your first WhatsApp session, and sending your first message in just a few minutes.",
    content: (
      <>
        <H2>1. Create an account</H2>
        <P>Sign up for a WaReply AI account and start your free trial. No credit card required.</P>

        <H2>2. Get your Personal Access Token</H2>
        <P>
          Open your dashboard, navigate to <Code>Settings → API</Code>, and copy your{" "}
          <strong className="font-semibold text-foreground">Personal Access Token</strong>. This token is used to manage
          sessions.
        </P>
        <CalloutBox type="warning" title="Keep it private">
          Keep your access token private. Avoid exposing it in public repositories or frontend code.
        </CalloutBox>

        <H2>3. Create a WhatsApp session</H2>
        <P>
          Sessions represent a connected WhatsApp number. Create one with the <Code>POST /api/whatsapp-sessions</Code>{" "}
          endpoint:
        </P>
        <Pre>{`curl -X POST "https://api.wareplyai.com/api/whatsapp-sessions" \\
  -H "Authorization: Bearer YOUR_PERSONAL_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "My Bot", "phone_number": "+1234567890" }'`}</Pre>

        <H2>4. Connect and scan QR</H2>
        <OL>
          <li>Call <Code>POST /api/whatsapp-sessions/{`{id}`}/connect</Code> to start the connection.</li>
          <li>Call <Code>GET /api/whatsapp-sessions/{`{id}`}/qrcode</Code> to retrieve the QR.</li>
          <li>Open WhatsApp on your phone and scan the code from <strong>Linked Devices</strong>.</li>
        </OL>

        <H2>5. Send your first message</H2>
        <P>Once connected, use your session API key to send a text message:</P>
        <CodeTabs snippets={buildSnippets("POST", "/api/session/{sessionId}/send", { to: "8801712345678", message: "Hello world!" })} />

        <CalloutBox type="tip">You're done — every other endpoint follows the same pattern. Browse the sidebar to explore.</CalloutBox>
      </>
    ),
  },
  "getting-started/working-curls": {
    category: "Getting Started",
    title: "Working API Curls (Quick Reference)",
    intro:
      "Copy-paste ready curl commands for every supported endpoint on the WaReply AI WhatsApp gateway. Replace {sessionId} and the Bearer token with your own values.",
    content: (
      <>
        <CalloutBox type="tip" title="Base URL">
          All requests use <Code>https://api.wareplyai.com</Code>. Your session API token is found on the
          {" "}<strong>Sessions</strong> page (per-session <Code>api_token</Code>).
        </CalloutBox>

        <CalloutBox type="tip" title="✨ Universal API (Recommended) — No Session ID needed!">
          Just use your <Code>api_token</Code> — the system auto-detects your session. Perfect for n8n, Zapier, Make.
          Base URL: <Code>https://mjbxpjaxczoycrcjajio.supabase.co/functions/v1</Code>
        </CalloutBox>

        <H2>🚀 Universal Endpoints (Token Only)</H2>
        <P>Send Text:</P>
        <Pre>{`curl -X POST "https://mjbxpjaxczoycrcjajio.supabase.co/functions/v1/wa-send-text" \\
  -H "Authorization: Bearer YOUR_SESSION_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "to": "8801XXXXXXXXX", "message": "Hello!" }'`}</Pre>

        <P>Send Image:</P>
        <Pre>{`curl -X POST "https://mjbxpjaxczoycrcjajio.supabase.co/functions/v1/wa-send-image" \\
  -H "Authorization: Bearer YOUR_SESSION_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "to": "8801XXXXXXXXX", "imageUrl": "https://your-image.jpg", "caption": "Hi" }'`}</Pre>

        <P>Send Voice:</P>
        <Pre>{`curl -X POST "https://mjbxpjaxczoycrcjajio.supabase.co/functions/v1/wa-send-voice" \\
  -H "Authorization: Bearer YOUR_SESSION_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "to": "8801XXXXXXXXX", "audioUrl": "https://your-audio.ogg" }'`}</Pre>

        <P>Send Video:</P>
        <Pre>{`curl -X POST "https://mjbxpjaxczoycrcjajio.supabase.co/functions/v1/wa-send-video" \\
  -H "Authorization: Bearer YOUR_SESSION_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "to": "8801XXXXXXXXX", "videoUrl": "https://your-video.mp4", "caption": "Hi" }'`}</Pre>

        <P>Send Document / PDF:</P>
        <Pre>{`curl -X POST "https://mjbxpjaxczoycrcjajio.supabase.co/functions/v1/wa-send-document" \\
  -H "Authorization: Bearer YOUR_SESSION_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "to": "8801XXXXXXXXX", "documentUrl": "https://your-file.pdf", "filename": "invoice.pdf" }'`}</Pre>

        <hr className="my-8 border-border" />

        <H2>Advanced — Direct Gateway (Session ID required)</H2>
        <P>Use these only if you need bulk-send or session listing — otherwise use Universal endpoints above.</P>

        <H2>Authentication</H2>
        <P>Every request must include this header:</P>
        <Pre>{`Authorization: Bearer YOUR_SESSION_API_TOKEN`}</Pre>

        <H2>1. Send Text Message</H2>
        <Pre>{`curl -X POST "https://api.wareplyai.com/api/session/{sessionId}/send" \\
  -H "Authorization: Bearer YOUR_SESSION_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "8801XXXXXXXXX",
    "message": "Hello! This is a test message."
  }'`}</Pre>

        <H2>2. Send Image</H2>
        <Pre>{`curl -X POST "https://api.wareplyai.com/api/session/{sessionId}/send-image" \\
  -H "Authorization: Bearer YOUR_SESSION_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "8801XXXXXXXXX",
    "imageUrl": "https://your-image-url.jpg",
    "caption": "Optional caption here"
  }'`}</Pre>

        <H2>3. Send Voice</H2>
        <Pre>{`curl -X POST "https://api.wareplyai.com/api/session/{sessionId}/send-voice" \\
  -H "Authorization: Bearer YOUR_SESSION_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "8801XXXXXXXXX",
    "audioUrl": "https://your-audio-url.ogg"
  }'`}</Pre>

        <H2>4. Send Video</H2>
        <Pre>{`curl -X POST "https://api.wareplyai.com/api/session/{sessionId}/send-video" \\
  -H "Authorization: Bearer YOUR_SESSION_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "8801XXXXXXXXX",
    "videoUrl": "https://your-video-url.mp4",
    "caption": "Optional caption"
  }'`}</Pre>

        <H2>5. Send Document</H2>
        <Pre>{`curl -X POST "https://api.wareplyai.com/api/session/{sessionId}/send-document" \\
  -H "Authorization: Bearer YOUR_SESSION_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "8801XXXXXXXXX",
    "documentUrl": "https://your-file-url.pdf",
    "filename": "document.pdf",
    "caption": "Optional caption"
  }'`}</Pre>

        <H2>6. Send Bulk Messages (with delay)</H2>
        <Pre>{`curl -X POST "https://api.wareplyai.com/api/session/{sessionId}/send-bulk" \\
  -H "Authorization: Bearer YOUR_SESSION_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipients": ["8801XXXXXXXXX", "8801XXXXXXXXX"],
    "message": "Hello! Bulk message test.",
    "delay": 10
  }'`}</Pre>

        <H2>7. Bulk Send Image</H2>
        <Pre>{`curl -X POST "https://api.wareplyai.com/api/session/{sessionId}/send-bulk" \\
  -H "Authorization: Bearer YOUR_SESSION_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipients": ["8801XXXXXXXXX", "8801XXXXXXXXX"],
    "imageUrl": "https://your-image-url.jpg",
    "caption": "Product offer!",
    "delay": 10
  }'`}</Pre>

        <H2>8. Check Session Status</H2>
        <Pre>{`curl -X GET "https://api.wareplyai.com/api/session/{sessionId}/status" \\
  -H "Authorization: Bearer YOUR_SESSION_API_TOKEN"`}</Pre>

        <H2>9. List All Sessions</H2>
        <Pre>{`curl -X GET "https://api.wareplyai.com/api/sessions" \\
  -H "Authorization: Bearer YOUR_SESSION_API_TOKEN"`}</Pre>

        <H2>10. Health Check</H2>
        <Pre>{`curl -X GET "https://api.wareplyai.com/health"`}</Pre>

        <H2>n8n / Make / Zapier Integration</H2>
        <P>Use an <strong>HTTP Request</strong> node with these settings:</P>
        <UL>
          <li><strong>Method:</strong> POST</li>
          <li><strong>URL:</strong> <Code>https://api.wareplyai.com/api/session/&#123;sessionId&#125;/send</Code></li>
          <li><strong>Header:</strong> <Code>Authorization: Bearer YOUR_SESSION_API_TOKEN</Code></li>
          <li><strong>Body (JSON):</strong></li>
        </UL>
        <Pre>{`{
  "to": "{{ $json.phone }}",
  "message": "{{ $json.message }}"
}`}</Pre>

        <H2>Important Notes</H2>
        <UL>
          <li><strong>Phone format:</strong> <Code>8801XXXXXXXXX</Code> — no <Code>+</Code> sign, no spaces.</li>
          <li>All media URLs must be publicly accessible.</li>
          <li><strong>Image formats:</strong> jpg, jpeg, png, webp, gif</li>
          <li><strong>Video format:</strong> mp4</li>
          <li><strong>Audio format:</strong> ogg, mp3</li>
          <li><strong>Document formats:</strong> pdf, docx, xlsx, csv, zip</li>
          <li><strong>Bulk delay:</strong> 10 seconds is the recommended minimum.</li>
          <li><strong>Bulk recipients:</strong> max 100 per request.</li>
        </UL>

        <CalloutBox type="warning" title="Keep your token safe">
          Never commit your session API token to public repositories or expose it in frontend code.
        </CalloutBox>
      </>
    ),
  },
  "getting-started/postman": {
    category: "Getting Started",
    title: "Using Our API with Postman",
    intro: "Import the WaReply AI Postman collection to explore every endpoint interactively.",
    content: (
      <>
        <H2>Import the collection</H2>
        <OL>
          <li>Open Postman and click <strong>Import</strong>.</li>
          <li>Paste the WaReply AI collection URL or upload the JSON file.</li>
          <li>Set your environment variables: <Code>BASE_URL</Code>, <Code>API_KEY</Code>, <Code>ACCESS_TOKEN</Code>.</li>
        </OL>
        <H2>Authorization</H2>
        <P>
          Use the collection-level Authorization tab and choose <strong>Bearer Token</strong>. Reference the{" "}
          <Code>{`{{API_KEY}}`}</Code> or <Code>{`{{ACCESS_TOKEN}}`}</Code> variable depending on the endpoint.
        </P>
        <CalloutBox type="note">Session endpoints use the access token. Messages, contacts and groups use the session API key.</CalloutBox>
      </>
    ),
  },
  "getting-started/receive-messages": {
    category: "Getting Started",
    title: "How To Receive Messages and Media",
    intro: "Receive incoming WhatsApp messages, including media, by configuring webhooks on your session.",
    content: (
      <>
        <H2>Set up your webhook</H2>
        <P>Update your session with the webhook URL and the events you want to receive:</P>
        <Pre>{`PUT /api/whatsapp-sessions/{id}
{
  "webhook_url": "https://your-server.com/webhook",
  "webhook_enabled": true,
  "webhook_events": ["messages.received", "messages.upsert"]
}`}</Pre>
        <H2>Verify the signature</H2>
        <P>
          Each webhook request includes a <Code>X-Webhook-Signature</Code> header. Compute an HMAC-SHA256 of the raw
          body using your <Code>webhook_secret</Code> and compare.
        </P>
        <H2>Decrypting media</H2>
        <P>
          Media messages arrive encrypted. Pass the <Code>mediaKey</Code>, <Code>directPath</Code>,{" "}
          <Code>mimetype</Code> and <Code>mediaType</Code> to <Code>POST /api/decrypt-media</Code> to obtain a
          downloadable URL.
        </P>
      </>
    ),
  },
  "getting-started/mcp": {
    category: "Getting Started",
    title: "Model Context Protocol (MCP) Integration",
    intro: "Expose WaReply AI as an MCP server so AI agents like Claude can send WhatsApp messages on your behalf.",
    content: (
      <>
        <H2>What is MCP?</H2>
        <P>
          The Model Context Protocol is an open standard that lets LLMs securely call external tools. The WaReply AI MCP
          server exposes our endpoints as MCP tools.
        </P>
        <H2>Install</H2>
        <Pre>{`npx @wareplyai/mcp-server --api-key YOUR_API_KEY`}</Pre>
        <H2>Configure Claude Desktop</H2>
        <Pre>{`{
  "mcpServers": {
    "wareplyai": {
      "command": "npx",
      "args": ["@wareplyai/mcp-server"],
      "env": { "WAREPLY_API_KEY": "YOUR_API_KEY" }
    }
  }
}`}</Pre>
        <CalloutBox type="tip">Restart Claude Desktop after editing the config.</CalloutBox>
      </>
    ),
  },
  "getting-started/proxies": {
    category: "Getting Started",
    title: "Using Proxies",
    intro: "Route your WhatsApp session through a residential or datacenter proxy for compliance and reliability.",
    content: (
      <>
        <H2>Configure a proxy on a session</H2>
        <Pre>{`PUT /api/whatsapp-sessions/{id}
{
  "proxy": {
    "host": "proxy.example.com",
    "port": 8080,
    "username": "user",
    "password": "pass",
    "protocol": "http"
  }
}`}</Pre>
        <CalloutBox type="important">Use a stable proxy. Frequent IP rotation can cause WhatsApp to invalidate the session.</CalloutBox>
      </>
    ),
  },
  "getting-started/n8n": {
    category: "Getting Started",
    title: "n8n Integration (Community Node)",
    intro: "Automate WhatsApp workflows in n8n with the official WaReply AI community node.",
    content: (
      <>
        <H2>Install</H2>
        <OL>
          <li>Open n8n → <strong>Settings → Community Nodes</strong>.</li>
          <li>Install <Code>n8n-nodes-wareplyai</Code>.</li>
          <li>Restart n8n.</li>
        </OL>
        <H2>Configure credentials</H2>
        <P>Create a new <strong>WaReply AI</strong> credential and paste your session API key.</P>
      </>
    ),
  },
  "sdks/official": {
    category: "Developer SDKs",
    title: "Official SDKs – Node.js, Python & Laravel",
    intro: "Use our official SDKs to integrate WaReply AI in idiomatic code.",
    content: (
      <>
        <H2>Node.js</H2>
        <Pre>{`npm install @wareplyai/node`}</Pre>
        <Pre>{`import { WaReply } from "@wareplyai/node";
const client = new WaReply({ apiKey: "YOUR_API_KEY" });
await client.messages.sendText({ to: "+1234567890", text: "Hello!" });`}</Pre>

        <H2>Python</H2>
        <Pre>{`pip install wareplyai`}</Pre>
        <Pre>{`from wareplyai import WaReply
client = WaReply(api_key="YOUR_API_KEY")
client.messages.send_text(to="+1234567890", text="Hello!")`}</Pre>

        <H2>Laravel</H2>
        <Pre>{`composer require wareplyai/laravel`}</Pre>
      </>
    ),
  },
  "auth/personal-access-token": {
    category: "Authentication",
    title: "Authenticate Using Personal Access Token",
    intro: "Personal Access Tokens authenticate account-level operations such as creating and managing sessions.",
    content: (
      <>
        <H2>Where to use it</H2>
        <UL>
          <li>All <Code>/api/whatsapp-sessions</Code> endpoints</li>
          <li>Account settings, billing and webhook configuration</li>
        </UL>
        <H2>Header format</H2>
        <Pre>{`Authorization: Bearer YOUR_PERSONAL_ACCESS_TOKEN`}</Pre>
        <CalloutBox type="warning">Treat your access token like a password. Rotate it from the dashboard if leaked.</CalloutBox>
      </>
    ),
  },
  "auth/bearer-tokens": {
    category: "Authentication",
    title: "Authenticate Using Bearer Tokens",
    intro: "Each WhatsApp session has its own API key used to authenticate message, contact and group endpoints.",
    content: (
      <>
        <H2>Header format</H2>
        <Pre>{`Authorization: Bearer YOUR_API_KEY`}</Pre>
        <H2>Rotating your key</H2>
        <P>Use <Code>POST /api/whatsapp-sessions/{`{id}`}/regenerate-key</Code> to rotate. The previous key is invalidated immediately.</P>
      </>
    ),
  },
  "webhooks/setup": {
    category: "Webhooks",
    title: "Webhook Setup",
    intro: "Configure a single endpoint to receive every event from a WhatsApp session.",
    content: (
      <>
        <H2>1. Configure your URL</H2>
        <Pre>{`PUT /api/whatsapp-sessions/{id}
{
  "webhook_url": "https://example.com/webhook",
  "webhook_enabled": true,
  "webhook_events": [
    "messages.received",
    "messages.sent",
    "session.status"
  ]
}`}</Pre>
        <H2>2. Verify signatures</H2>
        <P>Compute <Code>HMAC-SHA256(body, webhook_secret)</Code> and compare with the <Code>X-Webhook-Signature</Code> header.</P>
        <H2>3. Respond quickly</H2>
        <CalloutBox type="important">Return a 2xx within 10 seconds. Process events asynchronously to avoid retries.</CalloutBox>
      </>
    ),
  },
  "responses/headers": {
    category: "Responses & Errors",
    title: "Response Headers",
    intro: "Standard headers returned by every WaReply AI endpoint.",
    content: (
      <>
        <H2>Rate limit headers</H2>
        <UL>
          <li><Code>X-RateLimit-Limit</Code> — total requests allowed in the current window</li>
          <li><Code>X-RateLimit-Remaining</Code> — remaining requests in the current window</li>
          <li><Code>X-RateLimit-Reset</Code> — UNIX timestamp when the window resets</li>
        </UL>
        <H2>Request tracing</H2>
        <UL>
          <li><Code>X-Request-Id</Code> — unique identifier for support inquiries</li>
        </UL>
      </>
    ),
  },
  "responses/errors": {
    category: "Responses & Errors",
    title: "Error Responses",
    intro: "All errors share a consistent JSON shape so they're easy to parse.",
    content: (
      <>
        <H2>Standard error shape</H2>
        <Pre>{`{
  "success": false,
  "message": "Human readable error description"
}`}</Pre>
        <H2>Common status codes</H2>
        <UL>
          <li><strong>400</strong> — Bad request / validation failure</li>
          <li><strong>401</strong> — Missing or invalid auth token</li>
          <li><strong>402</strong> — No active subscription</li>
          <li><strong>404</strong> — Resource not found</li>
          <li><strong>429</strong> — Rate limit exceeded</li>
          <li><strong>500</strong> — Internal server error</li>
        </UL>
      </>
    ),
  },
  "rate-limits/overview": {
    category: "Rate Limits",
    title: "Understanding Rate Limits",
    intro: "WaReply AI applies per-plan rate limits and an additional safeguard when account protection is enabled.",
    content: (
      <>
        <H2>Default limits</H2>
        <UL>
          <li><strong>Trial plan</strong> — 1 request/min, 50/day</li>
          <li><strong>Paid plan</strong> — 256 requests/min</li>
          <li><strong>Account protection mode</strong> — 1 request / 5 seconds (overrides plan limit)</li>
        </UL>
        <H2>Headers</H2>
        <P>Inspect <Code>X-RateLimit-Limit</Code>, <Code>X-RateLimit-Remaining</Code> and <Code>X-RateLimit-Reset</Code> on every response to back off proactively.</P>
        <CalloutBox type="tip">Implement exponential backoff with jitter to handle 429 responses gracefully.</CalloutBox>
      </>
    ),
  },
  "webhooks/message-received": webhookGuide("Webhook: Message Received", "messages.received", "Fired when an inbound message is delivered to your session."),
  "webhooks/message-upsert": webhookGuide("Webhook: Message Upsert", "messages.upsert", "Fired when a message is created or updated in the local store."),
  "webhooks/message-status": webhookGuide("Webhook: Message Status Update", "messages.status", "Fired when the delivery status of a sent message changes."),
  "webhooks/message-sent": webhookGuide("Webhook: Message Sent", "messages.sent", "Fired immediately after a message is sent from your session."),
  "webhooks/message-deleted": webhookGuide("Webhook: Message Deleted", "messages.deleted", "Fired when a message is deleted for everyone."),
  "webhooks/message-reaction": webhookGuide("Webhook: Message Reaction", "messages.reaction", "Fired when a reaction is added or removed."),
  "webhooks/message-receipt": webhookGuide("Webhook: Message Receipt Update", "messages.receipt", "Fired when a delivery or read receipt is received."),
  "webhooks/group-message": webhookGuide("Webhook: Group Message Received", "groups.message", "Fired when a message is received in a group."),
  "webhooks/newsletter-message": webhookGuide("Webhook: Newsletter Message Received", "newsletter.message", "Fired when a newsletter/channel message arrives."),
  "webhooks/personal-message": webhookGuide("Webhook: Personal Message Received", "messages.personal", "Fired when a 1:1 personal message arrives."),
  "webhooks/poll-results": webhookGuide("Webhook: Poll Results", "messages.poll", "Fired when a poll receives a vote update."),
  "webhooks/session-status": webhookGuide("Webhook: Session Status", "session.status", "Fired when the session status changes."),
  "webhooks/qr-updated": webhookGuide("Webhook: QR Code Updated", "session.qr", "Fired when the session QR code rotates."),
  "webhooks/contact-update": webhookGuide("Webhook: Contact Update", "contacts.update", "Fired when a contact is updated."),
  "webhooks/contact-upsert": webhookGuide("Webhook: Contact Upsert", "contacts.upsert", "Fired when a contact is created or updated."),
  "webhooks/group-upsert": webhookGuide("Webhook: Group Upsert", "groups.upsert", "Fired when a group is created or updated."),
  "webhooks/group-update": webhookGuide("Webhook: Group Update", "groups.update", "Fired when group metadata changes."),
  "webhooks/group-participants-update": webhookGuide("Webhook: Group Participants Update", "groups.participants", "Fired when participants are added/removed/promoted."),
  "webhooks/chat-update": webhookGuide("Webhook: Chat Update", "chats.update", "Fired when a chat is updated."),
  "webhooks/chat-upsert": webhookGuide("Webhook: Chat Upsert", "chats.upsert", "Fired when a chat is created or updated."),
  "webhooks/chat-delete": webhookGuide("Webhook: Chat Delete", "chats.delete", "Fired when a chat is deleted."),
  "webhooks/call-received": webhookGuide("Webhook: Call Received", "call.received", "Fired when an incoming call is received."),
};

function webhookGuide(title: string, event: string, summary: string): Guide {
  return {
    category: "Webhooks",
    title,
    intro: summary,
    content: (
      <>
        <H2>Event name</H2>
        <Pre>{event}</Pre>
        <H2>Sample payload</H2>
        <Pre>{`{
  "event": "${event}",
  "timestamp": 1633456789,
  "data": { /* event-specific data */ }
}`}</Pre>
        <CalloutBox type="note">
          Subscribe to this event by adding <Code>"{event}"</Code> to <Code>webhook_events</Code> on your session.
        </CalloutBox>
      </>
    ),
  };
}

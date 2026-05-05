export type NavItem = {
  title: string;
  slug: string;
  isNew?: boolean;
};

export type NavCategory = {
  label: string;
  items: NavItem[];
};

export const navigation: NavCategory[] = [
  {
    label: "Getting Started",
    items: [
      { title: "Getting Started with WaReply AI", slug: "getting-started/intro" },
      { title: "Using Our API with Postman", slug: "getting-started/postman" },
      { title: "How To Receive Messages and Media", slug: "getting-started/receive-messages" },
      { title: "Model Context Protocol (MCP) Integration", slug: "getting-started/mcp", isNew: true },
      { title: "Using Proxies", slug: "getting-started/proxies", isNew: true },
      { title: "n8n Integration (Community Node)", slug: "getting-started/n8n", isNew: true },
    ],
  },
  {
    label: "Developer SDKs",
    items: [{ title: "Official SDKs – Node.js, Python & Laravel", slug: "sdks/official" }],
  },
  {
    label: "Authentication",
    items: [
      { title: "Authenticate Using Personal Access Token", slug: "auth/personal-access-token" },
      { title: "Authenticate Using Bearer Tokens", slug: "auth/bearer-tokens" },
    ],
  },
  {
    label: "Sessions",
    items: [
      { title: "Get All WhatsApp Sessions", slug: "sessions/get-all" },
      { title: "Create WhatsApp Session", slug: "sessions/create" },
      { title: "Get WhatsApp Session Details", slug: "sessions/get-details" },
      { title: "Update WhatsApp Session", slug: "sessions/update" },
      { title: "Get WhatsApp Session Status", slug: "sessions/status" },
      { title: "Delete WhatsApp Session", slug: "sessions/delete" },
      { title: "Restart WhatsApp Session", slug: "sessions/restart" },
      { title: "Connect WhatsApp Session", slug: "sessions/connect" },
      { title: "Get Message Logs", slug: "sessions/message-logs" },
      { title: "Get WhatsApp Session QR Code", slug: "sessions/qrcode" },
      { title: "Get Session Logs", slug: "sessions/session-logs" },
      { title: "Disconnect WhatsApp Session", slug: "sessions/disconnect" },
      { title: "Get Session User Info", slug: "sessions/user-info" },
      { title: "Check if Number is on WhatsApp", slug: "sessions/on-whatsapp" },
      { title: "Regenerate API Key", slug: "sessions/regenerate-key" },
      { title: "Send Presence Update", slug: "sessions/presence" },
    ],
  },
  {
    label: "Messages",
    items: [
      { title: "Decrypt Media File", slug: "messages/decrypt-media" },
      { title: "Upload Media File", slug: "messages/upload" },
      { title: "Send Text Message", slug: "messages/send-text" },
      { title: "Send Image Message", slug: "messages/send-image" },
      { title: "Send Video Message", slug: "messages/send-video" },
      { title: "Send Document Message", slug: "messages/send-document" },
      { title: "Send Audio Message", slug: "messages/send-audio" },
      { title: "Send Sticker Message", slug: "messages/send-sticker" },
      { title: "Send Contact Card", slug: "messages/send-contact" },
      { title: "Send Location", slug: "messages/send-location" },
      { title: "Resend Failed Message", slug: "messages/resend" },
      { title: "Send Poll Message", slug: "messages/send-poll" },
      { title: "Send Quoted Message", slug: "messages/send-quoted" },
      { title: "Edit a Message", slug: "messages/edit" },
      { title: "Get Message Info", slug: "messages/info" },
      { title: "Delete a Message", slug: "messages/delete" },
      { title: "Mark Message as Read", slug: "messages/mark-read", isNew: true },
      { title: "Send View Once Message", slug: "messages/view-once" },
    ],
  },
  {
    label: "Contacts",
    items: [
      { title: "Get Contact Info", slug: "contacts/get-info" },
      { title: "Get All Contacts", slug: "contacts/get-all" },
      { title: "Get Contact Profile Picture", slug: "contacts/picture" },
      { title: "Block Contact", slug: "contacts/block" },
      { title: "Unblock Contact", slug: "contacts/unblock" },
      { title: "Create or Update Contact", slug: "contacts/upsert" },
      { title: "Get LID from Phone Number", slug: "contacts/lid-from-pn" },
      { title: "Get Phone Number from LID", slug: "contacts/pn-from-lid" },
    ],
  },
  {
    label: "Groups",
    items: [
      { title: "Create a New Group", slug: "groups/create" },
      { title: "Get All Groups", slug: "groups/get-all" },
      { title: "Get Group Metadata", slug: "groups/metadata" },
      { title: "Send Group Message", slug: "groups/send-message" },
      { title: "Update Group Participants", slug: "groups/update-participants" },
      { title: "Get Group Participants", slug: "groups/get-participants" },
      { title: "Send Message with Mentions", slug: "groups/send-mentions" },
      { title: "Add Group Participants", slug: "groups/add-participants" },
      { title: "Remove Group Participants", slug: "groups/remove-participants" },
      { title: "Get Group Profile Picture", slug: "groups/picture" },
      { title: "Update Group Settings", slug: "groups/settings" },
      { title: "Get Group Invite Link", slug: "groups/invite-link" },
      { title: "Get Group Invite Info", slug: "groups/invite-info" },
      { title: "Accept Group Invite", slug: "groups/accept-invite" },
      { title: "Leave Group", slug: "groups/leave" },
    ],
  },
  {
    label: "Channels (Communities)",
    items: [{ title: "Send Channel Message", slug: "channels/send" }],
  },
  {
    label: "Webhooks",
    items: [
      { title: "Webhook Setup", slug: "webhooks/setup" },
      { title: "Webhook: Message Received", slug: "webhooks/message-received" },
      { title: "Webhook: Message Upsert", slug: "webhooks/message-upsert" },
      { title: "Webhook: Message Status Update", slug: "webhooks/message-status" },
      { title: "Webhook: Message Sent", slug: "webhooks/message-sent" },
      { title: "Webhook: Message Deleted", slug: "webhooks/message-deleted" },
      { title: "Webhook: Message Reaction", slug: "webhooks/message-reaction" },
      { title: "Webhook: Message Receipt Update", slug: "webhooks/message-receipt" },
      { title: "Webhook: Group Message Received", slug: "webhooks/group-message" },
      { title: "Webhook: Newsletter Message Received", slug: "webhooks/newsletter-message" },
      { title: "Webhook: Personal Message Received", slug: "webhooks/personal-message" },
      { title: "Webhook: Poll Results", slug: "webhooks/poll-results" },
      { title: "Webhook: Session Status", slug: "webhooks/session-status" },
      { title: "Webhook: QR Code Updated", slug: "webhooks/qr-updated" },
      { title: "Webhook: Contact Update", slug: "webhooks/contact-update" },
      { title: "Webhook: Contact Upsert", slug: "webhooks/contact-upsert" },
      { title: "Webhook: Group Upsert", slug: "webhooks/group-upsert" },
      { title: "Webhook: Group Update", slug: "webhooks/group-update" },
      { title: "Webhook: Group Participants Update", slug: "webhooks/group-participants-update" },
      { title: "Webhook: Chat Update", slug: "webhooks/chat-update" },
      { title: "Webhook: Chat Upsert", slug: "webhooks/chat-upsert" },
      { title: "Webhook: Chat Delete", slug: "webhooks/chat-delete" },
      { title: "Webhook: Call Received", slug: "webhooks/call-received" },
    ],
  },
  {
    label: "Responses & Errors",
    items: [
      { title: "Response Headers", slug: "responses/headers" },
      { title: "Error Responses", slug: "responses/errors" },
    ],
  },
  {
    label: "Rate Limits",
    items: [{ title: "Understanding Rate Limits", slug: "rate-limits/overview" }],
  },
];

export const flatNav: { slug: string; title: string; category: string }[] = navigation.flatMap((c) =>
  c.items.map((i) => ({ slug: i.slug, title: i.title, category: c.label })),
);

export function getPrevNext(slug: string) {
  const idx = flatNav.findIndex((i) => i.slug === slug);
  return {
    prev: idx > 0 ? flatNav[idx - 1] : null,
    next: idx >= 0 && idx < flatNav.length - 1 ? flatNav[idx + 1] : null,
  };
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type Param = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type ResponseExample = {
  label: string;
  status?: "success" | "error";
  body: string;
};

export type EndpointDoc = {
  slug: string;
  category: string;
  title: string;
  method: HttpMethod;
  path: string;
  baseUrl?: string;
  oneLiner: string;
  description: string;
  authNote?: "session" | "personal";
  params?: Param[];
  exampleBody?: Record<string, unknown>;
  responses: ResponseExample[];
};

const successData = {
  success: true,
  data: { msgId: 100000, jid: "+1234567890", status: "in_progress" },
};

const unauthorized: ResponseExample = {
  label: "Error Response (Unauthorized)",
  status: "error",
  body: JSON.stringify({ success: false, message: "Unauthorized. Invalid or missing API key." }, null, 2),
};

const sessionObject = {
  success: true,
  data: {
    id: 1,
    name: "Business WhatsApp",
    phone_number: "+1234567890",
    status: "connected",
    account_protection: true,
    log_messages: true,
    webhook_url: "https://example.com/webhook",
    webhook_enabled: true,
    webhook_events: ["messages.received", "session.status"],
    api_key: "75075a7bf64...",
    webhook_secret: "fb61be02...",
    created_at: "2025-04-01T12:00:00Z",
    updated_at: "2025-05-08T15:30:00Z",
  },
};

const paginated = {
  success: true,
  data: {
    current_page: 1,
    data: [],
    from: 1,
    last_page: 5,
    next_page_url: "/api/...?page=2",
    per_page: 10,
    total: 15,
  },
};

const sendStandard = (path: string, fields: Param[] = [], body: Record<string, unknown> = {}): Pick<EndpointDoc, "params" | "exampleBody" | "responses"> => ({
  params: [
    { name: "to", type: "string", required: true, description: "Recipient phone number in E.164 format or, Group JID." },
    ...fields,
  ],
  exampleBody: { to: "+1234567890", ...body },
  responses: [
    { label: "Success Response", status: "success", body: JSON.stringify(successData, null, 2) },
    unauthorized,
  ],
});

const paginationParams: Param[] = [
  { name: "whatsappSession", type: "string", required: true, description: "ID of the WhatsApp session." },
  { name: "page", type: "integer", required: false, description: "Page number for pagination. Default: 1." },
  { name: "per_page", type: "integer", required: false, description: "Number of results per page. Default: 10." },
];

export const endpoints: EndpointDoc[] = [
  // ---------------- SESSIONS ----------------
  {
    slug: "sessions/get-all", category: "Sessions", title: "Get All WhatsApp Sessions",
    method: "GET", path: "/api/whatsapp-sessions", authNote: "personal",
    oneLiner: "Retrieves a list of all WhatsApp sessions available to the authenticated user.",
    description: "Returns every WhatsApp session that belongs to the authenticated account along with status, webhook configuration and metadata. No request body or query parameters are required.",
    responses: [
      { label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: [sessionObject.data] }, null, 2) },
      unauthorized,
    ],
  },
  {
    slug: "sessions/create", category: "Sessions", title: "Create WhatsApp Session",
    method: "POST", path: "/api/whatsapp-sessions", authNote: "personal",
    oneLiner: "Creates a new WhatsApp session with the provided details. Requires an active subscription.",
    description: "Creates a new WhatsApp session. The `name` and `phone_number` fields are required. Webhook fields are optional and can be updated later.",
    params: [
      { name: "name", type: "string", required: true, description: "A friendly display name for the session." },
      { name: "phone_number", type: "string", required: true, description: "Phone number in E.164 format." },
      { name: "account_protection", type: "boolean", required: false, description: "Enable account protection mode (slower send rate)." },
      { name: "log_messages", type: "boolean", required: false, description: "Persist message logs for this session." },
      { name: "webhook_url", type: "string", required: false, description: "URL where webhook events will be delivered." },
      { name: "webhook_enabled", type: "boolean", required: false, description: "Whether webhook delivery is enabled." },
      { name: "webhook_events", type: "string[]", required: false, description: "List of event names to subscribe to." },
    ],
    exampleBody: { name: "Business WhatsApp", phone_number: "+1234567890", account_protection: true, log_messages: true },
    responses: [
      { label: "Success Response", status: "success", body: JSON.stringify(sessionObject, null, 2) },
      unauthorized,
    ],
  },
  {
    slug: "sessions/get-details", category: "Sessions", title: "Get WhatsApp Session Details",
    method: "GET", path: "/api/whatsapp-sessions/{id}", authNote: "personal",
    oneLiner: "Retrieves details for a specific WhatsApp session.",
    description: "Returns the full session object including configuration, webhook setup and connection status for the session identified by `{id}`.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify(sessionObject, null, 2) }, unauthorized],
  },
  {
    slug: "sessions/update", category: "Sessions", title: "Update WhatsApp Session",
    method: "PUT", path: "/api/whatsapp-sessions/{id}", authNote: "personal",
    oneLiner: "Updates details for a specific WhatsApp session.",
    description: "Updates the configuration of an existing WhatsApp session. All body fields are optional — only provided fields will be updated.",
    params: [
      { name: "name", type: "string", required: false, description: "A friendly display name for the session." },
      { name: "phone_number", type: "string", required: false, description: "Phone number in E.164 format." },
      { name: "account_protection", type: "boolean", required: false, description: "Enable account protection mode." },
      { name: "log_messages", type: "boolean", required: false, description: "Persist message logs." },
      { name: "webhook_url", type: "string", required: false, description: "URL where webhook events are delivered." },
      { name: "webhook_enabled", type: "boolean", required: false, description: "Whether webhook delivery is enabled." },
      { name: "webhook_events", type: "string[]", required: false, description: "List of subscribed event names." },
    ],
    exampleBody: { name: "Updated Name", webhook_enabled: true, webhook_events: ["messages.received"] },
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify(sessionObject, null, 2) }, unauthorized],
  },
  {
    slug: "sessions/status", category: "Sessions", title: "Get WhatsApp Session Status",
    method: "GET", path: "/api/status",
    oneLiner: "Returns the current status of the connected WhatsApp session.",
    description: "Returns the runtime status of the session associated with the API Key. Useful for verifying connectivity before issuing send requests.",
    responses: [
      { label: "Session Connected Response", status: "success", body: JSON.stringify({ success: true, data: { status: "connected" } }, null, 2) },
      { label: "Session Needs Scan Response", status: "success", body: JSON.stringify({ success: true, data: { status: "need_scan" } }, null, 2) },
      { label: "Session Logged out Response", status: "success", body: JSON.stringify({ success: true, data: { status: "logged_out" } }, null, 2) },
      { label: "Session Expired Response", status: "success", body: JSON.stringify({ success: true, data: { status: "expired" } }, null, 2) },
      { label: "Session Disconnected", status: "success", body: JSON.stringify({ success: true, data: { status: "disconnected" } }, null, 2) },
    ],
  },
  {
    slug: "sessions/delete", category: "Sessions", title: "Delete WhatsApp Session",
    method: "DELETE", path: "/api/whatsapp-sessions/{id}", authNote: "personal",
    oneLiner: "Deletes a specific WhatsApp session.",
    description: "Permanently removes the WhatsApp session identified by `{id}`. This action is irreversible.",
    responses: [{ label: "Success Response (204 No content)", status: "success", body: "{}" }, unauthorized],
  },
  {
    slug: "sessions/restart", category: "Sessions", title: "Restart WhatsApp Session",
    method: "POST", path: "/api/whatsapp-sessions/{id}/restart", authNote: "personal",
    oneLiner: "Restarts a specific, currently connected WhatsApp session.",
    description: "Restarts the worker process for a connected session. Use this to recover from transient issues without re-scanning the QR code.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, message: "Session restarted." }, null, 2) }, unauthorized],
  },
  {
    slug: "sessions/connect", category: "Sessions", title: "Connect WhatsApp Session",
    method: "POST", path: "/api/whatsapp-sessions/{id}/connect", authNote: "personal",
    oneLiner: "Initiates the connection process for a WhatsApp session. Requires an active subscription.",
    description: "Starts the connection flow for a session. After calling this endpoint, fetch the QR code endpoint to authenticate the device.",
    params: [{ name: "qr_as_image", type: "boolean", required: false, description: "If true, the response will include the QR code as a base64 image." }],
    exampleBody: { qr_as_image: true },
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { status: "need_scan" } }, null, 2) }, unauthorized],
  },
  {
    slug: "sessions/message-logs", category: "Sessions", title: "Get Message Logs",
    method: "GET", path: "/api/whatsapp-sessions/{id}/message-logs", authNote: "personal",
    oneLiner: "Retrieves a paginated list of message logs for a specific session.",
    description: "Returns historical message activity for a session. Supports pagination via `page` and `per_page` query parameters.",
    params: paginationParams,
    responses: [{ label: "Success Response (Paginated)", status: "success", body: JSON.stringify(paginated, null, 2) }, unauthorized],
  },
  {
    slug: "sessions/qrcode", category: "Sessions", title: "Get WhatsApp Session QR Code",
    method: "GET", path: "/api/whatsapp-sessions/{id}/qrcode", authNote: "personal",
    oneLiner: "Retrieves the QR code needed to connect a WhatsApp session.",
    description: "Returns a QR code that can be scanned from the WhatsApp mobile app to authenticate the session. The QR code rotates regularly.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { qr: "data:image/png;base64,..." } }, null, 2) }, unauthorized],
  },
  {
    slug: "sessions/session-logs", category: "Sessions", title: "Get Session Logs",
    method: "GET", path: "/api/whatsapp-sessions/{id}/session-logs", authNote: "personal",
    oneLiner: "Retrieves a paginated list of session activity logs.",
    description: "Returns activity logs for the session including connection events, errors and lifecycle events. Supports pagination.",
    params: paginationParams,
    responses: [{ label: "Success Response (Paginated)", status: "success", body: JSON.stringify(paginated, null, 2) }, unauthorized],
  },
  {
    slug: "sessions/disconnect", category: "Sessions", title: "Disconnect WhatsApp Session",
    method: "POST", path: "/api/whatsapp-sessions/{id}/disconnect", authNote: "personal",
    oneLiner: "Disconnects an active WhatsApp session.",
    description: "Disconnects the active socket for a session without deleting it. The session can be reconnected later.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, message: "Session disconnected." }, null, 2) }, unauthorized],
  },
  {
    slug: "sessions/user-info", category: "Sessions", title: "Get Session User Info",
    method: "GET", path: "/api/user",
    oneLiner: "Retrieves information about the WhatsApp user associated with the current API key session.",
    description: "Returns information about the connected WhatsApp account such as JID, push name and phone number.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { jid: "1234567890@s.whatsapp.net", pushName: "Acme Bot", phone_number: "+1234567890" } }, null, 2) }, unauthorized],
  },
  {
    slug: "sessions/on-whatsapp", category: "Sessions", title: "Check if Number is on WhatsApp",
    method: "GET", path: "/api/on-whatsapp/{phone_number}",
    oneLiner: "Verifies if a given Phone Number is registered on WhatsApp.",
    description: "Checks whether the supplied phone number is reachable on WhatsApp. The phone number must be in E.164 format without the leading +.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { exists: true, jid: "1234567890@s.whatsapp.net" } }, null, 2) }, unauthorized],
  },
  {
    slug: "sessions/regenerate-key", category: "Sessions", title: "Regenerate API Key",
    method: "POST", path: "/api/whatsapp-sessions/{id}/regenerate-key", authNote: "personal",
    oneLiner: "Regenerates the API key for a specific WhatsApp session.",
    description: "Generates a new API key for the session. The previous key is invalidated immediately. Make sure to update your applications.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { api_key: "newKey123..." } }, null, 2) }, unauthorized],
  },
  {
    slug: "sessions/presence", category: "Sessions", title: "Send Presence Update",
    method: "POST", path: "/api/send-presence-update",
    oneLiner: "Sends a presence update to a specific JID to indicate user activity.",
    description: "Sends a presence indicator (typing, recording, paused, etc.) to a specific JID. Useful for emulating natural conversation behaviour.",
    params: [
      { name: "jid", type: "string", required: true, description: "Target JID to send the presence to." },
      { name: "presence", type: "string", required: true, description: "One of: `available`, `unavailable`, `composing`, `recording`, `paused`." },
    ],
    exampleBody: { jid: "1234567890@s.whatsapp.net", presence: "composing" },
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true }, null, 2) }, unauthorized],
  },

  // ---------------- MESSAGES ----------------
  {
    slug: "messages/decrypt-media", category: "Messages", title: "Decrypt Media File",
    method: "POST", path: "/api/decrypt-media",
    oneLiner: "Decrypts an encrypted media file sent in a message.",
    description: "Accepts an encrypted media payload from an incoming message and returns a decrypted, downloadable URL. The URL is valid for one hour.",
    params: [
      { name: "mediaKey", type: "string", required: true, description: "Encryption key for the media." },
      { name: "directPath", type: "string", required: true, description: "Direct path to the encrypted media." },
      { name: "mimetype", type: "string", required: true, description: "MIME type of the media." },
      { name: "mediaType", type: "string", required: true, description: "Media type: `image`, `video`, `audio`, `document`, `sticker`." },
    ],
    exampleBody: { mediaKey: "...", directPath: "/v/...", mimetype: "image/jpeg", mediaType: "image" },
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { url: "https://media.example.com/decrypted.jpg" } }, null, 2) }, unauthorized],
  },
  {
    slug: "messages/upload", category: "Messages", title: "Upload Media File",
    method: "POST", path: "/api/upload",
    oneLiner: "Uploads a media file to the server. Supports raw binary and Base64-encoded uploads.",
    description: "Uploads a media file and returns a URL that can be used in subsequent send-message calls. Supports both raw multipart binary and Base64-encoded uploads.",
    params: [
      { name: "file", type: "file|string", required: true, description: "Raw binary file or Base64-encoded string." },
      { name: "filename", type: "string", required: false, description: "Optional filename for the uploaded media." },
    ],
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { url: "https://media.example.com/abc.jpg" } }, null, 2) }, unauthorized],
  },
  {
    slug: "messages/send-text", category: "Messages", title: "Send Text Message",
    method: "POST", path: "/api/send-message",
    oneLiner: "Sends a plain text message to a recipient.",
    description: "Sends a plain text WhatsApp message. The text content is provided in the `text` field. Required when no media, contact or location is sent.",
    ...sendStandard("/api/send-message", [
      { name: "text", type: "string", required: true, description: "The text content of the message. Required if no media/contact/location is sent." },
    ], { text: "Hello from WaReply AI!" }),
  },
  {
    slug: "messages/send-image", category: "Messages", title: "Send Image Message",
    method: "POST", path: "/api/send-message",
    oneLiner: "Sends a message with an image attached via a URL.",
    description: "Sends an image message. The image is referenced by a publicly reachable URL passed in `imageUrl`. An optional caption can be included as `text`.",
    ...sendStandard("/api/send-message", [
      { name: "imageUrl", type: "string", required: true, description: "Public URL of the image to send." },
      { name: "text", type: "string", required: false, description: "Optional caption for the image." },
    ], { imageUrl: "https://example.com/image.jpg", text: "Look at this!" }),
  },
  {
    slug: "messages/send-video", category: "Messages", title: "Send Video Message",
    method: "POST", path: "/api/send-message",
    oneLiner: "Sends a message with a video attached via a URL.",
    description: "Sends a video message via a publicly reachable URL. Optionally include a caption with the `text` field.",
    ...sendStandard("/api/send-message", [
      { name: "videoUrl", type: "string", required: true, description: "Public URL of the video file." },
      { name: "text", type: "string", required: false, description: "Optional caption." },
    ], { videoUrl: "https://example.com/video.mp4" }),
  },
  {
    slug: "messages/send-document", category: "Messages", title: "Send Document Message",
    method: "POST", path: "/api/send-message",
    oneLiner: "Sends a message with a document attached via a URL.",
    description: "Sends a document message. The document is referenced by URL. Provide the optional `fileName` field to control the filename shown to the recipient.",
    ...sendStandard("/api/send-message", [
      { name: "documentUrl", type: "string", required: true, description: "Public URL of the document." },
      { name: "fileName", type: "string", required: false, description: "Filename shown to the recipient." },
    ], { documentUrl: "https://example.com/file.pdf", fileName: "Invoice.pdf" }),
  },
  {
    slug: "messages/send-audio", category: "Messages", title: "Send Audio Message",
    method: "POST", path: "/api/send-message",
    oneLiner: "Sends a message with an audio file attached via a URL.",
    description: "Sends an audio message. The audio file must be reachable via the supplied URL. Use OGG/Opus for voice notes for best compatibility.",
    ...sendStandard("/api/send-message", [
      { name: "audioUrl", type: "string", required: true, description: "Public URL of the audio file." },
    ], { audioUrl: "https://example.com/voice.ogg" }),
  },
  {
    slug: "messages/send-sticker", category: "Messages", title: "Send Sticker Message",
    method: "POST", path: "/api/send-message",
    oneLiner: "Sends a message with a sticker attached via a URL (supports .webp format).",
    description: "Sends a sticker message. Only WEBP format is supported. Maximum file size: 100KB.",
    ...sendStandard("/api/send-message", [
      { name: "stickerUrl", type: "string", required: true, description: "Public URL of the WEBP sticker." },
    ], { stickerUrl: "https://example.com/sticker.webp" }),
  },
  {
    slug: "messages/send-contact", category: "Messages", title: "Send Contact Card",
    method: "POST", path: "/api/send-message",
    oneLiner: "Sends a message containing a contact card.",
    description: "Sends a vCard-style contact to the recipient. Provide both the contact display name and phone number.",
    ...sendStandard("/api/send-message", [
      { name: "contact", type: "object", required: true, description: "Object with `name` and `phone` fields." },
    ], { contact: { name: "John Doe", phone: "+1234567890" } }),
  },
  {
    slug: "messages/send-location", category: "Messages", title: "Send Location",
    method: "POST", path: "/api/send-message",
    oneLiner: "Sends a message containing a location pin.",
    description: "Sends a geographic location to the recipient. Provide both `latitude` and `longitude`. Optional `name` and `address` are supported.",
    ...sendStandard("/api/send-message", [
      { name: "location", type: "object", required: true, description: "Object with `latitude`, `longitude` and optional `name`/`address`." },
    ], { location: { latitude: 37.7749, longitude: -122.4194, name: "San Francisco" } }),
  },
  {
    slug: "messages/resend", category: "Messages", title: "Resend Failed Message",
    method: "POST", path: "/api/messages/{message}/resend",
    oneLiner: "Initiates the resending of a previously failed message from the logs.",
    description: "Retries delivery of a previously failed message. The message must be in a failed state for the request to succeed.",
    responses: [
      { label: "Success Response", status: "success", body: JSON.stringify(successData, null, 2) },
      { label: "Error Response (Not Failed)", status: "error", body: JSON.stringify({ success: false, message: "Message is not in a failed state." }, null, 2) },
      unauthorized,
    ],
  },
  {
    slug: "messages/send-poll", category: "Messages", title: "Send Poll Message",
    method: "POST", path: "/api/send-message",
    oneLiner: "Sends a message containing a poll with multi select support.",
    description: "Sends a poll to the recipient. Provide the poll `name`, an array of `options` and `selectableCount` for multi-select polls.",
    ...sendStandard("/api/send-message", [
      { name: "poll", type: "object", required: true, description: "Object with `name`, `options[]` and `selectableCount`." },
    ], { poll: { name: "Pizza or Pasta?", options: ["Pizza", "Pasta"], selectableCount: 1 } }),
  },
  {
    slug: "messages/send-quoted", category: "Messages", title: "Send Quoted Message",
    method: "POST", path: "/api/send-message",
    oneLiner: "Sends a message that quotes or replies to a previous message.",
    description: "Sends a message that quotes a previous message. Provide the `quotedMessageId` of the original message.",
    ...sendStandard("/api/send-message", [
      { name: "text", type: "string", required: true, description: "Reply text content." },
      { name: "quotedMessageId", type: "string", required: true, description: "ID of the message being quoted." },
    ], { text: "Yes, agreed!", quotedMessageId: "3EB0..." }),
  },
  {
    slug: "messages/edit", category: "Messages", title: "Edit a Message",
    method: "PUT", path: "/api/messages/{msgId}",
    oneLiner: "Edits the text content of a previously sent message.",
    description: "Edits the body of a previously sent text message. Edits must be made within WhatsApp's allowed edit window (15 minutes).",
    params: [{ name: "text", type: "string", required: true, description: "The new text content." }],
    exampleBody: { text: "Updated message text" },
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true }, null, 2) }, unauthorized],
  },
  {
    slug: "messages/info", category: "Messages", title: "Get Message Info",
    method: "GET", path: "/api/messages/{msgId}/info",
    oneLiner: "Retrieves detailed information about a specific message.",
    description: "Returns delivery and read status information for a specific message identified by `{msgId}`.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { id: "msgid", status: 4 } }, null, 2) }, unauthorized],
  },
  {
    slug: "messages/delete", category: "Messages", title: "Delete a Message",
    method: "DELETE", path: "/api/messages/{msgId}",
    oneLiner: "Deletes a specific message for everyone.",
    description: "Deletes the specified message for everyone in the conversation. Subject to WhatsApp's deletion time window.",
    responses: [{ label: "Success Response (204 No content)", status: "success", body: "{}" }, unauthorized],
  },
  {
    slug: "messages/mark-read", category: "Messages", title: "Mark Message as Read",
    method: "POST", path: "/api/messages/read",
    oneLiner: "Marks a specific received WhatsApp message as read (blue ticks).",
    description: "Marks an incoming message as read so the sender sees blue ticks. Provide the message key of the message to mark.",
    params: [{ name: "messageKey", type: "object", required: true, description: "WhatsApp message key object identifying the message." }],
    exampleBody: { messageKey: { id: "3EB0...", remoteJid: "1234@s.whatsapp.net", fromMe: false } },
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true }, null, 2) }, unauthorized],
  },
  {
    slug: "messages/view-once", category: "Messages", title: "Send View Once Message",
    method: "POST", path: "/api/send-message",
    oneLiner: "Sends an image, video, or audio message that can only be viewed a single time.",
    description: "Sends a view-once media message. Provide the media URL and set `viewOnce` to `true`.",
    ...sendStandard("/api/send-message", [
      { name: "imageUrl", type: "string", required: false, description: "Public URL of the media." },
      { name: "viewOnce", type: "boolean", required: true, description: "Must be set to true." },
    ], { imageUrl: "https://example.com/secret.jpg", viewOnce: true }),
  },

  // ---------------- CONTACTS ----------------
  {
    slug: "contacts/get-info", category: "Contacts", title: "Get Contact Info",
    method: "GET", path: "/api/contacts/{phone}",
    oneLiner: "Retrieves detailed information for a specific contact.",
    description: "Returns the contact information stored for a specific phone number including push name and status.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { phone: "+1234567890", name: "John", status: "Hey there!" } }, null, 2) }, unauthorized],
  },
  {
    slug: "contacts/get-all", category: "Contacts", title: "Get All Contacts",
    method: "GET", path: "/api/contacts",
    oneLiner: "Retrieves a list of all contacts synced with the WhatsApp session.",
    description: "Returns the address book associated with the connected WhatsApp account.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: [] }, null, 2) }, unauthorized],
  },
  {
    slug: "contacts/picture", category: "Contacts", title: "Get Contact Profile Picture",
    method: "GET", path: "/api/contacts/{phone}/picture",
    oneLiner: "Retrieves the URL of the profile picture for a specific contact.",
    description: "Returns the profile picture URL for a contact. The URL is valid for one hour.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { url: "https://..." } }, null, 2) }, unauthorized],
  },
  {
    slug: "contacts/block", category: "Contacts", title: "Block Contact",
    method: "POST", path: "/api/contacts/{phone}/block",
    oneLiner: "Blocks a specific contact.",
    description: "Blocks the specified contact at the WhatsApp account level.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true }, null, 2) }, unauthorized],
  },
  {
    slug: "contacts/unblock", category: "Contacts", title: "Unblock Contact",
    method: "POST", path: "/api/contacts/{phone}/unblock",
    oneLiner: "Unblocks a specific contact.",
    description: "Removes a contact from the block list.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true }, null, 2) }, unauthorized],
  },
  {
    slug: "contacts/upsert", category: "Contacts", title: "Create or Update Contact",
    method: "PUT", path: "/api/contacts",
    oneLiner: "Creates or updates a contact in the session's address book.",
    description: "Creates or updates a contact entry. Provide the contact `phone` and any updatable fields.",
    params: [
      { name: "phone", type: "string", required: true, description: "Phone number in E.164 format." },
      { name: "name", type: "string", required: false, description: "Display name for the contact." },
    ],
    exampleBody: { phone: "+1234567890", name: "John Doe" },
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true }, null, 2) }, unauthorized],
  },
  {
    slug: "contacts/lid-from-pn", category: "Contacts", title: "Get LID from Phone Number",
    method: "GET", path: "/api/lid-from-pn/{pn}",
    oneLiner: "Retrieves the Link ID (LID) associated with a real phone number.",
    description: "Returns the WhatsApp LID (link identifier) for a phone number. Useful when working with newer WhatsApp identity systems.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { lid: "1234@lid" } }, null, 2) }, unauthorized],
  },
  {
    slug: "contacts/pn-from-lid", category: "Contacts", title: "Get Phone Number from LID",
    method: "GET", path: "/api/pn-from-lid/{lid}",
    oneLiner: "Retrieves the real phone number associated with a Link ID (LID).",
    description: "Reverses a LID lookup to return the underlying phone number.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { phone: "+1234567890" } }, null, 2) }, unauthorized],
  },

  // ---------------- GROUPS ----------------
  {
    slug: "groups/create", category: "Groups", title: "Create a New Group",
    method: "POST", path: "/api/groups",
    oneLiner: "Creates a new WhatsApp group with a given name and list of participants.",
    description: "Creates a new WhatsApp group. Provide the group `name` and an array of participant phone numbers.",
    params: [
      { name: "name", type: "string", required: true, description: "Group name." },
      { name: "participants", type: "string[]", required: true, description: "List of phone numbers in E.164 format." },
    ],
    exampleBody: { name: "Project Team", participants: ["+1234567890", "+1098765432"] },
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { groupJid: "1234@g.us" } }, null, 2) }, unauthorized],
  },
  {
    slug: "groups/get-all", category: "Groups", title: "Get All Groups",
    method: "GET", path: "/api/groups",
    oneLiner: "Retrieves a list of all WhatsApp groups the connected account is a member of.",
    description: "Returns all groups that the connected account is a member of.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: [] }, null, 2) }, unauthorized],
  },
  {
    slug: "groups/metadata", category: "Groups", title: "Get Group Metadata",
    method: "GET", path: "/api/groups/{groupJid}/metadata",
    oneLiner: "Retrieves metadata for a specific group (subject, description, creation date, owner).",
    description: "Returns the metadata for a group: subject, description, creation timestamp and owner.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { subject: "Team", owner: "1234@s.whatsapp.net" } }, null, 2) }, unauthorized],
  },
  {
    slug: "groups/send-message", category: "Groups", title: "Send Group Message",
    method: "POST", path: "/api/send-message",
    oneLiner: "Sends a message to a specific WhatsApp group using its Group ID.",
    description: "Sends a message to a group using its JID in the `to` field.",
    ...sendStandard("/api/send-message", [
      { name: "text", type: "string", required: true, description: "Message text." },
    ], { to: "1234@g.us", text: "Hello team!" }),
  },
  {
    slug: "groups/update-participants", category: "Groups", title: "Update Group Participants",
    method: "PUT", path: "/api/groups/{groupId}/participants/update",
    oneLiner: "Promote or demote one or more participants in a specific group.",
    description: "Promotes or demotes participants in a group. Requires admin privileges in the group.",
    params: [
      { name: "participants", type: "string[]", required: true, description: "List of participant JIDs." },
      { name: "action", type: "string", required: true, description: "One of: `promote`, `demote`." },
    ],
    exampleBody: { participants: ["1234@s.whatsapp.net"], action: "promote" },
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true }, null, 2) }, unauthorized],
  },
  {
    slug: "groups/get-participants", category: "Groups", title: "Get Group Participants",
    method: "GET", path: "/api/groups/{groupJid}/participants",
    oneLiner: "Retrieves a list of participants for a specific group.",
    description: "Returns the participant list for a group with their roles (admin/member).",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: [] }, null, 2) }, unauthorized],
  },
  {
    slug: "groups/send-mentions", category: "Groups", title: "Send Message with Mentions",
    method: "POST", path: "/api/send-message",
    oneLiner: "Sends a message to a group that specifically mentions one or more participants.",
    description: "Sends a group message and mentions specific participants by phone number.",
    ...sendStandard("/api/send-message", [
      { name: "text", type: "string", required: true, description: "Message text including @mentions." },
      { name: "mentions", type: "string[]", required: true, description: "Phone numbers to mention." },
    ], { to: "1234@g.us", text: "Hi @1234567890", mentions: ["+1234567890"] }),
  },
  {
    slug: "groups/add-participants", category: "Groups", title: "Add Group Participants",
    method: "POST", path: "/api/groups/{groupId}/participants/add",
    oneLiner: "Adds participants to a specific group. Requires admin privileges.",
    description: "Adds new participants to the specified group. Caller must be a group admin.",
    params: [{ name: "participants", type: "string[]", required: true, description: "Phone numbers to add." }],
    exampleBody: { participants: ["+1234567890"] },
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true }, null, 2) }, unauthorized],
  },
  {
    slug: "groups/remove-participants", category: "Groups", title: "Remove Group Participants",
    method: "POST", path: "/api/groups/{groupId}/participants/remove",
    oneLiner: "Removes participants from a specific group. Requires admin privileges.",
    description: "Removes participants from the specified group. Caller must be a group admin.",
    params: [{ name: "participants", type: "string[]", required: true, description: "Phone numbers to remove." }],
    exampleBody: { participants: ["+1234567890"] },
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true }, null, 2) }, unauthorized],
  },
  {
    slug: "groups/picture", category: "Groups", title: "Get Group Profile Picture",
    method: "GET", path: "/api/groups/{groupJid}/picture",
    oneLiner: "Retrieves the URL of the profile picture for a specific group.",
    description: "Returns the group profile picture URL. The URL is valid for one hour.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { url: "https://..." } }, null, 2) }, unauthorized],
  },
  {
    slug: "groups/settings", category: "Groups", title: "Update Group Settings",
    method: "PUT", path: "/api/groups/{groupId}/settings",
    oneLiner: "Updates settings for a specific group (subject, description, announce mode, restrict mode).",
    description: "Updates the configurable settings of a group. All fields are optional.",
    params: [
      { name: "subject", type: "string", required: false, description: "Group subject (name)." },
      { name: "description", type: "string", required: false, description: "Group description." },
      { name: "announce", type: "boolean", required: false, description: "If true, only admins can send messages." },
      { name: "restrict", type: "boolean", required: false, description: "If true, only admins can edit group info." },
    ],
    exampleBody: { subject: "Renamed", announce: true },
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true }, null, 2) }, unauthorized],
  },
  {
    slug: "groups/invite-link", category: "Groups", title: "Get Group Invite Link",
    method: "GET", path: "/api/groups/{groupJid}/invite-link",
    oneLiner: "Retrieves the invite link for a specific WhatsApp group.",
    description: "Returns the current invite link for a group. Caller must be a group admin.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { inviteLink: "https://chat.whatsapp.com/..." } }, null, 2) }, unauthorized],
  },
  {
    slug: "groups/invite-info", category: "Groups", title: "Get Group Invite Info",
    method: "GET", path: "/api/groups/invite/{inviteCode}",
    oneLiner: "Retrieves metadata for a group from its invite code.",
    description: "Returns information about a group from a public invite code.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { subject: "Group", participantsCount: 23 } }, null, 2) }, unauthorized],
  },
  {
    slug: "groups/accept-invite", category: "Groups", title: "Accept Group Invite",
    method: "POST", path: "/api/groups/invite/accept",
    oneLiner: "Accepts a group invitation using an invite code.",
    description: "Joins a group using an invite code obtained from a group invite link.",
    params: [{ name: "inviteCode", type: "string", required: true, description: "Invite code." }],
    exampleBody: { inviteCode: "abc123" },
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true, data: { groupJid: "1234@g.us" } }, null, 2) }, unauthorized],
  },
  {
    slug: "groups/leave", category: "Groups", title: "Leave Group",
    method: "POST", path: "/api/groups/{groupId}/leave",
    oneLiner: "Leaves a specific group that the user is a member of.",
    description: "Leaves the specified group.",
    responses: [{ label: "Success Response", status: "success", body: JSON.stringify({ success: true }, null, 2) }, unauthorized],
  },

  // ---------------- CHANNELS ----------------
  {
    slug: "channels/send", category: "Channels (Communities)", title: "Send Channel Message",
    method: "POST", path: "/api/send-message",
    oneLiner: "Sends a message to a WhatsApp Channel (community).",
    description: "Sends a message to a WhatsApp Channel using the channel JID in the `to` field. Only admins of the channel can post.",
    ...sendStandard("/api/send-message", [
      { name: "text", type: "string", required: true, description: "Channel message text." },
    ], { to: "1234@newsletter", text: "Channel update!" }),
  },
];

export const endpointsBySlug: Record<string, EndpointDoc> = Object.fromEntries(endpoints.map((e) => [e.slug, e]));

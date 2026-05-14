import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { gatewayBaseVariants, looksLikeCustomerPhone, looksLikeSendableRecipient, resolveCustomerNumber } from "./index.ts";

Deno.test("accepts any 8-15 digit string as a possible customer phone", () => {
  // WhatsApp 15-digit LID ids that start with 23/13 are not sendable customer phones.
  assertEquals(looksLikeCustomerPhone("231872433004727"), false);
  assertEquals(looksLikeCustomerPhone("132543412175084"), false);
  assertEquals(looksLikeCustomerPhone("8801739049039"), true);
  assertEquals(looksLikeCustomerPhone("01739049039"), true);
});

Deno.test("looksLikeSendableRecipient accepts customer phone strings", () => {
  assertEquals(looksLikeSendableRecipient("8801739049039"), true);
});

Deno.test("prefers nested @s.whatsapp.net jid over top-level Baileys id", () => {
  // body.from is a Baileys-generated id; raw_payload.key.remoteJid carries the real customer.
  assertEquals(
    resolveCustomerNumber({
      from: "231872433004727",
      raw_payload: { key: { remoteJid: "8801739049039@s.whatsapp.net", fromMe: false } },
    }, "8801948695672"),
    "8801739049039",
  );
});

Deno.test("prefers cleanedSenderPn when remoteJid is a WhatsApp LID", () => {
  assertEquals(
    resolveCustomerNumber({
      from: "231872433004727",
      raw_payload: { key: { remoteJid: "231872433004727@lid", cleanedSenderPn: "8801739049039", senderPn: "8801739049039@s.whatsapp.net", fromMe: false } },
    }, "8801948695672"),
    "8801739049039",
  );
});

Deno.test("does not treat @lid remoteJid digits as a sendable phone when senderPn is present", () => {
  assertEquals(
    resolveCustomerNumber({
      raw_payload: {
        key: {
          remoteJid: "254872603640004@lid",
          senderPn: "971566652315@s.whatsapp.net",
          cleanedSenderPn: "971566652315",
          senderLid: "254872603640004@lid",
        },
      },
    }, null),
    "971566652315",
  );
});

Deno.test("excludes the connected session's own phone from candidates", () => {
  assertEquals(
    resolveCustomerNumber({
      from: "8801948695672",
      raw_payload: { key: { remoteJid: "8801739049039@s.whatsapp.net", fromMe: false } },
    }, "8801948695672"),
    "8801739049039",
  );
});

Deno.test("supports Baileys pn/lid alternate jid fields", () => {
  assertEquals(
    resolveCustomerNumber({
      from: "231872433004727",
      raw_payload: { key: { remoteJidAlt: "8801739049039@s.whatsapp.net", participantAlt: "8801948695672@s.whatsapp.net" } },
    }, "8801948695672"),
    "8801739049039",
  );
});

Deno.test("falls back to body.from when no trusted jid present", () => {
  // No @s.whatsapp.net anywhere — accept the digits as-is so the gateway can route.
  assertEquals(
    resolveCustomerNumber({ from: "8801739049039" }, "8801948695672"),
    "8801739049039",
  );
});

Deno.test("read receipt gateway base also tries root when WHATSAPP_GATEWAY_URL contains /waapi", () => {
  assertEquals(
    gatewayBaseVariants("https://api.wareplyai.com/waapi"),
    ["https://api.wareplyai.com/waapi", "https://api.wareplyai.com"],
  );
});

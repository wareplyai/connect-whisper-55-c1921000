import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { looksLikeCustomerPhone, resolveCustomerNumber } from "./index.ts";

Deno.test("rejects Baileys generated message ids as recipients", () => {
  assertEquals(looksLikeCustomerPhone("231872433004727"), false);
  assertEquals(looksLikeCustomerPhone("52334780534993"), false);
});

Deno.test("accepts real Bangladesh WhatsApp phone numbers", () => {
  assertEquals(looksLikeCustomerPhone("8801739049039"), true);
  assertEquals(looksLikeCustomerPhone("01739049039"), true);
});

Deno.test("prefers nested real customer jid over top-level Baileys message id", () => {
  assertEquals(
    resolveCustomerNumber({
      from: "231872433004727",
      raw_payload: { key: { remoteJid: "8801739049039@s.whatsapp.net", fromMe: false } },
    }, "8801948695672"),
    "8801739049039",
  );
});

Deno.test("does not resolve the connected session phone as the customer", () => {
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

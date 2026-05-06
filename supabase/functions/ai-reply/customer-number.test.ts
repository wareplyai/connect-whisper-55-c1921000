import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { looksLikeCustomerPhone } from "./index.ts";

Deno.test("rejects Baileys generated message ids as recipients", () => {
  assertEquals(looksLikeCustomerPhone("231872433004727"), false);
  assertEquals(looksLikeCustomerPhone("52334780534993"), false);
});

Deno.test("accepts real Bangladesh WhatsApp phone numbers", () => {
  assertEquals(looksLikeCustomerPhone("8801739049039"), true);
  assertEquals(looksLikeCustomerPhone("01739049039"), true);
});

// Generates an enhanced professional system prompt for a business using
// the Lovable AI Gateway (global LOVABLE_API_KEY). Capped at ~2000 output tokens.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const business = body.business ?? {};
    const products = Array.isArray(body.products) ? body.products.slice(0, 30) : [];
    const baseInstructions = String(body.baseInstructions || "").slice(0, 6000);

    const productList = products.length
      ? products.map((p: any) => {
          const parts = [p.name];
          if (p.price) parts.push(`${p.price} ${p.currency || "tk"}`);
          if (p.stock !== null && p.stock !== undefined && p.stock !== "") parts.push(`stock: ${p.stock}`);
          if (p.category) parts.push(p.category);
          return `- ${parts.join(" — ")}`;
        }).join("\n")
      : "(no products)";

    const businessSummary = `Name: ${business.name || "(unnamed)"}
Type: ${business.business_type || "N/A"}
Description: ${business.description || "N/A"}
Location: ${business.location || "N/A"}
Working Hours: ${business.working_hours || "N/A"}
Contact: ${business.contact || "N/A"}
Website: ${business.website || "N/A"}

PRODUCTS:
${productList}`;

    const userPrompt = `You are an expert prompt engineer. Build a POLISHED, PROFESSIONAL WhatsApp customer-support system prompt for the business below.

RULES you MUST follow when writing the prompt:
1. Start with the "CORE INSTRUCTIONS" block I provide verbatim (do not rewrite it, do not shorten it).
2. Then add a clean "BUSINESS PROFILE" section using the real data below.
3. Then add a "PRODUCT CATALOG" section (from the list I give — never invent items).
4. Then generate a "COMMON QUESTIONS & ANSWERS" section with 12–18 realistic short Q&A pairs a real customer would ask THIS specific business (price, availability, delivery, location, hours, contact, how to order, return/exchange, payment method, warranty, discount, size/color options, bulk order, image request, greeting, off-topic redirect, etc.). Answers must be short (1–2 lines), natural, human, and reference the actual business data where relevant.
5. Language for the Q&A section: write each answer template in BOTH pure Bangla script AND English (label them "BN:" and "EN:"). NEVER use Banglish (Bangla words in English letters).
6. No emojis anywhere. No markdown asterisks. Plain clean text.
7. End with a short "FALLBACK" block in Bangla + English for unknown questions.
8. Keep the whole prompt under ~1800 tokens. Be dense, no filler.

=== CORE INSTRUCTIONS (include verbatim at the top) ===
${baseInstructions}

=== BUSINESS DATA ===
${businessSummary}

Now output ONLY the final system prompt text. No preamble, no explanation, no code fences.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        max_tokens: 2000,
        messages: [
          { role: "system", content: "You output only the requested prompt text. No preamble." },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      let status = aiRes.status;
      let message = errText;
      if (status === 429) message = "AI rate limit reached — try again in a moment.";
      if (status === 402) message = "AI credits exhausted — please contact admin.";
      return new Response(JSON.stringify({ error: message }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const prompt = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ prompt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ai-generate-prompt error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

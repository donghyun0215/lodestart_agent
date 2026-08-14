// Server-side proxy to the Anthropic API.
// The browser calls THIS route; the API key never leaves the server.
export const runtime = "nodejs";
export const maxDuration = 300; // web-search calls take several round trips

// The only models this proxy will forward. The app runs on Haiku (Sonnet
// kept as the documented revert path). Anything else — Opus included — is
// refused HERE, server-side: on 2026-08-13 someone discovered this endpoint
// and burned ~$31 of Opus through it, which the app itself never requests.
// A whitelist kills that entire abuse class regardless of what the client
// sends.
const ALLOWED_MODELS = new Set([
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
]);
const MAX_TOKENS_CAP = 4000;
const MAX_SEARCHES_CAP = 6;

export async function POST(req) {
  try {
    const body = await req.json();

    const model = body.model || "claude-haiku-4-5-20251001";
    if (!ALLOWED_MODELS.has(model)) {
      console.warn(`[claude-proxy] refused model "${model}" from ${req.headers.get("x-forwarded-for") || "?"}`);
      return Response.json({ error: "지원하지 않는 모델입니다." }, { status: 400 });
    }

    // Same-origin gate: browsers always send an Origin/Referer for fetch()
    // from a page. Requests with a foreign origin are cross-site scripts;
    // requests with none are curl-style scripts. Not cryptographic proof,
    // but combined with the model whitelist it makes this endpoint useless
    // as a free-LLM proxy.
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const selfHost = req.headers.get("host") || "";
    if (origin && selfHost && !origin.includes(selfHost)) {
      console.warn(`[claude-proxy] refused foreign origin "${origin}"`);
      return Response.json({ error: "허용되지 않은 출처입니다." }, { status: 403 });
    }
    if (!origin) {
      console.warn(`[claude-proxy] refused no-origin request from ${req.headers.get("x-forwarded-for") || "?"}`);
      return Response.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: Math.min(Number(body.max_tokens) || 1200, MAX_TOKENS_CAP),
        messages: body.messages,
        // Matching sends the same instructions + startup profile on every one
        // of ~70 batches per run. Marking that fixed part as a cached system
        // block means only the first call pays full price; every call after
        // reads it at 1/10th cost. The part that actually changes per call
        // (the contact list) stays in `messages`, never cached.
        ...(body.system
          ? {
              system: [
                {
                  type: "text",
                  text: body.system,
                  cache_control: { type: "ephemeral" },
                },
              ],
            }
          : {}),
        // Only the note-enrichment job asks for this. Everything else (matching,
        // drafting) stays search-free so it remains fast and cheap — the model
        // is told to work from the profile and the stored notes, not the web.
        ...(body.web_search
          ? {
              tools: [
                {
                  type: "web_search_20250305",
                  name: "web_search",
                  max_uses: Math.min(Number(body.max_searches) || 4, MAX_SEARCHES_CAP),
                },
              ],
            }
          : {}),
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}

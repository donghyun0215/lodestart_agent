// Server-side proxy to the Anthropic API.
// The browser calls THIS route; the API key never leaves the server.
export const runtime = "nodejs";
export const maxDuration = 300; // web-search calls take several round trips

export async function POST(req) {
  try {
    const body = await req.json();

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model || "claude-sonnet-4-6",
        max_tokens: body.max_tokens || 1200,
        messages: body.messages,
        // Only the note-enrichment job asks for this. Everything else (matching,
        // drafting) stays search-free so it remains fast and cheap — the model
        // is told to work from the profile and the stored notes, not the web.
        ...(body.web_search
          ? {
              tools: [
                {
                  type: "web_search_20250305",
                  name: "web_search",
                  max_uses: body.max_searches || 4,
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

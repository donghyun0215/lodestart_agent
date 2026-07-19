// Sends an EXISTING Gmail draft (created via /api/gmail/draft) using
// drafts.send — the gmail.compose scope already covers this, no new
// OAuth consent needed. This is a real send: use with a confirmation
// step on the client, and keep volume capped.
export const runtime = "nodejs";

function refreshToken(rt) {
  return fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: rt,
      grant_type: "refresh_token",
    }),
  }).then((r) => r.json());
}

async function sendDraft(accessToken, draftId) {
  return fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts/send", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ id: draftId }),
  });
}

const MAX_PER_CALL = 50; // hard safety cap regardless of what the client asks for

export async function POST(req) {
  try {
    const { draftIds } = await req.json(); // [{contactId, gmailDraftId}, ...]
    if (!Array.isArray(draftIds) || !draftIds.length) {
      return new Response(JSON.stringify({ error: "no_drafts" }), { status: 400 });
    }
    const batch = draftIds.slice(0, MAX_PER_CALL);

    const cookie = req.headers.get("cookie") || "";
    const get = (k) => (cookie.match(new RegExp(`${k}=([^;]+)`)) || [])[1] || "";
    let accessToken = get("g_at");
    const refresh = get("g_rt");
    if (!accessToken && !refresh) {
      return new Response(JSON.stringify({ error: "not_connected" }), { status: 401 });
    }

    const results = [];
    for (const item of batch) {
      let res = await sendDraft(accessToken, item.gmailDraftId);
      if (res.status === 401 && refresh) {
        const r = await refreshToken(refresh);
        if (r.access_token) {
          accessToken = r.access_token;
          res = await sendDraft(accessToken, item.gmailDraftId);
        }
      }
      results.push({ contactId: item.contactId, ok: res.ok });
    }

    const headers = new Headers({ "content-type": "application/json" });
    headers.append(
      "Set-Cookie",
      `g_at=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
    );
    return new Response(JSON.stringify({ results, capped: draftIds.length > MAX_PER_CALL }), {
      status: 200,
      headers,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}

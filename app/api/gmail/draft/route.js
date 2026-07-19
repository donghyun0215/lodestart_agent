// Creates a Gmail DRAFT in the connected account. Does NOT send.
// Tammy opens Gmail, reviews the draft, and hits Send herself.
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

// Build a raw RFC-2822 message, base64url-encoded, UTF-8 safe (handles Korean).
function buildRaw({ to, subject, body }) {
  const enc = (s) =>
    "=?UTF-8?B?" + Buffer.from(s, "utf-8").toString("base64") + "?=";
  const lines = [
    `To: ${to}`,
    `Subject: ${enc(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body, "utf-8").toString("base64"),
  ];
  return Buffer.from(lines.join("\r\n"), "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createDraft(accessToken, msg) {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ message: { raw: buildRaw(msg) } }),
  });
  return res;
}

export async function POST(req) {
  try {
    const { drafts } = await req.json(); // [{to, subject, body}, ...]
    const cookie = req.headers.get("cookie") || "";
    const get = (k) =>
      (cookie.match(new RegExp(`${k}=([^;]+)`)) || [])[1] || "";
    let accessToken = get("g_at");
    const refresh = get("g_rt");

    if (!accessToken && !refresh) {
      return new Response(
        JSON.stringify({ error: "not_connected" }),
        { status: 401 }
      );
    }

    const results = [];
    for (const d of drafts) {
      let res = await createDraft(accessToken, d);
      // token expired -> refresh once and retry
      if (res.status === 401 && refresh) {
        const r = await refreshToken(refresh);
        if (r.access_token) {
          accessToken = r.access_token;
          res = await createDraft(accessToken, d);
        }
      }
      const ok = res.ok;
      let draftId = null;
      if (ok) {
        try {
          const j = await res.json();
          draftId = j.id || null;
        } catch (_) {}
      }
      results.push({ to: d.to, ok, draftId });
    }

    const headers = new Headers({ "content-type": "application/json" });
    // if we refreshed, update the cookie
    headers.append(
      "Set-Cookie",
      `g_at=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
    );
    return new Response(JSON.stringify({ results }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}

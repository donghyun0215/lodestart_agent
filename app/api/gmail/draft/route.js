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
//
// Two things here exist because Outlook taught us they must:
// 1. Base64 bodies are wrapped at 76 chars. RFC 2045 requires it; Gmail's
//    own reader forgives a single kilometre-long line, but Outlook (and some
//    Android mail apps) corrupt multibyte text when the line limit is
//    ignored — that was the "글자가 다 깨져요" bug.
// 2. The message is multipart/alternative with a plain-text part AND an
//    HTML part, so bold/underline formatting survives in every client, and
//    clients that prefer plain text still get a clean fallback.
function wrap76(b64) {
  return b64.replace(/(.{76})/g, "$1\r\n");
}

function escapeHtml(t) {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildRaw({ to, cc, subject, body, html }) {
  const enc = (s) =>
    "=?UTF-8?B?" + Buffer.from(s, "utf-8").toString("base64") + "?=";
  const boundary = "ld_" + Math.random().toString(36).slice(2);
  // Plain part: the body as given. HTML part: provided rich HTML, or the
  // plain text escaped with line breaks preserved.
  const htmlBody =
    html && html.trim()
      ? html
      : `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${escapeHtml(
          body
        ).replace(/\n/g, "<br>")}</div>`;
  const headers = [
    `To: ${to}`,
    ...(cc && cc.trim() ? [`Cc: ${cc}`] : []),
    `Subject: ${enc(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const lines = [
    ...headers,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(Buffer.from(body, "utf-8").toString("base64")),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(Buffer.from(htmlBody, "utf-8").toString("base64")),
    `--${boundary}--`,
  ];
  return Buffer.from(lines.join("\r\n"), "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Create a new draft, OR update an existing one in place when we already
// have its id. Updating matters: clicking "Gmail 초안함에 넣기" twice used
// to leave two separate drafts in Gmail for the same contact, and we'd only
// track the newest one — so if the person sent the older copy, our
// "has this draft disappeared?" check kept saying "still there".
async function upsertDraft(accessToken, msg, existingDraftId) {
  const url = existingDraftId
    ? `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${existingDraftId}`
    : "https://gmail.googleapis.com/gmail/v1/users/me/drafts";
  return fetch(url, {
    method: existingDraftId ? "PUT" : "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ message: { raw: buildRaw(msg) } }),
  });
}

export async function POST(req) {
  try {
    const { drafts } = await req.json(); // [{to, cc, subject, body, html}, ...]
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
      let res = await upsertDraft(accessToken, d, d.existingDraftId);
      // token expired -> refresh once and retry
      if (res.status === 401 && refresh) {
        const r = await refreshToken(refresh);
        if (r.access_token) {
          accessToken = r.access_token;
          res = await upsertDraft(accessToken, d, d.existingDraftId);
        }
      }
      // The draft we tried to update is gone (already sent, or deleted by
      // hand) -> fall back to creating a fresh one.
      if (res.status === 404 && d.existingDraftId) {
        res = await upsertDraft(accessToken, d, null);
      }
      const ok = res.ok;
      let draftId = null;
      let threadId = null;
      if (ok) {
        try {
          const j = await res.json();
          draftId = j.id || null;
          threadId = j.message?.threadId || null;
        } catch (_) {}
      }
      results.push({ to: d.to, ok, draftId, threadId });
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

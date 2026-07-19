// Detects two things without ever modifying anything in Gmail:
//
// 1. "Sent" — was checked by asking whether the draft we created still
//    exists. Once a draft is sent (whether the person clicked our in-app
//    "지금 발송" button OR opened Gmail themselves and hit Send), Gmail
//    deletes the draft object and turns it into a normal sent message.
//    So drafts.get() returning 404 means "this went out".
//
// 2. "Replied" — was checked by looking at the thread. Our own outgoing
//    message carries the SENT label. Any other message in the same
//    thread that does NOT carry SENT is an incoming message, i.e. a reply.
//
// Read-only: only calls drafts.get and threads.get. Never writes.
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

async function draftExists(token, draftId) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  if (res.status === 404) return { exists: false, authFail: false, status: 404 };
  if (res.status === 401) return { exists: null, authFail: true, status: 401 };
  return { exists: res.ok, authFail: false, status: res.status };
}

async function threadHasReply(token, threadId) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=minimal`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  if (res.status === 401) return { replied: null, authFail: true, count: "auth-fail" };
  if (!res.ok) return { replied: false, authFail: false, count: `http-${res.status}` };
  const j = await res.json();
  // A reply always appends a genuinely new message to the thread, so the
  // message COUNT is the reliable signal — not labels. (Checking for a
  // missing "SENT" label was wrong: an unsent draft's own placeholder
  // message also lacks "SENT", which made every un-sent draft look like
  // it already had a reply.)
  const count = (j.messages || []).length;
  return { replied: count > 1, authFail: false, count };
}

export async function POST(req) {
  try {
    const { items } = await req.json(); // [{contactId, gmailDraftId, threadId}, ...]
    const cookie = req.headers.get("cookie") || "";
    const get = (k) => (cookie.match(new RegExp(`${k}=([^;]+)`)) || [])[1] || "";
    let accessToken = get("g_at");
    const refresh = get("g_rt");
    if (!accessToken && !refresh) {
      return new Response(JSON.stringify({ error: "not_connected" }), { status: 401 });
    }

    const refreshIfNeeded = async () => {
      if (!refresh) return false;
      const r = await refreshToken(refresh);
      if (r.access_token) {
        accessToken = r.access_token;
        return true;
      }
      return false;
    };

    const results = [];
    for (const item of items || []) {
      let sent = null;
      let replied = null;
      const debug = { draftId: item.gmailDraftId, threadId: item.threadId };

      if (item.gmailDraftId) {
        let d = await draftExists(accessToken, item.gmailDraftId);
        if (d.authFail && (await refreshIfNeeded())) {
          d = await draftExists(accessToken, item.gmailDraftId);
        }
        debug.draftStatus = d.status; // 404 = sent/deleted, 200 = still a draft
        if (d.exists !== null) sent = !d.exists; // draft gone -> it was sent
      } else {
        debug.draftStatus = "no-draft-id-stored";
      }

      if (item.threadId) {
        let t = await threadHasReply(accessToken, item.threadId);
        if (t.authFail && (await refreshIfNeeded())) {
          t = await threadHasReply(accessToken, item.threadId);
        }
        debug.messageCount = t.count;
        if (t.replied !== null) replied = t.replied;
      } else {
        debug.messageCount = "no-thread-id-stored";
      }

      results.push({ contactId: item.contactId, sent, replied, debug });
    }

    const headers = new Headers({ "content-type": "application/json" });
    headers.append(
      "Set-Cookie",
      `g_at=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
    );
    return new Response(JSON.stringify({ results }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}

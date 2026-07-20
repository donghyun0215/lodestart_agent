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

// Look at the thread and decide both questions from its messages.
//
// Why not just check whether the draft still exists? Because drafts.get was
// observed returning 200 for drafts that had already been sent, so it can't
// be trusted. The SENT label is direct evidence: Gmail attaches it the
// moment a message actually goes out, and never to an unsent draft.
//
//   draft, not sent  -> 1 message, no SENT label
//   sent, no reply   -> 1 message, HAS SENT label
//   sent + replied   -> 2+ messages, at least one SENT
async function inspectThread(token, threadId) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=From`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  if (res.status === 401) return { authFail: true, status: 401 };
  if (!res.ok) return { authFail: false, status: res.status };
  const j = await res.json();
  const msgs = j.messages || [];
  const sentMsgs = msgs.filter((m) => (m.labelIds || []).includes("SENT"));
  const incoming = msgs.filter((m) => !(m.labelIds || []).includes("SENT"));
  return {
    authFail: false,
    status: 200,
    count: msgs.length,
    sent: sentMsgs.length > 0,
    // Only count incoming mail as a reply once we've actually sent something,
    // otherwise the unsent draft itself would look like an incoming message.
    replied: sentMsgs.length > 0 && incoming.length > 0,
  };
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

      // Primary signal: the thread. Authoritative for both questions.
      if (item.threadId) {
        let t = await inspectThread(accessToken, item.threadId);
        if (t.authFail && (await refreshIfNeeded())) {
          t = await inspectThread(accessToken, item.threadId);
        }
        debug.threadStatus = t.status;
        debug.messageCount = t.count;
        debug.sentLabelFound = t.sent;
        if (t.status === 200) {
          sent = t.sent;
          replied = t.replied;
        }
      } else {
        debug.threadStatus = "no-thread-id-stored";
      }

      // Fallback only when we have no thread id: a vanished draft implies
      // it was sent.
      if (sent === null && item.gmailDraftId) {
        let d = await draftExists(accessToken, item.gmailDraftId);
        if (d.authFail && (await refreshIfNeeded())) {
          d = await draftExists(accessToken, item.gmailDraftId);
        }
        debug.draftStatus = d.status;
        if (d.exists !== null) sent = !d.exists;
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

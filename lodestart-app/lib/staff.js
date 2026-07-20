// Shared "is this a Lodestart staff account?" logic.
//
// Why this exists: the contact database holds names, job titles and work
// email addresses of real people. Under Singapore's PDPA that is personal
// data, so bulk export has to be limited to the company's own staff rather
// than to anyone who happens to open the app.
//
// Identity comes from the Gmail OAuth cookie the user already has — we ask
// Google whose mailbox it is, and compare the domain. Nothing is trusted
// from the client.

const DEFAULT_DOMAINS = ["lodestart.ai"];

export function staffDomains() {
  const raw = process.env.STAFF_EMAIL_DOMAINS || "";
  const list = raw
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  return list.length ? list : DEFAULT_DOMAINS;
}

// Extra individual addresses allowed regardless of domain (e.g. a
// consultant on a gmail.com address). Comma-separated env var.
function allowlist() {
  return (process.env.STAFF_EMAIL_ALLOWLIST || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function readCookie(cookieHeader, name) {
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(cookieHeader || "");
  return m ? decodeURIComponent(m[1]) : "";
}

async function refreshToken(rt) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: rt,
      grant_type: "refresh_token",
    }),
  });
  return r.json();
}

async function getProfileEmail(token) {
  const r = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    { headers: { authorization: `Bearer ${token}` } }
  );
  if (!r.ok) return { email: "", status: r.status };
  const j = await r.json();
  return { email: (j.emailAddress || "").toLowerCase(), status: 200 };
}

// Returns { email, staff }. Never throws — a failure just means "not staff".
export async function resolveAccount(cookieHeader) {
  try {
    let token = readCookie(cookieHeader, "g_at");
    let res = token ? await getProfileEmail(token) : { email: "", status: 401 };

    // Access token expires after an hour; fall back to the refresh token.
    if (res.status === 401) {
      const rt = readCookie(cookieHeader, "g_rt");
      if (rt) {
        const t = await refreshToken(rt);
        if (t.access_token) res = await getProfileEmail(t.access_token);
      }
    }

    const email = res.email;
    if (!email) return { email: "", staff: false };
    const domain = email.split("@")[1] || "";
    const staff =
      staffDomains().includes(domain) || allowlist().includes(email);
    return { email, staff };
  } catch {
    return { email: "", staff: false };
  }
}

// Lightweight check: does the browser still hold a Gmail auth cookie, and
// WHO does it belong to?
//
// The cookies are httpOnly so client JS can't read them directly — this
// route lets the UI ask "am I actually still connected?" after a refresh,
// instead of always showing "disconnected" until the user clicks connect
// again (the cookie itself is still valid for up to 1hr / 30 days).
//
// It also reports whether the signed-in account is on a Lodestart domain.
// That flag drives whether the CSV export button is shown — but the flag
// is only cosmetic. The real check is re-done server-side in /api/export,
// so flipping it in devtools gets you nothing.
export const runtime = "nodejs";

import { staffDomains, resolveAccount } from "../../../../lib/staff";

export async function GET(req) {
  const cookie = req.headers.get("cookie") || "";
  const hasAccess = /(?:^|;\s*)g_at=/.test(cookie);
  const hasRefresh = /(?:^|;\s*)g_rt=/.test(cookie);
  const connected = hasAccess || hasRefresh;
  if (!connected) {
    return Response.json({ connected: false, email: "", staff: false });
  }
  const acct = await resolveAccount(cookie);
  return Response.json({
    connected: true,
    email: acct.email,
    staff: acct.staff,
    domains: staffDomains(),
  });
}

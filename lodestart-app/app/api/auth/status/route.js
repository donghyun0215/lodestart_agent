// Lightweight check: does the browser still hold a Gmail auth cookie?
// The cookies are httpOnly so client JS can't read them directly — this
// route lets the UI ask "am I actually still connected?" after a refresh,
// instead of always showing "disconnected" until the user clicks connect
// again (the cookie itself is still valid for up to 1hr / 30 days).
export const runtime = "nodejs";

export async function GET(req) {
  const cookie = req.headers.get("cookie") || "";
  const hasAccess = /(?:^|;\s*)g_at=/.test(cookie);
  const hasRefresh = /(?:^|;\s*)g_rt=/.test(cookie);
  return Response.json({ connected: hasAccess || hasRefresh });
}

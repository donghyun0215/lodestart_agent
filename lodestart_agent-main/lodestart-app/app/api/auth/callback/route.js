// Step 2 of Gmail login: Google sends the user back here with a ?code=...
// We exchange it for an access token and store it in an httpOnly cookie.
export const runtime = "nodejs";

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return Response.redirect(new URL("/?gmail=error", url.origin));
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tok = await tokenRes.json();
  if (!tok.access_token) {
    return Response.redirect(new URL("/?gmail=error", url.origin));
  }

  // Store access token in an httpOnly cookie (not readable by JS -> safer).
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    `g_at=${tok.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
  );
  if (tok.refresh_token) {
    headers.append(
      "Set-Cookie",
      `g_rt=${tok.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
    );
  }
  headers.append("Location", new URL("/?gmail=connected", url.origin).toString());
  return new Response(null, { status: 302, headers });
}

// Step 1 of Gmail login: redirect the user to Google's consent screen.
export const runtime = "nodejs";

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    // gmail.compose = create drafts & send as the user (nothing is auto-sent by us).
    // gmail.readonly = lets the dashboard check whether a draft was sent and
    // whether a thread got a reply. We only ever read, never modify/delete.
    scope:
      "https://www.googleapis.com/auth/gmail.compose " +
      "https://www.googleapis.com/auth/gmail.readonly",
    access_type: "offline",
    prompt: "consent",
  });
  return Response.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}

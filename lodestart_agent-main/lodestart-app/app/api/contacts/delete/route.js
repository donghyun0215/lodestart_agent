// Server-enforced contact deletion.
//
// Deletion is irreversible, so — like CSV export — the check happens here,
// not in the browser: the route asks Google whose Gmail cookie this is and
// only proceeds for the named individuals in the allowlist (Tammy and
// Donghyun by default; DELETE_ALLOWED_EMAILS env to change). Hiding the
// button client-side alone would not be a real control.
//
// Every deletion is logged (who deleted which contact, when) so removals
// from a PDPA-relevant dataset leave a trail.
export const runtime = "nodejs";

import { createClient } from "@supabase/supabase-js";
import { resolveAccount, canDelete, deleteAllowlist } from "../../../../lib/staff";

export async function POST(req) {
  const acct = await resolveAccount(req.headers.get("cookie") || "");
  if (!acct.email) {
    return Response.json(
      { error: "Gmail 계정으로 로그인한 뒤에 삭제할 수 있습니다." },
      { status: 401 }
    );
  }
  if (!canDelete(acct.email)) {
    return Response.json(
      {
        error: `삭제 권한이 없습니다. 허용된 계정: ${deleteAllowlist().join(", ")}`,
      },
      { status: 403 }
    );
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const id = payload?.id;
  if (!id) {
    return Response.json({ error: "삭제할 컨택 id가 없습니다." }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Fetch first so the audit log can name what was removed.
  const { data: row } = await supabase
    .from("contacts")
    .select("org, email")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) {
    return Response.json({ error: "삭제 실패: " + error.message }, { status: 500 });
  }

  console.log(
    `[contact-delete] ${acct.email} deleted contact ${id} (${row?.org || "?"} / ${
      row?.email || "?"
    }) at ${new Date().toISOString()}`
  );
  return Response.json({ ok: true });
}

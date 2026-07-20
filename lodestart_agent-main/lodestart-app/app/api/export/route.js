// Server-enforced CSV export.
//
// The draft rows live in the browser, so the export used to be built and
// downloaded entirely client-side — which meant "only staff can export"
// could never be more than a hidden button. This route moves the actual
// file generation to the server: the browser POSTs the rows, the server
// checks who is signed in, and only then hands back a CSV.
//
// Every export is logged (who, when, how many rows) so there is a record
// of personal data leaving the system — which is what PDPA accountability
// actually asks for.
export const runtime = "nodejs";

import { resolveAccount, staffDomains } from "../../../lib/staff";

function csvEscape(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows, columns) {
  const head = columns.join(",");
  const body = rows
    .map((r) => columns.map((c) => csvEscape(r[c])).join(","))
    .join("\r\n");
  // BOM so Excel on Windows opens Korean text without mojibake.
  return "\ufeff" + head + "\r\n" + body;
}

export async function POST(req) {
  const acct = await resolveAccount(req.headers.get("cookie") || "");

  if (!acct.email) {
    return Response.json(
      { error: "Gmail 계정으로 로그인한 뒤에 내보낼 수 있습니다." },
      { status: 401 }
    );
  }
  if (!acct.staff) {
    return Response.json(
      {
        error:
          `이 데이터에는 개인정보가 포함되어 있어 (PDPA) Lodestart 직원 계정만 내보낼 수 있습니다. ` +
          `현재 로그인: ${acct.email} — 허용 도메인: ${staffDomains().join(", ")}`,
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

  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  if (!rows.length) {
    return Response.json({ error: "내보낼 초안이 없습니다." }, { status: 400 });
  }

  const columns = ["to", "name", "org", "fit", "bundle", "subject", "body"];
  const csv = toCsv(rows, columns);

  // Audit trail — shows up in Vercel logs.
  console.log(
    `[export] ${acct.email} exported ${rows.length} rows at ${new Date().toISOString()}`
  );

  const name = (payload?.filename || "campaign").replace(/[^\w.\-가-힣]/g, "_");
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}_drafts.csv"`,
      "cache-control": "no-store",
    },
  });
}

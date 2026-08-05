// Fetch a deployed one-pager page server-side and return its text.
//
// Why a route at all: the browser can't fetch arbitrary sites (CORS), so
// pasting a one-pager URL has to go through us. We pull the HTML here, strip
// the parts that carry no content (scripts, styles, svg), collapse the rest
// to text, and hand that back for the same extraction prompt the PDF path
// uses. No API key involved — this is just an HTML fetch.
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_CHARS = 60000; // plenty for a one-pager; guards against huge pages

export async function POST(req) {
  let url;
  try {
    ({ url } = await req.json());
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (!url || !/^https?:\/\//i.test(url)) {
    return Response.json(
      { error: "http(s)로 시작하는 전체 링크를 붙여넣어 주세요." },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        // A few hosts hand bots an empty shell; a browser UA gets the page.
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return Response.json(
        { error: `페이지를 불러오지 못했습니다 (HTTP ${res.status}).` },
        { status: 502 }
      );
    }
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      // keep a line break where block elements end so structure survives
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, MAX_CHARS);

    if (text.length < 100) {
      return Response.json(
        {
          error:
            "페이지에서 읽을 수 있는 텍스트가 거의 없습니다. 자바스크립트로만 그려지는 페이지일 수 있어요 — PDF로 저장해서 업로드해 보세요.",
        },
        { status: 422 }
      );
    }
    return Response.json({ text, url });
  } catch (e) {
    return Response.json(
      { error: "페이지 요청 실패: " + (e?.message || "unknown") },
      { status: 502 }
    );
  }
}

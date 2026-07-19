"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Papa from "papaparse";

/* ------------------------------------------------------------------ */
/*  Lodestart Outreach Desk — v0 prototype                            */
/*  Startup profile -> matched contacts -> personalised drafts        */
/* ------------------------------------------------------------------ */

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
`;

const C = {
  bg: "#EEF1F4",
  surface: "#FFFFFF",
  ink: "#16202C",
  mute: "#5C6B7A",
  line: "#D6DCE3",
  pine: "#2F5D50",      // accent — celadon/pine
  pineSoft: "#E6EEEA",
  brass: "#96762B",     // scores
  alert: "#8E2F2F",
};

const AUDIENCES = {
  VC: {
    label: "투자자 (VC)",
    goal: "소개 미팅 / 투자 검토",
    hint: "펀드의 투자 테제, 스테이지, 섹터, 지역 포커스와의 적합도",
    cta: "Would you be open to a short intro call?",
  },
  CORPORATE_KR: {
    label: "대기업 (PoC 발주)",
    goal: "PoC / 파일럿 제안",
    hint: "그 회사의 실제 사업/운영에서 이 기술이 풀 수 있는 구체적 문제",
    cta: "Could we explore a short PoC scoped to your operations?",
  },
  INSTITUTION: {
    label: "기관 (오픈이노베이션)",
    goal: "챌린지 참여 / 프로그램 연계",
    hint: "기관의 오픈이노베이션 챌린지·프로그램 주제와의 연결고리",
    cta: "Is there an upcoming challenge or programme this could fit?",
  },
};

const DEFAULT_SENDER = {
  name: "Tammy Ahn",
  title: "Vice President",
  org: "Korean Chamber of Commerce (KOCHAM) Singapore",
  secondOrg: "Lodestart Pte. Ltd.",
  programme: "KIMST",
  programmeLine:
    "I'm supporting the KIMST programme, which brings vetted Korean deep-tech startups into Singapore through PoCs and pilots with local partners.",
  calendly: "https://calendly.com/tammy-lodestart",
  siteUrl: "https://lodestart.ai",
  signoff: "Best regards,",
};

const DEFAULT_TONE = {
  rules:
    "- Warm but businesslike. No hype, no superlatives.\n" +
    "- Short paragraphs. Max 160 words total.\n" +
    "- Lead with why THIS recipient, not with our credentials.\n" +
    "- One clear ask at the end. Never two.\n" +
    "- Never say 'I hope this email finds you well'.",
  banned: "synergy, cutting-edge, revolutionary, game-changing, leverage, disrupt",
};

const K = {
  sender: "ld:sender",
  tone: "ld:tone",
  edits: "ld:edits",
  startups: "ld:startups",
};

/* ------------------------------- storage ------------------------------- */
async function loadKey(key, fallback) {
  try {
    const r = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    return r ? JSON.parse(r) : fallback;
  } catch {
    return fallback;
  }
}
async function saveKey(key, value) {
  try {
    if (typeof window !== "undefined")
      window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("storage", e);
  }
}

/* --------------------------------- api --------------------------------- */
async function claude(prompt, maxTokens = 1000, tries = 0) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  // rate limited / overloaded -> wait and retry (up to 5 times)
  if ((res.status === 429 || res.status === 529) && tries < 5) {
    const wait = 2000 * Math.pow(2, tries); // 2s, 4s, 8s, 16s, 32s
    await new Promise((r) => setTimeout(r, wait));
    return claude(prompt, maxTokens, tries + 1);
  }
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// Send a PDF (or image) plus a prompt. source = {media_type, data(base64), kind}
async function claudeWithDoc(source, prompt, maxTokens = 1500, tries = 0) {
  const block =
    source.kind === "pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: source.data } }
      : { type: "image", source: { type: "base64", media_type: source.media_type, data: source.data } };
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: [block, { type: "text", text: prompt }] }],
    }),
  });
  if ((res.status === 429 || res.status === 529) && tries < 5) {
    await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, tries)));
    return claudeWithDoc(source, prompt, maxTokens, tries + 1);
  }
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// read a File -> base64 (strips the data: prefix)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    r.readAsDataURL(file);
  });
}

function parseJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("[") >= 0 ? clean.indexOf("[") : clean.indexOf("{");
  const e = clean.lastIndexOf("]") >= 0 ? clean.lastIndexOf("]") : clean.lastIndexOf("}");
  const slice = clean.slice(s, e + 1);
  try {
    return JSON.parse(slice);
  } catch (_) {
    // Model produced slightly malformed JSON (stray quote in a reason string, etc).
    // Salvage every well-formed {...} object individually so one bad row
    // doesn't sink the whole batch.
    const objs = [];
    const matches = slice.match(/\{[^{}]*\}/g) || [];
    for (const m of matches) {
      try {
        objs.push(JSON.parse(m));
      } catch (_) {
        // last resort: pull fields out by regex
        const i = m.match(/"i"\s*:\s*(\d+)/);
        const sc = m.match(/"score"\s*:\s*(\d+)/);
        const rs = m.match(/"reason"\s*:\s*"([^"]*)/);
        if (i)
          objs.push({
            i: Number(i[1]),
            score: sc ? Number(sc[1]) : 0,
            reason: rs ? rs[1] : "",
          });
      }
    }
    if (objs.length) return objs;
    throw new Error("could not parse model output");
  }
}

/* --------------------------------- ui ---------------------------------- */
const Btn = ({ children, onClick, kind = "primary", disabled, small }) => {
  const base = {
    primary: { background: C.pine, color: "#fff", border: `1px solid ${C.pine}` },
    ghost: { background: "transparent", color: C.ink, border: `1px solid ${C.line}` },
    quiet: { background: "transparent", color: C.mute, border: "1px solid transparent" },
  }[kind];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...base,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        padding: small ? "5px 10px" : "9px 16px",
        borderRadius: 4,
        fontFamily: "Inter, sans-serif",
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        letterSpacing: "0.01em",
        transition: "opacity .15s",
      }}
    >
      {children}
    </button>
  );
};

const Field = ({ label, value, onChange, area, rows = 3, mono, ph }) => (
  <label style={{ display: "block", marginBottom: 14 }}>
    <div
      style={{
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: C.mute,
        marginBottom: 5,
      }}
    >
      {label}
    </div>
    {area ? (
      <textarea
        value={value}
        rows={rows}
        placeholder={ph}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle(mono)}
      />
    ) : (
      <input
        value={value}
        placeholder={ph}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle(mono)}
      />
    )}
  </label>
);
const inputStyle = (mono) => ({
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 11px",
  border: `1px solid ${C.line}`,
  borderRadius: 4,
  background: C.surface,
  color: C.ink,
  fontFamily: mono ? "'JetBrains Mono', monospace" : "Inter, sans-serif",
  fontSize: 13,
  lineHeight: 1.6,
  outline: "none",
  resize: "vertical",
});

const Card = ({ children, pad = 20, style }) => (
  <div
    style={{
      background: C.surface,
      border: `1px solid ${C.line}`,
      borderRadius: 6,
      padding: pad,
      ...style,
    }}
  >
    {children}
  </div>
);

const H = ({ children, sub }) => (
  <div style={{ marginBottom: 16 }}>
    <div
      style={{
        fontFamily: "Archivo, sans-serif",
        fontWeight: 700,
        fontSize: 16,
        color: C.ink,
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </div>
    {sub && (
      <div style={{ fontFamily: "Inter", fontSize: 12, color: C.mute, marginTop: 3 }}>
        {sub}
      </div>
    )}
  </div>
);

const ScoreBar = ({ score }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
    <div
      style={{
        width: 44,
        height: 4,
        background: C.line,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${score}%`,
          height: "100%",
          background: score >= 70 ? C.pine : score >= 45 ? C.brass : C.line,
        }}
      />
    </div>
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 500,
        color: score >= 70 ? C.pine : score >= 45 ? C.brass : C.mute,
        width: 20,
      }}
    >
      {score}
    </span>
  </div>
);

/* ================================= app ================================= */
export default function App() {
  const [tab, setTab] = useState("data");
  const [contacts, setContacts] = useState([]);
  const [sender, setSender] = useState(DEFAULT_SENDER);
  const [tone, setTone] = useState(DEFAULT_TONE);
  const [edits, setEdits] = useState([]);
  const [startups, setStartups] = useState([]);
  const [ready, setReady] = useState(false);

  const [startup, setStartup] = useState({
    name: "",
    oneLiner: "",
    sector: "",
    tech: "",
    traction: "",
    ask: "",
    link: "",
  });

  const [audience, setAudience] = useState("CORPORATE_KR");
  const [limit, setLimit] = useState(15);
  const [lang, setLang] = useState("EN"); // EN | KO
  const [scores, setScores] = useState({});
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState(null);
  const [gmail, setGmail] = useState("unknown"); // unknown|connected|error
  const [sendStatus, setSendStatus] = useState({}); // id -> draft|sent|replied|no_interest
  const [pushMsg, setPushMsg] = useState("");

  // detect ?gmail=connected coming back from OAuth
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("gmail") === "connected") setGmail("connected");
    if (q.get("gmail") === "error") setGmail("error");
  }, []);

  useEffect(() => {
    (async () => {
      setSender(await loadKey(K.sender, DEFAULT_SENDER));
      setTone(await loadKey(K.tone, DEFAULT_TONE));
      setEdits(await loadKey(K.edits, []));
      const s = await loadKey(K.startups, []);
      setStartups(s);
      if (s.length) setStartup(s[s.length - 1]);
      setReady(true);
    })();
  }, []);

  /* ---------------------------- csv ingest ---------------------------- */
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr("");
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => {
        const rows = r.data
          .map((x, i) => ({
            id: i,
            email: (x.email || "").trim(),
            org: (x.org || "").trim(),
            person: (x.person || "").trim(),
            title: (x.title || "").trim(),
            country: (x.country || "").trim(),
            type: (x.type || "").trim(),
            notes: (x.notes || "").trim(),
            sendable: (x.sendable || "YES").trim(),
          }))
          .filter((x) => x.email && x.sendable === "YES");
        if (!rows.length) {
          setErr("보낼 수 있는 행이 없습니다. email과 sendable=YES 컬럼을 확인하세요.");
          return;
        }
        setContacts(rows);
        setScores({});
        setDrafts({});
      },
      error: () => setErr("CSV를 읽지 못했습니다."),
    });
  };

  /* --------------------- IR deck -> autofill profile ------------------- */
  const onDeck = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr("");
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    const isImg = f.type.startsWith("image/");
    if (!isPdf && !isImg) {
      setErr("PDF 또는 이미지 파일을 올려주세요.");
      return;
    }
    setBusy("extract");
    try {
      const data = await fileToBase64(f);
      const source = isPdf
        ? { kind: "pdf", data }
        : { kind: "image", media_type: f.type, data };

      const prompt = `This is a startup's IR deck / pitch material. Extract a concise outreach profile.

Return ONLY JSON, no prose, no markdown, and use no unescaped double quotes inside strings:
{
 "name": "company name",
 "oneLiner": "one sentence, what the company does",
 "sector": "e.g. Logistics / Robotics",
 "tech": "the core technology / how it works, 1-2 sentences",
 "traction": "concrete proof: revenue, clients, users, funding stage. Numbers if present.",
 "ask": "what a partner or customer could offer them (PoC site, pilot, distribution, etc). If not stated, infer briefly.",
 "link": "website URL if present, else empty string"
}
Rules:
- Use the deck's own facts. Do NOT invent numbers or clients.
- If a field is genuinely not in the deck, use an empty string.
- Keep each field short enough to fit a form input.
- Write values in the deck's primary language (Korean deck -> Korean values).`;

      const out = await claudeWithDoc(source, prompt, 1500);
      const j = parseJSON(out);
      setStartup((prev) => ({
        name: j.name || prev.name,
        oneLiner: j.oneLiner || prev.oneLiner,
        sector: j.sector || prev.sector,
        tech: j.tech || prev.tech,
        traction: j.traction || prev.traction,
        ask: j.ask || prev.ask,
        link: j.link || prev.link,
      }));
    } catch (e2) {
      setErr("IR 추출 실패: " + e2.message + " — 직접 입력하거나 다른 파일을 시도하세요.");
    }
    setBusy("");
  };

  const pool = useMemo(() => {
    if (audience === "VC") return contacts.filter((c) => c.type.startsWith("VC"));
    if (audience === "CORPORATE_KR")
      return contacts.filter((c) => c.type === "CORPORATE_KR");
    return contacts.filter(
      (c) => c.type === "ACCELERATOR" || c.type === "INSTITUTION" || c.type === "AGENCY"
    );
  }, [contacts, audience]);

  const scored = useMemo(
    () =>
      pool
        .filter((c) => scores[c.id])
        .sort((a, b) => scores[b.id].score - scores[a.id].score),
    [pool, scores]
  );

  const profileText = () =>
    `Startup: ${startup.name}
One-liner: ${startup.oneLiner}
Sector: ${startup.sector}
Technology: ${startup.tech}
Traction / proof: ${startup.traction}
What they want from a partner: ${startup.ask}
Link: ${startup.link}`;

  /* ------------------------------ matching ---------------------------- */
  const runMatch = async () => {
    if (!startup.name || !startup.oneLiner) {
      setErr("스타트업 이름과 한 줄 소개는 필수입니다.");
      setTab("startup");
      return;
    }
    setErr("");
    setBusy("match");
    setProgress(0);
    const next = {};
    const BATCH = 20;      // contacts per API call
    const CONCURRENCY = 2; // API calls running at once

    // build all batches up front
    const batches = [];
    for (let i = 0; i < pool.length; i += BATCH) batches.push(pool.slice(i, i + BATCH));

    const scoreBatch = async (chunk) => {
      const list = chunk
        .map(
          (c, j) =>
            `${j}. org="${c.org}" | person="${c.person}" | title="${c.title}" | country="${c.country}" | note="${c.notes}"`
        )
        .join("\n");
      const prompt = `You are screening outreach targets for a Korean startup entering Singapore.

${profileText()}

Audience type: ${AUDIENCES[audience].label} — goal is ${AUDIENCES[audience].goal}.
Judge fit on: ${AUDIENCES[audience].hint}

Score each contact 0-100 for how likely they are to actually care about this startup.
Be harsh. Most cold contacts deserve 20-50. Reserve 80+ for a genuinely specific fit.
If the contact's org has no plausible connection to this startup, score it low and say so.

CONTACTS:
${list}

Return ONLY a JSON array, no prose, no markdown:
[{"i":0,"score":72,"reason":"one specific sentence, max 18 words, naming the actual overlap"}]
Inside "reason" use only plain text — no double quotes, no line breaks, no colons.`;
      const out = await claude(prompt, 1600);
      parseJSON(out).forEach((r) => {
        const c = chunk[r.i];
        if (c)
          next[c.id] = {
            score: Math.max(0, Math.min(100, Number(r.score) || 0)),
            reason: String(r.reason || ""),
          };
      });
    };

    try {
      let done = 0;
      // run batches in parallel waves of CONCURRENCY
      for (let w = 0; w < batches.length; w += CONCURRENCY) {
        const wave = batches.slice(w, w + CONCURRENCY);
        await Promise.all(
          wave.map((chunk) =>
            scoreBatch(chunk).then(() => {
              done += 1;
              setScores({ ...next });
              setProgress(Math.min(100, Math.round((done / batches.length) * 100)));
            })
          )
        );
      }
      setTab("match");
    } catch (e) {
      setErr("매칭 실패: " + e.message);
    }
    setBusy("");
  };

  /* ------------------------------- drafts ----------------------------- */
  const fewShot = () => {
    const recent = edits.slice(-3);
    if (!recent.length) return "";
    return (
      "\n\nTammy has edited past drafts. Learn from these before/after pairs:\n" +
      recent
        .map(
          (e, i) =>
            `--- Example ${i + 1} ---\nBEFORE (AI):\n${e.before}\n\nAFTER (Tammy's version):\n${e.after}`
        )
        .join("\n\n") +
      "\n\nMatch the AFTER style."
    );
  };

  const draftFor = async (c) => {
    const a = AUDIENCES[audience];
    const langBlock =
      lang === "KO"
        ? `Write this email in KOREAN (한국어).
- Use natural, polished business Korean with proper 존댓말 (formal register).
- Address the recipient by surname + title + 님. If title is a role like 법인장/지사장/대표/전무, use "${c.person ? c.person.split(" ")[0] : ""} <title>님" (e.g. "박 법인장님"). If title is unknown, use "담당자님".
- This reads as a Korean professional writing to another Korean professional. Warm but businesslike.
- Keep the calendly and website links as-is.`
        : `Write this email in ENGLISH.`;

    const prompt = `${langBlock}

SENDER
${sender.name}, ${sender.title}, ${sender.org}
Also: ${sender.secondOrg}
Programme: ${sender.programmeLine}

RECIPIENT
${c.person || "(name unknown — use a neutral greeting)"} — ${c.title || "unknown title"}
${c.org} (${c.country})
Context: ${c.notes || "none"}

STARTUP BEING INTRODUCED
${profileText()}

WHY THIS RECIPIENT (from screening)
${scores[c.id]?.reason || ""}

STRUCTURE
1. One line: who Tammy is (chamber role gives credibility — state it, don't sell it).
2. One line on the ${sender.programme} programme.
3. Two or three sentences on the startup: what it does + one concrete proof point.
4. The core paragraph — why THIS organisation specifically. Be concrete about their business. If you don't have enough information to be specific, say something honest and narrow rather than inventing facts.
5. Close with exactly one ask, in the spirit of: "${a.cta}"
6. Sign off as ${sender.name} and include ${sender.calendly} and ${sender.siteUrl}.

TONE RULES (follow strictly)
${tone.rules}
Never use these words: ${tone.banned}
${fewShot()}

Return ONLY JSON, and inside the strings use no unescaped double quotes:
{"subject":"...","body":"..."}`;

    const out = await claude(prompt, 1400);
    const j = parseJSON(out);
    return { subject: j.subject, body: j.body, edited: false };
  };

  const runDrafts = async () => {
    const top = scored.slice(0, limit);
    if (!top.length) return;
    setBusy("draft");
    setProgress(0);
    setErr("");
    const next = { ...drafts };
    const CONCURRENCY = 2; // generate 5 drafts at once
    try {
      let done = 0;
      for (let w = 0; w < top.length; w += CONCURRENCY) {
        const wave = top.slice(w, w + CONCURRENCY);
        await Promise.all(
          wave.map((c) =>
            draftFor(c).then((d) => {
              next[c.id] = d;
              done += 1;
              setDrafts({ ...next });
              setProgress(Math.round((done / top.length) * 100));
            })
          )
        );
      }
      setTab("review");
      setOpenId(top[0].id);
    } catch (e) {
      setErr("초안 생성 실패: " + e.message);
    }
    setBusy("");
  };

  /* ---------------------------- learning loop -------------------------- */
  const commitEdit = async (id, newBody) => {
    const d = drafts[id];
    if (!d || d.body === newBody) return;
    const rec = { before: d.body, after: newBody, at: Date.now() };
    const nextEdits = [...edits, rec].slice(-8);
    setEdits(nextEdits);
    await saveKey(K.edits, nextEdits);
    setDrafts({ ...drafts, [id]: { ...d, body: newBody, edited: true } });
  };

  const saveStartup = async () => {
    const list = [...startups.filter((s) => s.name !== startup.name), startup];
    setStartups(list);
    await saveKey(K.startups, list);
  };

  // Push the current drafts into Gmail as DRAFTS (nothing is sent).
  const pushToGmail = async () => {
    const rows = scored
      .filter((c) => drafts[c.id])
      .map((c) => ({
        id: c.id,
        to: c.email,
        subject: drafts[c.id].subject,
        body: drafts[c.id].body,
      }));
    if (!rows.length) return;
    setBusy("push");
    setPushMsg("");
    try {
      const res = await fetch("/api/gmail/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drafts: rows }),
      });
      if (res.status === 401) {
        setGmail("unknown");
        setPushMsg("Gmail 연결이 필요합니다. 상단의 Gmail 연결 버튼을 눌러주세요.");
        setBusy("");
        return;
      }
      const data = await res.json();
      const ok = (data.results || []).filter((r) => r.ok).length;
      // mark those as sent-to-draft
      const ns = { ...sendStatus };
      (data.results || []).forEach((r, i) => {
        if (r.ok) ns[rows[i].id] = ns[rows[i].id] || "draft_in_gmail";
      });
      setSendStatus(ns);
      setPushMsg(`${ok}건을 Gmail 초안함에 넣었습니다. Gmail에서 확인 후 보내세요.`);
    } catch (e) {
      setPushMsg("실패: " + e.message);
    }
    setBusy("");
  };

  const setStatus = (id, st) =>
    setSendStatus((prev) => ({ ...prev, [id]: st }));

  const exportCsv = () => {
    const rows = scored
      .filter((c) => drafts[c.id])
      .map((c) => ({
        to: c.email,
        name: c.person,
        org: c.org,
        fit: scores[c.id].score,
        subject: drafts[c.id].subject,
        body: drafts[c.id].body,
      }));
    const blob = new Blob([Papa.unparse(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${startup.name || "campaign"}_drafts.csv`;
    a.click();
  };

  if (!ready) return null;

  const TABS = [
    ["data", "1 · 컨택"],
    ["startup", "2 · 스타트업"],
    ["match", "3 · 매칭"],
    ["review", "4 · 초안 검토"],
    ["dash", "대시보드"],
    ["voice", "톤 설정"],
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "Inter, sans-serif",
        color: C.ink,
      }}
    >
      <style>{FONTS}</style>

      {/* header */}
      <div
        style={{
          background: C.ink,
          padding: "16px 24px",
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontFamily: "Archivo, sans-serif",
            fontWeight: 700,
            fontSize: 15,
            color: "#fff",
            letterSpacing: "-0.01em",
          }}
        >
          Lodestart Outreach Desk
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "#8FA3AE",
          }}
        >
          v1 · Gmail 초안 생성 (자동 발송 없음)
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 18, alignItems: "center" }}>
          <a
            href="/api/auth/google"
            style={{
              textDecoration: "none",
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              padding: "7px 12px",
              borderRadius: 4,
              border: `1px solid ${gmail === "connected" ? "#3E7D5A" : "#3A4652"}`,
              background: gmail === "connected" ? "#294B39" : "transparent",
              color: gmail === "connected" ? "#B7E4C7" : "#C4D0DA",
            }}
          >
            {gmail === "connected" ? "● Gmail 연결됨" : "Gmail 연결"}
          </a>
          {[
            ["컨택", contacts.length],
            ["매칭", Object.keys(scores).length],
            ["초안", Object.keys(drafts).length],
          ].map(([l, n]) => (
            <div key={l} style={{ textAlign: "right" }}>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 15,
                  color: "#fff",
                }}
              >
                {n}
              </div>
              <div style={{ fontSize: 10, color: "#8FA3AE" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* tabs */}
      <div
        style={{
          display: "flex",
          gap: 2,
          padding: "0 24px",
          background: C.surface,
          borderBottom: `1px solid ${C.line}`,
          overflowX: "auto",
        }}
      >
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${tab === id ? C.pine : "transparent"}`,
              color: tab === id ? C.ink : C.mute,
              padding: "13px 14px",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: tab === id ? 600 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {(err || busy) && (
        <div
          style={{
            padding: "9px 24px",
            background: err ? "#FBEDED" : C.pineSoft,
            color: err ? C.alert : C.pine,
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            borderBottom: `1px solid ${C.line}`,
          }}
        >
          {err ||
            (busy === "extract"
              ? "IR 자료에서 프로필 추출 중…"
              : busy === "match"
              ? `매칭 중… ${progress}%`
              : `초안 생성 중… ${progress}%`)}
        </div>
      )}

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 24px 80px" }}>
        {/* ------------------------------ DATA ---------------------------- */}
        {tab === "data" && (
          <Card>
            <H sub="contacts_master.csv를 올리세요. sendable=YES 인 행만 불러옵니다.">
              컨택 불러오기
            </H>
            <input
              type="file"
              accept=".csv"
              onChange={onFile}
              style={{ fontSize: 13, fontFamily: "Inter" }}
            />
            {contacts.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                    gap: 10,
                  }}
                >
                  {Object.entries(
                    contacts.reduce((a, c) => {
                      a[c.type] = (a[c.type] || 0) + 1;
                      return a;
                    }, {})
                  ).map(([t, n]) => (
                    <div
                      key={t}
                      style={{
                        border: `1px solid ${C.line}`,
                        borderRadius: 4,
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 18,
                          color: C.pine,
                        }}
                      >
                        {n}
                      </div>
                      <div style={{ fontSize: 11, color: C.mute }}>{t}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 18 }}>
                  <Btn onClick={() => setTab("startup")}>다음 · 스타트업 입력</Btn>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ---------------------------- STARTUP --------------------------- */}
        {tab === "startup" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)",
              gap: 20,
            }}
          >
            <Card>
              <H sub="매칭 품질은 여기서 갈립니다. 구체적으로 쓸수록 좋아집니다.">
                스타트업 프로필
              </H>

              {/* IR deck autofill */}
              <label
                style={{
                  display: "block",
                  border: `1.5px dashed ${busy === "extract" ? C.pine : C.line}`,
                  borderRadius: 6,
                  padding: "14px 16px",
                  marginBottom: 18,
                  cursor: busy ? "default" : "pointer",
                  background: busy === "extract" ? C.pineSoft : "#FAFBFC",
                  transition: "all .15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      fontFamily: "Archivo, sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      color: C.pine,
                    }}
                  >
                    {busy === "extract" ? "IR 자료 읽는 중…" : "IR 자료 업로드 (PDF/이미지)"}
                  </div>
                  <div style={{ fontSize: 11, color: C.mute }}>
                    {busy === "extract"
                      ? "잠시만요, 아래 항목을 자동으로 채웁니다"
                      : "던져주면 아래 항목을 자동으로 채웁니다 · 검토 후 수정하세요"}
                  </div>
                </div>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  disabled={!!busy}
                  onChange={onDeck}
                  style={{ display: "none" }}
                />
              </label>

              <Field
                label="회사명"
                value={startup.name}
                onChange={(v) => setStartup({ ...startup, name: v })}
                ph="예: Neubility"
              />
              <Field
                label="한 줄 소개"
                value={startup.oneLiner}
                onChange={(v) => setStartup({ ...startup, oneLiner: v })}
                ph="카메라만으로 주행하는 저가형 자율주행 배송로봇"
              />
              <Field
                label="섹터"
                value={startup.sector}
                onChange={(v) => setStartup({ ...startup, sector: v })}
                ph="Logistics / Robotics"
              />
              <Field
                label="기술"
                value={startup.tech}
                onChange={(v) => setStartup({ ...startup, tech: v })}
                area
                rows={2}
                ph="LiDAR 없이 카메라 기반 SLAM. 하드웨어 원가 1/5."
              />
              <Field
                label="트랙션 / 증거"
                value={startup.traction}
                onChange={(v) => setStartup({ ...startup, traction: v })}
                area
                rows={2}
                ph="서울에서 로봇 300대 운영, 편의점 체인과 계약. 시리즈B."
              />
              <Field
                label="파트너에게 원하는 것"
                value={startup.ask}
                onChange={(v) => setStartup({ ...startup, ask: v })}
                area
                rows={2}
                ph="싱가포르 내 3개월 배송 PoC 사이트, 규제 가이드"
              />
              <Field
                label="링크"
                value={startup.link}
                onChange={(v) => setStartup({ ...startup, link: v })}
                ph="https://..."
              />
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={saveStartup} kind="ghost">
                  프로필 저장
                </Btn>
              </div>
            </Card>

            <Card>
              <H sub="누구에게 보낼지 정합니다.">캠페인</H>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: C.mute,
                  marginBottom: 7,
                }}
              >
                수신자 유형
              </div>
              {Object.entries(AUDIENCES).map(([k, a]) => {
                const n = contacts.filter((c) =>
                  k === "VC"
                    ? c.type.startsWith("VC")
                    : k === "CORPORATE_KR"
                    ? c.type === "CORPORATE_KR"
                    : ["ACCELERATOR", "INSTITUTION", "AGENCY"].includes(c.type)
                ).length;
                const on = audience === k;
                return (
                  <button
                    key={k}
                    onClick={() => {
                      setAudience(k);
                      setLang(k === "CORPORATE_KR" ? "KO" : "EN");
                      setScores({});
                      setDrafts({});
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      marginBottom: 7,
                      padding: "10px 12px",
                      borderRadius: 4,
                      cursor: "pointer",
                      background: on ? C.pineSoft : "transparent",
                      border: `1px solid ${on ? C.pine : C.line}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.ink,
                      }}
                    >
                      <span>{a.label}</span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: on ? C.pine : C.mute,
                          fontWeight: 500,
                        }}
                      >
                        {n}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: C.mute, marginTop: 2 }}>
                      {a.goal}
                    </div>
                  </button>
                );
              })}

              <div style={{ marginTop: 16 }}>
                <Field
                  label={`초안 개수 (상위 ${limit}명)`}
                  value={String(limit)}
                  onChange={(v) => setLimit(Math.max(1, Math.min(40, Number(v) || 1)))}
                  mono
                />
              </div>

              <Btn
                onClick={runMatch}
                disabled={!pool.length || !!busy}
              >
                {pool.length}명 매칭 스코어링
              </Btn>
              {!pool.length && (
                <div style={{ fontSize: 11, color: C.mute, marginTop: 8 }}>
                  이 유형의 컨택이 없습니다. CSV를 먼저 올리세요.
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ----------------------------- MATCH ---------------------------- */}
        {tab === "match" && (
          <Card pad={0}>
            <div style={{ padding: 20, borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <H
                    sub={`${startup.name || "—"} · ${AUDIENCES[audience].label} · 점수 높은 순`}
                  >
                    매칭 결과 {scored.length}
                  </H>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      border: `1px solid ${C.line}`,
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    {["EN", "KO"].map((L) => (
                      <button
                        key={L}
                        onClick={() => setLang(L)}
                        style={{
                          padding: "8px 13px",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "Inter, sans-serif",
                          fontSize: 12,
                          fontWeight: 600,
                          background: lang === L ? C.pine : "transparent",
                          color: lang === L ? "#fff" : C.mute,
                        }}
                      >
                        {L === "EN" ? "English" : "한국어"}
                      </button>
                    ))}
                  </div>
                  <Btn onClick={runDrafts} disabled={!scored.length || !!busy}>
                    {lang === "KO" ? "한국어로" : "영어로"} 상위{" "}
                    {Math.min(limit, scored.length)}명 초안 생성
                  </Btn>
                </div>
              </div>
            </div>
            <div style={{ maxHeight: 560, overflowY: "auto" }}>
              {scored.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    padding: "11px 20px",
                    borderBottom: `1px solid ${C.line}`,
                    background: i < limit ? C.surface : "#FAFBFC",
                    opacity: i < limit ? 1 : 0.55,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: C.mute,
                      width: 22,
                    }}
                  >
                    {i + 1}
                  </div>
                  <ScoreBar score={scores[c.id].score} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {c.org}
                      {c.person && (
                        <span style={{ color: C.mute, fontWeight: 400 }}>
                          {" "}
                          · {c.person}
                          {c.title ? `, ${c.title}` : ""}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>
                      {scores[c.id].reason}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: C.mute,
                    }}
                  >
                    {c.email}
                  </div>
                </div>
              ))}
              {!scored.length && (
                <div style={{ padding: 40, textAlign: "center", color: C.mute, fontSize: 13 }}>
                  아직 매칭 결과가 없습니다. 스타트업 탭에서 스코어링을 실행하세요.
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ----------------------------- REVIEW --------------------------- */}
        {tab === "review" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <H sub="수정하면 다음 초안부터 Tammy의 문체를 따라갑니다. 발송은 직접 하세요.">
                초안 {Object.keys(drafts).length}건
              </H>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                <div
                  style={{
                    display: "flex",
                    border: `1px solid ${C.line}`,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  {["EN", "KO"].map((L) => (
                    <button
                      key={L}
                      onClick={() => setLang(L)}
                      style={{
                        padding: "7px 13px",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        fontWeight: 600,
                        background: lang === L ? C.pine : "transparent",
                        color: lang === L ? "#fff" : C.mute,
                      }}
                    >
                      {L === "EN" ? "English" : "한국어"}
                    </button>
                  ))}
                </div>
                <Btn
                  kind="ghost"
                  onClick={runDrafts}
                  disabled={!scored.length || !!busy}
                >
                  {lang === "KO" ? "한국어로 다시 생성" : "Regenerate in English"}
                </Btn>
                <Btn
                  onClick={pushToGmail}
                  disabled={!Object.keys(drafts).length || !!busy}
                >
                  {busy === "push" ? "넣는 중…" : "Gmail 초안함에 넣기"}
                </Btn>
                <Btn kind="ghost" onClick={exportCsv} disabled={!Object.keys(drafts).length}>
                  CSV 내보내기
                </Btn>
              </div>
            </div>

            {pushMsg && (
              <div
                style={{
                  marginBottom: 12,
                  padding: "9px 12px",
                  borderRadius: 4,
                  background: C.pineSoft,
                  color: C.pine,
                  fontSize: 12,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {pushMsg}
              </div>
            )}
            {scored
              .filter((c) => drafts[c.id])
              .map((c) => {
                const d = drafts[c.id];
                const open = openId === c.id;
                return (
                  <Card key={c.id} pad={0} style={{ marginBottom: 10 }}>
                    <div
                      onClick={() => setOpenId(open ? null : c.id)}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        padding: "12px 16px",
                        cursor: "pointer",
                      }}
                    >
                      <ScoreBar score={scores[c.id].score} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{c.org}</div>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 11,
                            color: C.mute,
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.email} · {d.subject}
                        </div>
                      </div>
                      {d.edited && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: C.pine,
                            background: C.pineSoft,
                            padding: "3px 7px",
                            borderRadius: 3,
                          }}
                        >
                          수정됨
                        </span>
                      )}
                      <span style={{ color: C.mute, fontSize: 11 }}>
                        {open ? "닫기" : "열기"}
                      </span>
                    </div>

                    {open && (
                      <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.line}` }}>
                        <div style={{ paddingTop: 14 }}>
                          <Field
                            label="제목"
                            value={d.subject}
                            onChange={(v) =>
                              setDrafts({ ...drafts, [c.id]: { ...d, subject: v } })
                            }
                          />
                          <Field
                            label="본문 — 고치면 학습합니다"
                            value={d.body}
                            area
                            rows={14}
                            onChange={(v) =>
                              setDrafts({ ...drafts, [c.id]: { ...d, body: v } })
                            }
                          />
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Btn
                              small
                              onClick={() => commitEdit(c.id, d.body)}
                            >
                              수정 반영 · 톤 학습
                            </Btn>
                            <Btn
                              small
                              kind="ghost"
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  `To: ${c.email}\nSubject: ${d.subject}\n\n${d.body}`
                                )
                              }
                            >
                              복사
                            </Btn>
                            <Btn
                              small
                              kind="ghost"
                              onClick={() =>
                                window.open(
                                  `mailto:${c.email}?subject=${encodeURIComponent(
                                    d.subject
                                  )}&body=${encodeURIComponent(d.body)}`
                                )
                              }
                            >
                              메일 앱에서 열기
                            </Btn>
                            <Btn
                              small
                              kind="quiet"
                              onClick={async () => {
                                setBusy("draft");
                                try {
                                  setDrafts({ ...drafts, [c.id]: await draftFor(c) });
                                } catch (e) {
                                  setErr(e.message);
                                }
                                setBusy("");
                              }}
                            >
                              다시 쓰기
                            </Btn>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}

            {!Object.keys(drafts).length && (
              <Card>
                <div style={{ color: C.mute, fontSize: 13, textAlign: "center", padding: 30 }}>
                  초안이 없습니다. 매칭 탭에서 생성하세요.
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ---------------------------- DASHBOARD -------------------------- */}
        {tab === "dash" && (
          <div>
            {(() => {
              const withDrafts = scored.filter((c) => drafts[c.id]);
              const st = (id) => sendStatus[id] || "draft";
              const count = (v) => withDrafts.filter((c) => st(c.id) === v).length;
              const inGmail = withDrafts.filter(
                (c) => st(c.id) === "draft_in_gmail"
              ).length;
              const sent = count("sent");
              const replied = count("replied");
              const noInt = count("no_interest");
              const totalActioned = sent + replied + noInt;
              const replyRate = totalActioned
                ? Math.round((replied / totalActioned) * 100)
                : 0;

              // by audience type breakdown among drafts
              const byType = {};
              withDrafts.forEach((c) => {
                const t = c.type || "?";
                byType[t] = byType[t] || { total: 0, replied: 0 };
                byType[t].total += 1;
                if (st(c.id) === "replied") byType[t].replied += 1;
              });

              const Stat = ({ label, value, accent }) => (
                <Card style={{ flex: 1, minWidth: 130 }}>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 26,
                      color: accent || C.ink,
                    }}
                  >
                    {value}
                  </div>
                  <div style={{ fontSize: 12, color: C.mute, marginTop: 3 }}>
                    {label}
                  </div>
                </Card>
              );

              return (
                <div>
                  <H sub={`${startup.name || "—"} · ${AUDIENCES[audience].label}`}>
                    성과 대시보드
                  </H>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginBottom: 16,
                    }}
                  >
                    <Stat label="초안 생성" value={withDrafts.length} />
                    <Stat label="Gmail 초안함" value={inGmail} accent={C.pine} />
                    <Stat label="보냄" value={sent} />
                    <Stat label="회신" value={replied} accent={C.pine} />
                    <Stat label="회신율" value={`${replyRate}%`} accent={C.brass} />
                  </div>

                  <Card style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                      유형별 성과
                    </div>
                    {Object.keys(byType).length === 0 && (
                      <div style={{ color: C.mute, fontSize: 12 }}>
                        아직 데이터가 없습니다.
                      </div>
                    )}
                    {Object.entries(byType).map(([t, v]) => (
                      <div
                        key={t}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "7px 0",
                          borderBottom: `1px solid ${C.line}`,
                        }}
                      >
                        <div style={{ width: 150, fontSize: 13 }}>{t}</div>
                        <div style={{ flex: 1, fontSize: 12, color: C.mute }}>
                          초안 {v.total} · 회신 {v.replied}
                        </div>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 12,
                            color: C.brass,
                          }}
                        >
                          {v.total ? Math.round((v.replied / v.total) * 100) : 0}%
                        </div>
                      </div>
                    ))}
                  </Card>

                  <Card pad={0}>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: `1px solid ${C.line}`,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      발송 상태 기록 — Gmail에서 보낸 뒤 여기서 상태를 눌러주세요
                    </div>
                    <div style={{ maxHeight: 420, overflowY: "auto" }}>
                      {withDrafts.length === 0 && (
                        <div
                          style={{
                            padding: 30,
                            textAlign: "center",
                            color: C.mute,
                            fontSize: 13,
                          }}
                        >
                          초안을 먼저 생성하세요.
                        </div>
                      )}
                      {withDrafts.map((c) => (
                        <div
                          key={c.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "9px 16px",
                            borderBottom: `1px solid ${C.line}`,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>
                              {c.org}
                            </div>
                            <div
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 11,
                                color: C.mute,
                              }}
                            >
                              {c.email}
                            </div>
                          </div>
                          {[
                            ["draft", "초안"],
                            ["sent", "보냄"],
                            ["replied", "회신"],
                            ["no_interest", "관심없음"],
                          ].map(([v, label]) => {
                            const on =
                              (sendStatus[c.id] || "draft").replace(
                                "draft_in_gmail",
                                "draft"
                              ) === v;
                            return (
                              <button
                                key={v}
                                onClick={() => setStatus(c.id, v)}
                                style={{
                                  padding: "5px 9px",
                                  borderRadius: 3,
                                  cursor: "pointer",
                                  fontFamily: "Inter, sans-serif",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  border: `1px solid ${on ? C.pine : C.line}`,
                                  background: on ? C.pine : "transparent",
                                  color: on ? "#fff" : C.mute,
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </Card>

                  <div style={{ fontSize: 11, color: C.mute, marginTop: 10 }}>
                    오픈율(열람 여부)은 정확도가 낮아 제공하지 않습니다. 회신율을 핵심 지표로 봅니다.
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ------------------------------ VOICE --------------------------- */}
        {tab === "voice" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              gap: 20,
            }}
          >
            <Card>
              <H sub="모든 메일의 고정 블록입니다.">보내는 사람</H>
              <Field label="이름" value={sender.name} onChange={(v) => setSender({ ...sender, name: v })} />
              <Field label="직함" value={sender.title} onChange={(v) => setSender({ ...sender, title: v })} />
              <Field label="소속" value={sender.org} onChange={(v) => setSender({ ...sender, org: v })} />
              <Field label="프로그램 설명" area rows={3} value={sender.programmeLine} onChange={(v) => setSender({ ...sender, programmeLine: v })} />
              <Field label="Calendly" mono value={sender.calendly} onChange={(v) => setSender({ ...sender, calendly: v })} />
              <Field label="웹사이트" mono value={sender.siteUrl} onChange={(v) => setSender({ ...sender, siteUrl: v })} />
              <Btn onClick={() => saveKey(K.sender, sender)}>저장</Btn>
            </Card>

            <Card>
              <H sub="Tammy가 코드를 건드리지 않고 에이전트를 길들이는 곳입니다.">문체 규칙</H>
              <Field
                label="규칙"
                area
                rows={8}
                value={tone.rules}
                onChange={(v) => setTone({ ...tone, rules: v })}
              />
              <Field
                label="금지 단어"
                area
                rows={2}
                value={tone.banned}
                onChange={(v) => setTone({ ...tone, banned: v })}
              />
              <Btn onClick={() => saveKey(K.tone, tone)}>저장</Btn>

              <div
                style={{
                  marginTop: 22,
                  paddingTop: 16,
                  borderTop: `1px solid ${C.line}`,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  학습된 수정 {edits.length}건
                </div>
                <div style={{ fontSize: 12, color: C.mute, marginBottom: 10 }}>
                  최근 3건이 다음 초안 생성 시 예시로 들어갑니다.
                </div>
                {edits.slice(-3).reverse().map((e, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: C.mute,
                      padding: "7px 9px",
                      background: C.bg,
                      borderRadius: 3,
                      marginBottom: 6,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.after.slice(0, 70)}…
                  </div>
                ))}
                {edits.length > 0 && (
                  <Btn
                    small
                    kind="quiet"
                    onClick={async () => {
                      setEdits([]);
                      await saveKey(K.edits, []);
                    }}
                  >
                    학습 초기화
                  </Btn>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

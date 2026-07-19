"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Papa from "papaparse";
import { supabase } from "../lib/supabase";
import {
  Users,
  Building2,
  Landmark,
  Sparkles,
  LayoutDashboard,
  SlidersHorizontal,
  Mail,
  Send,
  FileUp,
  Check,
  X,
  Loader2,
  Compass,
  Search,
  Database,
  RefreshCw,
  Pin,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Lodestart Outreach Desk — v0 prototype                            */
/*  Startup profile -> matched contacts -> personalised drafts        */
/* ------------------------------------------------------------------ */

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
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
  TEST: {
    label: "🧪 테스트 (더미 데이터)",
    goal: "워크플로우 점검용 — 실제 고객 아님",
    hint: "실제 사업 연관성은 무시하고, 매칭·초안 형식이 정상 작동하는지만 본다",
    cta: "(테스트) Would you be open to a short intro call?",
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
  prefs: "ld:prefs", // last audience/lang selected — helps land back on the right view after refresh
  draftStartup: "ld:draftStartup", // whatever's currently typed, saved continuously — not just on "저장" click
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
// Module-level hook the component registers so these standalone functions
// can report token usage back into React state. Not exact billing — the
// real balance isn't readable from a normal API key — just a running
// estimate from each response's own usage numbers.
let onUsage = null;
function reportUsage(u) {
  if (onUsage && u) onUsage(u);
}

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
  reportUsage(data.usage);
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
  reportUsage(data.usage);
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


// Drafts come back as plain text with SUBJECT:/BODY: markers.
// Avoids all JSON escaping problems with newlines and Korean quotes.
// Plain-text emails should never contain markdown — Gmail renders it literally
// (asterisks etc. show up as-is), which looks broken and spam-like.
function stripMarkdown(s) {
  return (s || "")
    .replace(/\*\*(.+?)\*\*/g, "$1") // **bold**
    .replace(/\*(.+?)\*/g, "$1")     // *italic*
    .replace(/^#{1,6}\s+/gm, "")     // # headings
    .replace(/^[-*]\s+/gm, "• ");    // - bullets -> plain bullet

}

function parseDraft(text) {
  const t = (text || "").replace(/```/g, "").trim();
  const sm = t.match(/SUBJECT:\s*(.+)/i);
  const bi = t.search(/BODY:\s*/i);
  let subject = sm ? sm[1].trim() : "";
  let body = bi >= 0 ? t.slice(bi).replace(/^BODY:\s*/i, "") : "";
  if (!body) {
    // model ignored the format - fall back to "first line = subject, rest = body"
    const lines = t.split("\n");
    subject = subject || lines[0].replace(/^subject\s*:\s*/i, "").trim();
    body = lines.slice(1).join("\n").trim();
  }
  if (!subject) subject = "(제목 없음)";
  return { subject: stripMarkdown(subject).trim(), body: stripMarkdown(body).trim() };
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
const Btn = ({ children, onClick, kind = "primary", disabled, small, icon: Icon }) => {
  const [hover, setHover] = useState(false);
  const base = {
    primary: {
      background: hover && !disabled ? "#274F44" : C.pine,
      color: "#fff",
      border: `1px solid ${C.pine}`,
      boxShadow: hover && !disabled ? "0 3px 10px rgba(47,93,80,0.28)" : "0 1px 2px rgba(47,93,80,0.15)",
    },
    ghost: {
      background: hover && !disabled ? "#F2F4F6" : "transparent",
      color: C.ink,
      border: `1px solid ${C.line}`,
      boxShadow: "none",
    },
    quiet: {
      background: hover && !disabled ? "#F2F4F6" : "transparent",
      color: C.mute,
      border: "1px solid transparent",
      boxShadow: "none",
    },
    danger: {
      background: hover && !disabled ? "#7A2828" : C.alert,
      color: "#fff",
      border: `1px solid ${C.alert}`,
      boxShadow: hover && !disabled ? "0 3px 10px rgba(142,47,47,0.28)" : "none",
    },
  }[kind];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...base,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        padding: small ? "5px 10px" : "9px 16px",
        borderRadius: 5,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "Inter, sans-serif",
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        letterSpacing: "0.01em",
        transition: "all .15s",
        transform: hover && !disabled ? "translateY(-1px)" : "none",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {Icon && <Icon size={small ? 12 : 14} strokeWidth={2.3} />}
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

const Card = ({ children, pad = 20, style, hoverable }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => hoverable && setHover(true)}
      onMouseLeave={() => hoverable && setHover(false)}
      style={{
        background: C.surface,
        border: `1px solid ${hover ? "#C3CCD4" : C.line}`,
        borderRadius: 8,
        padding: pad,
        boxShadow: hover
          ? "0 6px 16px rgba(22,32,44,0.08)"
          : "0 1px 3px rgba(22,32,44,0.04)",
        transition: "box-shadow .18s, border-color .18s, transform .18s",
        transform: hover ? "translateY(-1px)" : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const H = ({ children, sub, icon: Icon }) => (
  <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
    <div
      style={{
        width: 3,
        height: Icon ? 32 : 22,
        borderRadius: 2,
        background: `linear-gradient(180deg, ${C.pine}, #7CAE9B)`,
        marginTop: 2,
        flexShrink: 0,
      }}
    />
    <div>
      <div
        style={{
          fontFamily: "Archivo, sans-serif",
          fontWeight: 700,
          fontSize: 16,
          color: C.ink,
          letterSpacing: "-0.01em",
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        {Icon && <Icon size={16} color={C.pine} strokeWidth={2.3} />}
        {children}
      </div>
      {sub && (
        <div style={{ fontFamily: "Inter", fontSize: 12, color: C.mute, marginTop: 3 }}>
          {sub}
        </div>
      )}
    </div>
  </div>
);

const ScoreBar = ({ score }) => {
  const tone = score >= 70 ? C.pine : score >= 45 ? C.brass : "#9AA6B1";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 48,
          height: 5,
          background: "#E7EBEE",
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "inset 0 1px 1px rgba(22,32,44,0.06)",
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            borderRadius: 3,
            background:
              score >= 70
                ? `linear-gradient(90deg, #2F5D50, #4A8A73)`
                : score >= 45
                ? `linear-gradient(90deg, #7A611F, #B08F35)`
                : "#B7C1CA",
            transition: "width .3s ease",
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          fontWeight: 700,
          color: tone,
          minWidth: 22,
          textAlign: "right",
        }}
      >
        {score}
      </span>
    </div>
  );
};

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
  const [limit, setLimit] = useState("15"); // free text while typing — validated on run, not per keystroke
  const limitNum = parseInt(limit, 10);
  const [lang, setLang] = useState("EN"); // EN | KO
  const [scores, setScores] = useState({});
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState(null);
  const [gmail, setGmail] = useState("unknown"); // unknown|connected|error
  const [sendStatus, setSendStatus] = useState({}); // id -> draft|sent|replied|no_interest
  const [gmailDraftIds, setGmailDraftIds] = useState({}); // contact id -> gmail draft id
  const [threadIds, setThreadIds] = useState({}); // contact id -> gmail thread id (for reply detection)
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [pushMsg, setPushMsg] = useState("");
  const [usage, setUsage] = useState({ in: 0, out: 0, calls: 0 });
  const [campaignId, setCampaignId] = useState(null);
  const [restoredNote, setRestoredNote] = useState("");

  // Find the most recent campaign for this startup+audience, or create one.
  // Campaign identity is (startup name, audience) — regenerating in a
  // different language just updates the same campaign's rows.
  const getOrCreateCampaignId = async () => {
    if (!startup.name) return null;
    const { data: found, error: findErr } = await supabase
      .from("campaigns")
      .select("id")
      .eq("startup", startup.name)
      .eq("audience", audience)
      .order("created_at", { ascending: false })
      .limit(1);
    if (findErr) throw findErr;
    if (found && found.length) {
      setCampaignId(found[0].id);
      return found[0].id;
    }
    const { data: created, error: createErr } = await supabase
      .from("campaigns")
      .insert({ startup: startup.name, audience, lang })
      .select()
      .single();
    if (createErr) throw createErr;
    setCampaignId(created.id);
    return created.id;
  };

  // Write-through: upsert one contact's send row (draft content + status).
  // Never blocks the UI — failures are logged but don't interrupt the flow.
  const persistSend = async (cid, contact, extra) => {
    if (!cid || !contact) return;
    const { error } = await supabase.from("sends").upsert(
      {
        campaign_id: cid,
        contact_id: contact.id,
        email: contact.email,
        org: contact.org,
        person: contact.person,
        fit: scores[contact.id]?.score ?? null,
        updated_at: new Date().toISOString(),
        ...extra,
      },
      { onConflict: "campaign_id,contact_id" }
    );
    if (error) {
      // Supabase doesn't throw on failure — it returns { error } — so this
      // was silently swallowed before. Surface it so a save failure is
      // actually visible instead of just vanishing.
      console.error("persistSend failed", error);
      setErr(
        "⚠ 저장 실패: " +
          error.message +
          " — Supabase에서 supabase_schema.sql을 다시 실행했는지 확인하세요."
      );
    }
  };

  // Register the usage hook so claude()/claudeWithDoc() can report token counts.
  useEffect(() => {
    onUsage = (u) =>
      setUsage((p) => ({
        in: p.in + (u.input_tokens || 0),
        out: p.out + (u.output_tokens || 0),
        calls: p.calls + 1,
      }));
    return () => {
      onUsage = null;
    };
  }, []);
  // Sonnet pricing approx $3/MTok in, $15/MTok out — this is an ESTIMATE,
  // not a real balance read (the API key can't report remaining credit).
  const estCost = (usage.in / 1e6) * 3 + (usage.out / 1e6) * 15;

  // detect ?gmail=connected coming back from OAuth
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("gmail") === "connected") setGmail("connected");
    if (q.get("gmail") === "error") setGmail("error");
  }, []);

  // The gmail=connected query param only shows up right after the OAuth
  // redirect — on a normal refresh the badge would fall back to "Gmail
  // 연결" even though the cookie is still valid. Ask the server what's
  // actually true.
  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.connected) setGmail((prev) => (prev === "error" ? prev : "connected"));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      setSender(await loadKey(K.sender, DEFAULT_SENDER));
      setTone(await loadKey(K.tone, DEFAULT_TONE));
      setEdits(await loadKey(K.edits, []));
      const s = await loadKey(K.startups, []);
      setStartups(s);
      // Whatever was last typed (even if "프로필 저장" was never clicked)
      // takes priority over the curated saved-profiles list — this is what
      // makes the campaign-restore effect below able to find its match
      // after a refresh.
      const draft = await loadKey(K.draftStartup, null);
      if (draft && draft.name) setStartup(draft);
      else if (s.length) setStartup(s[s.length - 1]);
      const p = await loadKey(K.prefs, null);
      if (p) {
        if (p.audience) setAudience(p.audience);
        if (p.lang) setLang(p.lang);
        if (p.tab) setTab(p.tab);
      }
      setReady(true);
    })();
  }, []);

  // Autosave every keystroke in the startup profile — not just on
  // "프로필 저장" — so typing a name and immediately matching/drafting
  // still survives a refresh.
  useEffect(() => {
    if (!ready) return;
    saveKey(K.draftStartup, startup);
  }, [ready, startup]);

  // Remember the last tab/audience/lang picked, so a refresh lands back on
  // the same screen instead of always bouncing to "1 · 컨택"
  // (and so the campaign-restore effect below knows where to look).
  useEffect(() => {
    if (!ready) return;
    saveKey(K.prefs, { audience, lang, tab });
  }, [ready, audience, lang, tab]);

  // Restore a previous campaign's matches/drafts/statuses from the DB when
  // landing on a startup+audience that already has saved work. Without
  // this, refreshing the page wiped everything except the contacts DB —
  // this is what fixes that.
  useEffect(() => {
    if (!ready || !startup.name || !contacts.length) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: camp, error: campErr } = await supabase
          .from("campaigns")
          .select("id")
          .eq("startup", startup.name)
          .eq("audience", audience)
          .order("created_at", { ascending: false })
          .limit(1);
        if (campErr) throw campErr;
        if (cancelled || !camp || !camp.length) return;
        const cid = camp[0].id;
        setCampaignId(cid);
        const { data: rows, error: rowsErr } = await supabase
          .from("sends")
          .select("*")
          .eq("campaign_id", cid);
        if (rowsErr) throw rowsErr;
        if (cancelled || !rows || !rows.length) return;
        const sc = {}, dr = {}, st = {}, gd = {}, td = {};
        rows.forEach((r) => {
          if (r.fit !== null && r.fit !== undefined) sc[r.contact_id] = { score: r.fit, reason: "" };
          if (r.subject || r.body) dr[r.contact_id] = { subject: r.subject || "", body: r.body || "", edited: false };
          if (r.status) st[r.contact_id] = r.status;
          if (r.gmail_draft_id) gd[r.contact_id] = r.gmail_draft_id;
          if (r.thread_id) td[r.contact_id] = r.thread_id;
        });
        // Only fill in if we don't already have live, unsaved work in memory.
        setScores((p) => (Object.keys(p).length ? p : sc));
        setDrafts((p) => (Object.keys(p).length ? p : dr));
        setSendStatus((p) => (Object.keys(p).length ? p : st));
        setGmailDraftIds((p) => (Object.keys(p).length ? p : gd));
        setThreadIds((p) => (Object.keys(p).length ? p : td));
        if (Object.keys(dr).length) {
          setRestoredNote(`이전 캠페인을 복원했습니다 — 초안 ${Object.keys(dr).length}건.`);
        }
      } catch (e) {
        console.error("campaign restore failed", e);
        setErr("⚠ 복원 실패: " + e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, contacts.length, startup.name, audience]);

  /* ---------------------------- csv ingest ---------------------------- */
  const [contactQuery, setContactQuery] = useState("");
  const [contactTypeFilter, setContactTypeFilter] = useState("ALL");
  const [dbNote, setDbNote] = useState("");

  // Pull every row from the `contacts` table (paginated — Supabase caps at 1000/req).
  const loadContacts = async () => {
    setBusy("loadContacts");
    setDbNote("");
    try {
      let all = [];
      let from = 0;
      const page = 1000;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("contacts")
          .select("*")
          .range(from, from + page - 1);
        if (error) throw error;
        all = all.concat(data || []);
        if (!data || data.length < page) break;
        from += page;
      }
      setContacts(
        all
          .map((r) => ({
            id: r.id,
            email: (r.email || "").trim(),
            org: (r.org || "").trim(),
            person: (r.person || "").trim(),
            title: (r.title || "").trim(),
            country: (r.country || "").trim(),
            type: (r.type || "").trim(),
            notes: (r.notes || "").trim(),
            sendable: (r.sendable || "YES").trim(),
          }))
          .filter((c) => c.email && c.sendable === "YES")
      );
    } catch (e) {
      setDbNote(
        "DB에서 컨택을 불러오지 못했습니다: " +
          e.message +
          " — Supabase 설정(.env.local, supabase_schema.sql 실행 여부)을 확인하세요."
      );
    }
    setBusy("");
  };

  // Load contacts from the DB once on mount.
  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CSV upload now UPSERTS into Supabase (by email) instead of just
  // loading into memory — the DB becomes the single source of truth,
  // so nobody has to re-upload the file every visit.
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr("");
    setDbNote("");
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: async (r) => {
        const rows = r.data
          .map((x) => ({
            email: (x.email || "").trim().toLowerCase(),
            org: (x.org || "").trim(),
            person: (x.person || "").trim(),
            title: (x.title || "").trim(),
            country: (x.country || "").trim(),
            type: (x.type || "").trim(),
            notes: (x.notes || "").trim(),
            sendable: (x.sendable || "YES").trim() || "YES",
          }))
          .filter((x) => x.email);
        if (!rows.length) {
          setErr("업로드할 행이 없습니다. email 컬럼을 확인하세요.");
          return;
        }
        setBusy("uploadContacts");
        try {
          const CHUNK = 500;
          for (let i = 0; i < rows.length; i += CHUNK) {
            const chunk = rows.slice(i, i + CHUNK);
            const { error } = await supabase
              .from("contacts")
              .upsert(chunk, { onConflict: "email" });
            if (error) throw error;
          }
          setDbNote(`${rows.length}건을 DB에 추가/업데이트했습니다.`);
          await loadContacts();
        } catch (e2) {
          setDbNote("DB 업로드 실패: " + e2.message);
        }
        setBusy("");
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

  const filteredContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    return contacts.filter((c) => {
      if (contactTypeFilter !== "ALL" && c.type !== contactTypeFilter) return false;
      if (!q) return true;
      return (
        c.org.toLowerCase().includes(q) ||
        c.person.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q)
      );
    });
  }, [contacts, contactQuery, contactTypeFilter]);

  const pool = useMemo(() => {
    if (audience === "TEST") return contacts.filter((c) => c.type === "TEST");
    if (audience === "VC")
      return contacts.filter((c) => c.type.startsWith("VC") && c.type !== "TEST");
    if (audience === "CORPORATE_KR")
      return contacts.filter((c) => c.type === "CORPORATE_KR");
    return contacts.filter(
      (c) =>
        c.type === "ACCELERATOR" ||
        c.type === "INSTITUTION" ||
        c.type === "AGENCY" ||
        c.type === "INTERMEDIARY"
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
    const CONCURRENCY = 4; // real API key here, higher tier than the sandbox demo

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

OUTPUT FORMAT — follow exactly:
- Plain text email body only. This is NOT markdown — it will be sent as-is in a real email client.
- NEVER wrap words in asterisks, underscores, or # symbols for emphasis (no **bold**, no *italic*, no # headings). If you want to emphasize the startup name, just write it plainly.
- No JSON, no code fences, no commentary outside the two fields below.

SUBJECT: <the subject line on one line>
BODY:
<the full email body, as many lines as needed>`;

    const out = await claude(prompt, 1400);
    return { ...parseDraft(out), edited: false };
  };

  const runDrafts = async () => {
    if (!Number.isFinite(limitNum) || limitNum <= 0) {
      setErr("초안 개수는 1 이상의 숫자여야 합니다.");
      return;
    }
    const top = scored.slice(0, limitNum);
    if (!top.length) return;
    setBusy("draft");
    setProgress(0);
    setErr("");
    const next = { ...drafts };
    const CONCURRENCY = 4; // real API key here, higher tier than the sandbox demo
    try {
      const cid = await getOrCreateCampaignId();
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
              persistSend(cid, c, {
                subject: d.subject,
                body: d.body,
                status: sendStatus[c.id]?.replace("draft_in_gmail", "draft") || "draft",
              });
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
      const ns = { ...sendStatus };
      const ids = { ...gmailDraftIds };
      const tids = { ...threadIds };
      const cid = await getOrCreateCampaignId();
      (data.results || []).forEach((r, i) => {
        if (r.ok) {
          ns[rows[i].id] = ns[rows[i].id] || "draft_in_gmail";
          if (r.draftId) {
            ids[rows[i].id] = r.draftId;
            if (r.threadId) tids[rows[i].id] = r.threadId;
            const c = contacts.find((x) => x.id === rows[i].id);
            if (cid && c)
              persistSend(cid, c, {
                gmail_draft_id: r.draftId,
                thread_id: r.threadId || null,
                status: "draft",
              });
          }
        }
      });
      setSendStatus(ns);
      setGmailDraftIds(ids);
      setThreadIds(tids);
      setPushMsg(`${ok}건을 Gmail 초안함에 넣었습니다. 검토 후 대시보드에서 발송하거나 Gmail에서 직접 보내세요.`);
    } catch (e) {
      setPushMsg("실패: " + e.message);
    }
    setBusy("");
  };

  // Real send — actually delivers the email. Requires the draft to already
  // exist in Gmail (pushToGmail must run first). Capped and confirmed.
  const sendNow = async (ids) => {
    const targets = ids
      .filter((id) => gmailDraftIds[id])
      .map((id) => ({ contactId: id, gmailDraftId: gmailDraftIds[id] }));
    if (!targets.length) return;
    setBusy("send");
    setPushMsg("");
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftIds: targets }),
      });
      if (res.status === 401) {
        setGmail("unknown");
        setPushMsg("Gmail 연결이 필요합니다.");
        setBusy("");
        return;
      }
      const data = await res.json();
      const ns = { ...sendStatus };
      let ok = 0;
      const cid = campaignId || (await getOrCreateCampaignId());
      (data.results || []).forEach((r) => {
        if (r.ok) {
          ns[r.contactId] = "sent";
          ok += 1;
          const c = contacts.find((x) => x.id === r.contactId);
          if (cid && c) persistSend(cid, c, { status: "sent" });
        }
      });
      setSendStatus(ns);
      setPushMsg(
        `${ok}건 실제 발송 완료.` +
          (data.capped ? " (안전 한도 50건까지만 처리했습니다.)" : "")
      );
    } catch (e) {
      setPushMsg("발송 실패: " + e.message);
    }
    setBusy("");
  };

  const sendOneNow = (id) => {
    if (!window.confirm("이 메일을 지금 실제로 발송합니다. 되돌릴 수 없습니다. 계속할까요?"))
      return;
    sendNow([id]);
  };

  const sendAllDraftedNow = () => {
    const ids = Object.keys(gmailDraftIds).filter(
      (id) => sendStatus[id] !== "sent" && sendStatus[id] !== "replied"
    );
    if (!ids.length) return;
    const typed = window.prompt(
      `Gmail 초안함에 있는 ${ids.length}건을 지금 전부 실제 발송합니다.\n` +
        `되돌릴 수 없습니다. 계속하려면 아래에 "발송" 이라고 입력하세요.`
    );
    if (typed !== "발송") return;
    sendNow(ids);
  };

  // Ask Gmail whether any tracked drafts have been sent (from the app OR
  // manually inside Gmail) and whether any threads got a reply. Read-only.
  const syncGmail = async () => {
    const items = Object.keys(gmailDraftIds)
      .filter((id) => sendStatus[id] !== "replied") // already know the outcome, skip
      .map((id) => ({
        contactId: id,
        gmailDraftId: gmailDraftIds[id],
        threadId: threadIds[id] || null,
      }));
    if (!items.length) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/gmail/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (res.status === 401) {
        setGmail("unknown");
        setPushMsg("Gmail 연결이 만료됐습니다. 다시 연결해주세요.");
        setSyncing(false);
        return;
      }
      const data = await res.json();
      const ns = { ...sendStatus };
      let changed = 0;
      const cid = campaignId || (await getOrCreateCampaignId());
      (data.results || []).forEach((r) => {
        const c = contacts.find((x) => x.id === r.contactId);
        let newStatus = null;
        if (r.replied) newStatus = "replied";
        else if (r.sent && ns[r.contactId] !== "no_interest") newStatus = "sent";
        if (newStatus && ns[r.contactId] !== newStatus) {
          ns[r.contactId] = newStatus;
          changed += 1;
          if (cid && c) persistSend(cid, c, { status: newStatus });
        }
      });
      if (changed) setSendStatus(ns);
      setLastSync(new Date());
    } catch (e) {
      console.error("syncGmail failed", e);
    }
    setSyncing(false);
  };

  // Auto-poll every 45s while sitting on the dashboard tab, so replies show
  // up without having to click anything — but only if Gmail is connected
  // and there's something worth checking.
  useEffect(() => {
    if (tab !== "dash" || gmail !== "connected") return;
    if (!Object.keys(gmailDraftIds).length) return;
    syncGmail();
    const t = setInterval(syncGmail, 45000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, gmail, campaignId]);

  const setStatus = async (id, st) => {
    setSendStatus((prev) => ({ ...prev, [id]: st }));
    const c = contacts.find((x) => x.id === id);
    const cid = campaignId || (await getOrCreateCampaignId());
    if (cid && c) persistSend(cid, c, { status: st });
  };

  // Manually force a contact to the top of the ranking — bypasses the AI
  // score entirely. Useful for testing the pipeline end-to-end with a
  // known contact, or for "I know this one matters, skip the scoring".
  const pinContact = (id) => {
    setScores((prev) => ({
      ...prev,
      [id]: { score: 100, reason: "수동 고정 — 사용자가 직접 최상위로 지정" },
    }));
  };

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
    ["data", "1 · 컨택", Users],
    ["startup", "2 · 스타트업", Building2],
    ["match", "3 · 매칭", Sparkles],
    ["review", "4 · 초안 검토", Mail],
    ["dash", "대시보드", LayoutDashboard],
    ["voice", "톤 설정", SlidersHorizontal],
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
          background: `linear-gradient(180deg, ${C.ink} 0%, #101923 100%)`,
          padding: "15px 24px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          borderBottom: `2px solid ${C.pine}`,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            background: `linear-gradient(135deg, ${C.pine} 0%, #4A8A73 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Compass size={17} color="#fff" strokeWidth={2.2} />
        </div>
        <div>
          <div
            style={{
              fontFamily: "Archivo, sans-serif",
              fontWeight: 700,
              fontSize: 15,
              color: "#fff",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            Lodestart Outreach Desk
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10.5,
              color: "#7C8FA0",
              marginTop: 1,
            }}
          >
            v1 · Gmail 초안 생성 · 실제 발송은 확인 후
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          {/* estimated API usage this session */}
          <div
            title="Anthropic API 키는 잔여 크레딧을 직접 조회할 수 없어 이번 세션 사용량으로 추정한 값입니다."
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 11px",
              borderRadius: 5,
              border: "1px solid #2C3844",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <Sparkles size={12} color="#8FA3AE" />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: "#C4D0DA",
              }}
            >
              ≈ ${estCost.toFixed(3)} 사용
            </span>
            <span style={{ fontSize: 10, color: "#5C6B7A" }}>(추정)</span>
          </div>

          <a
            href="/api/auth/google"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              textDecoration: "none",
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              padding: "7px 12px",
              borderRadius: 5,
              whiteSpace: "nowrap",
              flexShrink: 0,
              border: `1px solid ${gmail === "connected" ? "#3E7D5A" : "#3A4652"}`,
              background: gmail === "connected" ? "#1F3B2C" : "transparent",
              color: gmail === "connected" ? "#B7E4C7" : "#C4D0DA",
              transition: "all .15s",
            }}
          >
            <Mail size={13} />
            {gmail === "connected" ? "Gmail 연결됨" : "Gmail 연결"}
          </a>

          <div style={{ display: "flex", gap: 16 }}>
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
                    lineHeight: 1,
                  }}
                >
                  {n}
                </div>
                <div style={{ fontSize: 9.5, color: "#7C8FA0", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
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
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: tab === id ? C.pineSoft : "transparent",
              border: "none",
              borderRadius: "6px 6px 0 0",
              borderBottom: `2px solid ${tab === id ? C.pine : "transparent"}`,
              color: tab === id ? C.pine : C.mute,
              padding: "11px 14px",
              marginTop: 6,
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: tab === id ? 600 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all .15s",
            }}
          >
            <Icon size={14} strokeWidth={tab === id ? 2.4 : 2} />
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
              : busy === "push"
              ? "Gmail 초안함에 넣는 중…"
              : busy === "send"
              ? "발송 중…"
              : busy === "loadContacts"
              ? "컨택 DB 불러오는 중…"
              : busy === "uploadContacts"
              ? "컨택 DB에 업로드 중…"
              : `초안 생성 중… ${progress}%`)}
        </div>
      )}

      {restoredNote && !err && !busy && (
        <div
          style={{
            padding: "9px 24px",
            background: "#EAF2FA",
            color: "#2C5A85",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
            borderBottom: `1px solid ${C.line}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <RefreshCw size={13} />
          {restoredNote}
          <button
            onClick={() => setRestoredNote("")}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#2C5A85",
            }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 24px 80px" }}>
        {/* ------------------------------ DATA ---------------------------- */}
        {tab === "data" && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <H icon={Database} sub="모든 컨택은 Supabase DB에 저장되어 다음에 다시 방문해도 그대로 남아있습니다.">
                  컨택 데이터베이스
                </H>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Btn
                    kind="ghost"
                    small
                    icon={RefreshCw}
                    onClick={loadContacts}
                    disabled={!!busy}
                  >
                    새로고침
                  </Btn>
                  <label>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "9px 16px",
                        borderRadius: 5,
                        background: C.pine,
                        color: "#fff",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: busy ? "not-allowed" : "pointer",
                        opacity: busy ? 0.5 : 1,
                      }}
                    >
                      <FileUp size={14} />
                      CSV 업로드 (DB에 추가·업데이트)
                    </span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={onFile}
                      disabled={!!busy}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>

              {dbNote && (
                <div
                  style={{
                    marginTop: 4,
                    marginBottom: 14,
                    padding: "9px 12px",
                    borderRadius: 4,
                    background: C.pineSoft,
                    color: C.pine,
                    fontSize: 12,
                  }}
                >
                  {dbNote}
                </div>
              )}

              {contacts.length === 0 && busy !== "loadContacts" && (
                <div
                  style={{
                    padding: "30px 10px",
                    textAlign: "center",
                    color: C.mute,
                    fontSize: 13,
                  }}
                >
                  <Database size={26} color={C.line} style={{ marginBottom: 8 }} />
                  <div>DB가 비어있습니다. CSV를 업로드해서 시작하세요.</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    이메일이 이미 있는 행은 자동으로 최신 정보로 업데이트되고, 새 이메일은
                    추가됩니다 (중복 없음).
                  </div>
                </div>
              )}

              {contacts.length > 0 && (
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
                    <button
                      key={t}
                      onClick={() =>
                        setContactTypeFilter(contactTypeFilter === t ? "ALL" : t)
                      }
                      style={{
                        textAlign: "left",
                        cursor: "pointer",
                        border: `1px solid ${contactTypeFilter === t ? C.pine : C.line}`,
                        background: contactTypeFilter === t ? C.pineSoft : C.surface,
                        borderRadius: 6,
                        padding: "10px 12px",
                        transition: "all .12s",
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
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {contacts.length > 0 && (
              <Card pad={0}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 16px",
                    borderBottom: `1px solid ${C.line}`,
                  }}
                >
                  <div style={{ position: "relative", flex: 1, maxWidth: 340 }}>
                    <Search
                      size={14}
                      color={C.mute}
                      style={{ position: "absolute", left: 10, top: 10 }}
                    />
                    <input
                      value={contactQuery}
                      onChange={(e) => setContactQuery(e.target.value)}
                      placeholder="회사, 담당자, 이메일로 검색"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "8px 10px 8px 30px",
                        border: `1px solid ${C.line}`,
                        borderRadius: 5,
                        fontSize: 13,
                        fontFamily: "Inter, sans-serif",
                        outline: "none",
                      }}
                    />
                  </div>
                  {contactTypeFilter !== "ALL" && (
                    <Btn small kind="ghost" onClick={() => setContactTypeFilter("ALL")}>
                      {contactTypeFilter} 필터 해제
                    </Btn>
                  )}
                  <div style={{ marginLeft: "auto", fontSize: 12, color: C.mute }}>
                    {filteredContacts.length.toLocaleString()}건
                    {filteredContacts.length !== contacts.length &&
                      ` / 전체 ${contacts.length.toLocaleString()}건`}
                  </div>
                </div>

                <div style={{ maxHeight: 460, overflowY: "auto" }}>
                  {filteredContacts.slice(0, 300).map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "9px 16px",
                        borderBottom: `1px solid ${C.line}`,
                        fontSize: 12.5,
                      }}
                    >
                      <div
                        style={{
                          width: 92,
                          flexShrink: 0,
                          fontSize: 10,
                          fontWeight: 600,
                          color: C.mute,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.type}
                      </div>
                      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.org}
                        </div>
                        {c.person && (
                          <div style={{ color: C.mute, fontSize: 11 }}>
                            {c.person}
                            {c.title ? ` · ${c.title}` : ""}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          flex: "1 1 220px",
                          minWidth: 0,
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11.5,
                          color: C.mute,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.email}
                      </div>
                      <div style={{ width: 70, flexShrink: 0, color: C.mute, fontSize: 11 }}>
                        {c.country}
                      </div>
                    </div>
                  ))}
                  {filteredContacts.length > 300 && (
                    <div
                      style={{
                        padding: 14,
                        textAlign: "center",
                        fontSize: 11,
                        color: C.mute,
                      }}
                    >
                      상위 300건만 표시했습니다. 검색으로 좁혀보세요. (매칭에는 필터와 무관하게
                      전체가 사용됩니다.)
                    </div>
                  )}
                </div>
              </Card>
            )}

            {contacts.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Btn onClick={() => setTab("startup")}>다음 · 스타트업 입력</Btn>
              </div>
            )}
          </div>
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
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  border: `1.5px dashed ${busy === "extract" ? C.pine : C.line}`,
                  borderRadius: 8,
                  padding: "14px 16px",
                  marginBottom: 18,
                  cursor: busy ? "default" : "pointer",
                  background: busy === "extract" ? C.pineSoft : "#FAFBFC",
                  transition: "all .15s",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 7,
                    background: busy === "extract" ? "#fff" : C.pineSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {busy === "extract" ? (
                    <Loader2 size={17} color={C.pine} className="spin" />
                  ) : (
                    <FileUp size={17} color={C.pine} />
                  )}
                </div>
                <div>
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
                  <div style={{ fontSize: 11, color: C.mute, marginTop: 1 }}>
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
              {audience === "TEST" && (
                <div
                  style={{
                    marginBottom: 12,
                    padding: "9px 12px",
                    borderRadius: 5,
                    background: "#FBF3D9",
                    border: "1px solid #E0C15C",
                    color: "#7A611F",
                    fontSize: 11.5,
                    lineHeight: 1.5,
                  }}
                >
                  🧪 테스트 모드입니다. 전부 더미 회사이고, 이메일은 Gmail 별칭(+test)으로
                  전부 본인 받은편지함으로 옵니다. 실제 발송을 눌러도 안전하지만, KOCHAM
                  실제 회원사와 절대 섞이지 않습니다.
                </div>
              )}
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
                  k === "TEST"
                    ? c.type === "TEST"
                    : k === "VC"
                    ? c.type.startsWith("VC") && c.type !== "TEST"
                    : k === "CORPORATE_KR"
                    ? c.type === "CORPORATE_KR"
                    : ["ACCELERATOR", "INSTITUTION", "AGENCY", "INTERMEDIARY"].includes(c.type)
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
                  label={`초안 개수 (상위 ${
                    Number.isFinite(limitNum) && limitNum > 0 ? limitNum : "?"
                  }명)`}
                  value={limit}
                  onChange={(v) => setLimit(v.replace(/[^0-9]/g, ""))}
                  mono
                />
                {limit !== "" &&
                  (!Number.isFinite(limitNum) || limitNum <= 0) && (
                    <div style={{ fontSize: 11, color: C.alert, marginTop: -8, marginBottom: 10 }}>
                      1 이상의 숫자를 입력하세요.
                    </div>
                  )}
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
                          whiteSpace: "nowrap",
                          background: lang === L ? C.pine : "transparent",
                          color: lang === L ? "#fff" : C.mute,
                        }}
                      >
                        {L === "EN" ? "English" : "한국어"}
                      </button>
                    ))}
                  </div>
                  <Btn
                    onClick={runDrafts}
                    disabled={!scored.length || !!busy || !Number.isFinite(limitNum) || limitNum <= 0}
                  >
                    {lang === "KO" ? "한국어로" : "영어로"} 상위{" "}
                    {Number.isFinite(limitNum) && limitNum > 0
                      ? Math.min(limitNum, scored.length)
                      : "?"}
                    명 초안 생성
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
                    background: i < limitNum ? C.surface : "#FAFBFC",
                    opacity: i < limitNum ? 1 : 0.55,
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
                  <button
                    onClick={() => pinContact(c.id)}
                    title="이 컨택을 최상위로 고정 (점수 100)"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      border: `1px solid ${
                        scores[c.id].reason?.startsWith("수동 고정") ? C.pine : C.line
                      }`,
                      borderRadius: 5,
                      background: scores[c.id].reason?.startsWith("수동 고정")
                        ? C.pineSoft
                        : "transparent",
                      color: scores[c.id].reason?.startsWith("수동 고정") ? C.pine : C.mute,
                      cursor: "pointer",
                    }}
                  >
                    <Pin size={12} strokeWidth={2.3} />
                  </button>
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
                flexWrap: "wrap",
                rowGap: 10,
              }}
            >
              <H sub="수정하면 다음 초안부터 Tammy의 문체를 따라갑니다. 발송은 직접 하세요.">
                초안 {Object.keys(drafts).length}건
              </H>
              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                  rowGap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    border: `1px solid ${C.line}`,
                    borderRadius: 4,
                    overflow: "hidden",
                    flexShrink: 0,
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
                        whiteSpace: "nowrap",
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
                  icon={FileUp}
                  onClick={pushToGmail}
                  disabled={!Object.keys(drafts).length || !!busy}
                >
                  {busy === "push" ? "넣는 중…" : "Gmail 초안함에 넣기"}
                </Btn>
                {Object.keys(gmailDraftIds).length > 0 && (
                  <Btn kind="danger" icon={Send} onClick={sendAllDraftedNow} disabled={!!busy}>
                    전체 실제 발송
                  </Btn>
                )}
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
                            <div style={{ flex: 1 }} />
                            {gmailDraftIds[c.id] &&
                              sendStatus[c.id] !== "sent" &&
                              sendStatus[c.id] !== "replied" && (
                                <Btn
                                  small
                                  kind="danger"
                                  icon={Send}
                                  onClick={() => sendOneNow(c.id)}
                                  disabled={!!busy}
                                >
                                  지금 발송
                                </Btn>
                              )}
                            {(sendStatus[c.id] === "sent" ||
                              sendStatus[c.id] === "replied") && (
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: C.pine,
                                  padding: "6px 10px",
                                }}
                              >
                                <Check size={13} /> 발송 완료
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}

            {!Object.keys(drafts).length && (
              <Card>
                <div
                  style={{
                    color: C.mute,
                    fontSize: 13,
                    textAlign: "center",
                    padding: 40,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Mail size={26} color={C.line} strokeWidth={1.6} />
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <H sub={`${startup.name || "—"} · ${AUDIENCES[audience].label}`}>
                      성과 대시보드
                    </H>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {lastSync && (
                        <span style={{ fontSize: 11, color: C.mute }}>
                          마지막 확인: {lastSync.toLocaleTimeString("ko-KR")}
                        </span>
                      )}
                      <Btn
                        small
                        kind="ghost"
                        icon={syncing ? Loader2 : RefreshCw}
                        onClick={syncGmail}
                        disabled={syncing || !Object.keys(gmailDraftIds).length}
                      >
                        {syncing ? "확인 중…" : "Gmail 동기화"}
                      </Btn>
                    </div>
                  </div>

                  {gmail !== "connected" && Object.keys(gmailDraftIds).length > 0 && (
                    <div
                      style={{
                        marginBottom: 14,
                        padding: "9px 12px",
                        borderRadius: 5,
                        background: "#FBF3D9",
                        border: "1px solid #E0C15C",
                        color: "#7A611F",
                        fontSize: 11.5,
                      }}
                    >
                      회신·발송 자동 감지를 쓰려면 Gmail을 다시 연결해주세요 (읽기 권한이
                      추가돼서 재연결이 한 번 필요합니다).
                    </div>
                  )}
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
                      발송 상태 기록
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 400,
                          color: C.mute,
                          marginTop: 3,
                        }}
                      >
                        Gmail 동기화가 켜져 있으면(대시보드에 있는 동안 45초마다 자동 확인)
                        Gmail에서 직접 보내거나 회신이 와도 자동으로 반영됩니다. 안 되는
                        경우에만 아래 버튼으로 직접 표시해주세요.
                      </div>
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
                          {gmailDraftIds[c.id] &&
                            sendStatus[c.id] !== "sent" &&
                            sendStatus[c.id] !== "replied" && (
                              <Btn small kind="danger" icon={Send} onClick={() => sendOneNow(c.id)}>
                                발송
                              </Btn>
                            )}
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
                                  transition: "all .12s",
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

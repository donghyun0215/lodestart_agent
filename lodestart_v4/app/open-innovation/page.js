"use client";
import { useState, useMemo } from "react";
import {
  CHALLENGES,
  CHALLENGE_SECTORS,
  CHALLENGE_PLATFORMS,
  CHALLENGE_STATUS,
  ORGS,
} from "@/lib/data";
import ChallengeCard from "@/components/ChallengeCard";
import OrgRow from "@/components/OrgRow";
import Reveal from "@/components/Reveal";
import { RuleTitle } from "@/components/Bits";
import Link from "next/link";
import { useLang } from "@/components/LanguageProvider";

const SECTOR_KO = {
  Healthcare: "헬스케어",
  FinTech: "핀테크",
  Logistics: "물류",
  Retail: "리테일",
  Sustainability: "지속가능성",
  "Professional Services": "전문 서비스",
};
const PLATFORM_KO = {
  "IMDA OIP": "IMDA OIP",
  OIN: "OIN",
  MAS: "MAS",
  EnterpriseSG: "EnterpriseSG",
  "LodestarT sourced": "LodestarT 발굴",
};

export default function OpenInnovationPage() {
  const { t, lang } = useLang();
  const [q, setQ] = useState("");
  const [sectors, setSectors] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [status, setStatus] = useState("all");

  const toggle = (list, setList, v) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const reset = () => {
    setQ("");
    setSectors([]);
    setPlatforms([]);
    setStatus("all");
  };

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return CHALLENGES.filter((c) => {
      const sOk = sectors.length === 0 || sectors.includes(c.sector);
      const pOk = platforms.length === 0 || platforms.includes(c.platform);
      const stOk = status === "all" || c.status === status;
      const qOk =
        !term ||
        c.title.toLowerCase().includes(term) ||
        c.desc.toLowerCase().includes(term) ||
        c.owner.toLowerCase().includes(term) ||
        c.tags.some((t) => t.toLowerCase().includes(term));
      return sOk && pOk && stOk && qOk;
    });
  }, [q, sectors, platforms, status]);

  const activeCount = sectors.length + platforms.length + (status !== "all" ? 1 : 0) + (q ? 1 : 0);

  return (
    <>
      <header className="page-hero">
        <div className="wrap">
          <span className="kicker">{t("oi_kicker")}</span>
          <h1 className="h-section">{t("oi_title")}</h1>
          <p className="sub">{t("oi_sub")}</p>
        </div>
      </header>

      {/* ---------- PAIN POINT ---------- */}
      <section className="section">
        <div className="wrap">
          <Reveal>
            <RuleTitle kicker={t("oi_pain_kicker")} title={t("oi_pain_title")} sub={t("oi_pain_sub")} />
          </Reveal>
          <div className="pain-grid">
            <Reveal>
              <div className="pain-card">
                <span className="pain-mark" aria-hidden="true">01</span>
                <h3>{t("oi_pain_1_t")}</h3>
                <p>{t("oi_pain_1_d")}</p>
              </div>
            </Reveal>
            <Reveal delay={60}>
              <div className="pain-card">
                <span className="pain-mark" aria-hidden="true">02</span>
                <h3>{t("oi_pain_2_t")}</h3>
                <p>{t("oi_pain_2_d")}</p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="pain-card">
                <span className="pain-mark" aria-hidden="true">03</span>
                <h3>{t("oi_pain_3_t")}</h3>
                <p>{t("oi_pain_3_d")}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- WORKFLOW ---------- */}
      <section className="section dark">
        <div className="wrap">
          <Reveal>
            <RuleTitle dark kicker={t("oi_flow_kicker")} title={t("oi_flow_title")} sub={t("oi_flow_sub")} />
          </Reveal>
          <div className="flow-track">
            {[
              ["1", t("oi_flow_1_t"), t("oi_flow_1_d")],
              ["2", t("oi_flow_2_t"), t("oi_flow_2_d")],
              ["3", t("oi_flow_3_t"), t("oi_flow_3_d")],
              ["4", t("oi_flow_4_t"), t("oi_flow_4_d")],
              ["5", t("oi_flow_5_t"), t("oi_flow_5_d")],
            ].map(([n, ttl, desc], i) => (
              <Reveal key={n} delay={i * 60}>
                <div className={`flow-step ${n === "4" ? "highlight" : ""}`}>
                  <span className="flow-n">{n}</span>
                  <h3>{ttl}</h3>
                  <p>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="flow-note">{t("oi_flow_note")}</p>
          <div style={{ marginTop: 36 }}>
            <Link href="/contact" className="btn btn-orange">
              {t("oi_pain_cta")} <span className="arr">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- FILTER BAR ---------- */}
      <section className="section soft" style={{ paddingBottom: 30 }}>
        <div className="wrap">
          <div className="filter-panel">
            <div className="fp-row">
              <label className="fp-label" htmlFor="oi-search">
                {t("f_search")}
              </label>
              <input
                id="oi-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("f_search_ph")}
                className="fp-input"
              />
              <button className="btn btn-black btn-sm fp-reset" onClick={reset} type="button">
                {t("f_reset")}
              </button>
            </div>

            <div className="fp-row">
              <span className="fp-label">{t("f_sector")}</span>
              <div className="fp-chips">
                {CHALLENGE_SECTORS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`fp-chip ${sectors.includes(s) ? "on" : ""}`}
                    onClick={() => toggle(sectors, setSectors, s)}
                    aria-pressed={sectors.includes(s)}
                  >
                    {lang === "ko" ? SECTOR_KO[s] ?? s : s}
                    {sectors.includes(s) && <i aria-hidden="true">×</i>}
                  </button>
                ))}
              </div>
            </div>

            <div className="fp-row">
              <span className="fp-label">{t("f_source")}</span>
              <div className="fp-chips">
                {CHALLENGE_PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`fp-chip ${platforms.includes(p) ? "on" : ""}`}
                    onClick={() => toggle(platforms, setPlatforms, p)}
                    aria-pressed={platforms.includes(p)}
                  >
                    {lang === "ko" ? PLATFORM_KO[p] ?? p : p}
                    {platforms.includes(p) && <i aria-hidden="true">×</i>}
                  </button>
                ))}
              </div>
            </div>

            <div className="fp-row">
              <span className="fp-label">{t("f_status")}</span>
              <div className="fp-chips">
                {CHALLENGE_STATUS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={`fp-chip ${status === s.value ? "on" : ""}`}
                    onClick={() => setStatus(s.value)}
                    aria-pressed={status === s.value}
                  >
                    {t("f_" + s.value)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="result-note" style={{ marginTop: 24 }}>
            <b style={{ color: "var(--ink)" }}>{list.length}</b> {list.length === 1 ? t("oi_count_one") : t("oi_count_many")}
            {activeCount > 0 ? ` · ${activeCount} ${activeCount === 1 ? t("oi_filter_applied") : t("oi_filters_applied")}` : ""}
          </p>

          <div className="c-grid">
            {list.map((c, i) => (
              <Reveal key={c.id} delay={(i % 3) * 70}>
                <ChallengeCard c={c} />
              </Reveal>
            ))}
          </div>

          {list.length === 0 && (
            <p style={{ color: "var(--ink-faint)", padding: "40px 0" }}>
              {t("oi_none")}
            </p>
          )}

          <p className="sample-note">
            {t("oi_sample")}
          </p>
        </div>
      </section>

      {/* ---------- ORG INDEX ---------- */}
      <section className="section">
        <div className="wrap">
          <Reveal>
            <RuleTitle
              kicker={t("oi_counterparts_kicker")}
              title={t("oi_counterparts_title")}
              sub={t("oi_counterparts_sub")}
            />
          </Reveal>
          <div className="org-list">
            {ORGS.map((o, i) => (
              <Reveal key={o.slug} delay={i * 50}>
                <OrgRow o={o} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- NATIONAL FUNDING PROGRAMMES ---------- */}
      <section className="section soft">
        <div className="wrap">
          <Reveal>
            <RuleTitle
              kicker={t("oi_funding_kicker")}
              title={t("oi_funding_title")}
              sub={t("oi_funding_sub")}
            />
          </Reveal>
          <div className="funding-grid">
            <Reveal>
              <div className="funding-card">
                <span className="funding-tag">{t("oi_funding_1_tag")}</span>
                <h3>{t("oi_funding_1_name")}</h3>
                <p className="funding-org">{t("oi_funding_1_org")}</p>
                <p className="funding-desc">{t("oi_funding_1_desc")}</p>
                <div className="funding-links">
                  <a
                    href="https://www.startupsg.gov.sg/programmes/4897/startup-sg-tech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    {t("oi_funding_1_learn")}
                  </a>
                  <a
                    href="https://www.startupsg.gov.sg/programmes/4897/startup-sg-tech/apply"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-orange btn-sm"
                  >
                    {t("oi_funding_1_apply")} <span className="arr">→</span>
                  </a>
                </div>
              </div>
            </Reveal>
            <Reveal delay={60}>
              <div className="funding-card">
                <span className="funding-tag">{t("oi_funding_2_tag")}</span>
                <h3>{t("oi_funding_2_name")}</h3>
                <p className="funding-org">{t("oi_funding_2_org")}</p>
                <p className="funding-desc">{t("oi_funding_2_desc")}</p>
                <div className="funding-links">
                  <a
                    href="https://aisingapore.org/innovation/100e/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    {t("oi_funding_2_learn")}
                  </a>
                  <a
                    href="https://aisingapore.org/innovation/100e/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-orange btn-sm"
                  >
                    {t("oi_funding_2_apply")} <span className="arr">→</span>
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
          <p className="sample-note" style={{ marginTop: 22 }}>
            {t("oi_funding_note")}
          </p>
        </div>
      </section>
    </>
  );
}

"use client";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ORGS, STARTUPS } from "@/lib/data";
import { useLang } from "@/components/LanguageProvider";

export default function OrgView({ slug }) {
  const { t, p } = useLang();
  const o = ORGS.find((x) => x.slug === slug);
  if (!o) notFound();

  // naive fit: companies whose sector keyword appears in the org's focus areas
  const matched = STARTUPS.filter((s) =>
    o.focus.some(
      (f) =>
        s.sector.toLowerCase().includes(f.toLowerCase().split(" ")[0]) ||
        f.toLowerCase().includes(s.sector.toLowerCase().split(" ")[0])
    )
  ).slice(0, 3);

  return (
    <>
      <header className="page-hero">
        <div className="wrap">
          <Link href="/open-innovation" className="back-link" style={{ color: "rgba(255,255,255,0.55)" }}>
            <span aria-hidden="true">←</span> {t("org_back")}
          </Link>
          {o.logo && (
            <span className="org-hero-logo">
              <Image
                src={o.logo}
                alt={o.name}
                width={Math.round((o.logoW / 96) * 40)}
                height={40}
                style={{ height: 40, width: "auto" }}
                unoptimized
              />
            </span>
          )}
          <br />
          <span className={`org-type ${o.type}`} style={{ marginBottom: 12 }}>
            {p(o, "typeLabel")}
          </span>
          <h1 className="h-section">{p(o, "name")}</h1>
          <p className="sub">{p(o, "desc")}</p>
          <div className="org-focus" style={{ marginTop: 20 }}>
            {o.focus.map((f) => (
              <span
                key={f}
                className="hash"
                style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ---------- STATS ---------- */}
      

      {/* ---------- OPEN CALLS ---------- */}
      <section className="section">
        <div className="wrap">
          <div className="rule-title">
            <h2 className="h-section">{t("org_open_now")}</h2>
            <div className="rule-line" />
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {o.calls.map((c) => (
              <div key={c.title} className="call-row">
                <div>
                  <h5>{p(c, "title")}</h5>
                  <div className="call-meta">
                    <span>{c.sector}</span>
                    <span>{c.funding}</span>
                    <span>{t("oi_end_date")} {c.deadline}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span className={`call-status ${c.status === "closing" ? "closing" : ""}`}>
                    <span className="dot" />
                    {c.status === "closing" ? t("f_closing") : t("f_open")}
                  </span>
                  {o.link ? (
                    <a href={o.link} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      {t("org_official")} <span className="arr">→</span>
                    </a>
                  ) : (
                    <Link href="/contact" className="btn btn-outline btn-sm">
                      {t("org_request_match")} <span className="arr">→</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* engagement route */}
          <div
            style={{
              marginTop: 40,
              background: "var(--black)",
              color: "#fff",
              borderRadius: "var(--radius-lg)",
              padding: "40px 44px",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 28,
              alignItems: "center",
            }}
          >
            <div>
              <span className="kicker">{t("org_route_kicker")}</span>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 500, margin: "12px 0 10px" }}>
                {t("org_route_title")}
              </h3>
              <p style={{ color: "rgba(255,255,255,0.62)", fontSize: 14.5, maxWidth: 560 }}>
                {t("org_route_sub")}
              </p>
            </div>
            <Link href="/contact" className="btn btn-orange">
              {t("org_route_cta")} <span className="arr">→</span>
            </Link>
          </div>

          {/* matched companies */}
          {matched.length > 0 && (
            <div style={{ marginTop: 56 }}>
              <div className="rule-title">
                <h2 className="h-section">{t("org_matched")}</h2>
                <div className="rule-line" />
              </div>
              <div className="org-list">
                {matched.map((s) => (
                  <Link key={s.slug} href={`/startups/${s.slug}`} className="org-row">
                    <div>
                      <span className="chip-program">{s.programme}</span>
                      <h3 style={{ marginTop: 8 }}>{s.name}</h3>
                      <p className="org-desc">{p(s, "summary")}</p>
                    </div>
                    <span className="s-link">
                      {t("co_view")} <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

"use client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STARTUPS } from "@/lib/data";
import { Banner } from "@/components/Bits";
import { useLang } from "@/components/LanguageProvider";

function Section({ title, children }) {
  return (
    <div className="d-section">
      <h2 className="d-title">{title}</h2>
      {children}
    </div>
  );
}

function Bullets({ items }) {
  return (
    <ul>
      {items.map((i, k) => (
        <li key={k}>{i}</li>
      ))}
    </ul>
  );
}

export default function StartupView({ slug }) {
  const { t, p } = useLang();
  const s = STARTUPS.find((x) => x.slug === slug);
  if (!s) notFound();

  return (
    <section className="section">
      <div className="wrap">
        <Link href="/startups" className="back-link">
          <span aria-hidden="true">←</span> {t("co_back")}
        </Link>

        <div className="detail-layout">
          {/* ---------- MAIN ---------- */}
          <div>
            <Banner banner={s.banner} large />

            <div style={{ marginTop: 34 }}>
              <Section title={t("d_overview")}>
                {p(s, "overview").map((para, k) => (
                  <p key={k}>{para}</p>
                ))}
              </Section>

              <Section title={t("d_funding")}>
                <p>{p(s, "funding")}</p>
              </Section>

              {s.team.length > 0 && (
                <Section title={t("d_team")}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: 14,
                    }}
                  >
                    {s.team.map((t) => (
                      <div
                        key={t.name}
                        style={{
                          border: "1px solid var(--line)",
                          borderRadius: "var(--radius)",
                          padding: "20px 18px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            background: "var(--bg-soft)",
                            margin: "0 auto 12px",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 600,
                            color: "var(--ink-faint)",
                          }}
                        >
                          {t.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")}
                        </div>
                        <b style={{ fontSize: 14.5, display: "block" }}>{t.name}</b>
                        <span style={{ fontSize: 12.5, color: "var(--ink-faint)", display: "block", marginBottom: 8 }}>
                          {t.role}
                        </span>
                        <span style={{ fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.5, display: "block" }}>
                          {t.notes}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              <Section title={t("d_problem")}>
                <Bullets items={s.problem} />
              </Section>

              <Section title={t("d_opportunity")}>
                <Bullets items={s.opportunity} />
              </Section>

              <Section title={t("d_advantage")}>
                <Bullets items={s.advantage} />
              </Section>

              <Section title={t("d_solution")}>
                <p style={{ fontWeight: 600, color: "var(--ink)" }}>{s.solution.lead}</p>
                {s.solution.groups.map((g) => (
                  <div key={g.title}>
                    <h4>{g.title}</h4>
                    <Bullets items={g.items} />
                  </div>
                ))}
              </Section>

              <Section title={t("d_model")}>
                <p style={{ fontWeight: 600, color: "var(--ink)" }}>{s.businessModel.lead}</p>
                <Bullets items={s.businessModel.items} />
              </Section>

              {s.achievements.length > 0 && (
                <Section title={t("d_achievements")}>
                  <Bullets items={s.achievements} />
                </Section>
              )}

              <Section title={t("d_highlights")}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  {s.highlights.map((h, k) => (
                    <div
                      key={k}
                      style={{
                        background: "var(--bg-soft)",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--radius)",
                        padding: "16px 18px",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      {h}
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </div>

          {/* ---------- SIDEBAR ---------- */}
          <aside className="d-side">
            <div className="side-card">
              <span className="chip-program">{s.programme}</span>
              <h1 style={{ fontSize: "1.5rem", margin: "12px 0 0" }}>{s.name}</h1>
              <p className="side-quote">{p(s, "summary")}</p>
              <a href="mailto:hello@lodestart.ai" className="btn btn-black" style={{ width: "100%" }}>
                {t("d_get_touch")}
              </a>
              <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 10, textAlign: "center" }}>
                {t("d_intro_note")}
              </p>
            </div>

            <div className="side-card">
              {s.website && (
                <div className="side-row">
                  <span className="ico" aria-hidden="true">
                    ↗
                  </span>
                  <div>
                    <a href={s.website} target="_blank" rel="noopener noreferrer">
                      {t("d_website")}
                    </a>
                    <small>{s.website.replace(/^https?:\/\//, "")}</small>
                  </div>
                </div>
              )}
              <div className="side-row">
                <span className="ico" aria-hidden="true">
                  ▤
                </span>
                <div>
                  <span>{s.deck.name}</span>
                  <small>{s.deck.size}</small>
                </div>
              </div>
              <div className="side-row">
                <span className="ico" aria-hidden="true">
                  ⌖
                </span>
                <div>
                  <span>{p(s, "hq")}</span>
                  <small>{t("d_hq")}</small>
                </div>
              </div>
            </div>

            <div className="side-card">
              <span className="side-label">{t("d_hosts")}</span>
              {s.hosts.map((h) => (
                <div key={h.name} className="host-row">
                  <span className="host-ava">{h.name[0]}</span>
                  <div>
                    <b>
                      {h.name}
                      <span>{h.type}</span>
                    </b>
                    <small>{h.role}</small>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

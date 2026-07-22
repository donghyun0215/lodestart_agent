"use client";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useLang } from "@/components/LanguageProvider";

const UPCOMING = [
  { tag: "Demo Day", tag_ko: "데모데이", title: "K-FinTech × Singapore", when: "Q1 · Singapore", when_ko: "1분기 · 싱가포르" },
  { tag: "Roundtable", tag_ko: "라운드테이블", title: "Regulators & Founders", when: "Q2 · Seoul", when_ko: "2분기 · 서울" },
  { tag: "Showcase", tag_ko: "쇼케이스", title: "Deep Tech Korea", when: "Q3 · Singapore", when_ko: "3분기 · 싱가포르" },
  { tag: "Summit", tag_ko: "서밋", title: "K-Startup Global Day", when: "Q4 · Singapore", when_ko: "4분기 · 싱가포르" },
];

export default function EventsPage() {
  const { t, p } = useLang();
  return (
    <>
      <header className="page-hero">
        <div className="wrap">
          <span className="kicker">{t("ev_kicker")}</span>
          <h1 className="h-section">
            {t("ev_title_a")} <em className="accent">{t("ev_title_b")}</em>
          </h1>
          <p className="sub">{t("ev_sub")}</p>
        </div>
      </header>

      <section className="section">
        <div className="wrap">
          <div className="feat-grid">
            {[1, 2, 3].map((i) => (
              <Reveal key={i} delay={(i - 1) * 60}>
                <div className="feat-card">
                  <h3>{t(`ev_${i}_t`)}</h3>
                  <p>{t(`ev_${i}_d`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section soft">
        <div className="wrap">
          <div className="up-head">
            <h2 className="h-section">{t("ev_upcoming")}</h2>
            <Link href="/contact" className="s-link">
              {t("ev_schedule")} <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="up-list">
            {UPCOMING.map((e, i) => (
              <Reveal key={e.title} delay={i * 40}>
                <div className="up-row">
                  <span className="up-tag">{p(e, "tag")}</span>
                  <span className="up-title">{e.title}</span>
                  <span className="up-when">{p(e, "when")}</span>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="fine-note" style={{ marginTop: 18 }}>
            Indicative programme — dates and venues confirm closer to each event.
          </p>
          <div style={{ marginTop: 26 }}>
            <Link href="/contact" className="btn btn-orange">
              {t("ev_join")} <span className="arr">→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

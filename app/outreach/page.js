"use client";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useLang } from "@/components/LanguageProvider";

export default function OutreachPage() {
  const { t } = useLang();
  return (
    <>
      <header className="page-hero">
        <div className="wrap">
          <span className="kicker">{t("ou_kicker")}</span>
          <h1 className="h-section">
            {t("ou_title_a")} <em className="accent">{t("ou_title_b")}</em>
          </h1>
          <p className="sub">{t("ou_sub")}</p>
        </div>
      </header>

      <section className="section">
        <div className="wrap">
          <div className="feat-grid">
            {[1, 2, 3].map((i) => (
              <Reveal key={i} delay={(i - 1) * 60}>
                <div className="feat-card">
                  <h3>{t(`ou_${i}_t`)}</h3>
                  <p>{t(`ou_${i}_d`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div style={{ marginTop: 34 }}>
            <Link href="/contact" className="btn btn-orange">
              {t("ou_cta")} <span className="arr">→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

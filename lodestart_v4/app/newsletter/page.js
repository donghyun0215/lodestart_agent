"use client";
import { useState } from "react";
import Reveal from "@/components/Reveal";
import { useLang } from "@/components/LanguageProvider";

export default function NewsletterPage() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent("Briefing access request");
    const body = encodeURIComponent(`Please add this address to the K-Innovation Partners briefing:\n\n${email}`);
    window.location.href = `mailto:Admin@lodestart.ai?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <>
      <header className="page-hero">
        <div className="wrap">
          <span className="kicker">{t("nl_kicker")}</span>
          <h1 className="h-section">
            {t("nl_title_a")} <em className="accent">{t("nl_title_b")}</em>
          </h1>
          <p className="sub">{t("nl_sub")}</p>
        </div>
      </header>

      <section className="section">
        <div className="wrap nl-grid">
          <Reveal>
            <h2 className="h-section" style={{ marginBottom: 24 }}>
              {t("nl_inside")}
            </h2>
            <ul className="nl-list">
              {[1, 2, 3, 4].map((i) => (
                <li key={i}>
                  <span className="nl-check" aria-hidden="true">✓</span>
                  <div>
                    <b>{t(`nl_${i}_t`)}</b>
                    <p>{t(`nl_${i}_d`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={80}>
            <div className="nl-card">
              <span className="nl-icon" aria-hidden="true">✉</span>
              <h3>{t("nl_sub_t")}</h3>
              <p className="nl-card-sub">{t("nl_sub_d")}</p>
              <form onSubmit={submit}>
                <input
                  type="email"
                  required
                  className="nl-input"
                  placeholder={t("nl_ph")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit" className="btn btn-orange" style={{ width: "100%", justifyContent: "center" }}>
                  {t("nl_cta")} <span className="arr">→</span>
                </button>
              </form>
              <p className="nl-fine">{sent ? t("nl_thanks") : t("nl_note")}</p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

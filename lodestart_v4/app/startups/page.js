"use client";
import { useState, useMemo, useRef } from "react";
import { STARTUPS, STARTUP_THEMES } from "@/lib/data";
import StartupRow from "@/components/StartupRow";
import ThemeCard from "@/components/ThemeCard";
import Reveal from "@/components/Reveal";
import { useLang } from "@/components/LanguageProvider";

export default function StartupsPage() {
  const { t, p } = useLang();
  const [theme, setTheme] = useState(null); // selected theme slug, or null = all
  const listRef = useRef(null);

  const activeTheme = STARTUP_THEMES.find((th) => th.slug === theme) ?? null;

  const list = useMemo(() => {
    if (!activeTheme) return STARTUPS;
    return STARTUPS.filter((s) => activeTheme.companies.includes(s.slug));
  }, [activeTheme]);

  const countFor = (th) => STARTUPS.filter((s) => th.companies.includes(s.slug)).length;

  const selectTheme = (slug) => {
    setTheme((cur) => (cur === slug ? null : slug));
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <>
      <header className="page-hero">
        <div className="wrap">
          <span className="kicker">{t("co_kicker")}</span>
          <h1 className="h-section">{t("co_title")}</h1>
          <p className="sub">{t("co_sub")}</p>
        </div>
      </header>

      {/* ---------- THEME GRID ---------- */}
      <section className="section soft">
        <div className="wrap">
          <Reveal>
            <span className="kicker">{t("theme_kicker")}</span>
            <h2 className="h-section" style={{ margin: "14px 0 12px" }}>
              {t("theme_title")}
            </h2>
            <p className="sub" style={{ marginBottom: 40 }}>
              {t("theme_sub")}
            </p>
          </Reveal>
          <div className="theme-grid">
            {STARTUP_THEMES.map((th, i) => (
              <Reveal key={th.slug} delay={i * 60}>
                <ThemeCard
                  theme={th}
                  count={countFor(th)}
                  active={theme === th.slug}
                  onSelect={() => selectTheme(th.slug)}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- COMPANY LIST ---------- */}
      <section className="section" ref={listRef}>
        <div className="wrap">
          <p className="result-note">
            <b style={{ color: "var(--ink)" }}>{list.length}</b>{" "}
            {list.length === 1 ? t("co_count_one") : t("co_count_many")}
            {activeTheme ? ` ${t("co_in")} ${p(activeTheme, "title")}` : ""}
            {activeTheme && (
              <button type="button" className="theme-reset" onClick={() => setTheme(null)}>
                {t("theme_clear")}
              </button>
            )}
          </p>
          <div className="s-list">
            {list.map((s, i) => (
              <Reveal key={s.slug} delay={i * 50}>
                <StartupRow s={s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}


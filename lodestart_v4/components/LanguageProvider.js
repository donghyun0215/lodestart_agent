"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { STRINGS, pick } from "@/lib/i18n";

const LangContext = createContext({ lang: "en", setLang: () => {}, t: (k) => k, p: () => "" });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("lodestart-lang");
      if (saved === "ko" || saved === "en") setLangState(saved);
    } catch {
      /* storage unavailable — stay on the default */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next);
    try {
      window.localStorage.setItem("lodestart-lang", next);
    } catch {
      /* non-fatal */
    }
  }, []);

  const t = useCallback((key) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key, [lang]);
  const p = useCallback((obj, field) => pick(obj, field, lang), [lang]);

  return <LangContext.Provider value={{ lang, setLang, t, p }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={lang === "en" ? "on" : ""}
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        className={lang === "ko" ? "on" : ""}
        onClick={() => setLang("ko")}
        aria-pressed={lang === "ko"}
      >
        KR
      </button>
    </div>
  );
}

"use client";
import Link from "next/link";
import { Banner } from "./Bits";
import { useLang } from "./LanguageProvider";

export default function StartupRow({ s }) {
  const { t, p } = useLang();
  return (
    <Link href={`/startups/${s.slug}`} className="s-row">
      <Banner banner={s.banner} />
      <div className="s-body">
        <div className="s-head">
          <div>
            <span className="chip-program">{s.programme}</span>
            <h3 style={{ marginTop: 8 }}>{s.name}</h3>
          </div>
        </div>
        <p className="s-desc">{p(s, "summary")}</p>
        <div className="s-foot">
          <div className="hash-row">
            {s.hashtags.map((h) => (
              <span key={h} className="hash">
                # {h}
              </span>
            ))}
          </div>
          <span className="s-link">
            {t("co_view")} <span aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

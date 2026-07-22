"use client";
import Link from "next/link";
import Logo from "./Logo";
import { useLang } from "./LanguageProvider";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer>
      <div className="wrap">
        <div className="foot-logo">
          <Logo size={44} sub={false} />
        </div>

        <div className="foot-grid">
          <div>
            <h4>{t("ft_platform")}</h4>
            <Link href="/startups">{t("ft_for_startups")}</Link>
            <Link href="/open-innovation">{t("nav_oi")}</Link>
            <a href="https://community.lodestart.ai" target="_blank" rel="noopener noreferrer">
              {t("ft_community")}
            </a>
          </div>

          <div>
            <h4>{t("ft_services")}</h4>
            <Link href="/newsletter">{t("ft_briefing")}</Link>
            <Link href="/outreach">{t("ft_matchmaking")}</Link>
          </div>

          <div>
            <h4>{t("ft_contact")}</h4>
            <a href="mailto:Admin@lodestart.ai" className="foot-mail">
              Admin@lodestart.ai
            </a>
          </div>

          <div>
            <h4>{t("ft_follow")}</h4>
            <div className="foot-social">
              <a href="https://www.linkedin.com/company/lodestart/" target="_blank" rel="noopener noreferrer" aria-label="LodestarT on LinkedIn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.24 8h4.52v14H.24V8zm7.5 0h4.33v1.9h.06c.6-1.14 2.08-2.34 4.28-2.34 4.58 0 5.43 3.01 5.43 6.93V22h-4.52v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.54 1.72-2.54 3.49V22H7.74V8z" />
                </svg>
              </a>
              <a href="https://medium.com/@taehyon.ahn" target="_blank" rel="noopener noreferrer" aria-label="LodestarT on Medium">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42zM24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="foot-base">
          <span>{t("ft_rights")}</span>
          <span className="foot-byintro">{t("ft_byintro")}</span>
        </div>
      </div>
    </footer>
  );
}

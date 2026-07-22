"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { useLang, LangToggle } from "./LanguageProvider";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const { t } = useLang();
  const isActive = (href) => (href === "/" ? path === "/" : path.startsWith(href));

  const LINKS = [
    { href: "/", label: t("nav_home") },
    { href: "/startups", label: t("nav_companies") },
    { href: "/open-innovation", label: t("nav_oi") },
    { href: "/events", label: t("nav_events") },
    { href: "/newsletter", label: t("nav_newsletter") },
    { href: "/outreach", label: t("nav_outreach") },
  ];

  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <Link href="/" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <div className={`nav-links ${open ? "open" : ""}`}>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : ""} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link href="/contact" className="pill" onClick={() => setOpen(false)}>
            {t("nav_contact")}
          </Link>
          <LangToggle />
        </div>
        <button className="nav-burger" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "✕" : "☰"}
        </button>
      </div>
    </nav>
  );
}

"use client";
import { useState } from "react";
import { useLang } from "@/components/LanguageProvider";

export default function ContactPage() {
  const { t } = useLang();
  const [profile, setProfile] = useState("company");
  const [form, setForm] = useState({ name: "", org: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const PROFILES = [
    { v: "company", label: t("ct_p_company") },
    { v: "institution", label: t("ct_p_institution") },
    { v: "partner", label: t("ct_p_partner") },
  ];

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`LodestarT enquiry — ${form.org || form.name}`);
    const label = PROFILES.find((p) => p.v === profile)?.label ?? "";
    const body = encodeURIComponent(
      `Profile: ${label}\nName: ${form.name}\nOrganisation: ${form.org}\nEmail: ${form.email}\n\n${form.message}`
    );
    window.location.href = `mailto:hello@lodestart.ai?subject=${subject}&body=${body}`;
    setSent(true);
  };

  const field = {
    width: "100%",
    padding: "12px 15px",
    border: "1px solid var(--line)",
    borderRadius: 8,
    fontSize: 14.5,
    fontFamily: "inherit",
    background: "#fff",
    marginBottom: 14,
  };

  return (
    <>
      <header className="page-hero">
        <div className="wrap">
          <span className="kicker">{t("ct_kicker")}</span>
          <h1 className="h-section">{t("ct_title")}</h1>
          <p className="sub">{t("ct_sub")}</p>
        </div>
      </header>

      <section className="section soft">
        <div className="wrap" style={{ maxWidth: 720 }}>
          <form onSubmit={submit} className="side-card" style={{ padding: 34 }}>
            <span className="side-label" style={{ marginBottom: 12, display: "block" }}>
              {t("ct_which")}
            </span>
            <div className="filters" style={{ marginBottom: 26 }}>
              {PROFILES.map((p) => (
                <button
                  key={p.v}
                  type="button"
                  className={`f-chip ${profile === p.v ? "active" : ""}`}
                  onClick={() => setProfile(p.v)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <input style={field} placeholder={t("ct_name")} value={form.name} onChange={set("name")} required />
            <input style={field} placeholder={t("ct_org")} value={form.org} onChange={set("org")} required />
            <input style={field} type="email" placeholder={t("ct_email")} value={form.email} onChange={set("email")} required />
            <textarea
              style={{ ...field, minHeight: 130, resize: "vertical" }}
              placeholder={profile === "institution" ? t("ct_msg_institution") : t("ct_msg_company")}
              value={form.message}
              onChange={set("message")}
              required
            />
            <button type="submit" className="btn btn-black" style={{ width: "100%", marginTop: 6 }}>
              {t("ct_send")} <span className="arr">→</span>
            </button>
            {sent && (
              <p style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 14, textAlign: "center" }}>
                {t("ct_sent")}
              </p>
            )}
          </form>
        </div>
      </section>
    </>
  );
}

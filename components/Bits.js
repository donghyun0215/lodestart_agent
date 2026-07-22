"use client";
// Small shared presentational pieces

export function RuleTitle({ kicker, title, sub, dark = false }) {
  return (
    <div className={`rule-title ${dark ? "on-dark" : ""}`}>
      {kicker && <span className="kicker">{kicker}</span>}
      <h2 className="h-section" style={{ marginTop: kicker ? 12 : 0 }}>
        {title}
      </h2>
      {sub && <p className="sub" style={{ marginBottom: 22 }}>{sub}</p>}
      <div className="rule-line" />
    </div>
  );
}

export function Banner({ banner, large = false }) {
  return (
    <div className={`s-banner ${large ? "lg" : ""}`}>
      <span className="b-brand">
        <i className="b-dot" />
        {banner.brand}
      </span>
      <span className="b-title">{banner.title}</span>
      <span className="b-tags">{banner.tags}</span>
    </div>
  );
}

export function NumCard({ n, title, desc }) {
  return (
    <div className="num-card">
      <span className="num-badge">{n}</span>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

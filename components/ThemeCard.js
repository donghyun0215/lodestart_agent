"use client";
import { useLang } from "./LanguageProvider";

/* ------------------------------------------------------------------
   Theme cover art — composed SVG, same pattern as ChallengeCard.js.
   Duotone indigo→coral (the site's brand gradient) with a motif per
   theme. To swap in a real photo later, add `image: "/covers/xxx.jpg"`
   to the theme in lib/data.js and wire an <Image> branch here the
   same way ChallengeCard.js does it.
------------------------------------------------------------------- */

const PALETTE = {
  ai: { a: "#211a45", b: "#4338ca", ink: "#b7aeff" },
  tokenization: { a: "#2a1240", b: "#7c3aed", ink: "#e3b8ff" },
  rwa: { a: "#3a1030", b: "#c2185b", ink: "#ffb3cf" },
  ocean: { a: "#0b2942", b: "#0ea5c4", ink: "#a8e6ff" },
  robotics: { a: "#1a1f2e", b: "#14b8a6", ink: "#aef3e6" },
  safety: { a: "#2b1707", b: "#f59e0b", ink: "#ffd9a3" },
};

function Motif({ kind, ink }) {
  if (kind === "ai") {
    // neural / data-node grid
    const nodes = [
      [40, 60], [120, 42], [200, 66], [280, 44], [356, 62],
      [64, 128], [150, 116], [232, 132], [318, 114],
      [40, 190], [124, 172], [206, 196], [286, 174], [360, 188],
    ];
    const edges = [
      [0, 5], [1, 5], [1, 6], [2, 6], [2, 7], [3, 7], [3, 8], [4, 8],
      [5, 9], [5, 10], [6, 10], [6, 11], [7, 11], [7, 12], [8, 12], [8, 13],
    ];
    return (
      <g>
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a][0]} y1={nodes[a][1]}
            x2={nodes[b][0]} y2={nodes[b][1]}
            stroke={ink} strokeWidth="1" opacity="0.22"
          />
        ))}
        {nodes.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 4.5 : 3} fill={ink} opacity={0.35 + (i % 4) * 0.12} />
        ))}
      </g>
    );
  }

  if (kind === "tokenization") {
    // hex token grid
    const hex = (cx, cy, r) => {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      });
      return pts.join(" ");
    };
    const centers = [
      [70, 56], [140, 90], [70, 124], [140, 158], [70, 192],
      [210, 56], [280, 90], [210, 124], [280, 158], [210, 192],
      [350, 56], [350, 124], [350, 192],
    ];
    return (
      <g fill="none" stroke={ink}>
        {centers.map(([cx, cy], i) => (
          <polygon key={i} points={hex(cx, cy, 26)} strokeWidth="1.1" opacity={0.16 + (i % 5) * 0.06} />
        ))}
        {centers.filter((_, i) => i % 3 === 0).map(([cx, cy], i) => (
          <polygon key={`f${i}`} points={hex(cx, cy, 26)} fill={ink} stroke="none" opacity="0.14" />
        ))}
      </g>
    );
  }

  if (kind === "rwa") {
    // stacked ledger / vault bars
    const rows = [50, 78, 106, 134, 162, 190];
    return (
      <g>
        {rows.map((y, i) => (
          <g key={y} opacity={0.5 - i * 0.05}>
            <line x1="30" y1={y} x2="370" y2={y} stroke={ink} strokeWidth="1" opacity="0.3" />
            <rect x="30" y={y - 14} width={90 + (i % 4) * 40} height="9" rx="2" fill={ink} opacity="0.4" />
          </g>
        ))}
        <rect x="300" y="36" width="70" height="164" rx="8" fill="none" stroke={ink} strokeWidth="1.2" opacity="0.3" />
      </g>
    );
  }

  if (kind === "ocean") {
    // current lines + drifting bubbles, evoking sea/marine data
    const waveRows = [56, 92, 128, 164];
    const wavePath = (y, amp, phase) => {
      let d = `M -10 ${y}`;
      for (let x = -10; x <= 410; x += 20) {
        d += ` L ${x + 20} ${y + Math.sin((x + phase) / 36) * amp}`;
      }
      return d;
    };
    const bubbles = [
      [40, 40, 3.5], [96, 190, 5], [150, 30, 2.5], [210, 200, 4],
      [268, 44, 3], [320, 176, 5.5], [360, 26, 2.5], [24, 150, 4],
    ];
    return (
      <g>
        {waveRows.map((y, i) => (
          <path
            key={y}
            d={wavePath(y, 10 + i * 2, i * 40)}
            fill="none"
            stroke={ink}
            strokeWidth="1.4"
            opacity={0.4 - i * 0.07}
          />
        ))}
        {bubbles.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={ink} opacity={0.25 + (i % 3) * 0.12} />
        ))}
      </g>
    );
  }

  if (kind === "safety") {
    // radar sweep rings + shield, evoking real-time risk detection
    const cx = 118, cy = 118;
    const rings = [30, 56, 82, 108];
    const blips = [
      [190, 60, 4], [250, 96, 3], [220, 160, 4.5], [280, 40, 2.5],
      [60, 190, 3], [310, 140, 3.5], [340, 80, 2.5],
    ];
    return (
      <g>
        {rings.map((r, i) => (
          <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={ink} strokeWidth="1.2" opacity={0.32 - i * 0.06} />
        ))}
        <line x1={cx} y1={cy} x2={cx + 104} y2={cy - 40} stroke={ink} strokeWidth="1.4" opacity="0.4" />
        <path
          d={`M ${cx} ${cy} L ${cx + 104} ${cy - 60} A 104 104 0 0 1 ${cx + 104} ${cy - 20} Z`}
          fill={ink}
          opacity="0.14"
        />
        {blips.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={ink} opacity={0.3 + (i % 3) * 0.15} />
        ))}
        <g transform={`translate(${cx - 15} ${cy - 18})`} opacity="0.55">
          <path d="M15 0 L30 6 V18 C30 28 23 34 15 38 C7 34 0 28 0 18 V6 Z" fill="none" stroke={ink} strokeWidth="2" />
          <path d="M9 19 L13.5 24 L22 12" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    );
  }

  // robotics — jointed arm segments over a sensor grid
  const dots = [];
  for (let x = 26; x <= 374; x += 32) {
    for (let y = 34; y <= 206; y += 32) {
      dots.push([x, y]);
    }
  }
  const arm = [
    [70, 190],
    [130, 130],
    [190, 150],
    [250, 80],
    [300, 60],
  ];
  return (
    <g>
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill={ink} opacity="0.18" />
      ))}
      <polyline
        points={arm.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke={ink}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      {arm.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === arm.length - 1 ? 8 : 6} fill={ink} opacity={i === 0 ? 0.25 : 0.45} />
      ))}
      <rect x="286" y="42" width="34" height="20" rx="4" fill="none" stroke={ink} strokeWidth="1.4" opacity="0.4" />
    </g>
  );
}

function Art({ kind }) {
  const p = PALETTE[kind] ?? PALETTE.ai;
  const gid = `theme-bg-${kind}`;
  const fade = `theme-fade-${kind}`;
  const grain = `theme-grain-${kind}`;

  return (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.a} />
          <stop offset="100%" stopColor={p.b} />
        </linearGradient>
        <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="50%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
        </linearGradient>
        <filter id={grain}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width="400" height="225" fill={`url(#${gid})`} />
      <Motif kind={kind} ink={p.ink} />
      <g stroke="#fff" fill="none" opacity="0.08" transform="translate(318 30) rotate(-14)">
        <rect x="0" y="0" width="60" height="60" rx="18" strokeWidth="2" transform="rotate(22 30 30)" />
        <rect x="0" y="0" width="60" height="60" rx="18" strokeWidth="2" transform="rotate(-22 30 30)" />
      </g>
      <rect width="400" height="225" filter={`url(#${grain})`} opacity="0.055" />
      <rect width="400" height="225" fill={`url(#${fade})`} />
    </svg>
  );
}

export default function ThemeCard({ theme, active, count, onSelect }) {
  const { p, t } = useLang();

  return (
    <button type="button" className={`theme-card ${active ? "active" : ""}`} onClick={onSelect}>
      <span className="theme-cover">
        <Art kind={theme.cover} />
        <span className="theme-count">
          {count} {count === 1 ? t("theme_company_one") : t("theme_company_many")}
        </span>
      </span>
      <span className="theme-body">
        <span className="theme-h">{p(theme, "title")}</span>
        <span className="theme-desc">{p(theme, "desc")}</span>
        <span className="theme-cta">
          {t("theme_view")} <span className="arr">→</span>
        </span>
      </span>
    </button>
  );
}

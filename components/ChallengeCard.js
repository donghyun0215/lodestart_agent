"use client";
import Link from "next/link";
import Image from "next/image";
import { useLang } from "./LanguageProvider";

/* ------------------------------------------------------------------
   Sector cover art.
   Each cover is a composed, sector-specific abstraction rather than a
   generic gradient: a histopathology slide grid, a candlestick field,
   a container stack, and so on. Duotone plus film grain keeps them
   editorial rather than decorative.

   To use a real photograph instead, add `image: "/covers/foo.jpg"` to
   the challenge in lib/data.js — the <Image> branch below takes over.
------------------------------------------------------------------- */

/* Sector photography. A challenge can override with its own `image` field;
   if neither exists, the SVG art below is used as a fallback. */
const COVER_PHOTO = {
  health: "/covers/healthcare.jpg",
  public: "/covers/professional-services.jpg",
  finance: "/covers/fintech.jpg",
  logistics: "/covers/logistics.jpg",
  retail: "/covers/retail.jpg",
  climate: "/covers/sustainability.jpg",
};

const PALETTE = {
  health: { a: "#16303f", b: "#2d6b7d", ink: "#9fd8e3" },
  public: { a: "#1d2540", b: "#3f4f86", ink: "#a9b6ee" },
  finance: { a: "#0e1526", b: "#243a63", ink: "#7fb0ff" },
  logistics: { a: "#2b2015", b: "#5b3d22", ink: "#e0a165" },
  retail: { a: "#2c1c2b", b: "#5a3350", ink: "#dc9ac9" },
  climate: { a: "#14271d", b: "#2b5540", ink: "#7fd3a1" },
};

function Motif({ kind, ink }) {
  if (kind === "health") {
    return (
      <g>
        {Array.from({ length: 5 }).map((_, r) =>
          Array.from({ length: 11 }).map((_, c) => (
            <rect
              key={`${r}-${c}`}
              x={26 + c * 34}
              y={38 + r * 30}
              width="22"
              height="18"
              rx="3"
              fill={ink}
              opacity={0.06 + ((r * 11 + c) % 7) * 0.035}
            />
          ))
        )}
        <rect x="20" y="32" width="366" height="156" rx="6" fill="none" stroke={ink} strokeWidth="1" opacity="0.22" />
      </g>
    );
  }

  if (kind === "public") {
    return (
      <g fill="none" stroke={ink}>
        {[46, 74, 102, 130, 158].map((r, i) => (
          <circle key={r} cx="200" cy="196" r={r} strokeWidth="1.1" opacity={0.3 - i * 0.045} />
        ))}
        <path d="M200 64 L246 92 V148 Q246 190 200 212 Q154 190 154 148 V92 Z" strokeWidth="1.4" opacity="0.4" />
      </g>
    );
  }

  if (kind === "finance") {
    const bars = [
      [40, 96, 52],
      [72, 70, 74],
      [104, 108, 40],
      [136, 60, 92],
      [168, 84, 62],
      [200, 46, 104],
      [232, 92, 48],
      [264, 66, 80],
      [296, 100, 44],
      [328, 54, 96],
    ];
    return (
      <g>
        {bars.map(([x, y, h], i) => (
          <g key={x} opacity={0.22 + (i % 3) * 0.12}>
            <line x1={x} y1={y - 12} x2={x} y2={y + h + 12} stroke={ink} strokeWidth="1" />
            <rect x={x - 6} y={y} width="12" height={h} rx="2" fill={ink} opacity="0.55" />
          </g>
        ))}
        <line x1="20" y1="176" x2="380" y2="176" stroke={ink} strokeWidth="1" opacity="0.28" />
      </g>
    );
  }

  if (kind === "logistics") {
    return (
      <g stroke={ink} fill={ink}>
        {Array.from({ length: 4 }).map((_, r) =>
          Array.from({ length: 7 }).map((_, c) => (
            <rect
              key={`${r}-${c}`}
              x={34 + c * 48}
              y={54 + r * 34}
              width="42"
              height="28"
              rx="2"
              strokeWidth="1"
              fillOpacity={(r + c) % 3 === 0 ? 0.16 : 0.05}
              opacity="0.5"
            />
          ))
        )}
      </g>
    );
  }

  if (kind === "retail") {
    return (
      <g>
        {[62, 108, 154].map((y, r) => (
          <g key={y}>
            <line x1="30" y1={y + 30} x2="370" y2={y + 30} stroke={ink} strokeWidth="1.4" opacity="0.38" />
            {Array.from({ length: 9 }).map((_, c) => {
              const gap = (r === 0 && c === 5) || (r === 1 && c === 2) || (r === 2 && c === 7);
              return (
                <rect
                  key={c}
                  x={36 + c * 38}
                  y={y}
                  width="28"
                  height="28"
                  rx="2"
                  fill={ink}
                  opacity={gap ? 0.05 : 0.18 + ((c + r) % 3) * 0.07}
                  stroke={gap ? ink : "none"}
                  strokeDasharray={gap ? "3 3" : undefined}
                  strokeOpacity="0.4"
                />
              );
            })}
          </g>
        ))}
      </g>
    );
  }

  // climate — topographic contours
  return (
    <g fill="none" stroke={ink}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M-10 ${190 - i * 22} Q 90 ${150 - i * 26}, 190 ${182 - i * 20} T 410 ${158 - i * 24}`}
          strokeWidth="1.2"
          opacity={0.4 - i * 0.05}
        />
      ))}
    </g>
  );
}

function Art({ kind }) {
  const p = PALETTE[kind] ?? PALETTE.finance;
  const gid = `bg-${kind}`;
  const grain = `grain-${kind}`;
  const fade = `fade-${kind}`;

  return (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.a} />
          <stop offset="100%" stopColor={p.b} />
        </linearGradient>
        <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
        </linearGradient>
        <filter id={grain}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width="400" height="225" fill={`url(#${gid})`} />
      <Motif kind={kind} ink={p.ink} />

      {/* LodestarT interlocking mark, ghosted */}
      <g stroke="#fff" fill="none" opacity="0.07" transform="translate(318 44) rotate(-14)">
        <rect x="0" y="0" width="60" height="60" rx="18" strokeWidth="2" transform="rotate(22 30 30)" />
        <rect x="0" y="0" width="60" height="60" rx="18" strokeWidth="2" transform="rotate(-22 30 30)" />
      </g>

      <rect width="400" height="225" filter={`url(#${grain})`} opacity="0.055" />
      <rect width="400" height="225" fill={`url(#${fade})`} />
    </svg>
  );
}

export default function ChallengeCard({ c }) {
  const { t, p } = useLang();
  const photo = c.image ?? COVER_PHOTO[c.cover] ?? null;

  return (
    <Link href={`/open-innovation/${c.orgSlug}`} className="c-card">
      <div className="c-cover">
        {photo ? (
          <Image
            src={photo}
            alt=""
            fill
            sizes="(max-width: 660px) 100vw, (max-width: 1020px) 50vw, 33vw"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <Art kind={c.cover} />
        )}
        <span className="c-cover-scrim" aria-hidden="true" />
        <span className="c-cover-label">{p(c, "sector")}</span>
      </div>

      <div className="c-card-body">
        <div className="c-card-top">
          <span className="c-sector">{p(c, "sector")}</span>
          <span className="c-fn">{c.fn}</span>
        </div>

        <h3>{p(c, "title")}</h3>

        <div className="c-tags">
          {c.tags.slice(0, 2).map((t) => (
            <span key={t} className="c-tag">
              {t}
            </span>
          ))}
          {c.tags.length > 2 && <span className="c-tag more">more…</span>}
        </div>

        <p className="c-desc">{p(c, "desc")}</p>

        <div className="c-prize">{c.prize}</div>

        <div className="c-owner">
          {/* Drop a file into /public/logos and set `ownerLogo` in lib/data.js to swap the initials chip */}
          {c.ownerLogo ? (
            <span className="c-owner-img">
              <Image
                src={c.ownerLogo}
                alt={c.owner}
                width={Math.round(((c.ownerLogoW ?? 300) / 96) * 28)}
                height={28}
                style={{ height: 28, width: "auto" }}
                unoptimized
              />
            </span>
          ) : (
            <span className="c-owner-mark">{c.ownerMark}</span>
          )}
          <span className="c-owner-name">{c.owner}</span>
        </div>
      </div>

      <div className={`c-card-foot ${c.status === "closing" ? "closing" : ""}`}>
        <span className="c-platform">{c.platform}</span>
        <span>
          {c.status === "closing" ? t("oi_closing_soon") + " " : t("oi_end_date") + " "}
          {c.deadline}
        </span>
      </div>
    </Link>
  );
}

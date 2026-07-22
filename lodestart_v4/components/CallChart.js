"use client";

// Lightweight SVG chart: monthly call volume (bars) + funding value (line).
// No chart library — keeps the bundle small and the styling on-brand.

export default function CallChart({ data }) {
  const W = 720;
  const H = 260;
  const padL = 44;
  const padR = 44;
  const padT = 20;
  const padB = 34;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxCalls = Math.max(...data.map((d) => d.calls), 1);
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const step = innerW / data.length;
  const barW = Math.min(38, step * 0.5);

  const x = (i) => padL + step * i + step / 2;
  const yBar = (v) => padT + innerH - (v / maxCalls) * innerH;
  const yLine = (v) => padT + innerH - (v / maxValue) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${yLine(d.value)}`).join(" ");
  const hasValue = data.some((d) => d.value > 0);

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Monthly open innovation call volume">
        {/* gridlines */}
        {ticks.map((t) => {
          const y = padT + innerH - t * innerH;
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
              <text x={padL - 10} y={y + 4} textAnchor="end" fontSize="10" fill="var(--ink-faint)">
                {Math.round(t * maxCalls)}
              </text>
            </g>
          );
        })}

        {/* bars — call volume */}
        {data.map((d, i) => {
          const y = yBar(d.calls);
          return (
            <rect
              key={d.m}
              x={x(i) - barW / 2}
              y={y}
              width={barW}
              height={padT + innerH - y}
              rx="4"
              fill="var(--orange-badge-bg)"
              stroke="var(--orange-badge)"
              strokeWidth="1"
            />
          );
        })}

        {/* line — funding value */}
        {hasValue && (
          <>
            <path d={linePath} fill="none" stroke="var(--orange)" strokeWidth="2" />
            {data.map((d, i) => (
              <circle key={d.m} cx={x(i)} cy={yLine(d.value)} r="3.5" fill="var(--orange)" />
            ))}
          </>
        )}

        {/* x labels */}
        {data.map((d, i) => (
          <text key={d.m} x={x(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--ink-faint)">
            {d.m}
          </text>
        ))}
      </svg>
    </div>
  );
}

"use client";
import Image from "next/image";

const H = 42; // rendered logo height in px

// Infinite logo belt. Items carry a real transparent-PNG logo from /public/logos.
export default function Marquee({ items, reverse = false, speed = 42 }) {
  // duplicate so the -50% translate loops seamlessly
  const doubled = [...items, ...items];
  return (
    <div className="marquee">
      <div
        className={`marquee-track ${reverse ? "rev" : ""}`}
        style={{ animationDuration: `${speed}s` }}
      >
        {doubled.map((it, i) => (
          <span key={`${it.name}-${i}`} className="marquee-item">
            <Image
              src={it.src}
              alt={i < items.length ? it.name : ""}
              aria-hidden={i >= items.length}
              width={Math.round((it.w / 96) * H)}
              height={H}
              style={{ height: H, width: "auto" }}
              unoptimized
            />
          </span>
        ))}
      </div>
    </div>
  );
}

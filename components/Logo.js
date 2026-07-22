"use client";
import Image from "next/image";

export default function Logo({ size = 44 }) {
  return (
    <span className="logo">
      <Image
        src="/logos/kinnovation-full.png"
        alt="K-Innovation Partners"
        width={size * 3}
        height={size}
        style={{ height: size, width: "auto", objectFit: "contain" }}
        unoptimized
        priority
      />
    </span>
  );
}

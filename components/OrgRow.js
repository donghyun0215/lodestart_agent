"use client";
import Link from "next/link";
import Image from "next/image";
import { useLang } from "./LanguageProvider";

export default function OrgRow({ o }) {
  const { t, p } = useLang();
  return (
    <Link href={`/open-innovation/${o.slug}`} className="org-row">
      <div className="org-main">
        {o.logo ? (
          <span className="org-logo">
            <Image
              src={o.logo}
              alt={o.name}
              width={Math.round((o.logoW / 96) * 34)}
              height={34}
              style={{ height: 34, width: "auto" }}
              unoptimized
            />
          </span>
        ) : (
          <span className="org-logo org-logo-blank">{o.short}</span>
        )}
        <div>
          <span className={`org-type ${o.type}`}>{p(o, "typeLabel")}</span>
          <h3>{p(o, "name")}</h3>
          <p className="org-desc">{p(o, "desc")}</p>
          <div className="org-focus">
            {o.focus.map((f) => (
              <span key={f} className="hash">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

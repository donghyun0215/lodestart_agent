import { ORGS } from "@/lib/data";
import OrgView from "@/components/OrgView";

export function generateStaticParams() {
  return ORGS.map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const o = ORGS.find((x) => x.slug === slug);
  if (!o) return {};
  return { title: `${o.name} — LodestarT Open Innovation`, description: o.desc };
}

export default async function Page({ params }) {
  const { slug } = await params;
  return <OrgView slug={slug} />;
}

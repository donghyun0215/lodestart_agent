import { STARTUPS } from "@/lib/data";
import StartupView from "@/components/StartupView";

export function generateStaticParams() {
  return STARTUPS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const s = STARTUPS.find((x) => x.slug === slug);
  if (!s) return {};
  return { title: `${s.name} — LodestarT`, description: s.summary };
}

export default async function Page({ params }) {
  const { slug } = await params;
  return <StartupView slug={slug} />;
}

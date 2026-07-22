# LodestarT — PoC & Open Innovation Platform

Next.js (App Router) rebuild of the LodestarT PoC / Open Innovation platform.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

## Deploy to Vercel

Push to GitHub, then import the repo at vercel.com. Zero config — Vercel detects Next.js automatically.

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing — black hero, curated positioning, featured companies, demand-side organisations |
| `/startups` | Company directory, sector-filtered |
| `/startups/[slug]` | Notion-style company profile (Overview → Funding → Team → Problem → Opportunity → Advantage → Solution → Business model → Achievements → Highlights) with sticky sidebar |
| `/open-innovation` | Demand-side organisation search — national platforms, agencies, regulators, LodestarT-sourced corporates |
| `/open-innovation/[slug]` | Counterpart dashboard — 12-month call stats, monthly volume/funding chart, cadence, engagement route, open calls, matched companies |
| `/services` | Engagement services and the Discover → Analyse → Connect → Scope → Deliver flow |
| `/contact` | Gated enquiry form (no self-serve sign-up) |

## Design system

Theme follows the existing LodestarT corporate site: black header/hero, white body, burnt-orange accent (`--orange: #e2632e`), muted orange numbered badges, hairline-plus-dot section rules, Poppins. All tokens in `app/globals.css` under `:root`.

The logo in `components/Logo.js` is an SVG reproduction of the LodestarT mark. Replace with the official SVG when available — no other file needs to change.

## Data

All content lives in `lib/data.js`:

- `STARTUPS` — 4 real companies (DeepSearch, Forest Jalan, Wavebridge, Stockeeper/Bankcow) with full profile content.
- `ORGS` — demand-side organisations (IMDA OIP, OIN, EnterpriseSG, MAS, plus one LodestarT-sourced corporate). **Call statistics are illustrative samples**, flagged as such in the UI. Replace with live data or wire to source platforms.
- `SERVICES`, `FLOW` — engagement content.

### Next step: Notion as CMS

The structure of `STARTUPS` maps 1:1 to a Notion database. To wire it up:

1. Create a Notion integration, share the database with it.
2. Add `NOTION_TOKEN` and `NOTION_DB_ID` to `.env.local`.
3. Replace the static import in `app/startups/page.js` and `app/startups/[slug]/page.js` with a server-side fetch (`@notionhq/client`), keeping the same shape.

Because these are React Server Components, the Notion call runs on the server — no token exposure, and Vercel caches the result.

## Logos

Real partner logos live in `/public/logos` as transparent PNGs, trimmed and normalised to 96px height (2x of the 42px display size). They render in the home-page belts via `components/Marquee.js`, greyscale by default and full-colour on hover.

Source files were AVIF rasters; they are **not** vector SVGs. If official SVGs become available, drop them into `/public/logos` and update the `src` paths in `PARTNERS` / `TRUSTED_BY` / `ECOSYSTEM` in `lib/data.js` — no component changes needed.

### Challenge covers & owner logos

Covers use sector photography from `/public/covers` (800x450 JPEG, centre-cropped to 16:9). `COVER_PHOTO` in `components/ChallengeCard.js` maps a challenge's `cover` key to its image; a challenge can override with its own `image` field. A brand scrim (dark bottom gradient plus a subtle indigo/orange wash) sits over every photo so the sector label stays legible and the cards read as one family rather than six unrelated stock shots.

If a photo is ever missing, the card falls back to composed SVG art — one motif per sector (histopathology grid, candlestick field, container stack, shelf gaps, topographic contours, protective arcs). That code stays in place as a safety net.

**Owner logos** live in `/public/logos`. Add `ownerLogo` and `ownerLogoW` to a challenge in `lib/data.js` and the initials chip is replaced automatically. Anonymous counterparts deliberately keep the initials chip.

Owner marks are currently initials (SGH, MSF, MAS…) because these are **illustrative sample calls**. Do not attach real agency logos to fabricated calls in anything that leaves the team.

## Language (KR / EN)

Toggle sits in the nav. Choice persists in `localStorage` and sets `<html lang>`, which drives Korean-aware typography (`word-break: keep-all`, looser line height).

- **UI chrome** — `lib/i18n.js`, keyed strings under `STRINGS.en` / `STRINGS.ko`. Add a key to both.
- **Content** — Korean lives next to the English in `lib/data.js` as `<field>_ko` (`summary_ko`, `desc_ko`, `title_ko`…). The `p(obj, "field")` helper from `useLang()` resolves it, falling back to English when a translation is missing. Nothing breaks if a `_ko` field is absent.
- Company detail bullets (Problem, Solution, Highlights) stay in English by design — they are the companies' own IR copy.

Detail routes are a server shell (`generateStaticParams`, `generateMetadata`) wrapping a client view (`components/StartupView.js`, `components/OrgView.js`), so static generation and the language context coexist.

## Notes

- No self-serve "post a challenge" / "list your startup" CTAs. Access is curated: companies join via a LodestarT programme, institutions engage through the team. All CTAs route to `/contact`.
- Charts are hand-rolled SVG (`components/CallChart.js`) — no chart library, small bundle, on-brand styling.

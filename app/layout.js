export const metadata = {
  title: "Lodestart Outreach Desk",
  description: "AI-assisted outreach for Korean startups entering Singapore",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}

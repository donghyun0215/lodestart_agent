import "./globals.css";
import Nav from "@/components/Nav";
import { LanguageProvider } from "@/components/LanguageProvider";
import Footer from "@/components/Footer";

export const metadata = {
  title: "K-Innovation Partners — PoC & Open Innovation",
  description:
    "Where innovative startup solutions meet global market leaders. K-Innovation Partners connects Korea's proven companies with Singapore's institutions through curated proof-of-concept engagements.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LanguageProvider>
          <Nav />
          <main>{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}

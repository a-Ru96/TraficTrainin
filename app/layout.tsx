import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { Nav } from "@/components/Nav";

// Fonts are downloaded at build time and served from our own domain (no request to Google by visitors).
const inter = Inter({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin", "latin-ext"], weight: ["500", "700"], variable: "--font-grotesk", display: "swap" });

export const metadata: Metadata = {
  title: "Roadly · UK road signs quiz",
  description: "Learn UK road signs and road safety with flashcards, quizzes and games. Jump in as a guest.",
};
export const viewport: Viewport = { themeColor: "#0a0d14", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body>
        <AppProvider>
          <Nav />
          <main className="wrap">{children}</main>
          <footer className="foot">
            Roadly is an independent study aid, not an official DVSA or government service. Content follows the UK Highway Code
            (Open Government Licence v3.0). Traffic sign artwork is Crown copyright (Department for Transport) or in the public domain.{" "}
            <Link href="/legal">Privacy, terms &amp; credits</Link>
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}

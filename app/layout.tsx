import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "LevhaLab · UK road signs quiz",
  description: "Learn UK road signs and road safety with flashcards, quizzes and games. Jump in as a guest!",
};
export const viewport: Viewport = { themeColor: "#14082e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppProvider>
          <div className="bg-blobs" aria-hidden><i /><i /><i /></div>
          <Nav />
          <main className="wrap">{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import ThemeProviderClient from "./components/ThemeProviderClient";

export const metadata: Metadata = {
  title: "Chess Analyzer",
  description: "Online chess analysis with Stockfish",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProviderClient>
          {children}
        </ThemeProviderClient>
      </body>
    </html>
  );
}

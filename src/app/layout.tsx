import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ThemeProviderClient from "./components/ThemeProviderClient";
import AppearanceBootstrap from "@/src/components/board/appearanceBootstrap";

export const metadata: Metadata = {
  metadataBase: new URL('https://chess-analysis.org'),
  title: "Chess Analyzer",
  description: "Online chess analysis with Stockfish",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-EJC13GF5B2"
          strategy="afterInteractive"
        />
        <Script id="ga-gtag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);} 
            gtag('js', new Date());
            gtag('config', 'G-EJC13GF5B2');
          `}
        </Script>
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "tz2ph4ka92");`}
        </Script>
        <ThemeProviderClient>
          <AppearanceBootstrap />
          {children}
        </ThemeProviderClient>
      </body>
    </html>
  );
}

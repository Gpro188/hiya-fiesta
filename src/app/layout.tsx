import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://hiyafiesta.online"),
  title: {
    template: "%s | CSWC Hiya Fiesta 2026",
    default: "CSWC Hiya Fiesta 2026 | Council of Samastha Women's Colleges",
  },
  description:
    "Official Centralized ArtsFest Platform for Council of Samastha Women's Colleges (CSWC Hiya Fiesta 2026).",
  applicationName: "CSWC Hiya Fiesta 2026",
  keywords: [
    "cswc",
    "cswc hiya fiesta",
    "hiya fiesta 2026",
    "samastha womens colleges",
    "artsfest system",
  ],
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: {
      template: "%s | CSWC Hiya Fiesta 2026",
      default: "CSWC Hiya Fiesta 2026",
    },
    description:
      "Centralized Multi-Zone Festival Platform for CSWC Women's Colleges",
    type: "website",
    url: "https://cswc-hiya-fiesta.vercel.app/",
    siteName: "CSWC Hiya Fiesta 2026",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "CSWC Hiya Fiesta Logo",
      },
    ],
  },
  appleWebApp: {
    title: "CSWC Hiya Fiesta 2026",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CSWC Hiya Fiesta",
    url: "https://cswc-hiya-fiesta.vercel.app/",
  };

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Manrope:wght@400;500;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

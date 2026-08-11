import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
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
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
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
      className={`${outfit.variable} ${inter.variable} font-outfit`}
      suppressHydrationWarning
    >
      <head>
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

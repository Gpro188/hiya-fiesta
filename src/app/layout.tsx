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
  metadataBase: new URL("https://hiyafiesta.online"),
  title: {
    template: "%s | CSWC Hiya Fiesta 2026",
    default: "CSWC Hiya Fiesta 2026 | Fadhila, Fadheela & General Arts Fest Results",
  },
  description:
    "Official Arts Fest Results & Live Standings Platform for Council of Samastha Women's Colleges (CSWC Hiya Fiesta 2026). Live winner boards, points table, and result posters for Fadhila, Fadheela, and General category fest events across all zones and state.",
  applicationName: "CSWC Hiya Fiesta 2026",
  keywords: [
    "hiya fiesta",
    "hiya fiesta 2026",
    "fadhila fest",
    "fadheela fest",
    "fadhila fadheela fest",
    "fadhila artsfest",
    "fadheela artsfest",
    "cswc fest",
    "cswc artsfest",
    "cswc",
    "cswc hiya fiesta",
    "samastha womens colleges",
    "kerala arts fest results",
    "karnataka zone artsfest",
    "kasaragod zone artsfest",
    "kannur zone artsfest",
    "kozhikode zone artsfest",
    "malappuram zone artsfest",
    "palakkad zone artsfest",
    "thrissur zone artsfest",
  ],
  alternates: {
    canonical: "https://hiyafiesta.online",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: {
      template: "%s | CSWC Hiya Fiesta 2026",
      default: "CSWC Hiya Fiesta 2026 | Fadhila, Fadheela & General Arts Fest",
    },
    description:
      "Live Result Board, Points Table & Poster Download for CSWC Hiya Fiesta 2026 - Council of Samastha Women's Colleges (Fadhila & Fadheela ArtsFest).",
    type: "website",
    url: "https://hiyafiesta.online",
    siteName: "CSWC Hiya Fiesta 2026",
    images: [
      {
        url: "/icon.png",
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
    name: "CSWC Hiya Fiesta 2026",
    alternateName: [
      "Hiya Fiesta",
      "Fadhila Fest",
      "Fadheela Fest",
      "Fadhila Fadheela Fest",
      "CSWC Fest",
      "CSWC Artsfest",
      "Fadhil Artsfest",
      "Fadheela Artsfest",
    ],
    url: "https://hiyafiesta.online",
    description:
      "Official live result portal for Council of Samastha Women's Colleges Arts Fest (CSWC Hiya Fiesta 2026).",
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

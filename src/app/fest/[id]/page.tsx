import { prisma } from "@/lib/prisma";
import { getSettings, getHomepageSettings } from "@/lib/settings";
import type { Metadata } from "next";
import FestPage from "./results/page";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  
  if (!event) return { title: "Arts Fest Not Found" };
  
  const globalSetting = await getSettings(id);
  const homepage = await getHomepageSettings(id);
  
  const festName = homepage?.heroTitle || globalSetting.festName || event.name;
  const title = `${festName} | CSWC Hiya Fiesta System`;
  const description = homepage?.heroSubtitle || homepage?.aboutText || `Join us in the wonderful celebration of arts and creativity at ${festName}.`;
  
  return {
    title,
    description,
    keywords: [
      festName,
      "cswc",
      "cswc technologies",
      "artsfest management system",
      "arts fest system"
    ],
    openGraph: {
      title,
      description,
      images: homepage?.heroBgUrl ? [homepage.heroBgUrl] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: homepage?.heroBgUrl ? [homepage.heroBgUrl] : [],
    }
  };
}

export default FestPage;

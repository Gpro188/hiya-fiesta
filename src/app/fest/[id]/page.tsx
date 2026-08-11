import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSettings, getHomepageSettings } from "@/lib/settings";
import FestHomepage from "../../components/FestHomepage";
import type { Metadata } from "next";

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

export default async function EventHomepage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      homepageSetting: true
    }
  });

  if (!event) {
    notFound();
  }

  const globalSetting = await getSettings(event.id);

  return (
    <FestHomepage 
      event={event} 
      homepageSetting={event.homepageSetting} 
      globalSetting={globalSetting} 
      baseResultUrl={`/fest/${event.id}/results`}
    />
  );
}

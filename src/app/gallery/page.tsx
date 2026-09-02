import { getHomepageSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import GalleryClient, { GalleryItem } from "./GalleryClient";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Media Gallery · CSWC Hiya Fiesta 2026",
  description: "Official festival photo gallery, stage competitions, and captured moments of CSWC Hiya Fiesta 2026.",
};

export default async function GalleryPage() {
  // Find state event or first active event
  const stateFest = await prisma.event.findFirst({
    where: { type: "STATE" },
    include: { globalSetting: true },
  });

  const firstEvent = stateFest || (await prisma.event.findFirst());
  const settings = firstEvent ? await getHomepageSettings(firstEvent.id) : null;

  let rawGallery: any[] = [];
  try {
    if (settings?.galleryImages && typeof settings.galleryImages === "object") {
      rawGallery = Array.isArray(settings.galleryImages) ? settings.galleryImages : [];
    }
  } catch (e) {}

  const items: GalleryItem[] = rawGallery
    .map((g: any) => {
      if (typeof g === "string") {
        return {
          url: g,
          title: "Hiya Fiesta Moments",
          category: "General",
          isHighlighted: true,
        };
      }
      return {
        url: g?.url || "",
        title: g?.title || "Hiya Fiesta Moments",
        category: g?.category || "Highlights",
        isHighlighted: g?.isHighlighted !== false,
      };
    })
    .filter((g) => Boolean(g.url));

  const festName = settings?.heroTitle || stateFest?.name || "CSWC Hiya Fiesta 2026";
  const festMoto = settings?.heroSubtitle || "She Can. She Will.";

  return <GalleryClient items={items} festName={festName} festMoto={festMoto} />;
}

import { prisma } from "./prisma";

const settingsCache = new Map<string, { data: any; expiresAt: number }>();

export function clearSettingsCache() {
  settingsCache.clear();
}

export async function getSettings(eventId?: string | null) {
  const cacheKey = eventId || "default";
  const cached = settingsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    if (eventId) {
      const existing = await prisma.globalSetting.findFirst({
        where: {
          OR: [
            { eventId: eventId },
            { id: eventId }
          ]
        }
      });
      if (existing) {
        settingsCache.set(cacheKey, { data: existing, expiresAt: Date.now() + 60000 });
        return existing;
      }

      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        return { 
          id: eventId, 
          festName: "CSWC Hiya Fiesta 2026", 
          festMoto: "Council of Samastha Women's Colleges", 
          festLogo: null,
          posterPrimaryColor: "#1e293b" 
        } as any;
      }

      const upserted = await prisma.globalSetting.upsert({
        where: { id: eventId },
        update: {
          eventId: eventId,
          festName: event.name || "CSWC Hiya Fiesta 2026"
        },
        create: {
          id: eventId,
          eventId: eventId,
          festName: event.name || "CSWC Hiya Fiesta 2026",
          festMoto: "Council of Samastha Women's Colleges"
        }
      });
      settingsCache.set(cacheKey, { data: upserted, expiresAt: Date.now() + 60000 });
      return upserted;
    }

    const defaultSetting = await prisma.globalSetting.findFirst({
      where: {
        OR: [
          { id: "default" },
          { eventId: null }
        ]
      }
    });
    if (defaultSetting) {
      settingsCache.set(cacheKey, { data: defaultSetting, expiresAt: Date.now() + 60000 });
      return defaultSetting;
    }

    const defaultUpserted = await prisma.globalSetting.upsert({
      where: { id: "default" },
      update: {},
      create: { 
        id: "default", 
        festName: "CSWC Hiya Fiesta 2026",
        festMoto: "Council of Samastha Women's Colleges"
      }
    });
    settingsCache.set(cacheKey, { data: defaultUpserted, expiresAt: Date.now() + 60000 });
    return defaultUpserted;
  } catch (e) {
    console.error("getSettings failed:", e);
      return { 
        id: eventId || "default", 
        festName: "CSWC Hiya Fiesta 2026", 
        festMoto: "Council of Samastha Women's Colleges", 
        festLogo: null,
        posterBgUrl: null,
        posterLogoUrl: null,
        posterHeaderUrl: null,
        posterFooterUrl: null,
        posterCongratulationUrl: null,
        posterPrimaryColor: "#1e293b",
        posterSecondaryColor: "#f97316",
        posterTextColor: "#1e293b",
        maxIndividualPrograms: 4,
        maxIndividualOnStage: 2,
        maxIndividualOffStage: 2,
        maxGeneralTotal: 2,
        maxGeneralOnStage: 1,
        maxGeneralOffStage: 1,
      } as any;
  }
}

export async function getFestBranding(eventId?: string | null) {
  const settings = await getSettings(eventId);
  return {
    name: settings.festName,
    moto: settings.festMoto
  };
}

export async function getHomepageSettings(eventId: string) {
  try {
    let settings = await prisma.homepageSetting.findFirst({
      where: { eventId }
    });

    if (!settings) {
      const eventExists = await prisma.event.findUnique({ where: { id: eventId } });
      if (!eventExists) return null;

      settings = await prisma.homepageSetting.upsert({
        where: { eventId },
        update: {},
        create: {
          eventId,
          heroTitle: "CSWC Hiya Fiesta 2026",
          heroSubtitle: "A Celebration of Innovation and Creativity",
          heroBgUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80",
          aboutTitle: "About the Extravaganza",
          aboutText: "Welcome to the ultimate arts fest experience! We bring together the brightest minds to showcase incredible talent across multiple disciplines. Join us in this wonderful celebration.",
          primaryColor: "#4F46E5",
          secondaryColor: "#0EA5E9",
          bgColor: "#0F172A",
          committeeMembers: [
            { name: "John Doe", role: "Festival Chairman", imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
            { name: "Jane Smith", role: "Creative Director", imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" }
          ],
          galleryImages: [
            "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80"
          ]
        }
      });
    }
    return settings;
  } catch (error) {
    console.error("Failed to get homepage settings", error);
    return null;
  }
}

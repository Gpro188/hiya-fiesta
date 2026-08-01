import { prisma } from "./prisma";

export async function getSettings(eventId?: string | null) {
  try {
    if (eventId) {
      let settings = await prisma.globalSetting.findUnique({
        where: { eventId }
      });
      if (!settings) {
        // Fetch event name to pre-populate settings
        const event = await prisma.event.findUnique({
          where: { id: eventId }
        });
        settings = await prisma.globalSetting.create({
          data: {
            id: eventId, // explicitly set id so it doesn't default to "default"
            eventId,
            festName: event?.name || "CSWC Hiya Fiesta 2026",
            festMoto: "Council of Samastha Women's Colleges"
          }
        });
      }
      return settings;
    }

    return await prisma.globalSetting.upsert({
      where: { id: "default" },
      update: {
        festName: "CSWC Hiya Fiesta 2026",
        festMoto: "Council of Samastha Women's Colleges"
      },
      create: { 
        id: "default", 
        festName: "CSWC Hiya Fiesta 2026",
        festMoto: "Council of Samastha Women's Colleges"
      }
    });
  } catch (e) {
    console.error("getSettings failed:", e);
    return { 
      id: "default", 
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
      posterTextColor: "#1e293b"
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
    let settings = await prisma.homepageSetting.findUnique({
      where: { eventId }
    });

    if (!settings) {
      settings = await prisma.homepageSetting.create({
        data: {
          eventId,
          heroTitle: "Dpro Arts Fest 2026",
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

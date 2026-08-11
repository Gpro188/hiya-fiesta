"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function saveHomepageSettings(data: any) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user || (!["SUPER_ADMIN", "ADMIN", "MANAGER", "INSTITUTION_MANAGER"].includes(user.role))) {
      return { success: false, message: "Unauthorized" };
    }

    const eventId = data.targetEventId || user.eventId;
    
    if (!eventId) {
      return { success: false, message: "No event specified" };
    }

    // Authorization check
    if (user.role !== "SUPER_ADMIN" && user.eventId !== eventId) {
      return { success: false, message: "Unauthorized to edit other event settings" };
    }

    let committeeMembers = [];
    let galleryImages = [];
    let heroSlides = [];
    let statsCounter = {};
    let socialLinks = {};
    
    try {
      committeeMembers = data.committeeMembers ? JSON.parse(data.committeeMembers) : [];
      galleryImages = data.galleryImages ? JSON.parse(data.galleryImages) : [];
      heroSlides = data.heroSlides ? JSON.parse(data.heroSlides) : [];
      statsCounter = data.statsCounter ? JSON.parse(data.statsCounter) : {};
      socialLinks = data.socialLinks ? JSON.parse(data.socialLinks) : {};
    } catch (e) {
      console.error("Failed to parse JSON", e);
    }

    await prisma.homepageSetting.upsert({
      where: { eventId },
      update: {
        aboutTitle: data.aboutTitle,
        aboutText: data.aboutText,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        bgColor: data.bgColor,
        committeeMembers,
        committeeTitle: data.committeeTitle || "Program Committee",
        galleryImages,
        tickerText: data.tickerText,
        heroSlides,
        statsCounter,
        socialLinks
      },
      create: {
        eventId,
        aboutTitle: data.aboutTitle,
        aboutText: data.aboutText,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        bgColor: data.bgColor,
        committeeMembers,
        committeeTitle: data.committeeTitle || "Program Committee",
        galleryImages,
        tickerText: data.tickerText,
        heroSlides,
        statsCounter,
        socialLinks
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard/settings/homepage");
    revalidatePath(`/fest/${eventId}`);

    return { success: true, message: "Homepage settings saved successfully" };
  } catch (error) {
    console.error("Error saving homepage settings:", error);
    return { success: false, message: "Failed to save settings" };
  }
}

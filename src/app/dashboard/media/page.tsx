import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PosterSettingsForm from "./PosterSettingsForm";
import CategoryBrandingForm from "./CategoryBrandingForm";
import SuperAdminMediaCenter from "./SuperAdminMediaCenter";
import InteractivePosterStudio from "./InteractivePosterStudio";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import Link from "next/link";

export default async function MediaPage(props: {
  searchParams: Promise<{ session?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "SUPER_ADMIN", "MEDIA"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const { eventId, role } = session.user;
  const initialSettings = await getSettings(eventId);
  
  const eventFilter = eventId ? { eventId } : undefined;

  const categories = await prisma.category.findMany({
    where: eventFilter,
    orderBy: { name: 'asc' }
  });
  
  // Programs that have results and are published - for the download center
  const publishedPrograms = await prisma.program.findMany({
    where: {
        eventId: eventId || undefined,
        results: { some: { isPublished: true } }
    },
    include: { category: true },
    orderBy: { name: 'asc' }
  });

  // Super Admin: load all events with their categories for per-event category branding
  let allEventsWithCategories: any[] = [];
  if (role === "SUPER_ADMIN") {
    let superAdminWhere: any = {};
    if (searchParams.session === "state") {
      superAdminWhere = { type: "STATE" };
    } else if (searchParams.session === "zone") {
      superAdminWhere = { type: "ZONE" };
    }

    allEventsWithCategories = await prisma.event.findMany({
      where: superAdminWhere,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        categories: { orderBy: { name: 'asc' } },
        globalSetting: true,
        homepageSetting: true
      }
    });
  }

  const isSuperAdmin = role === "SUPER_ADMIN";

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Media Center</h1>
        <p className="page-description">Design result posters, manage branding assets, set category styles, and download result media templates.</p>
      </div>

      {isSuperAdmin ? (
        // Super Admin: full event-by-event category branding view
        <SuperAdminMediaCenter
          allEventsWithCategories={allEventsWithCategories}
          initialSettings={initialSettings}
        />
      ) : (
        // Zone Admin / Media: Interactive Poster Studio with Live Preview & Controls
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
          <div data-tour="media-poster">
            <InteractivePosterStudio 
              initialSettings={initialSettings} 
              categories={categories}
            />
          </div>
          <div data-tour="media-category">
            <CategoryBrandingForm categories={categories} />
          </div>
        </div>
      )}
    </div>
  );
}

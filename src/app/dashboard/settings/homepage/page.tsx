import { getHomepageSettings } from "@/lib/settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HomepageForm from "./HomepageForm";
import { redirect } from "next/navigation";

export default async function HomepageSettingsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  
  if (!user || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(user.role)) {
    redirect("/dashboard");
  }

  const isZoneAdmin = user.role === "ZONE_ADMIN";
  
  let targetEventId = user.eventId;
  let targetEventName = "";

  if (isZoneAdmin) {
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { zoneId: true, eventId: true }
    });
    const zoneId = fullUser?.zoneId || (user as any).zoneId;
    if (zoneId) {
      const zoneEvent = await prisma.event.findFirst({
        where: { zoneId, type: "ZONE" },
        select: { id: true, name: true }
      });
      if (zoneEvent) {
        targetEventId = zoneEvent.id;
        targetEventName = zoneEvent.name;
      }
    }
  }

  if (!targetEventId) {
    const firstEvent = await prisma.event.findFirst();
    targetEventId = firstEvent?.id;
    targetEventName = firstEvent?.name || "";
  }

  const settings = targetEventId ? await getHomepageSettings(targetEventId) : null;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1152px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
          {isZoneAdmin ? `${targetEventName || "Zone"} Banner & Portal Settings` : "Homepage & Banner Settings"}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {isZoneAdmin ? "Upload background banner, posters, and customize colors for your Zone Results Portal." : "Configure banners, colors, and content for the public festival landing page."}
        </p>
      </div>
      
      <div className="glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
        <HomepageForm initialData={settings} targetEventId={targetEventId} />
      </div>
    </div>
  );
}

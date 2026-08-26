import { getHomepageSettings } from "@/lib/settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HomepageForm from "./HomepageForm";
import { redirect } from "next/navigation";

export default async function HomepageSettingsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/dashboard");
  }

  let targetEventId = user.eventId;
  let targetEventName = "";

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
          Homepage & Banner Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Configure banners, colors, and content for the public festival landing page.
        </p>
      </div>
      
      <div className="glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
        <HomepageForm initialData={settings} targetEventId={targetEventId} />
      </div>
    </div>
  );
}

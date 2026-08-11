import { getHomepageSettings } from "@/lib/settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import HomepageForm from "./HomepageForm";
import { redirect } from "next/navigation";

export default async function HomepageSettingsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  
  if (!user || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(user.role)) {
    redirect("/dashboard");
  }

  const settings = user.eventId ? await getHomepageSettings(user.eventId) : null;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1152px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Homepage Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure the public landing page for your Arts Fest.</p>
      </div>
      
      <div className="glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
        <HomepageForm initialData={settings} />
      </div>
    </div>
  );
}

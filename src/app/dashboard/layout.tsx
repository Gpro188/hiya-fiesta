import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSettings, getHomepageSettings } from "@/lib/settings";
import DashboardSidebar from "./DashboardSidebar";
import TourWrapper from "@/components/TourWrapper";
import ThemeApplicator from "@/app/components/ThemeApplicator";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  const settings = await getSettings(session.user.eventId);

  const { role, username } = session.user;

  const homepageSettings = session.user.eventId ? await getHomepageSettings(session.user.eventId) : null;

  return (
    <div className="dashboard-container">
      <ThemeApplicator 
        primaryColor={homepageSettings?.primaryColor}
        secondaryColor={homepageSettings?.secondaryColor}
        bgColor={homepageSettings?.bgColor}
      />
      <DashboardSidebar 
        role={role} 
        username={username} 
        festName={settings.festName || "CSWC Hiya Fiesta 2026"} 
        festMoto={settings.festMoto || "Council of Samastha Women's Colleges"} 
      />

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          {children}
        </div>
      </main>

      {/* Onboarding Tour - auto-detects page from URL */}
      <TourWrapper />
    </div>
  );
}

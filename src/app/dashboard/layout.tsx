import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSettings, getHomepageSettings } from "@/lib/settings";
import DashboardSidebar from "./DashboardSidebar";
import ThemeApplicator from "@/app/components/ThemeApplicator";
import InstitutionOnboardingModal from "@/components/InstitutionOnboardingModal";
import bcrypt from "bcrypt";

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

  const userFull = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { institution: true, zone: true }
  });

  let displayName = username;
  if (userFull?.institution) {
    displayName = userFull.institution.name;
  } else if (userFull?.zone) {
    displayName = userFull.zone.name + " Zone";
  }

  let isDefaultPassword = false;
  if (["MANAGER", "INSTITUTION_MANAGER"].includes(role) && userFull?.password) {
    try {
      const match123 = await bcrypt.compare("123", userFull.password);
      const match123456 = await bcrypt.compare("123456", userFull.password);
      isDefaultPassword = match123 || match123456 || userFull.password === "123" || userFull.password === "123456";
    } catch (e) {
      isDefaultPassword = userFull.password === "123" || userFull.password === "123456";
    }
  }

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
        displayName={displayName}
        festName={settings.festName || "CSWC Hiya Fiesta 2026"} 
        festMoto={settings.festMoto || "Council of Samastha Women's Colleges"} 
      />

      {/* Main Content */}
      <main className="dashboard-main">
        {["MANAGER", "INSTITUTION_MANAGER"].includes(role) && (
          <InstitutionOnboardingModal 
            institutionName={userFull?.institution?.name || displayName}
            initialLogoUrl={userFull?.institution?.logoUrl}
            isDefaultPassword={isDefaultPassword}
          />
        )}
        <div className="dashboard-content">
          {children}
        </div>
      </main>
    </div>
  );
}

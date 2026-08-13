"use client";

import { usePathname } from "next/navigation";
import OnboardingTour from "@/components/OnboardingTour";
import { getTourSteps } from "@/lib/tourSteps";

export default function TourWrapper() {
  const pathname = usePathname();

  // Map pathname to tour page ID
  const getPageId = (): string | null => {
    if (pathname === "/dashboard") return "dashboard";
    if (pathname === "/dashboard/events") return "events";
    if (pathname.match(/^\/dashboard\/events\/[^/]+$/)) return "eventDetail";
    if (pathname === "/dashboard/teams") return "teams";
    if (pathname === "/dashboard/candidates") return "candidates";
    if (pathname === "/dashboard/programs") return "programs";
    if (pathname === "/dashboard/scoring") return "scoring";
    if (pathname === "/dashboard/schedule") return "schedule";
    if (pathname === "/dashboard/media") return "media";
    if (pathname === "/dashboard/settings") return "settings";
    if (pathname === "/dashboard/assignments") return "assignments";
    if (pathname === "/hub") return "hub";
    if (pathname === "/login") return "login";
    return null;
  };

  const pageId = getPageId();
  if (!pageId) return null;

  const steps = getTourSteps(pageId);
  if (steps.length === 0) return null;

  return null;
}

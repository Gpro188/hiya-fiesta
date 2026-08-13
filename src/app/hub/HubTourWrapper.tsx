"use client";

import OnboardingTour from "@/components/OnboardingTour";
import { getTourSteps } from "@/lib/tourSteps";

export default function HubTourWrapper() {
  const steps = getTourSteps("hub");
  if (steps.length === 0) return null;
  return null;
}

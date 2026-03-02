"use client";

import { ReactNode } from "react";
import { TourProvider, TourOverlay } from "@/components/tour";

/**
 * Persistent layout for all /dashboard/* routes.
 * TourProvider lives here so tour state survives page navigations.
 */
export default function DashboardRootLayout({ children }: { children: ReactNode }) {
  return (
    <TourProvider>
      {children}
      <TourOverlay />
    </TourProvider>
  );
}

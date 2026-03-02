import { ReactNode } from "react";

/**
 * Persistent layout for all /dashboard/* routes.
 * TourProvider now lives in root Providers so tour state
 * survives navigation between /home and /dashboard.
 */
export default function DashboardRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

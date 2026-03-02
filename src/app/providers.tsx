'use client';

import { SessionProvider } from "next-auth/react";
import { TourProvider, TourOverlay } from "@/components/tour";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TourProvider>
        {children}
        <TourOverlay />
      </TourProvider>
    </SessionProvider>
  );
}

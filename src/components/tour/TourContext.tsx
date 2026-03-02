"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

export interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}

/* ─── Master list of all tour steps ──────────────────────────────────
   Steps whose target element is not in the DOM at tour-start are
   automatically filtered out, so the tour adapts to whichever page
   the user is on.                                                    */
const ALL_TOUR_STEPS: TourStep[] = [
  // ── Sidebar (always visible) ────────────────────────────────────
  {
    target: "tour-nav-home",
    title: "Home",
    description:
      "Navigate to the Welcome page to check your setup progress and quick-start guide.",
    position: "right",
  },
  {
    target: "tour-nav-dashboard",
    title: "Dashboard",
    description:
      "Your central hub — see a quick overview with links to Businesses, Reviews, and Settings.",
    position: "right",
  },
  {
    target: "tour-nav-businesses",
    title: "Businesses",
    description:
      "Add, view, and manage your businesses along with their brands and locations.",
    position: "right",
  },
  {
    target: "tour-nav-reviews",
    title: "Reviews",
    description:
      "View all your Google reviews, check AI-generated reply suggestions, and approve or skip them.",
    position: "right",
  },
  {
    target: "tour-nav-settings",
    title: "Settings",
    description:
      "Configure notifications (WhatsApp & Telegram), connect Google Business Profile, and manage your account.",
    position: "right",
  },
  {
    target: "tour-user-profile",
    title: "Your Profile",
    description: "View your account info and sign out when you're done.",
    position: "right",
  },

  // ── Welcome page ────────────────────────────────────────────────
  {
    target: "tour-setup-progress",
    title: "Setup Progress",
    description:
      "Track your account setup here — connect notifications, link Google Business, and add your first business.",
    position: "bottom",
  },
  {
    target: "tour-go-dashboard",
    title: "Go to Dashboard",
    description:
      "Click this button to head to your Dashboard and manage everything.",
    position: "top",
  },

  // ── Dashboard page ──────────────────────────────────────────────
  {
    target: "tour-card-businesses",
    title: "Businesses Card",
    description:
      "Click here to view and manage all your businesses and their locations.",
    position: "bottom",
  },
  {
    target: "tour-card-reviews",
    title: "Reviews Card",
    description:
      "Click here to see all reviews and approve or skip AI-generated replies.",
    position: "bottom",
  },
  {
    target: "tour-card-settings",
    title: "Settings Card",
    description:
      "Click here to access your notification, Google Business, and account settings.",
    position: "bottom",
  },
  {
    target: "tour-pending-alert",
    title: "Pending Reviews",
    description:
      "When reviews are awaiting your approval this alert shows up. Tap it to review them.",
    position: "bottom",
  },

  // ── Settings hub ────────────────────────────────────────────────
  {
    target: "tour-settings-notifications",
    title: "Notification Settings",
    description:
      "Set up WhatsApp and Telegram to receive instant alerts when new reviews arrive.",
    position: "bottom",
  },
  {
    target: "tour-settings-google",
    title: "Google Business Settings",
    description:
      "Connect your Google Business Profile to automatically pull in new reviews.",
    position: "bottom",
  },
  {
    target: "tour-settings-account",
    title: "Account Settings",
    description: "Manage your account details and preferences.",
    position: "bottom",
  },
];

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeSteps, setActiveSteps] = useState<TourStep[]>([]);

  const startTour = useCallback(() => {
    // Only include steps whose target element is currently in the DOM
    const available = ALL_TOUR_STEPS.filter(
      (s) => document.querySelector(`[data-tour="${s.target}"]`) !== null
    );
    if (available.length === 0) return;
    setActiveSteps(available);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev < activeSteps.length - 1) return prev + 1;
      // Last step → finish
      setIsActive(false);
      return 0;
    });
  }, [activeSteps.length]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const skipTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
  }, []);

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        steps: activeSteps,
        totalSteps: activeSteps.length,
        startTour,
        nextStep,
        prevStep,
        skipTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

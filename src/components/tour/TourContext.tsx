"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

export interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  route: string; // the page this element lives on
}

interface TourContextType {
  isActive: boolean;
  isNavigating: boolean;
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

/* ─── Master ordered list of ALL tour steps ──────────────────────────
   Each step has a `route` so the tour can auto-navigate between pages.
   Steps whose target is optional (e.g. pending alert) are skipped
   at runtime if the element doesn't appear after navigation.         */
const ALL_TOUR_STEPS: TourStep[] = [
  // ── 1. Welcome page ─────────────────────────────────────────────
  {
    target: "tour-nav-home",
    title: "Home",
    description:
      "This is your Home button. It takes you to the Welcome page where you can check your setup progress.",
    position: "right",
    route: "/dashboard/welcome",
  },
  {
    target: "tour-setup-progress",
    title: "Setup Progress",
    description:
      "Track your account setup here — connect notifications, link Google Business, and add your first business.",
    position: "bottom",
    route: "/dashboard/welcome",
  },
  {
    target: "tour-go-dashboard",
    title: "Go to Dashboard",
    description:
      "Click this button anytime to jump to your Dashboard and manage everything.",
    position: "top",
    route: "/dashboard/welcome",
  },

  // ── 2. Dashboard page ───────────────────────────────────────────
  {
    target: "tour-nav-dashboard",
    title: "Dashboard",
    description:
      "This is your Dashboard — a central hub with quick links to Businesses, Reviews, and Settings.",
    position: "right",
    route: "/dashboard",
  },
  {
    target: "tour-pending-alert",
    title: "Pending Reviews Alert",
    description:
      "When reviews are awaiting your approval this alert shows up. Tap it to review them.",
    position: "bottom",
    route: "/dashboard",
  },
  {
    target: "tour-card-businesses",
    title: "Businesses Card",
    description:
      "Click here to view and manage all your businesses and their locations.",
    position: "bottom",
    route: "/dashboard",
  },
  {
    target: "tour-card-reviews",
    title: "Reviews Card",
    description:
      "Click here to see all reviews and approve or skip AI-generated replies.",
    position: "bottom",
    route: "/dashboard",
  },
  {
    target: "tour-card-settings",
    title: "Settings Card",
    description:
      "Click here to access your notification, Google Business, and account settings.",
    position: "bottom",
    route: "/dashboard",
  },

  // ── 3. Businesses page ──────────────────────────────────────────
  {
    target: "tour-nav-businesses",
    title: "Businesses",
    description:
      "Add, view, and manage your businesses along with their brands and locations.",
    position: "right",
    route: "/dashboard/businesses",
  },

  // ── 4. Reviews page ────────────────────────────────────────────
  {
    target: "tour-nav-reviews",
    title: "Reviews",
    description:
      "View all your Google reviews, check AI-generated reply suggestions, and approve or skip them.",
    position: "right",
    route: "/dashboard/reviews",
  },

  // ── 5. Settings hub ────────────────────────────────────────────
  {
    target: "tour-nav-settings",
    title: "Settings",
    description:
      "Configure notifications (WhatsApp & Telegram), connect Google Business Profile, and manage your account.",
    position: "right",
    route: "/dashboard/settings",
  },
  {
    target: "tour-settings-notifications",
    title: "Notification Settings",
    description:
      "Set up WhatsApp and Telegram to receive instant alerts when new reviews arrive.",
    position: "bottom",
    route: "/dashboard/settings",
  },
  {
    target: "tour-settings-google",
    title: "Google Business Settings",
    description:
      "Connect your Google Business Profile to automatically pull in new reviews.",
    position: "bottom",
    route: "/dashboard/settings",
  },
  {
    target: "tour-settings-account",
    title: "Account Settings",
    description: "Manage your account details and preferences.",
    position: "bottom",
    route: "/dashboard/settings",
  },

  // ── 6. User profile (sidebar — always visible) ─────────────────
  {
    target: "tour-user-profile",
    title: "Your Profile",
    description:
      "View your account info and sign out when you're done. That's the end of the tour!",
    position: "right",
    route: "/dashboard/settings", // stay on last page
  },
];

/* ── helper: wait for a DOM element to appear (with timeout) ──────── */
function waitForElement(selector: string, timeout = 3000): Promise<Element | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        observer.disconnect();
        resolve(found);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

export function TourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // We need a ref so callbacks always see fresh values
  const stateRef = useRef({ isActive, currentStep, pathname });
  useEffect(() => {
    stateRef.current = { isActive, currentStep, pathname };
  }, [isActive, currentStep, pathname]);

  /* ── navigate to the step's route if needed, then wait for target ── */
  const goToStep = useCallback(
    async (stepIndex: number) => {
      const step = ALL_TOUR_STEPS[stepIndex];
      if (!step) {
        setIsActive(false);
        return;
      }

      const needsNav = stateRef.current.pathname !== step.route;

      if (needsNav) {
        setIsNavigating(true);
        router.push(step.route);
        // Wait a tick for Next.js to start the transition
        await new Promise((r) => setTimeout(r, 100));
      }

      // Wait for the target element to appear in the DOM
      const el = await waitForElement(`[data-tour="${step.target}"]`, 4000);
      setIsNavigating(false);

      if (!el) {
        // Element didn't appear (e.g. pending alert not shown) → skip this step
        const direction = stepIndex >= stateRef.current.currentStep ? 1 : -1;
        const next = stepIndex + direction;
        if (next >= 0 && next < ALL_TOUR_STEPS.length) {
          setCurrentStep(next);
          goToStep(next);
        } else {
          setIsActive(false);
        }
        return;
      }

      setCurrentStep(stepIndex);
    },
    [router]
  );

  /* ── public actions ─────────────────────────────────────────────── */
  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    goToStep(0);
  }, [goToStep]);

  const nextStep = useCallback(() => {
    const next = stateRef.current.currentStep + 1;
    if (next >= ALL_TOUR_STEPS.length) {
      setIsActive(false);
      return;
    }
    goToStep(next);
  }, [goToStep]);

  const prevStep = useCallback(() => {
    const prev = stateRef.current.currentStep - 1;
    if (prev < 0) return;
    goToStep(prev);
  }, [goToStep]);

  const skipTour = useCallback(() => {
    setIsActive(false);
    setIsNavigating(false);
    setCurrentStep(0);
  }, []);

  return (
    <TourContext.Provider
      value={{
        isActive,
        isNavigating,
        currentStep,
        steps: ALL_TOUR_STEPS,
        totalSteps: ALL_TOUR_STEPS.length,
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

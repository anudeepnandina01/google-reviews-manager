"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SetupStatus {
  notificationsConnected: boolean;
  googleBusinessConnected: boolean;
  hasBusinesses: boolean;
  hasLocations: boolean;
}

interface SetupChecklistProps {
  onStatusChange?: (status: SetupStatus) => void;
  compact?: boolean;
}

export function SetupChecklist({ onStatusChange, compact = false }: SetupChecklistProps) {
  const router = useRouter();
  const [status, setStatus] = useState<SetupStatus>({
    notificationsConnected: false,
    googleBusinessConnected: false,
    hasBusinesses: false,
    hasLocations: false,
  });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const [telegramRes, whatsappRes, googleRes, businessesRes] = await Promise.all([
        fetch("/api/settings/telegram"),
        fetch("/api/settings/whatsapp"),
        fetch("/api/auth/google-business/status"),
        fetch("/api/businesses"),
      ]);

      const telegramData = telegramRes.ok ? await telegramRes.json() : { connected: false };
      const whatsappData = whatsappRes.ok ? await whatsappRes.json() : { connected: false };
      const googleData = googleRes.ok ? await googleRes.json() : { connected: false };
      const businessesData = businessesRes.ok ? await businessesRes.json() : [];

      const hasLocations = businessesData.some((b: any) => 
        b.brands?.some((brand: any) => brand.locations?.length > 0)
      );

      // User has notifications connected if either Telegram OR WhatsApp is connected
      const notificationsConnected = telegramData.connected || whatsappData.connected;

      const newStatus = {
        notificationsConnected,
        googleBusinessConnected: googleData.connected,
        hasBusinesses: businessesData.length > 0,
        hasLocations,
      };

      setStatus(newStatus);
      onStatusChange?.(newStatus);
    } catch (error) {
      console.error("Error fetching setup status:", error);
    } finally {
      setLoading(false);
    }
  };

  const completedSteps = Object.values(status).filter(Boolean).length;
  const totalSteps = 4;
  const progress = (completedSteps / totalSteps) * 100;
  const isComplete = completedSteps === totalSteps;

  const steps = [
    {
      id: "notifications",
      title: "Connect Notifications",
      description: "Receive instant alerts via Telegram or WhatsApp",
      completed: status.notificationsConnected,
      action: () => router.push("/dashboard/settings"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      id: "google",
      title: "Connect Google Business",
      description: "Sync your business locations automatically",
      completed: status.googleBusinessConnected,
      action: () => router.push("/dashboard/settings"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      ),
    },
    {
      id: "business",
      title: "Create a Business",
      description: "Set up your business profile",
      completed: status.hasBusinesses,
      action: () => router.push("/dashboard/businesses/new"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: "location",
      title: "Add Locations",
      description: "Add your Google Maps locations to monitor",
      completed: status.hasLocations,
      action: () => router.push("/dashboard/businesses"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
        <div className="h-2 bg-white/10 rounded w-full mb-6"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // If all steps are complete and compact mode, show minimal view
  if (isComplete && compact) {
    return (
      <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-emerald-400 font-semibold">Setup Complete!</p>
            <p className="text-white/60 text-sm">You&apos;re all set to receive review alerts</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div 
        className="p-5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isComplete 
                ? "bg-emerald-500/20" 
                : "bg-violet-500/20"
            }`}>
              {isComplete ? (
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold">
                {isComplete ? "Setup Complete!" : "Get Started"}
              </h3>
              <p className="text-white/60 text-sm">
                {isComplete 
                  ? "You're all set to receive review alerts" 
                  : `${completedSteps} of ${totalSteps} steps completed`}
              </p>
            </div>
          </div>
          <svg 
            className={`w-5 h-5 text-white/60 transition-transform ${expanded ? "rotate-180" : ""}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${
              isComplete 
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                : "bg-gradient-to-r from-violet-500 to-purple-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      {expanded && (
        <div className="px-5 pb-5 space-y-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
                step.completed 
                  ? "bg-emerald-500/10 border border-emerald-500/20" 
                  : "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 cursor-pointer"
              }`}
              onClick={() => !step.completed && step.action()}
            >
              {/* Step number/check */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                step.completed 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : "bg-white/10 text-white/60"
              }`}>
                {step.completed ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>

              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                step.completed 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : "bg-violet-500/20 text-violet-400"
              }`}>
                {step.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${step.completed ? "text-emerald-400" : "text-white"}`}>
                  {step.title}
                </p>
                <p className="text-white/60 text-sm truncate">{step.description}</p>
              </div>

              {/* Action */}
              {!step.completed && (
                <svg className="w-5 h-5 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

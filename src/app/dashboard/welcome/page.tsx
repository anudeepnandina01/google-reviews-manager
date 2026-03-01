"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout";

interface User {
  id: string;
  email: string;
  name: string;
}

interface SetupStatus {
  notifications: boolean;
  google: boolean;
  businesses: boolean;
}

function WelcomeContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [setup, setSetup] = useState<SetupStatus>({ notifications: false, google: false, businesses: false });

  useEffect(() => {
    const init = async () => {
      try {
        const [userRes, bizRes, telegramRes, whatsappRes, googleRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/businesses"),
          fetch("/api/settings/telegram"),
          fetch("/api/settings/whatsapp"),
          fetch("/api/auth/google-business/status"),
        ]);

        if (!userRes.ok) { router.push("/auth/signin"); return; }
        const userData = await userRes.json();
        setUser(userData.user);

        if (bizRes.ok) {
          const businesses = await bizRes.json();
          setSetup(prev => ({ ...prev, businesses: businesses.length > 0 }));
        }

        const telegramData = telegramRes.ok ? await telegramRes.json() : { connected: false };
        const whatsappData = whatsappRes.ok ? await whatsappRes.json() : { connected: false };
        const googleData = googleRes.ok ? await googleRes.json() : { connected: false };

        setSetup(prev => ({
          ...prev,
          notifications: telegramData.connected || whatsappData.connected,
          google: googleData.connected,
        }));
      } catch (error) {
        console.error("Error loading welcome:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const completedSteps = Object.values(setup).filter(Boolean).length;
  const totalSteps = 3;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[65vh]">
      {/* Welcome Hero */}
      <div className="text-center mb-10 animate-fade-in">
        <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/25">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
          Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
        </h1>
        <p className="text-white/50 text-lg max-w-md mx-auto">
          Manage your Google reviews, get AI-powered replies, and stay notified instantly.
        </p>
      </div>

      {/* Setup Progress */}
      {completedSteps < totalSteps && (
        <div className="w-full mb-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-sm font-semibold text-white/80">Getting Started</h2>
            </div>
            <span className="text-xs text-white/50">{completedSteps}/{totalSteps} complete</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { done: setup.notifications, label: "Connect Notifications", href: "/dashboard/settings/notifications", doneLabel: "Notifications Connected" },
              { done: setup.google, label: "Connect Google", href: "/dashboard/settings/google", doneLabel: "Google Connected" },
              { done: setup.businesses, label: "Add a Business", href: "/dashboard/businesses", doneLabel: "Business Added" },
            ].map((step) => (
              <Link
                key={step.label}
                href={step.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  step.done
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {step.done ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30" />
                )}
                {step.done ? step.doneLabel : step.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All set message */}
      {completedSteps === totalSteps && (
        <div className="w-full mb-8 bg-emerald-500/5 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-5 animate-slide-up">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-white/80">All set!</p>
              <p className="text-xs text-white/40">Your account is fully configured. Head to the Dashboard to manage everything.</p>
            </div>
          </div>
        </div>
      )}

      {/* Go to Dashboard Button */}
      <Link
        href="/dashboard"
        className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-semibold text-lg hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] animate-slide-up"
        style={{ animationDelay: "0.1s" }}
      >
        Go to Dashboard
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <DashboardLayout>
      <WelcomeContent />
    </DashboardLayout>
  );
}

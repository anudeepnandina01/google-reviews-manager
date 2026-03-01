"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout";

interface User {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

interface SetupStatus {
  notifications: boolean;
  google: boolean;
  businesses: boolean;
}

function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [setup, setSetup] = useState<SetupStatus>({ notifications: false, google: false, businesses: false });
  const [reviewCount, setReviewCount] = useState(0);
  const [businessCount, setBusinessCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        const [userRes, bizRes, telegramRes, whatsappRes, googleRes, reviewsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/businesses"),
          fetch("/api/settings/telegram"),
          fetch("/api/settings/whatsapp"),
          fetch("/api/auth/google-business/status"),
          fetch("/api/reviews?limit=1"),
        ]);

        if (userRes.ok) {
          const data = await userRes.json();
          setUser(data.user);
        }

        if (bizRes.ok) {
          const businesses = await bizRes.json();
          setBusinessCount(businesses.length);
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

        if (reviewsRes.ok) {
          const data = await reviewsRes.json();
          setReviewCount(data.pagination?.total || 0);
        }
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

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
    <div className="max-w-4xl mx-auto">
      {/* Welcome */}
      <div className="mb-10 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
        </h1>
        <p className="text-white/50 text-lg">What would you like to do today?</p>
      </div>

      {/* Setup Progress - always visible */}
      <div className={`mb-8 backdrop-blur-sm border rounded-2xl p-5 animate-slide-up ${
        completedSteps === totalSteps
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-white/5 border-white/10"
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {completedSteps === totalSteps ? (
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <h2 className="text-sm font-semibold text-white/80">
              {completedSteps === totalSteps ? "All set! Your account is fully configured" : "Getting Started"}
            </h2>
          </div>
          <span className="text-xs text-white/50">{completedSteps}/{totalSteps} complete</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              completedSteps === totalSteps
                ? "bg-gradient-to-r from-emerald-500 to-green-500"
                : "bg-gradient-to-r from-violet-500 to-purple-500"
            }`}
            style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { done: setup.notifications, label: "Connect Notifications", href: "/dashboard/settings/notifications", doneLabel: "Notifications Connected" },
            { done: setup.google, label: "Connect Google Business", href: "/dashboard/settings/google", doneLabel: "Google Connected" },
            { done: setup.businesses, label: "Add a Business", href: "/dashboard/businesses", doneLabel: "Business Added" },
          ].map((step) => (
            <Link
              key={step.label}
              href={step.done ? step.href : step.href}
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

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Businesses */}
        <Link
          href="/dashboard/businesses"
          className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-violet-500/30 transition-all duration-300 animate-slide-up"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors">My Businesses</h3>
              <p className="text-white/50 text-sm">{businessCount > 0 ? `${businessCount} business${businessCount > 1 ? "es" : ""}` : "Add your first business"}</p>
            </div>
          </div>
          <p className="text-white/40 text-sm">Manage your businesses, brands, and locations</p>
        </Link>

        {/* Reviews */}
        <Link
          href="/dashboard/reviews"
          className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-amber-500/30 transition-all duration-300 animate-slide-up"
          style={{ animationDelay: "0.05s" }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white group-hover:text-amber-300 transition-colors">Reviews</h3>
              <p className="text-white/50 text-sm">{reviewCount > 0 ? `${reviewCount} review${reviewCount > 1 ? "s" : ""}` : "No reviews yet"}</p>
            </div>
          </div>
          <p className="text-white/40 text-sm">View reviews and approve AI-suggested replies</p>
        </Link>

        {/* Notifications */}
        <Link
          href="/dashboard/settings/notifications"
          className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-green-500/30 transition-all duration-300 animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white group-hover:text-green-300 transition-colors">Notifications</h3>
              <p className="text-white/50 text-sm">{setup.notifications ? "Connected" : "Not connected"}</p>
            </div>
          </div>
          <p className="text-white/40 text-sm">WhatsApp &amp; Telegram alert settings</p>
        </Link>

        {/* Settings */}
        <Link
          href="/dashboard/settings"
          className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 animate-slide-up"
          style={{ animationDelay: "0.15s" }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">Settings</h3>
              <p className="text-white/50 text-sm">Google, account &amp; more</p>
            </div>
          </div>
          <p className="text-white/40 text-sm">Manage integrations and account settings</p>
        </Link>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}

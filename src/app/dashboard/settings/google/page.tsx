"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout";
import { Suspense } from "react";

interface GoogleBusinessStatus {
  connected: boolean;
  scope?: string;
  connectedAt?: string;
  tokenExpiresAt?: string;
}

function GoogleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [googleBusinessStatus, setGoogleBusinessStatus] = useState<GoogleBusinessStatus | null>(null);
  const [syncingReviews, setSyncingReviews] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [authRes, googleRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/auth/google-business/status"),
        ]);
        if (!authRes.ok) { router.push("/auth/signin"); return; }
        if (googleRes.ok) setGoogleBusinessStatus(await googleRes.json());

        // Check for success/error from OAuth callback
        const success = searchParams.get("success");
        const error = searchParams.get("error");
        if (success === "google_business_connected") {
          setSyncMessage("✅ Google Business Profile connected successfully!");
        } else if (error) {
          setSyncMessage(`❌ Error connecting: ${error.replace(/_/g, " ")}`);
        }
      } catch (error) {
        console.error("Error loading Google settings:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router, searchParams]);

  const fetchGoogleBusinessStatus = async () => {
    const res = await fetch("/api/auth/google-business/status");
    if (res.ok) setGoogleBusinessStatus(await res.json());
  };

  const connectGoogleBusiness = () => {
    window.location.href = "/api/auth/google-business/connect";
  };

  const disconnectGoogleBusiness = async () => {
    if (!confirm("Are you sure you want to disconnect Google Business Profile? You won't be able to sync reviews automatically.")) return;
    setDisconnectingGoogle(true);
    try {
      const res = await fetch("/api/auth/google-business/status", { method: "DELETE" });
      if (res.ok) {
        await fetchGoogleBusinessStatus();
        setSyncMessage("Google Business Profile disconnected.");
      }
    } finally { setDisconnectingGoogle(false); }
  };

  const syncAllReviews = async () => {
    setSyncingReviews(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/google-business/sync-all", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`✅ Synced ${data.synced} review(s) successfully!`);
      } else {
        setSyncMessage(`❌ ${data.error || "Failed to sync reviews"}`);
      }
    } catch {
      setSyncMessage("❌ Error syncing reviews");
    } finally {
      setSyncingReviews(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading Google settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back + Title */}
      <div className="mb-8 animate-fade-in">
        <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Settings
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Google Business Profile</h1>
        <p className="text-white/50">Connect Google to automatically fetch &amp; sync customer reviews</p>
      </div>

      {syncMessage && (
        <div className={`text-sm mb-6 p-3 rounded-lg animate-scale-in ${syncMessage.startsWith("✅") ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"}`}>
          {syncMessage}
        </div>
      )}

      {/* Google Business Section */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064 5.963 5.963 0 014.123 1.632l2.917-2.917A9.994 9.994 0 0012.545 2C6.473 2 1.5 6.973 1.5 13.045S6.473 24.09 12.545 24.09c5.598 0 10.545-4.052 10.545-10.545 0-.706-.076-1.393-.22-2.052h-10.325v-.254z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Connection Status</h2>
            <p className="text-white/50 text-sm">Link your Google Business account</p>
          </div>
        </div>

        {googleBusinessStatus?.connected ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
            <div className="flex items-center gap-2 text-emerald-400 mb-3">
              <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="font-semibold">Connected</span>
            </div>
            <p className="text-white/60 text-sm mb-2">Your Google Business Profile is connected. Reviews will be automatically synced from your linked locations.</p>
            {googleBusinessStatus.connectedAt && (
              <p className="text-white/40 text-xs mb-5">Connected on {new Date(googleBusinessStatus.connectedAt).toLocaleDateString()}</p>
            )}
            <div className="flex flex-wrap gap-3 items-center">
              <button onClick={syncAllReviews} disabled={syncingReviews} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {syncingReviews ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Syncing...</>) : (<><svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Sync All Reviews</>)}
              </button>
              <button onClick={disconnectGoogleBusiness} disabled={disconnectingGoogle} className="px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-all disabled:opacity-50">
                {disconnectingGoogle ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
            <p className="text-white/60 text-sm mb-4">Connect your Google Business Profile to automatically fetch and sync customer reviews. This allows you to:</p>
            <ul className="space-y-2 text-sm text-white/60 mb-5">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Automatically import reviews from all your Google Business locations
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Get AI-powered reply suggestions for each review
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Post approved replies directly back to Google
              </li>
            </ul>
            <button onClick={connectGoogleBusiness} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-500/25">
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064 5.963 5.963 0 014.123 1.632l2.917-2.917A9.994 9.994 0 0012.545 2C6.473 2 1.5 6.973 1.5 13.045S6.473 24.09 12.545 24.09c5.598 0 10.545-4.052 10.545-10.545 0-.706-.076-1.393-.22-2.052h-10.325v-.254z"/>
              </svg>
              Connect Google Business Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleSettingsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      }>
        <GoogleContent />
      </Suspense>
    </DashboardLayout>
  );
}

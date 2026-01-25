"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface TelegramStatus {
  connected: boolean;
  chatId: string | null;
  pendingCode: string | null;
  codeExpiresAt: string | null;
}

interface GoogleBusinessStatus {
  connected: boolean;
  scope?: string;
  connectedAt?: string;
  tokenExpiresAt?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [googleBusinessStatus, setGoogleBusinessStatus] = useState<GoogleBusinessStatus | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [syncingReviews, setSyncingReviews] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [sendingReviewTest, setSendingReviewTest] = useState(false);
  const [reviewTestMessage, setReviewTestMessage] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
    fetchTelegramStatus();
    fetchGoogleBusinessStatus();
    
    // Check for success/error from OAuth callback
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    
    if (success === "google_business_connected") {
      setSyncMessage("✅ Google Business Profile connected successfully!");
    } else if (error) {
      setSyncMessage(`❌ Error connecting: ${error.replace(/_/g, " ")}`);
    }
  }, [searchParams]);

  // Start polling for Telegram actions when connected
  useEffect(() => {
    if (!telegramStatus?.connected) return;
    
    const pollInterval = setInterval(async () => {
      try {
        await fetch("/api/telegram/poll", { method: "POST" });
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [telegramStatus?.connected]);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        router.push("/auth/signin");
      }
    } catch {
      router.push("/auth/signin");
    } finally {
      setLoading(false);
    }
  };

  const fetchTelegramStatus = async () => {
    try {
      const res = await fetch("/api/settings/telegram");
      if (res.ok) {
        const data = await res.json();
        setTelegramStatus(data);
      }
    } catch (error) {
      console.error("Error fetching Telegram status:", error);
    }
  };

  const fetchGoogleBusinessStatus = async () => {
    try {
      const res = await fetch("/api/auth/google-business/status");
      if (res.ok) {
        const data = await res.json();
        setGoogleBusinessStatus(data);
      }
    } catch (error) {
      console.error("Error fetching Google Business status:", error);
    }
  };

  const connectGoogleBusiness = () => {
    // Redirect to OAuth flow
    window.location.href = "/api/auth/google-business/connect";
  };

  const disconnectGoogleBusiness = async () => {
    if (!confirm("Are you sure you want to disconnect Google Business Profile? You won't be able to sync reviews automatically.")) {
      return;
    }
    setDisconnectingGoogle(true);
    try {
      const res = await fetch("/api/auth/google-business/status", { method: "DELETE" });
      if (res.ok) {
        await fetchGoogleBusinessStatus();
        setSyncMessage("Google Business Profile disconnected.");
      }
    } catch (error) {
      console.error("Error disconnecting Google Business:", error);
    } finally {
      setDisconnectingGoogle(false);
    }
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
    } catch (error) {
      console.error("Error syncing reviews:", error);
      setSyncMessage("❌ Error syncing reviews");
    } finally {
      setSyncingReviews(false);
    }
  };

  const generateCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await fetch("/api/settings/telegram", { method: "POST" });
      if (res.ok) {
        await fetchTelegramStatus();
      }
    } catch (error) {
      console.error("Error generating code:", error);
    } finally {
      setGeneratingCode(false);
    }
  };

  const verifyConnection = async () => {
    setVerifying(true);
    setVerifyMessage(null);
    try {
      const res = await fetch("/api/settings/telegram/verify", { method: "POST" });
      const data = await res.json();
      
      if (data.connected) {
        setVerifyMessage("✅ " + data.message);
        await fetchTelegramStatus();
      } else {
        setVerifyMessage("❌ " + (data.message || data.error || "Not connected"));
      }
    } catch (error) {
      console.error("Error verifying:", error);
      setVerifyMessage("❌ Error checking connection");
    } finally {
      setVerifying(false);
    }
  };

  const sendReviewTestNotification = async () => {
    setSendingReviewTest(true);
    setReviewTestMessage(null);
    try {
      const res = await fetch("/api/settings/telegram/test-review", { method: "POST" });
      const data = await res.json();
      
      if (data.success) {
        setReviewTestMessage("✅ " + data.message);
      } else {
        setReviewTestMessage("❌ " + (data.error || "Failed to send"));
      }
    } catch (error) {
      console.error("Error sending review test:", error);
      setReviewTestMessage("❌ Error sending test review");
    } finally {
      setSendingReviewTest(false);
    }
  };

  const disconnectTelegram = async () => {
    if (!confirm("Are you sure you want to disconnect Telegram notifications?")) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch("/api/settings/telegram", { method: "DELETE" });
      if (res.ok) {
        await fetchTelegramStatus();
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60 text-lg">Loading settings...</p>
        </div>
      </div>
    );
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "your_bot";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Link>
            </div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-white/60">Manage your account and notification preferences</p>
        </div>

        {/* Telegram Notifications Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white flex-shrink-0" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Telegram Notifications</h2>
              <p className="text-white/50 text-sm">Get instant alerts when new reviews arrive</p>
            </div>
          </div>

          {telegramStatus?.connected ? (
            /* Connected State */
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 text-emerald-400 mb-3">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-semibold">Connected</span>
              </div>
              <p className="text-white/60 text-sm mb-5">
                Your Telegram is connected. You&apos;ll receive notifications for new reviews with AI-generated reply suggestions.
              </p>
              
              {reviewTestMessage && (
                <div className={`text-sm mb-4 p-3 rounded-lg animate-scale-in ${
                  reviewTestMessage.startsWith("✅") 
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}>
                  {reviewTestMessage}
                </div>
              )}
              
              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={sendReviewTestNotification}
                  disabled={sendingReviewTest}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingReviewTest ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Send Test Review Alert
                    </>
                  )}
                </button>
                <button
                  onClick={disconnectTelegram}
                  disabled={disconnecting}
                  className="px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {disconnecting ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            </div>
          ) : telegramStatus?.pendingCode ? (
            /* Pending Connection State */
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
              <p className="text-amber-300 text-sm mb-4">
                Send this code to the Telegram bot to connect your account:
              </p>
              
              <div className="bg-slate-800/80 border-2 border-amber-500/50 rounded-xl p-6 text-center mb-5">
                <span className="text-4xl font-mono font-bold tracking-[0.3em] text-white">
                  {telegramStatus.pendingCode}
                </span>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl p-4 mb-5">
                <p className="text-white/80 text-sm font-medium mb-3">How to connect:</p>
                <ol className="space-y-2 text-sm text-white/60">
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs text-white/80">1</span>
                    Open Telegram on your phone or desktop
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs text-white/80">2</span>
                    Search for <strong className="text-blue-400">@{botUsername}</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs text-white/80">3</span>
                    Send the code shown above
                  </li>
                </ol>
              </div>
              
              {verifyMessage && (
                <div className={`text-sm mb-4 p-3 rounded-lg animate-scale-in ${
                  verifyMessage.startsWith("✅") 
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}>
                  {verifyMessage}
                </div>
              )}
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={verifyConnection}
                  disabled={verifying}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Checking...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verify Connection
                    </>
                  )}
                </button>
                <button
                  onClick={generateCode}
                  disabled={generatingCode}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {generatingCode ? "Generating..." : "Get New Code"}
                </button>
              </div>
            </div>
          ) : (
            /* Not Connected State */
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
              <p className="text-white/60 text-sm mb-5">
                Connect your Telegram account to receive instant notifications when customers leave reviews. You&apos;ll get AI-generated reply suggestions directly in your Telegram!
              </p>
              <button
                onClick={generateCode}
                disabled={generatingCode}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingCode ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    Connect Telegram
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Google Business Profile Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064 5.963 5.963 0 014.123 1.632l2.917-2.917A9.994 9.994 0 0012.545 2C6.473 2 1.5 6.973 1.5 13.045S6.473 24.09 12.545 24.09c5.598 0 10.545-4.052 10.545-10.545 0-.706-.076-1.393-.22-2.052h-10.325v-.254z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Google Business Profile</h2>
              <p className="text-white/50 text-sm">Connect to automatically fetch reviews from Google</p>
            </div>
          </div>

          {syncMessage && (
            <div className={`text-sm mb-4 p-3 rounded-lg animate-scale-in ${
              syncMessage.startsWith("✅") 
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            }`}>
              {syncMessage}
            </div>
          )}

          {googleBusinessStatus?.connected ? (
            /* Connected State */
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 text-emerald-400 mb-3">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-semibold">Connected</span>
              </div>
              <p className="text-white/60 text-sm mb-2">
                Your Google Business Profile is connected. Reviews will be automatically synced from your linked locations.
              </p>
              {googleBusinessStatus.connectedAt && (
                <p className="text-white/40 text-xs mb-5">
                  Connected on {new Date(googleBusinessStatus.connectedAt).toLocaleDateString()}
                </p>
              )}
              
              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={syncAllReviews}
                  disabled={syncingReviews}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncingReviews ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Syncing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Sync All Reviews
                    </>
                  )}
                </button>
                <button
                  onClick={disconnectGoogleBusiness}
                  disabled={disconnectingGoogle}
                  className="px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {disconnectingGoogle ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            </div>
          ) : (
            /* Not Connected State */
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
              <p className="text-white/60 text-sm mb-4">
                Connect your Google Business Profile to automatically fetch and sync customer reviews. This allows you to:
              </p>
              <ul className="space-y-2 text-sm text-white/60 mb-5">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Automatically import reviews from all your Google Business locations
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Get AI-powered reply suggestions for each review
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Post approved replies directly back to Google
                </li>
              </ul>
              <button
                onClick={connectGoogleBusiness}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-red-500/25"
              >
                <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064 5.963 5.963 0 014.123 1.632l2.917-2.917A9.994 9.994 0 0012.545 2C6.473 2 1.5 6.973 1.5 13.045S6.473 24.09 12.545 24.09c5.598 0 10.545-4.052 10.545-10.545 0-.706-.076-1.393-.22-2.052h-10.325v-.254z"/>
                </svg>
                Connect Google Business Profile
              </button>
            </div>
          )}
        </div>

        {/* Account Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Account Details</h2>
              <p className="text-white/50 text-sm">Your personal information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-white/10">
              <div>
                <span className="text-white/50 text-sm">Full Name</span>
                <p className="text-white font-medium">{user?.name || "Not set"}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
              </div>
            </div>
            <div className="py-4 border-b border-white/10">
              <span className="text-white/50 text-sm">Email Address</span>
              <p className="text-white font-medium">{user?.email}</p>
            </div>
            <div className="py-4">
              <span className="text-white/50 text-sm">Account Status</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-emerald-400 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/5 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6 mt-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
              <p className="text-white/50 text-sm">Irreversible actions</p>
            </div>
          </div>
          <p className="text-white/60 text-sm mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-sm font-medium transition-all duration-200"
            onClick={() => alert("This feature is coming soon!")}
          >
            Delete Account
          </button>
        </div>
      </main>
    </div>
  );
}

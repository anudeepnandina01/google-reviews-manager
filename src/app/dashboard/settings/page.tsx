"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout";

interface TelegramStatus {
  connected: boolean;
  chatId: string | null;
  pendingCode: string | null;
  codeExpiresAt: string | null;
  enabled?: boolean;
}

interface WhatsAppStatus {
  connected: boolean;
  phone: string | null;
  pendingCode: string | null;
  codeExpiresAt: string | null;
  enabled?: boolean;
  whatsappNumber?: string;
  whatsappLink?: string;
  available?: boolean; // Whether WhatsApp integration is configured on the backend
}

interface GoogleBusinessStatus {
  connected: boolean;
  scope?: string;
  connectedAt?: string;
  tokenExpiresAt?: string;
}

type NotificationPreference = "telegram" | "whatsapp" | "both" | "none";

function SettingsLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center animate-fade-in">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white/60">Loading settings...</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<SettingsLoadingFallback />}>
        <SettingsContent />
      </Suspense>
    </DashboardLayout>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null);
  const [googleBusinessStatus, setGoogleBusinessStatus] = useState<GoogleBusinessStatus | null>(null);
  const [notificationPreference, setNotificationPreference] = useState<NotificationPreference>("both");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [generatingWhatsappCode, setGeneratingWhatsappCode] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectingWhatsapp, setDisconnectingWhatsapp] = useState(false);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [syncingReviews, setSyncingReviews] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyingWhatsapp, setVerifyingWhatsapp] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [whatsappVerifyMessage, setWhatsappVerifyMessage] = useState<string | null>(null);
  const [sendingReviewTest, setSendingReviewTest] = useState(false);
  const [reviewTestMessage, setReviewTestMessage] = useState<string | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappOtp, setWhatsappOtp] = useState("");

  useEffect(() => {
    checkSession();
    fetchTelegramStatus();
    fetchWhatsappStatus();
    fetchGoogleBusinessStatus();
    fetchNotificationPreference();
    
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

  const fetchWhatsappStatus = async () => {
    try {
      const res = await fetch("/api/settings/whatsapp");
      if (res.ok) {
        const data = await res.json();
        setWhatsappStatus(data);
      }
    } catch (error) {
      console.error("Error fetching WhatsApp status:", error);
    }
  };

  const fetchNotificationPreference = async () => {
    try {
      const res = await fetch("/api/settings/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotificationPreference(data.preference || "both");
      }
    } catch (error) {
      console.error("Error fetching notification preference:", error);
    }
  };

  const updateNotificationPreference = async (pref: NotificationPreference) => {
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preference: pref }),
      });
      if (res.ok) {
        setNotificationPreference(pref);
      }
    } catch (error) {
      console.error("Error updating preference:", error);
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
    
    const results: string[] = [];
    
    try {
      // Send to WhatsApp if connected
      if (whatsappStatus?.connected) {
        const whatsappRes = await fetch("/api/settings/whatsapp/test-review", { method: "POST" });
        const whatsappData = await whatsappRes.json();
        if (whatsappData.success) {
          results.push("✅ WhatsApp");
        } else {
          results.push("❌ WhatsApp: " + (whatsappData.error || "Failed"));
        }
      }
      
      // Send to Telegram if connected
      if (telegramStatus?.connected) {
        const telegramRes = await fetch("/api/settings/telegram/test-review", { method: "POST" });
        const telegramData = await telegramRes.json();
        if (telegramData.success) {
          results.push("✅ Telegram");
        } else {
          results.push("❌ Telegram: " + (telegramData.error || "Failed"));
        }
      }
      
      if (results.length === 0) {
        setReviewTestMessage("❌ No notification channels connected");
      } else {
        setReviewTestMessage("Test sent: " + results.join(", "));
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

  // WhatsApp Functions - OTP flow (we send code TO user's WhatsApp)
  const [whatsappStep, setWhatsappStep] = useState<number>(1);
  
  const startWhatsappConnection = async () => {
    if (!whatsappPhone || whatsappPhone.length < 10) {
      setWhatsappVerifyMessage("❌ Please enter a valid phone number");
      return;
    }
    setGeneratingWhatsappCode(true);
    setWhatsappVerifyMessage(null);
    try {
      const res = await fetch("/api/settings/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: whatsappPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        if (whatsappStep === 1) {
          setWhatsappVerifyMessage("📱 Welcome message sent! Reply 'hi' to that WhatsApp message, then click 'Send Code' again.");
          setWhatsappStep(2);
        } else {
          setWhatsappVerifyMessage("✅ Verification code sent to your WhatsApp!");
        }
        await fetchWhatsappStatus();
      } else {
        setWhatsappVerifyMessage("❌ " + (data.error || "Failed to send code"));
      }
    } catch (error) {
      console.error("Error starting WhatsApp connection:", error);
      setWhatsappVerifyMessage("❌ Error sending verification code");
    } finally {
      setGeneratingWhatsappCode(false);
    }
  };

  const verifyWhatsappOtp = async () => {
    if (!whatsappOtp || whatsappOtp.length !== 6) {
      setWhatsappVerifyMessage("❌ Please enter the 6-digit code");
      return;
    }
    setVerifyingWhatsapp(true);
    setWhatsappVerifyMessage(null);
    try {
      const res = await fetch("/api/settings/whatsapp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: whatsappOtp }),
      });
      const data = await res.json();
      if (data.connected || data.verified) {
        setWhatsappVerifyMessage("✅ WhatsApp connected successfully!");
        setWhatsappOtp("");
        await fetchWhatsappStatus();
      } else {
        setWhatsappVerifyMessage("❌ " + (data.error || data.message || "Invalid code"));
      }
    } catch (error) {
      console.error("Error verifying WhatsApp:", error);
      setWhatsappVerifyMessage("❌ Error verifying code");
    } finally {
      setVerifyingWhatsapp(false);
    }
  };

  const disconnectWhatsapp = async () => {
    if (!confirm("Are you sure you want to disconnect WhatsApp notifications?")) {
      return;
    }
    setDisconnectingWhatsapp(true);
    try {
      const res = await fetch("/api/settings/whatsapp", { method: "DELETE" });
      if (res.ok) {
        setWhatsappPhone("");
        setWhatsappOtp("");
        await fetchWhatsappStatus();
      }
    } catch (error) {
      console.error("Error disconnecting WhatsApp:", error);
    } finally {
      setDisconnectingWhatsapp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading settings...</p>
        </div>
      </div>
    );
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "your_bot";

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Settings</h1>
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

        {/* WhatsApp Notifications Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6 animate-slide-up" style={{ animationDelay: '0.025s' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white flex-shrink-0" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">WhatsApp Notifications</h2>
              <p className="text-white/50 text-sm">Get instant alerts via WhatsApp</p>
            </div>
          </div>

          {whatsappStatus?.connected ? (
            /* Connected State */
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 text-emerald-400 mb-3">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-semibold">Connected</span>
                <span className="text-white/50 text-sm ml-2">({whatsappStatus.phone})</span>
              </div>
              <p className="text-white/60 text-sm mb-5">
                Your WhatsApp is connected. You&apos;ll receive notifications for new reviews with AI-generated reply suggestions.
              </p>
              
              {reviewTestMessage && (
                <div className={`text-sm mb-4 p-3 rounded-lg animate-scale-in ${
                  reviewTestMessage.includes("✅") 
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
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  onClick={disconnectWhatsapp}
                  disabled={disconnectingWhatsapp}
                  className="px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {disconnectingWhatsapp ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            </div>
          ) : whatsappStatus?.pendingCode ? (
            /* Pending Verification - Enter OTP */
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
              <p className="text-amber-300 text-sm mb-4">
                Enter the 6-digit code sent to your WhatsApp:
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  value={whatsappOtp}
                  onChange={(e) => setWhatsappOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="flex-1 max-w-[200px] px-4 py-3 bg-slate-800/80 border-2 border-amber-500/50 rounded-xl text-center text-2xl font-mono font-bold tracking-[0.3em] text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={verifyWhatsappOtp}
                  disabled={verifyingWhatsapp || whatsappOtp.length !== 6}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifyingWhatsapp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verify
                    </>
                  )}
                </button>
              </div>
              
              {whatsappVerifyMessage && (
                <div className={`text-sm mb-4 p-3 rounded-lg animate-scale-in ${
                  whatsappVerifyMessage.startsWith("✅") 
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}>
                  {whatsappVerifyMessage}
                </div>
              )}
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => startWhatsappConnection()}
                  disabled={generatingWhatsappCode}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {generatingWhatsappCode ? "Sending..." : "Resend Code"}
                </button>
                <button
                  onClick={disconnectWhatsapp}
                  disabled={disconnectingWhatsapp}
                  className="px-4 py-2.5 text-white/60 hover:text-white/80 hover:bg-white/10 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Not Connected - Enter Phone Number */
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5">
              <p className="text-white/60 text-sm mb-4">
                Connect your WhatsApp to receive instant notifications when customers leave reviews. You&apos;ll get AI-generated reply suggestions directly in your WhatsApp!
              </p>
              
              {/* Step-by-step instructions */}
              <div className="bg-slate-700/50 border border-white/10 rounded-lg p-4 mb-5">
                <p className="text-white/80 text-sm font-medium mb-3">How to connect:</p>
                <ol className="text-white/60 text-sm space-y-2 list-decimal list-inside">
                  <li>Enter your WhatsApp number below</li>
                  <li>Click &quot;Send Code&quot; - you&apos;ll receive a welcome message</li>
                  <li><strong className="text-amber-400">Reply &quot;hi&quot;</strong> to that message on WhatsApp</li>
                  <li>Click &quot;Resend Code&quot; to get your OTP</li>
                  <li>Enter the 6-digit code to verify</li>
                </ol>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                  placeholder="+91 98765 43210"
                  className="flex-1 max-w-[280px] px-4 py-2.5 bg-slate-800/80 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-green-500/50"
                />
                <button
                  onClick={startWhatsappConnection}
                  disabled={generatingWhatsappCode || !whatsappPhone}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingWhatsappCode ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Send Code
                    </>
                  )}
                </button>
              </div>
              
              {whatsappVerifyMessage && (
                <div className={`text-sm p-3 rounded-lg animate-scale-in ${
                  whatsappVerifyMessage.startsWith("✅") 
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}>
                  {whatsappVerifyMessage}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notification Preferences Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6 animate-slide-up" style={{ animationDelay: '0.04s' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>
              <p className="text-white/50 text-sm">Choose where to receive review alerts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Telegram Only */}
            <button
              onClick={() => updateNotificationPreference("telegram")}
              disabled={!telegramStatus?.connected}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                notificationPreference === "telegram"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              } ${!telegramStatus?.connected ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  notificationPreference === "telegram" ? "border-blue-500 bg-blue-500" : "border-white/30"
                }`}>
                  {notificationPreference === "telegram" && (
                    <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="font-medium text-white">Telegram Only</span>
              </div>
              <p className="text-white/50 text-xs ml-7">
                {telegramStatus?.connected ? "Receive alerts via Telegram" : "Connect Telegram first"}
              </p>
            </button>

            {/* WhatsApp Only */}
            <button
              onClick={() => updateNotificationPreference("whatsapp")}
              disabled={!whatsappStatus?.connected}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                notificationPreference === "whatsapp"
                  ? "border-green-500 bg-green-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              } ${!whatsappStatus?.connected ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  notificationPreference === "whatsapp" ? "border-green-500 bg-green-500" : "border-white/30"
                }`}>
                  {notificationPreference === "whatsapp" && (
                    <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="font-medium text-white">WhatsApp Only</span>
              </div>
              <p className="text-white/50 text-xs ml-7">
                {whatsappStatus?.connected 
                  ? "Receive alerts via WhatsApp" 
                  : "Connect WhatsApp first"}
              </p>
            </button>

            {/* Both */}
            <button
              onClick={() => updateNotificationPreference("both")}
              disabled={!telegramStatus?.connected && !whatsappStatus?.connected}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                notificationPreference === "both"
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              } ${!telegramStatus?.connected && !whatsappStatus?.connected ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  notificationPreference === "both" ? "border-violet-500 bg-violet-500" : "border-white/30"
                }`}>
                  {notificationPreference === "both" && (
                    <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="font-medium text-white">Both</span>
              </div>
              <p className="text-white/50 text-xs ml-7">
                {telegramStatus?.connected || whatsappStatus?.connected 
                  ? "Receive alerts on all connected channels" 
                  : "Connect at least one channel first"}
              </p>
            </button>

            {/* None */}
            <button
              onClick={() => updateNotificationPreference("none")}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                notificationPreference === "none"
                  ? "border-red-500 bg-red-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  notificationPreference === "none" ? "border-red-500 bg-red-500" : "border-white/30"
                }`}>
                  {notificationPreference === "none" && (
                    <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="font-medium text-white">None</span>
              </div>
              <p className="text-white/50 text-xs ml-7">
                Disable all notifications (you can still view reviews in the app)
              </p>
            </button>
          </div>
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
        <div className="bg-red-500/5 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
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
      </div>
  );
}

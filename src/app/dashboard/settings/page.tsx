"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout";

interface StatusInfo {
  notifications: boolean;
  google: boolean;
  telegramConnected: boolean;
  whatsappConnected: boolean;
}

function SettingsHub() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusInfo>({ notifications: false, google: false, telegramConnected: false, whatsappConnected: false });

  useEffect(() => {
    const init = async () => {
      try {
        const [authRes, telegramRes, whatsappRes, googleRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/settings/telegram"),
          fetch("/api/settings/whatsapp"),
          fetch("/api/auth/google-business/status"),
        ]);

        if (!authRes.ok) { router.push("/auth/signin"); return; }

        const telegramData = telegramRes.ok ? await telegramRes.json() : { connected: false };
        const whatsappData = whatsappRes.ok ? await whatsappRes.json() : { connected: false };
        const googleData = googleRes.ok ? await googleRes.json() : { connected: false };

        setStatus({
          notifications: telegramData.connected || whatsappData.connected,
          google: googleData.connected,
          telegramConnected: telegramData.connected,
          whatsappConnected: whatsappData.connected,
        });
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading settings...</p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: "Notifications",
      tourId: "tour-settings-notifications",
      description: "WhatsApp & Telegram alert settings",
      href: "/dashboard/settings/notifications",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      gradient: "from-green-500 to-emerald-600",
      shadow: "shadow-green-500/20",
      hoverBorder: "hover:border-green-500/30",
      status: status.notifications
        ? `${[status.whatsappConnected && "WhatsApp", status.telegramConnected && "Telegram"].filter(Boolean).join(" & ")} connected`
        : "Not connected",
      statusColor: status.notifications ? "text-emerald-400" : "text-white/40",
    },
    {
      title: "Google Business",
      tourId: "tour-settings-google",
      description: "Connect Google to sync reviews automatically",
      href: "/dashboard/settings/google",
      icon: (
        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064 5.963 5.963 0 014.123 1.632l2.917-2.917A9.994 9.994 0 0012.545 2C6.473 2 1.5 6.973 1.5 13.045S6.473 24.09 12.545 24.09c5.598 0 10.545-4.052 10.545-10.545 0-.706-.076-1.393-.22-2.052h-10.325v-.254z"/>
        </svg>
      ),
      gradient: "from-red-500 to-orange-500",
      shadow: "shadow-red-500/20",
      hoverBorder: "hover:border-red-500/30",
      status: status.google ? "Connected" : "Not connected",
      statusColor: status.google ? "text-emerald-400" : "text-white/40",
    },
    {
      title: "Account",
      tourId: "tour-settings-account",
      description: "Profile details and account management",
      href: "/dashboard/settings/account",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      gradient: "from-violet-500 to-purple-600",
      shadow: "shadow-violet-500/20",
      hoverBorder: "hover:border-violet-500/30",
      status: "Active",
      statusColor: "text-emerald-400",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Title */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-white/50">Manage your integrations and account preferences</p>
      </div>

      {/* Settings Cards */}
      <div className="space-y-4">
        {cards.map((card, index) => (
          <Link
            key={card.title}
            href={card.href}
            data-tour={card.tourId}
            className={`group flex items-center gap-5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 ${card.hoverBorder} transition-all duration-300 animate-slide-up`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center shadow-lg ${card.shadow} group-hover:scale-110 transition-transform flex-shrink-0`}>
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white group-hover:text-white/90 transition-colors">{card.title}</h3>
              <p className="text-white/40 text-sm">{card.description}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`text-xs font-medium ${card.statusColor} hidden sm:block`}>{card.status}</span>
              <svg className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <SettingsHub />
    </DashboardLayout>
  );
}

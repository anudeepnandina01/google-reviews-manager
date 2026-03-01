"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout";

function AccountContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) { router.push("/auth/signin"); return; }
        const data = await res.json();
        setUser(data.user);
      } catch (error) {
        console.error("Error loading account:", error);
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
          <p className="text-white/60">Loading account...</p>
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Account</h1>
        <p className="text-white/50">Your personal information and account management</p>
      </div>

      {/* Account Details */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="bg-red-500/5 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
            <p className="text-white/50 text-sm">Irreversible actions</p>
          </div>
        </div>
        <p className="text-white/60 text-sm mb-4">Once you delete your account, there is no going back. Please be certain.</p>
        <button
          className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-sm font-medium transition-all"
          onClick={() => alert("This feature is coming soon!")}
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <DashboardLayout>
      <AccountContent />
    </DashboardLayout>
  );
}

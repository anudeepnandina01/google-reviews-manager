"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, ReactNode } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Sidebar from "./Sidebar";
import { TourProvider, TourOverlay } from "@/components/tour";

interface User {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
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

    checkSession();

    // Listen for sidebar collapse state from localStorage
    const savedState = localStorage.getItem("sidebar-collapsed");
    if (savedState) {
      setSidebarCollapsed(savedState === "true");
    }
  }, [router]);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/firebase", { method: "DELETE" });
      await signOut(auth);
      window.location.href = "/auth/signin";
    } catch (error) {
      console.error("Error signing out:", error);
      window.location.href = "/auth/signin";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <TourProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Sidebar */}
        <Sidebar user={user} onSignOut={handleSignOut} />

        {/* Main Content */}
        <main
          className={`
            min-h-screen transition-all duration-300
            lg:pl-[280px]
            pt-16 lg:pt-0
          `}
        >
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>

        {/* Tour Overlay */}
        <TourOverlay />
      </div>
    </TourProvider>
  );
}

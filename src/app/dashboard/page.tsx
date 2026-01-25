"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

interface Business {
  id: string;
  name: string;
  brands: Array<{
    id: string;
    name: string;
    locations: Array<{
      id: string;
      name: string;
    }>;
  }>;
  _count?: {
    brands: number;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

export default function Dashboard() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check session
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
      }
    };
    
    checkSession();
    fetchBusinesses();
  }, [router]);

  const fetchBusinesses = async () => {
    try {
      const res = await fetch("/api/businesses");
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data);
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
    } finally {
      setLoading(false);
    }
  };

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
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const totalBrands = businesses.reduce((acc, b) => acc + (b.brands?.length || 0), 0);
  const totalLocations = businesses.reduce((acc, b) => 
    acc + (b.brands?.reduce((a, brand) => a + (brand.locations?.length || 0), 0) || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <svg className="w-6 h-6 text-white flex-shrink-0" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white hidden sm:block">ReviewsManager</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-4 py-2 text-white font-medium rounded-lg bg-white/10">
                Dashboard
              </Link>
              <Link href="/dashboard/reviews" className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition">
                Reviews
              </Link>
              <Link href="/dashboard/settings" className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition">
                Settings
              </Link>
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-white/80 text-sm font-medium max-w-40 truncate">
                {user?.name || user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-all duration-200 text-sm font-medium"
              >
                Sign Out
              </button>
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <svg className="w-6 h-6 flex-shrink-0" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 animate-fade-in">
            <div className="px-4 py-3 space-y-1">
              <Link href="/dashboard" className="block px-4 py-2 text-white font-medium rounded-lg bg-white/10">
                Dashboard
              </Link>
              <Link href="/dashboard/reviews" className="block px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition">
                Reviews
              </Link>
              <Link href="/dashboard/settings" className="block px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition">
                Settings
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-white/60">Here&apos;s an overview of your review management system</p>
        </div>

        {/* Stats Cards - Horizontal Layout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400 flex-shrink-0" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-blue-400 text-sm font-medium">Total</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{businesses.length}</p>
            <p className="text-white/60 text-sm">Businesses</p>
          </div>

          <div className="bg-gradient-to-br from-violet-500/20 to-violet-600/10 backdrop-blur-sm rounded-2xl p-6 border border-violet-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-400 flex-shrink-0" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <span className="text-violet-400 text-sm font-medium">Total</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{totalBrands}</p>
            <p className="text-white/60 text-sm">Brands</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 backdrop-blur-sm rounded-2xl p-6 border border-emerald-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400 flex-shrink-0" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-emerald-400 text-sm font-medium">Total</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{totalLocations}</p>
            <p className="text-white/60 text-sm">Locations</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 backdrop-blur-sm rounded-2xl p-6 border border-amber-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400 flex-shrink-0" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <span className="text-amber-400 text-sm font-medium">Active</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">0</p>
            <p className="text-white/60 text-sm">Reviews Today</p>
          </div>
        </div>

        {/* Businesses Section */}
        {businesses.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center animate-scale-in">
            <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-400 flex-shrink-0" width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No businesses yet</h2>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              Create your first business to start managing reviews and get AI-powered responses delivered right to your Telegram.
            </p>
            <button
              onClick={() => router.push("/dashboard/businesses/new")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl py-3 px-6 font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:scale-[1.02]"
            >
              <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Business
            </button>
          </div>
        ) : (
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Your Businesses</h2>
              <button
                onClick={() => router.push("/dashboard/businesses/new")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 text-sm font-medium"
              >
                <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Business
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {businesses.map((business, index) => (
                <div
                  key={business.id}
                  className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 animate-scale-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {business.name.charAt(0)}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/dashboard/businesses/${business.id}/ai-config`}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
                        title="AI Settings"
                      >
                        <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Link>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2">{business.name}</h3>
                  
                  <div className="flex items-center gap-4 text-sm text-white/60 mb-4">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {business.brands?.length || 0} Brands
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {business.brands?.reduce((a, b) => a + (b.locations?.length || 0), 0) || 0} Locations
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/businesses/${business.id}`)}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Manage Locations
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/reviews?businessId=${business.id}`)}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2"
                      title="View Reviews"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/settings"
              className="group flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center group-hover:bg-violet-500/30 transition flex-shrink-0">
                <svg className="w-5 h-5 text-violet-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-white font-medium whitespace-nowrap">Settings</span>
            </Link>

            {businesses.length > 0 && (
              <Link
                href={`/dashboard/businesses/${businesses[0].id}/ai-config`}
                className="group flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
              >
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="text-white font-medium whitespace-nowrap">AI Settings</span>
              </Link>
            )}

            <Link
              href="/dashboard/settings"
              className="group flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/30 transition flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <span className="text-white font-medium whitespace-nowrap">Telegram Bot</span>
            </Link>

            <div
              className="group flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 cursor-not-allowed opacity-60"
            >
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-white font-medium whitespace-nowrap">Analytics</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">© 2026 ReviewsManager. All rights reserved.</p>
            <div className="flex items-center gap-6 text-white/40 text-sm">
              <a href="#" className="hover:text-white/60 transition">Privacy Policy</a>
              <a href="#" className="hover:text-white/60 transition">Terms of Service</a>
              <a href="#" className="hover:text-white/60 transition">Help</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

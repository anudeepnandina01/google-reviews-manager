"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout";

interface Location {
  id: string;
  name: string;
  googleLocationId?: string;
}

interface Brand {
  id: string;
  name: string;
  locations: Location[];
}

interface Business {
  id: string;
  name: string;
  googleAccountId?: string;
  createdAt: string;
  brands: Brand[];
}

function BusinessesContent() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchBusinesses = async () => {
    try {
      const res = await fetch("/api/businesses");
      if (res.status === 401) { router.push("/auth/signin"); return; }
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data);
      }
    } catch (err) {
      console.error("Error fetching businesses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBusinesses(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName("");
        setShowAdd(false);
        await fetchBusinesses();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add business");
      }
    } catch (err) {
      alert("Failed to add business");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will remove all brands, locations, and reviews associated with this business.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/businesses/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchBusinesses();
      } else {
        alert("Failed to delete business");
      }
    } catch (err) {
      alert("Failed to delete business");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading businesses...</p>
        </div>
      </div>
    );
  }

  const totalLocations = businesses.reduce((sum, b) => sum + b.brands.reduce((s, br) => s + br.locations.length, 0), 0);
  const totalBrands = businesses.reduce((sum, b) => sum + b.brands.length, 0);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">My Businesses</h1>
          <p className="text-white/50">
            {businesses.length === 0
              ? "Add your first business to get started"
              : `${businesses.length} business${businesses.length !== 1 ? "es" : ""} · ${totalBrands} brand${totalBrands !== 1 ? "s" : ""} · ${totalLocations} location${totalLocations !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Add Business</span>
        </button>
      </div>

      {/* Add Business Form */}
      {showAdd && (
        <div className="mb-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 animate-fade-in">
          <h3 className="text-white font-semibold mb-3">New Business</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Business name"
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? "Adding..." : "Add"}
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewName(""); }}
              className="px-4 py-2.5 bg-white/5 text-white/60 rounded-xl hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {businesses.length === 0 && !showAdd && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">No businesses yet</h3>
          <p className="text-white/40 mb-6 max-w-sm mx-auto">Add your first business to start syncing Google reviews and receiving alerts</p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20"
          >
            Add Your First Business
          </button>
        </div>
      )}

      {/* Business Cards */}
      <div className="space-y-4">
        {businesses.map((biz, index) => (
          <div
            key={biz.id}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-all duration-300 animate-slide-up"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {/* Business Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
                  <span className="text-white font-bold text-sm">{biz.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{biz.name}</h3>
                  <p className="text-white/40 text-xs">
                    Added {new Date(biz.createdAt).toLocaleDateString()}
                    {biz.googleAccountId && (
                      <span className="ml-2 text-emerald-400">● Google connected</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(biz.id, biz.name)}
                disabled={deleting === biz.id}
                className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete business"
              >
                {deleting === biz.id ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>

            {/* Brands & Locations */}
            {biz.brands.length > 0 ? (
              <div className="space-y-2">
                {biz.brands.map((brand) => (
                  <div key={brand.id} className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span className="text-white/80 text-sm font-medium">{brand.name}</span>
                      <span className="text-white/30 text-xs">· {brand.locations.length} location{brand.locations.length !== 1 ? "s" : ""}</span>
                    </div>
                    {brand.locations.length > 0 && (
                      <div className="ml-6 space-y-1">
                        {brand.locations.map((loc) => (
                          <div key={loc.id} className="flex items-center gap-2 text-white/50 text-xs">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{loc.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-sm italic">No brands or locations yet — sync from Google to populate</p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-white/40 text-xs">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {biz.brands.length} brand{biz.brands.length !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-1.5 text-white/40 text-xs">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {biz.brands.reduce((s, br) => s + br.locations.length, 0)} location{biz.brands.reduce((s, br) => s + br.locations.length, 0) !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BusinessesPage() {
  return (
    <DashboardLayout>
      <BusinessesContent />
    </DashboardLayout>
  );
}

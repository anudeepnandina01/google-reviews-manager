"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Location {
  id: string;
  name: string;
  address: string | null;
  googlePlaceId: string | null;
  googleLocationId: string | null;
  _count: { reviews: number };
}

interface Brand {
  id: string;
  name: string;
  locations: Location[];
  _count: { locations: number };
}

interface Business {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
}

interface PlacePreview {
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  totalReviews?: number;
  photoUrl?: string;
}

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  // Form states
  const [brandName, setBrandName] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [placePreview, setPlacePreview] = useState<PlacePreview | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualLocation, setManualLocation] = useState({ name: "", address: "" });
  
  // Sync states
  const [syncingLocationId, setSyncingLocationId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<{ locationId: string; type: 'success' | 'error'; text: string } | null>(null);

  const handleSyncLocation = async (locationId: string) => {
    setSyncingLocationId(locationId);
    setSyncMessage(null);
    
    try {
      // Use the Places API to sync reviews (works for any business, not just owned ones)
      const response = await fetch(`/api/locations/${locationId}/sync-reviews`, { method: "POST" });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to sync reviews");
      }
      
      setSyncMessage({ 
        locationId,
        type: 'success', 
        text: data.message || `Synced ${data.reviewsSynced || 0} reviews` 
      });
      
      fetchBusinessData();
    } catch (err) {
      setSyncMessage({ 
        locationId,
        type: 'error', 
        text: err instanceof Error ? err.message : "Failed to sync" 
      });
    } finally {
      setSyncingLocationId(null);
    }
  };

  const fetchBusinessData = useCallback(async () => {
    try {
      // Fetch business details
      const businessRes = await fetch(`/api/businesses/${businessId}`);
      if (!businessRes.ok) {
        if (businessRes.status === 404) {
          router.push("/dashboard");
          return;
        }
        throw new Error("Failed to fetch business");
      }
      const businessData = await businessRes.json();
      setBusiness(businessData.business);

      // Fetch brands with locations
      const brandsRes = await fetch(`/api/businesses/${businessId}/brands`);
      if (brandsRes.ok) {
        const brandsData = await brandsRes.json();
        setBrands(brandsData.brands);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load business data");
    } finally {
      setLoading(false);
    }
  }, [businessId, router]);

  useEffect(() => {
    fetchBusinessData();
  }, [fetchBusinessData]);

  const handleLookupPlace = async () => {
    if (!googleUrl.trim()) return;

    setLookupLoading(true);
    setPlacePreview(null);
    setError(null);

    try {
      const response = await fetch("/api/places/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: googleUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to lookup place");
      }

      setPlacePreview(data.place);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to lookup place");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/businesses/${businessId}/brands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: brandName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create brand");
      }

      setBrandName("");
      setShowBrandModal(false);
      fetchBusinessData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create brand");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLocation = async () => {
    if (!selectedBrandId) return;
    
    // Validate based on mode
    if (!manualMode && !placePreview) return;
    if (manualMode && !manualLocation.name.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const body = manualMode 
        ? { name: manualLocation.name, address: manualLocation.address }
        : { googleUrl };

      const response = await fetch(
        `/api/businesses/${businessId}/brands/${selectedBrandId}/locations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add location");
      }

      setGoogleUrl("");
      setPlacePreview(null);
      setManualLocation({ name: "", address: "" });
      setManualMode(false);
      setShowLocationModal(false);
      setSelectedBrandId(null);
      fetchBusinessData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add location");
    } finally {
      setSubmitting(false);
    }
  };

  const openLocationModal = (brandId: string) => {
    setSelectedBrandId(brandId);
    setGoogleUrl("");
    setPlacePreview(null);
    setManualMode(false);
    setManualLocation({ name: "", address: "" });
    setError(null);
    setShowLocationModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!business) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Link>
            <h1 className="text-xl font-bold text-white">{business.name}</h1>
            <Link
              href={`/dashboard/businesses/${businessId}/ai-config`}
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Business Info Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{business.name}</h2>
              {business.description && (
                <p className="text-white/60 mb-2">{business.description}</p>
              )}
              {business.industry && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {business.industry}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-white/60">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{brands.length}</p>
                <p>Brands</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {brands.reduce((sum, b) => sum + b.locations.length, 0)}
                </p>
                <p>Locations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Brands Section */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Brands & Locations</h3>
          <button
            onClick={() => {
              setBrandName("");
              setError(null);
              setShowBrandModal(true);
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-medium py-2 px-4 rounded-xl transition-all duration-200"
          >
            <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Brand
          </button>
        </div>

        {brands.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white/40 flex-shrink-0" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-white mb-2">No brands yet</h4>
            <p className="text-white/60 mb-6">
              Create a brand to organize your locations (e.g., &ldquo;Main Brand&rdquo; or &ldquo;Franchise Name&rdquo;)
            </p>
            <button
              onClick={() => {
                setBrandName("");
                setError(null);
                setShowBrandModal(true);
              }}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-xl transition-all duration-200"
            >
              <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create First Brand
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden"
              >
                {/* Brand Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{brand.name}</h4>
                      <p className="text-sm text-white/60">
                        {brand.locations.length} location{brand.locations.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => openLocationModal(brand.id)}
                    className="inline-flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium py-2 px-4 rounded-xl transition-all duration-200 border border-emerald-500/30"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Add Location
                  </button>
                </div>

                {/* Locations List */}
                {brand.locations.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-white/40 text-sm">
                      No locations yet. Add a location by pasting a Google Maps link.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {brand.locations.map((location) => (
                      <div
                        key={location.id}
                        className="p-4 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                              <svg className="w-5 h-5 text-white/60 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div>
                              <h5 className="font-medium text-white">{location.name}</h5>
                              {location.address && (
                                <p className="text-sm text-white/60">{location.address}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* API Source Badge */}
                            {location.googleLocationId ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <svg className="w-3 h-3 flex-shrink-0" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                  </svg>
                                  Business Profile
                                </span>
                                <span className="text-[10px] text-emerald-400/70">All reviews • Can reply</span>
                              </div>
                            ) : location.googlePlaceId ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  <svg className="w-3 h-3 flex-shrink-0" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  Places API
                                </span>
                                <span className="text-[10px] text-blue-400/70">Top 5 reviews • Read only</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-1">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/10 text-white/60 border border-white/10">
                                  Manual entry
                                </span>
                                <span className="text-[10px] text-white/40">No Google link</span>
                              </div>
                            )}
                            
                            {/* Sync Button */}
                            {location.googlePlaceId && (
                              <button
                                onClick={() => handleSyncLocation(location.id)}
                                disabled={syncingLocationId === location.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 transition-all disabled:opacity-50"
                              >
                                {syncingLocationId === location.id ? (
                                  <>
                                    <svg className="w-3 h-3 animate-spin flex-shrink-0" width="12" height="12" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Syncing...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3 flex-shrink-0" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Sync Reviews
                                  </>
                                )}
                              </button>
                            )}
                            
                            {/* Review Count */}
                            <div className="text-right min-w-[60px]">
                              <p className="text-lg font-semibold text-white">{location._count.reviews}</p>
                              <p className="text-xs text-white/60">reviews</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Sync Message for this location */}
                        {syncMessage && syncMessage.locationId === location.id && (
                          <div className={`mt-2 ml-13 text-xs ${syncMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {syncMessage.text}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Brand Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-md p-6 animate-scale-in">
            <h3 className="text-xl font-semibold text-white mb-4">Create Brand</h3>
            <form onSubmit={handleCreateBrand}>
              <div className="mb-4">
                <label htmlFor="brandName" className="block text-sm font-medium text-white/80 mb-2">
                  Brand Name
                </label>
                <input
                  type="text"
                  id="brandName"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="input-dark"
                  placeholder="e.g., Main Brand, Franchise Name"
                  autoFocus
                />
                <p className="mt-2 text-xs text-white/40">
                  Use your business name if you only have one brand
                </p>
              </div>
              {error && (
                <p className="text-red-400 text-sm mb-4">{error}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || !brandName.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-medium py-2.5 px-4 rounded-xl disabled:opacity-50 transition-all duration-200"
                >
                  {submitting ? "Creating..." : "Create Brand"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-lg p-6 animate-scale-in">
            <h3 className="text-xl font-semibold text-white mb-2">Add Location</h3>
            
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                  !manualMode 
                    ? "bg-blue-600 text-white" 
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                Google Maps Link
              </button>
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                  manualMode 
                    ? "bg-blue-600 text-white" 
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                Manual Entry
              </button>
            </div>

            {!manualMode ? (
              <>
                <div className="mb-4">
                  <label htmlFor="googleUrl" className="block text-sm font-medium text-white/80 mb-2">
                    Google Maps Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="googleUrl"
                      value={googleUrl}
                      onChange={(e) => {
                        setGoogleUrl(e.target.value);
                        setPlacePreview(null);
                      }}
                      className="input-dark flex-1"
                      placeholder="https://maps.google.com/..."
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleLookupPlace}
                      disabled={lookupLoading || !googleUrl.trim()}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl disabled:opacity-50 transition-all duration-200 flex items-center gap-2"
                    >
                      {lookupLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                      Lookup
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-white/40">
                    Go to Google Maps, search for your business, and copy the URL from the address bar
                  </p>
                </div>

                {/* Place Preview */}
                {placePreview && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-4">
                      {placePreview.photoUrl && (
                        <img
                          src={placePreview.photoUrl}
                          alt={placePreview.name}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">{placePreview.name}</h4>
                        <p className="text-sm text-white/60 mt-1">{placePreview.address}</p>
                        {placePreview.rating && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-amber-400 flex-shrink-0" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                              <span className="text-sm font-medium text-white">{placePreview.rating}</span>
                            </div>
                            {placePreview.totalReviews && (
                              <span className="text-sm text-white/60">
                                ({placePreview.totalReviews} reviews)
                              </span>
                            )}
                          </div>
                        )}
                        {placePreview.phone && (
                          <p className="text-sm text-white/60 mt-1">{placePreview.phone}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <svg className="w-3 h-3 flex-shrink-0" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Found
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-4">
                  <label htmlFor="locationName" className="block text-sm font-medium text-white/80 mb-2">
                    Location Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="locationName"
                    value={manualLocation.name}
                    onChange={(e) => setManualLocation({ ...manualLocation, name: e.target.value })}
                    className="input-dark"
                    placeholder="e.g., Downtown Branch"
                    autoFocus
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="locationAddress" className="block text-sm font-medium text-white/80 mb-2">
                    Address <span className="text-white/40">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="locationAddress"
                    value={manualLocation.address}
                    onChange={(e) => setManualLocation({ ...manualLocation, address: e.target.value })}
                    className="input-dark"
                    placeholder="123 Main St, City, State"
                  />
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                  <p className="text-amber-300 text-sm">
                    <strong>Note:</strong> Manual locations won&apos;t sync reviews from Google automatically. 
                    Use Google Maps link if you want automatic review syncing.
                  </p>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 mb-4">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAddLocation}
                disabled={submitting || (!manualMode && !placePreview) || (manualMode && !manualLocation.name.trim())}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium py-2.5 px-4 rounded-xl disabled:opacity-50 transition-all duration-200"
              >
                {submitting ? "Adding..." : "Add Location"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLocationModal(false);
                  setSelectedBrandId(null);
                  setGoogleUrl("");
                  setPlacePreview(null);
                  setManualMode(false);
                  setManualLocation({ name: "", address: "" });
                }}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

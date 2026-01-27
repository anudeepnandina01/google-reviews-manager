"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout";

interface AiConfig {
  businessType: string | null;
  description: string | null;
  operatingHours: string | null;
  toneStyle: string;
  customInstructions: string | null;
  signatureClosing: string | null;
  includeContactInfo: boolean;
  contactPhone: string | null;
  contactEmail: string | null;
  includePromotion: boolean;
  promotionText: string | null;
  learnFromReplies: boolean;
}

interface ReplyExample {
  id: string;
  reviewRating: number;
  reviewText: string;
  finalReply: string;
  wasEdited: boolean;
  createdAt: string;
}

interface OperatingHours {
  [key: string]: { open: string; close: string; closed?: boolean };
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const TONE_STYLES = [
  { value: "professional", label: "Professional", desc: "Courteous, business-appropriate", icon: "💼" },
  { value: "friendly", label: "Friendly", desc: "Warm and personable", icon: "😊" },
  { value: "casual", label: "Casual", desc: "Relaxed and conversational", icon: "👋" },
  { value: "formal", label: "Formal", desc: "Very polished and corporate", icon: "🎩" },
];

export default function BusinessAiConfigPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params.businessId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState<string>("context");
  
  const [config, setConfig] = useState<AiConfig>({
    businessType: null,
    description: null,
    operatingHours: null,
    toneStyle: "professional",
    customInstructions: null,
    signatureClosing: null,
    includeContactInfo: false,
    contactPhone: null,
    contactEmail: null,
    includePromotion: false,
    promotionText: null,
    learnFromReplies: true,
  });

  const [hours, setHours] = useState<OperatingHours>({
    monday: { open: "09:00", close: "18:00" },
    tuesday: { open: "09:00", close: "18:00" },
    wednesday: { open: "09:00", close: "18:00" },
    thursday: { open: "09:00", close: "18:00" },
    friday: { open: "09:00", close: "18:00" },
    saturday: { open: "10:00", close: "16:00", closed: true },
    sunday: { open: "10:00", close: "16:00", closed: true },
  });

  const [examples, setExamples] = useState<ReplyExample[]>([]);

  useEffect(() => {
    fetchConfig();
  }, [businessId]);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`/api/businesses/${businessId}/ai-config`);
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          if (data.config.operatingHours) {
            try {
              setHours(JSON.parse(data.config.operatingHours));
            } catch {
              // Keep default hours
            }
          }
        }
        if (data.replyExamples) {
          setExamples(data.replyExamples);
        }
      } else if (res.status === 401) {
        router.push("/auth/signin");
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/businesses/${businessId}/ai-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          operatingHours: JSON.stringify(hours),
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "AI configuration saved successfully!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Error saving configuration" });
    } finally {
      setSaving(false);
    }
  };

  const deleteExample = async (exampleId: string) => {
    try {
      const res = await fetch(`/api/businesses/${businessId}/ai-config?exampleId=${exampleId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setExamples(examples.filter((e) => e.id !== exampleId));
      }
    } catch (error) {
      console.error("Error deleting example:", error);
    }
  };

  const updateHours = (day: string, field: "open" | "close" | "closed", value: string | boolean) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center animate-fade-in">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/60">Loading AI configuration...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const sections = [
    { id: "context", label: "Business Context", icon: "clipboard" },
    { id: "hours", label: "Operating Hours", icon: "clock" },
    { id: "tone", label: "Tone & Style", icon: "palette" },
    { id: "instructions", label: "Custom Rules", icon: "document" },
    { id: "contact", label: "Contact Info", icon: "phone" },
    { id: "promotions", label: "Promotions", icon: "gift" },
    { id: "learning", label: "AI Learning", icon: "brain" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">AI Reply Configuration</h1>
              <p className="text-white/60 text-sm">Customize how AI generates review responses</p>
            </div>
          </div>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="hidden lg:inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Configuration
              </>
            )}
          </button>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-xl animate-slide-up ${
          message.type === "success" 
            ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" 
            : "bg-red-500/20 border border-red-500/30 text-red-300"
        }`}>
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {message.text}
          </div>
        </div>
      )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sticky top-24">
              <div className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                      activeSection === section.id
                        ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="w-5 h-5 flex items-center justify-center">
                      {section.icon === "clipboard" && (
                        <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      )}
                      {section.icon === "clock" && (
                        <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {section.icon === "palette" && (
                        <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      )}
                      {section.icon === "document" && (
                        <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      {section.icon === "phone" && (
                        <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      )}
                      {section.icon === "gift" && (
                        <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                      )}
                      {section.icon === "brain" && (
                        <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm font-medium">{section.label}</span>
                  </button>
                ))}
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Business Context */}
            <section id="context" className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-slide-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Business Context</h2>
                  <p className="text-white/50 text-sm">Help AI understand your business</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="label-dark">Business Type</label>
                  <input
                    type="text"
                    value={config.businessType || ""}
                    onChange={(e) => setConfig({ ...config, businessType: e.target.value })}
                    placeholder="e.g., Restaurant, Salon, Retail Store, Dental Clinic"
                    className="input-dark"
                  />
                </div>

                <div>
                  <label className="label-dark">Business Description</label>
                  <textarea
                    value={config.description || ""}
                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                    placeholder="Brief description of your business (helps AI understand context)"
                    rows={3}
                    className="input-dark resize-none"
                  />
                </div>
              </div>
            </section>

            {/* Operating Hours */}
            <section id="hours" className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.05s" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Operating Hours</h2>
                  <p className="text-white/50 text-sm">AI can mention hours when relevant</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
                    <span className="w-24 text-sm font-medium capitalize text-white/80">{day}</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div 
                        className={`relative w-10 h-6 rounded-full transition-colors ${
                          !hours[day]?.closed ? "bg-emerald-500" : "bg-white/20"
                        }`}
                        onClick={() => updateHours(day, "closed", !hours[day]?.closed)}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          !hours[day]?.closed ? "translate-x-5" : "translate-x-1"
                        }`}></div>
                      </div>
                      <span className="text-sm text-white/60">{!hours[day]?.closed ? "Open" : "Closed"}</span>
                    </label>
                    {!hours[day]?.closed && (
                      <>
                        <input
                          type="time"
                          value={hours[day]?.open || "09:00"}
                          onChange={(e) => updateHours(day, "open", e.target.value)}
                          className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                        />
                        <span className="text-white/40">to</span>
                        <input
                          type="time"
                          value={hours[day]?.close || "18:00"}
                          onChange={(e) => updateHours(day, "close", e.target.value)}
                          className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Tone & Style */}
            <section id="tone" className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Tone & Style</h2>
                  <p className="text-white/50 text-sm">Choose how AI should communicate</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                {TONE_STYLES.map((style) => (
                  <label
                    key={style.value}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      config.toneStyle === style.value
                        ? "border-violet-500 bg-violet-500/20"
                        : "border-white/10 hover:border-white/30 bg-white/5"
                    }`}
                  >
                    <input
                      type="radio"
                      name="toneStyle"
                      value={style.value}
                      checked={config.toneStyle === style.value}
                      onChange={(e) => setConfig({ ...config, toneStyle: e.target.value })}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2 mb-1">
                      <span>{style.icon}</span>
                      <span className="font-medium text-white">{style.label}</span>
                    </div>
                    <p className="text-sm text-white/50">{style.desc}</p>
                  </label>
                ))}
              </div>

              <div>
                <label className="label-dark">Signature Closing (optional)</label>
                <input
                  type="text"
                  value={config.signatureClosing || ""}
                  onChange={(e) => setConfig({ ...config, signatureClosing: e.target.value })}
                  placeholder="e.g., Best regards, The Team at [Business Name]"
                  className="input-dark"
                />
              </div>
            </section>

            {/* Custom Instructions */}
            <section id="instructions" className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.15s" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Custom Rules</h2>
                  <p className="text-white/50 text-sm">Tell AI exactly how to respond - highest priority</p>
                </div>
              </div>
              
              <textarea
                value={config.customInstructions || ""}
                onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })}
                placeholder={`Examples:
- Always mention our loyalty program for positive reviews
- Never promise refunds in responses
- If someone mentions waiting time, apologize and explain we're working on it
- For negative reviews about food quality, offer a callback from our manager
- Use "Hi" instead of "Dear" when greeting`}
                rows={6}
                className="input-dark font-mono text-sm resize-none"
              />
            </section>

            {/* Contact Info */}
            <section id="contact" className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Contact Information</h2>
                  <p className="text-white/50 text-sm">Include in negative review responses</p>
                </div>
              </div>
              
              <label className="flex items-center gap-3 mb-6 cursor-pointer">
                <div 
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    config.includeContactInfo ? "bg-emerald-500" : "bg-white/20"
                  }`}
                  onClick={() => setConfig({ ...config, includeContactInfo: !config.includeContactInfo })}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    config.includeContactInfo ? "translate-x-6" : "translate-x-1"
                  }`}></div>
                </div>
                <span className="text-sm text-white/80">
                  Include contact info in negative review responses
                </span>
              </label>

              {config.includeContactInfo && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                  <div>
                    <label className="label-dark">Phone</label>
                    <input
                      type="tel"
                      value={config.contactPhone || ""}
                      onChange={(e) => setConfig({ ...config, contactPhone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className="input-dark"
                    />
                  </div>
                  <div>
                    <label className="label-dark">Email</label>
                    <input
                      type="email"
                      value={config.contactEmail || ""}
                      onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                      placeholder="support@business.com"
                      className="input-dark"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Promotions */}
            <section id="promotions" className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.25s" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-pink-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Promotions</h2>
                  <p className="text-white/50 text-sm">Mention current offers in positive responses</p>
                </div>
              </div>
              
              <label className="flex items-center gap-3 mb-6 cursor-pointer">
                <div 
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    config.includePromotion ? "bg-emerald-500" : "bg-white/20"
                  }`}
                  onClick={() => setConfig({ ...config, includePromotion: !config.includePromotion })}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    config.includePromotion ? "translate-x-6" : "translate-x-1"
                  }`}></div>
                </div>
                <span className="text-sm text-white/80">
                  Mention current promotion in positive review responses
                </span>
              </label>

              {config.includePromotion && (
                <div className="animate-fade-in">
                  <label className="label-dark">Current Promotion</label>
                  <input
                    type="text"
                    value={config.promotionText || ""}
                    onChange={(e) => setConfig({ ...config, promotionText: e.target.value })}
                    placeholder="e.g., 20% off on weekdays, Free dessert with dinner"
                    className="input-dark"
                  />
                </div>
              )}
            </section>

            {/* AI Learning */}
            <section id="learning" className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">AI Learning</h2>
                  <p className="text-white/50 text-sm">Improve AI with your approved replies</p>
                </div>
              </div>
              
              <label className="flex items-center gap-3 mb-6 cursor-pointer">
                <div 
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    config.learnFromReplies ? "bg-emerald-500" : "bg-white/20"
                  }`}
                  onClick={() => setConfig({ ...config, learnFromReplies: !config.learnFromReplies })}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    config.learnFromReplies ? "translate-x-6" : "translate-x-1"
                  }`}></div>
                </div>
                <span className="text-sm text-white/80">
                  Learn from my approved and edited replies to improve future suggestions
                </span>
              </label>

              {examples.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-white/80">
                      Recent Reply Examples
                    </h3>
                    <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded-full">
                      {examples.length} examples
                    </span>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
                    {examples.map((example) => (
                      <div key={example.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-4 h-4 flex-shrink-0 ${i < example.reviewRating ? "text-amber-400" : "text-white/20"}`}
                                  width="16"
                                  height="16"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            {example.wasEdited && (
                              <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">
                                Edited
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => deleteExample(example.id)}
                            className="text-red-400 hover:text-red-300 text-xs hover:bg-red-500/10 px-2 py-1 rounded transition"
                          >
                            Delete
                          </button>
                        </div>
                        <p className="text-white/50 text-xs mb-2 line-clamp-2">
                          <span className="text-white/70">Review:</span> {example.reviewText}
                        </p>
                        <p className="text-white/80 text-xs line-clamp-2">
                          <span className="text-emerald-400">Reply:</span> {example.finalReply}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Save Button (Mobile) */}
            <div className="lg:hidden flex justify-end pt-4">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save AI Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

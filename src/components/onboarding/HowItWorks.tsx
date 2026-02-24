"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface HowItWorksProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function HowItWorks({ onClose, showCloseButton = true }: HowItWorksProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Connect Your Accounts",
      description: "Link your Telegram to receive instant alerts and connect Google Business Profile to sync your locations automatically.",
      image: "🔗",
      color: "violet",
    },
    {
      title: "Add Your Locations",
      description: "Add your business locations from Google Maps. You can sync them automatically from Google Business Profile or add them manually using a Maps URL.",
      image: "📍",
      color: "blue",
    },
    {
      title: "Receive Review Alerts",
      description: "When customers leave reviews, you'll get instant Telegram notifications with AI-generated reply suggestions.",
      image: "🔔",
      color: "amber",
    },
    {
      title: "Respond with One Tap",
      description: "Review the AI-suggested reply, edit if needed, and approve to post directly to Google - all from Telegram!",
      image: "✨",
      color: "emerald",
    },
  ];

  const colors: Record<string, { bg: string; border: string; text: string }> = {
    violet: { bg: "bg-violet-500/20", border: "border-violet-500/30", text: "text-violet-400" },
    blue: { bg: "bg-blue-500/20", border: "border-blue-500/30", text: "text-blue-400" },
    amber: { bg: "bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-400" },
    emerald: { bg: "bg-emerald-500/20", border: "border-emerald-500/30", text: "text-emerald-400" },
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold">How It Works</h3>
            <p className="text-white/60 text-sm">Quick overview of the app</p>
          </div>
        </div>
        {showCloseButton && onClose && (
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Current Step */}
        <div className={`${colors[steps[currentStep].color].bg} ${colors[steps[currentStep].color].border} border rounded-xl p-6 mb-4 text-center`}>
          <div className="text-5xl mb-4">{steps[currentStep].image}</div>
          <h4 className={`text-lg font-semibold ${colors[steps[currentStep].color].text} mb-2`}>
            {steps[currentStep].title}
          </h4>
          <p className="text-white/70 text-sm leading-relaxed">
            {steps[currentStep].description}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                index === currentStep 
                  ? "w-8 bg-violet-500" 
                  : "bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          
          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => {
                onClose?.();
                router.push("/dashboard/settings");
              }}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg transition-all"
            >
              Get Started →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

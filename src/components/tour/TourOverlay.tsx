"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTour } from "./TourContext";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function TourOverlay() {
  const { isActive, currentStep, steps, totalSteps, nextStep, prevStep, skipTour } =
    useTour();
  const [rect, setRect] = useState<Rect | null>(null);

  /* ── keep the highlight rect in sync ────────────────────────────── */
  const refresh = useCallback(() => {
    if (!isActive || !steps[currentStep]) {
      setRect(null);
      return;
    }
    const el = document.querySelector(
      `[data-tour="${steps[currentStep].target}"]`
    );
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      setRect(null);
    }
  }, [isActive, currentStep, steps]);

  useEffect(() => {
    refresh();
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);
    return () => {
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [refresh]);

  /* ── nothing to render ──────────────────────────────────────────── */
  if (!isActive || !steps[currentStep]) return null;

  const step = steps[currentStep];
  const pos = step.position || "bottom";
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  /* ── tooltip position (fixed, viewport-relative) ────────────────── */
  const gap = 16;
  const tooltipW = 320;

  const tooltipStyle = (): React.CSSProperties => {
    if (!rect)
      return { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };

    switch (pos) {
      case "right":
        return {
          top: rect.top + rect.height / 2,
          left: rect.left + rect.width + gap,
          transform: "translateY(-50%)",
          maxWidth: tooltipW,
        };
      case "left":
        return {
          top: rect.top + rect.height / 2,
          left: rect.left - gap,
          transform: "translate(-100%,-50%)",
          maxWidth: tooltipW,
        };
      case "top":
        return {
          top: rect.top - gap,
          left: rect.left + rect.width / 2,
          transform: "translate(-50%,-100%)",
          maxWidth: tooltipW,
        };
      case "bottom":
      default:
        return {
          top: rect.top + rect.height + gap,
          left: rect.left + rect.width / 2,
          transform: "translateX(-50%)",
          maxWidth: tooltipW,
        };
    }
  };

  /* ── arrow (inline styles so Tailwind JIT isn't needed) ─────────── */
  const arrowStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: "absolute",
      width: 0,
      height: 0,
      borderWidth: 8,
      borderStyle: "solid",
    };
    // Arrow points TOWARD the target, so it sits on the side closest to it.
    switch (pos) {
      case "right":
        return {
          ...base,
          left: -16,
          top: "50%",
          transform: "translateY(-50%)",
          borderColor: "transparent rgb(30 41 59) transparent transparent",
        };
      case "left":
        return {
          ...base,
          right: -16,
          top: "50%",
          transform: "translateY(-50%)",
          borderColor: "transparent transparent transparent rgb(30 41 59)",
        };
      case "top":
        return {
          ...base,
          bottom: -16,
          left: "50%",
          transform: "translateX(-50%)",
          borderColor: "rgb(30 41 59) transparent transparent transparent",
        };
      case "bottom":
      default:
        return {
          ...base,
          top: -16,
          left: "50%",
          transform: "translateX(-50%)",
          borderColor: "transparent transparent rgb(30 41 59) transparent",
        };
    }
  };

  /* ── render ─────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Dark overlay with cutout */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="tour-spotlight">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - 6}
                y={rect.top - 6}
                width={rect.width + 12}
                height={rect.height + 12}
                rx={10}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#tour-spotlight)"
        />
      </svg>

      {/* Glow ring around target */}
      {rect && (
        <div
          className="fixed rounded-xl border-2 border-violet-500 pointer-events-none transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 4px rgba(139,92,246,0.3), 0 0 24px rgba(139,92,246,0.15)",
          }}
        />
      )}

      {/* Click-shield (blocks interactions outside tooltip) */}
      <div className="fixed inset-0" onClick={skipTour} />

      {/* ── Tooltip ──────────────────────────────────────────────── */}
      <div
        className="fixed bg-slate-800 border border-white/20 rounded-2xl shadow-2xl shadow-black/50 p-5 z-[10000]"
        style={{ ...tooltipStyle(), width: tooltipW }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow */}
        <div style={arrowStyle()} />

        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-violet-400 bg-violet-500/20 px-2.5 py-1 rounded-full">
            {currentStep + 1} of {totalSteps}
          </span>
          <button
            onClick={skipTour}
            className="text-white/40 hover:text-white/70 transition-colors text-xs"
          >
            Skip tour
          </button>
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-white mb-1.5">{step.title}</h3>
        <p className="text-white/60 text-sm leading-relaxed mb-5">
          {step.description}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={isFirst}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              isFirst
                ? "text-white/20 cursor-not-allowed"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Previous
          </button>

          <button
            onClick={nextStep}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/25"
          >
            {isLast ? "Finish" : "Next"}
            {!isLast && (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "w-4 bg-violet-400"
                  : i < currentStep
                  ? "w-1.5 bg-violet-400/50"
                  : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

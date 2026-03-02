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
  const { isActive, isNavigating, skipMessage, currentStep, steps, totalSteps, nextStep, prevStep, skipTour } =
    useTour();
  const [rect, setRect] = useState<Rect | null>(null);

  /* ── pick the first *visible* match (non-zero size) ─────────────── */
  const findVisible = useCallback((selector: string): Element | null => {
    const all = document.querySelectorAll(selector);
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
    return null;
  }, []);

  /* ── keep the highlight rect in sync ────────────────────────────── */
  const refresh = useCallback(() => {
    if (!isActive || !steps[currentStep]) {
      setRect(null);
      return;
    }
    const el = findVisible(
      `[data-tour="${steps[currentStep].target}"]`
    );
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      setRect(null);
    }
  }, [isActive, currentStep, steps, findVisible]);

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
  if (!isActive) return null;

  /* ── show loading spinner while navigating between pages ────────── */
  if (isNavigating || !steps[currentStep]) {
    return (
      <div className="fixed inset-0 z-[9999]">
        <div className="fixed inset-0 bg-black/60" />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/70 text-sm font-medium">Navigating…</p>
          {skipMessage && (
            <p className="text-violet-300 text-xs font-medium bg-violet-500/20 border border-violet-500/30 px-3 py-1.5 rounded-lg mt-1 animate-pulse">
              {skipMessage}
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ── skip-reason toast (can appear briefly over a normal step too) ── */
  const skipToast = skipMessage ? (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001] px-4 py-2 bg-slate-800 border border-violet-500/30 rounded-xl shadow-lg">
      <p className="text-violet-300 text-xs font-medium">{skipMessage}</p>
    </div>
  ) : null;

  const step = steps[currentStep];
  const pos = step.position || "bottom";
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  /* ── tooltip position (fixed, viewport-clamped) ──────────────────
     We compute final top/left in pixels so the tooltip never
     overflows outside the viewport.                                  */
  const gap = 16;
  const tooltipW = 320;
  const tooltipH = 240; // estimated max height
  const pad = 12; // min distance from viewport edge

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  const tooltipStyle = (): React.CSSProperties => {
    if (!rect)
      return { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = 0;
    let left = 0;

    switch (pos) {
      case "right":
        top = rect.top + rect.height / 2 - tooltipH / 2;
        left = rect.left + rect.width + gap;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipH / 2;
        left = rect.left - gap - tooltipW;
        break;
      case "top":
        top = rect.top - gap - tooltipH;
        left = rect.left + rect.width / 2 - tooltipW / 2;
        break;
      case "bottom":
      default:
        top = rect.top + rect.height + gap;
        left = rect.left + rect.width / 2 - tooltipW / 2;
        break;
    }

    // If tooltip doesn't fit on the preferred side, flip it
    if (pos === "right" && left + tooltipW > vw - pad) {
      left = rect.left - gap - tooltipW;
    } else if (pos === "left" && left < pad) {
      left = rect.left + rect.width + gap;
    } else if (pos === "top" && top < pad) {
      top = rect.top + rect.height + gap;
    } else if (pos === "bottom" && top + tooltipH > vh - pad) {
      top = rect.top - gap - tooltipH;
    }

    // Final clamp so it never escapes the viewport
    top = clamp(top, pad, vh - tooltipH - pad);
    left = clamp(left, pad, vw - tooltipW - pad);

    return { top, left, width: tooltipW };
  };

  /* ── arrow direction based on actual tooltip vs target position ── */
  const arrowStyle = (): React.CSSProperties => {
    if (!rect) return { display: "none" };

    const base: React.CSSProperties = {
      position: "absolute",
      width: 0,
      height: 0,
      borderWidth: 8,
      borderStyle: "solid",
    };

    const ts = tooltipStyle();
    const tTop = typeof ts.top === "number" ? ts.top : 0;
    const tLeft = typeof ts.left === "number" ? ts.left : 0;

    const targetCX = rect.left + rect.width / 2;
    const targetCY = rect.top + rect.height / 2;

    // Determine which edge the tooltip is on relative to the target
    const isToRight = tLeft > rect.left + rect.width / 2;
    const isToLeft = tLeft + tooltipW < rect.left + rect.width / 2;
    const isBelow = tTop > rect.top + rect.height / 2;

    if (!isToRight && !isToLeft) {
      // tooltip is horizontally aligned → arrow top or bottom
      if (isBelow) {
        // tooltip below target → arrow on top edge
        const arrowLeft = clamp(targetCX - tLeft, 20, tooltipW - 20);
        return { ...base, top: -16, left: arrowLeft, borderColor: "transparent transparent rgb(30 41 59) transparent" };
      } else {
        // tooltip above target → arrow on bottom edge
        const arrowLeft = clamp(targetCX - tLeft, 20, tooltipW - 20);
        return { ...base, bottom: -16, left: arrowLeft, borderColor: "rgb(30 41 59) transparent transparent transparent" };
      }
    } else if (isToRight) {
      // tooltip is to the right → arrow on left edge pointing left
      const arrowTop = clamp(targetCY - tTop, 20, tooltipH - 20);
      return { ...base, left: -16, top: arrowTop, borderColor: "transparent rgb(30 41 59) transparent transparent" };
    } else {
      // tooltip is to the left → arrow on right edge pointing right
      const arrowTop = clamp(targetCY - tTop, 20, tooltipH - 20);
      return { ...base, right: -16, top: arrowTop, borderColor: "transparent transparent transparent rgb(30 41 59)" };
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

      {/* Skip-reason toast */}
      {skipToast}
    </div>
  );
}

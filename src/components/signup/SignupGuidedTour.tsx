import { useEffect, useState, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

export interface TourStep {
  selector: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
}

interface SignupGuidedTourProps {
  steps: TourStep[];
  storageKey: string;
  /** External trigger to (re)start the tour */
  runKey?: number;
  onClose?: () => void;
}

const PADDING = 8;

const SignupGuidedTour = ({ steps, storageKey, runKey, onClose }: SignupGuidedTourProps) => {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Auto start once per user
  useEffect(() => {
    const seen = typeof window !== "undefined" && localStorage.getItem(storageKey);
    if (!seen) {
      const t = setTimeout(() => {
        setIndex(0);
        setActive(true);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  // External restart
  useEffect(() => {
    if (runKey !== undefined && runKey > 0) {
      setIndex(0);
      setActive(true);
    }
  }, [runKey]);

  const step = active ? steps[index] : null;

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      // Wait a tick for scroll
      requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        setRect(r);
      });
    } else {
      setRect(null);
    }
  }, [step]);

  useLayoutEffect(() => {
    measure();
  }, [measure, index, active]);

  useEffect(() => {
    if (!active) return;
    const handler = () => measure();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    const interval = setInterval(measure, 400);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
      clearInterval(interval);
    };
  }, [active, measure]);

  const finish = () => {
    setActive(false);
    localStorage.setItem(storageKey, "1");
    onClose?.();
  };

  const next = () => {
    if (index < steps.length - 1) setIndex(index + 1);
    else finish();
  };

  const prev = () => {
    if (index > 0) setIndex(index - 1);
  };

  if (!active || !step) return null;

  // Compute tooltip position
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tooltipW = Math.min(320, vw - 32);
  const tooltipH = 180;

  let top = 80;
  let left = 16;

  if (rect) {
    const placement =
      step.placement ||
      (rect.right + tooltipW + 24 < vw
        ? "right"
        : rect.left - tooltipW - 24 > 0
        ? "left"
        : rect.bottom + tooltipH + 24 < vh
        ? "bottom"
        : "top");

    switch (placement) {
      case "right":
        top = Math.max(16, Math.min(vh - tooltipH - 16, rect.top + rect.height / 2 - tooltipH / 2));
        left = rect.right + 16;
        break;
      case "left":
        top = Math.max(16, Math.min(vh - tooltipH - 16, rect.top + rect.height / 2 - tooltipH / 2));
        left = Math.max(16, rect.left - tooltipW - 16);
        break;
      case "bottom":
        top = rect.bottom + 16;
        left = Math.max(16, Math.min(vw - tooltipW - 16, rect.left + rect.width / 2 - tooltipW / 2));
        break;
      case "top":
        top = Math.max(16, rect.top - tooltipH - 16);
        left = Math.max(16, Math.min(vw - tooltipW - 16, rect.left + rect.width / 2 - tooltipW / 2));
        break;
    }
  } else {
    // Center if no element found
    top = vh / 2 - tooltipH / 2;
    left = vw / 2 - tooltipW / 2;
  }

  const spotlight = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dark overlay with spotlight cutout */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{
          background: "rgba(2, 6, 23, 0.72)",
          clipPath: spotlight
            ? `polygon(
                0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                ${spotlight.left}px ${spotlight.top}px,
                ${spotlight.left}px ${spotlight.top + spotlight.height}px,
                ${spotlight.left + spotlight.width}px ${spotlight.top + spotlight.height}px,
                ${spotlight.left + spotlight.width}px ${spotlight.top}px,
                ${spotlight.left}px ${spotlight.top}px
              )`
            : undefined,
          transition: "clip-path 0.25s ease",
        }}
        onClick={finish}
      />

      {/* Highlight ring */}
      {spotlight && (
        <div
          className="absolute rounded-xl ring-2 ring-cyan-400 shadow-[0_0_0_4px_rgba(34,211,238,0.25)] animate-pulse pointer-events-none"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            transition: "all 0.25s ease",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute pointer-events-auto bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4"
        style={{ top, left, width: tooltipW }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {step.title}
            </div>
          </div>
          <button
            onClick={finish}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
          {step.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Step {index + 1} of {steps.length}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button size="sm" variant="ghost" onClick={prev} className="h-7 px-2 text-xs">
                <ArrowLeft className="h-3 w-3 mr-1" /> Back
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={finish} className="h-7 px-2 text-xs">
              Skip
            </Button>
            <Button
              size="sm"
              onClick={next}
              className="h-7 px-3 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white"
            >
              {index === steps.length - 1 ? "Done" : "Next"}
              {index !== steps.length - 1 && <ArrowRight className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SignupGuidedTour;

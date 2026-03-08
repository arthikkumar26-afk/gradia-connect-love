import { useState, useEffect, useRef } from "react";
import { MessageCircle } from "lucide-react";

interface ChatbotAnimatedEntryProps {
  onClick: () => void;
}

const ChatbotAnimatedEntry = ({ onClick }: ChatbotAnimatedEntryProps) => {
  const [phase, setPhase] = useState<"walk" | "shake" | "bubble" | "collapse" | "button">("walk");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("shake"), 1400);
    const t2 = setTimeout(() => setPhase("bubble"), 2600);
    const t3 = setTimeout(() => setPhase("collapse"), 4600);
    const t4 = setTimeout(() => setPhase("button"), 5400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  if (phase === "button") {
    return (
      <button
        onClick={onClick}
        className="fixed bottom-6 right-6 z-[998] w-14 h-14 rounded-full bg-gradient-to-br from-[hsl(210,60%,25%)] to-[hsl(175,50%,40%)] text-white shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center"
        aria-label="Open chat"
        style={{
          animation: "chatEntryPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  const isWalking = phase === "walk";
  const showBubble = phase === "bubble";
  const isCollapsing = phase === "collapse";

  return (
    <>
      <style>{`
        @keyframes chatEntryPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes walkBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes sparkleFloat {
          0% { opacity: 0; transform: scale(0) translateY(0); }
          30% { opacity: 1; transform: scale(1) translateY(-2px); }
          100% { opacity: 0; transform: scale(0.5) translateY(-8px); }
        }
        @keyframes bubbleIn {
          0% { opacity: 0; transform: translateY(8px) scale(0.6); }
          50% { opacity: 1; transform: translateY(-2px) scale(1.03); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes collapseScene {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.3); }
        }
        .walk-left {
          transition: transform 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .walk-right {
          transition: transform 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .arm-transition {
          transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
      <div
        ref={containerRef}
        className="fixed bottom-6 right-6 z-[998] flex flex-col items-center"
        style={isCollapsing ? {
          animation: "collapseScene 0.8s cubic-bezier(0.55, 0, 1, 0.45) forwards",
        } : undefined}
      >
        {/* Chat bubble */}
        <div
          className="mb-1.5 bg-gradient-to-r from-[hsl(210,60%,20%)] to-[hsl(175,50%,35%)] text-white text-[11px] font-medium px-3 py-1.5 rounded-full shadow-lg"
          style={{
            animation: showBubble ? "bubbleIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both" : undefined,
            opacity: showBubble || isCollapsing ? undefined : 0,
            pointerEvents: "none",
          }}
        >
          ✨ Hi! Let's connect.
        </div>

        {/* Characters scene */}
        <div className="w-[110px] h-[65px] relative overflow-hidden">
          <svg viewBox="0 0 110 65" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="suitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(210, 60%, 28%)" />
                <stop offset="100%" stopColor="hsl(210, 60%, 18%)" />
              </linearGradient>
              <linearGradient id="casualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(175, 45%, 35%)" />
                <stop offset="100%" stopColor="hsl(175, 45%, 25%)" />
              </linearGradient>
              <filter id="softShadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.15" />
              </filter>
            </defs>

            {/* Businessman (left) */}
            <g
              className="walk-left"
              style={{
                transform: isWalking ? "translateX(-45px)" : "translateX(0px)",
                animation: isWalking ? "walkBounce 0.4s ease-in-out infinite" : undefined,
              }}
              filter="url(#softShadow)"
            >
              {/* Head */}
              <circle cx="42" cy="18" r="6.5" fill="hsl(30, 30%, 78%)" />
              {/* Hair */}
              <path d="M35.5 16 Q42 10 48.5 16" fill="hsl(210, 30%, 20%)" />
              {/* Body - suit */}
              <rect x="35" y="25" width="14" height="17" rx="3" fill="url(#suitGrad)" />
              {/* Lapels */}
              <path d="M39 25 L42 30 L45 25" fill="none" stroke="hsl(210, 40%, 35%)" strokeWidth="0.6" />
              {/* Tie */}
              <polygon points="42,26 40.5,34 42,36 43.5,34" fill="hsl(175, 50%, 40%)" opacity="0.9" />
              {/* Legs */}
              <line x1="39" y1="42" x2="38" y2="55" stroke="hsl(210, 40%, 15%)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="45" y1="42" x2="46" y2="55" stroke="hsl(210, 40%, 15%)" strokeWidth="2.5" strokeLinecap="round" />
              {/* Shoes */}
              <ellipse cx="37" cy="56" rx="3" ry="1.5" fill="hsl(210, 30%, 12%)" />
              <ellipse cx="47" cy="56" rx="3" ry="1.5" fill="hsl(210, 30%, 12%)" />
              {/* Arm */}
              <line
                x1="49" y1="28"
                x2={!isWalking ? "55" : "51"}
                y2={!isWalking ? "34" : "38"}
                stroke="url(#suitGrad)" strokeWidth="2.5" strokeLinecap="round"
                className="arm-transition"
              />
              {/* Hand */}
              <circle
                cx={!isWalking ? "55" : "51"}
                cy={!isWalking ? "34" : "38"}
                r="2"
                fill="hsl(30, 30%, 75%)"
                className="arm-transition"
              />
            </g>

            {/* Professional (right) */}
            <g
              className="walk-right"
              style={{
                transform: isWalking ? "translateX(45px)" : "translateX(0px)",
                animation: isWalking ? "walkBounce 0.4s ease-in-out 0.2s infinite" : undefined,
              }}
              filter="url(#softShadow)"
            >
              {/* Head */}
              <circle cx="68" cy="18" r="6.5" fill="hsl(25, 35%, 72%)" />
              {/* Hair */}
              <path d="M61.5 15 Q68 9 74.5 15 Q74 18 72 17 Q68 13 64 17 Q62 18 61.5 15Z" fill="hsl(20, 25%, 22%)" />
              {/* Body */}
              <rect x="61" y="25" width="14" height="17" rx="3" fill="url(#casualGrad)" />
              {/* Collar / shirt detail */}
              <path d="M64 25 L68 29 L72 25" fill="none" stroke="hsl(175, 30%, 55%)" strokeWidth="0.8" />
              {/* Button */}
              <circle cx="68" cy="31" r="0.8" fill="hsl(175, 30%, 55%)" />
              {/* Legs */}
              <line x1="64" y1="42" x2="63" y2="55" stroke="hsl(210, 20%, 22%)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="72" y1="42" x2="73" y2="55" stroke="hsl(210, 20%, 22%)" strokeWidth="2.5" strokeLinecap="round" />
              {/* Shoes */}
              <ellipse cx="62" cy="56" rx="3" ry="1.5" fill="hsl(25, 20%, 18%)" />
              <ellipse cx="74" cy="56" rx="3" ry="1.5" fill="hsl(25, 20%, 18%)" />
              {/* Arm */}
              <line
                x1="61" y1="28"
                x2={!isWalking ? "55" : "59"}
                y2={!isWalking ? "34" : "38"}
                stroke="url(#casualGrad)" strokeWidth="2.5" strokeLinecap="round"
                className="arm-transition"
              />
              {/* Hand */}
              <circle
                cx={!isWalking ? "55" : "59"}
                cy={!isWalking ? "34" : "38"}
                r="2"
                fill="hsl(25, 35%, 70%)"
                className="arm-transition"
              />
            </g>

            {/* Handshake sparkles */}
            {(phase === "shake" || showBubble) && (
              <>
                <circle cx="55" cy="32" r="1.8" fill="hsl(175, 60%, 55%)"
                  style={{ animation: "sparkleFloat 1.2s ease-out infinite" }} />
                <circle cx="52" cy="28" r="1.2" fill="hsl(210, 50%, 55%)"
                  style={{ animation: "sparkleFloat 1.2s ease-out 0.3s infinite" }} />
                <circle cx="58" cy="28" r="1.2" fill="hsl(175, 60%, 55%)"
                  style={{ animation: "sparkleFloat 1.2s ease-out 0.6s infinite" }} />
                <circle cx="55" cy="25" r="0.8" fill="hsl(45, 60%, 65%)"
                  style={{ animation: "sparkleFloat 1.4s ease-out 0.15s infinite" }} />
              </>
            )}
          </svg>
        </div>
      </div>
    </>
  );
};

export default ChatbotAnimatedEntry;

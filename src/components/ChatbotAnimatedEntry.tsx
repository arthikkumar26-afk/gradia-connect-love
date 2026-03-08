import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";

interface ChatbotAnimatedEntryProps {
  onClick: () => void;
}

const ChatbotAnimatedEntry = ({ onClick }: ChatbotAnimatedEntryProps) => {
  const [phase, setPhase] = useState<"walk" | "shake" | "bubble" | "button">("walk");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("shake"), 1200);
    const t2 = setTimeout(() => setPhase("bubble"), 2200);
    const t3 = setTimeout(() => setPhase("button"), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === "button") {
    return (
      <button
        onClick={onClick}
        className="fixed bottom-6 right-6 z-[998] w-14 h-14 rounded-full bg-gradient-to-br from-[hsl(210,60%,25%)] to-[hsl(175,50%,40%)] text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center animate-scale-in"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[998] flex flex-col items-center">
      {/* Chat bubble */}
      <div
        className={`mb-2 bg-gradient-to-r from-[hsl(210,60%,20%)] to-[hsl(175,50%,35%)] text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg transition-all duration-500 ${
          phase === "bubble" ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-75"
        }`}
      >
        Hi! Let's connect.
      </div>

      {/* Characters scene */}
      <div className="w-[100px] h-[60px] relative overflow-hidden">
        <svg viewBox="0 0 100 60" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Businessman (left) */}
          <g
            className="transition-transform ease-out"
            style={{
              transform: phase === "walk" ? "translateX(-40px)" : "translateX(0px)",
              transitionDuration: "1.2s",
            }}
          >
            {/* Head */}
            <circle cx="38" cy="18" r="6" fill="hsl(210, 40%, 70%)" />
            {/* Body - suit */}
            <rect x="32" y="24" width="12" height="16" rx="2" fill="hsl(210, 60%, 22%)" />
            {/* Tie */}
            <line x1="38" y1="25" x2="38" y2="34" stroke="hsl(175, 50%, 40%)" strokeWidth="1.5" />
            {/* Legs */}
            <line x1="35" y1="40" x2="34" y2="52" stroke="hsl(210, 50%, 18%)" strokeWidth="2" strokeLinecap="round" />
            <line x1="41" y1="40" x2="42" y2="52" stroke="hsl(210, 50%, 18%)" strokeWidth="2" strokeLinecap="round" />
            {/* Arm reaching for handshake */}
            <line
              x1="44" y1="28" x2={phase !== "walk" ? "50" : "46"} y2={phase !== "walk" ? "32" : "36"}
              stroke="hsl(210, 60%, 22%)" strokeWidth="2" strokeLinecap="round"
              className="transition-all duration-500"
            />
          </g>

          {/* Professional (right) */}
          <g
            className="transition-transform ease-out"
            style={{
              transform: phase === "walk" ? "translateX(40px)" : "translateX(0px)",
              transitionDuration: "1.2s",
            }}
          >
            {/* Head */}
            <circle cx="62" cy="18" r="6" fill="hsl(175, 30%, 70%)" />
            {/* Body - casual professional */}
            <rect x="56" y="24" width="12" height="16" rx="2" fill="hsl(175, 45%, 30%)" />
            {/* Collar detail */}
            <path d="M59 24 L62 27 L65 24" fill="none" stroke="hsl(175, 30%, 50%)" strokeWidth="0.8" />
            {/* Legs */}
            <line x1="59" y1="40" x2="58" y2="52" stroke="hsl(210, 30%, 25%)" strokeWidth="2" strokeLinecap="round" />
            <line x1="65" y1="40" x2="66" y2="52" stroke="hsl(210, 30%, 25%)" strokeWidth="2" strokeLinecap="round" />
            {/* Arm reaching for handshake */}
            <line
              x1="56" y1="28" x2={phase !== "walk" ? "50" : "54"} y2={phase !== "walk" ? "32" : "36"}
              stroke="hsl(175, 45%, 30%)" strokeWidth="2" strokeLinecap="round"
              className="transition-all duration-500"
            />
          </g>

          {/* Handshake sparkle */}
          {phase === "shake" && (
            <g className="animate-pulse">
              <circle cx="50" cy="30" r="1.5" fill="hsl(175, 60%, 55%)" opacity="0.8" />
              <circle cx="47" cy="27" r="1" fill="hsl(175, 60%, 55%)" opacity="0.5" />
              <circle cx="53" cy="27" r="1" fill="hsl(175, 60%, 55%)" opacity="0.5" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

export default ChatbotAnimatedEntry;

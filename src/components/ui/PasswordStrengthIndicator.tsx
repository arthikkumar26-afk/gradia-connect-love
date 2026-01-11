import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Contains a number", test: (p) => /[0-9]/.test(p) },
  { label: "Contains special character", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };
    
    const passedRequirements = requirements.filter((req) => req.test(password)).length;
    
    if (passedRequirements <= 1) return { score: 1, label: "Weak", color: "bg-destructive" };
    if (passedRequirements === 2) return { score: 2, label: "Fair", color: "bg-orange-500" };
    if (passedRequirements === 3) return { score: 3, label: "Good", color: "bg-yellow-500" };
    if (passedRequirements === 4) return { score: 4, label: "Strong", color: "bg-emerald-500" };
    return { score: 5, label: "Very Strong", color: "bg-emerald-600" };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={`font-medium ${
            strength.score <= 1 ? "text-destructive" :
            strength.score === 2 ? "text-orange-500" :
            strength.score === 3 ? "text-yellow-600" :
            "text-emerald-600"
          }`}>
            {strength.label}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                level <= strength.score ? strength.color : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {requirements.map((req) => {
          const passed = req.test(password);
          return (
            <div
              key={req.label}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                passed ? "text-emerald-600" : "text-muted-foreground"
              }`}
            >
              {passed ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              <span>{req.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

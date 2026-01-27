import { CheckCircle2, Circle, Lock, Mail, Code, Calendar, Monitor, BarChart3, FileText, ListChecks, UserCheck, Video, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterviewStage {
  name: string;
  order: number;
  description: string;
  stageType?: string;
}

interface StageResult {
  stage_order: number;
  completed_at?: string;
  ai_score?: number;
  passed?: boolean;
}

interface InterviewProgressTrackerProps {
  stages: InterviewStage[];
  currentStageOrder: number;
  stageResults: StageResult[];
  className?: string;
}

// Map stage names to icons
const stageIconsByName: Record<string, React.ComponentType<{ className?: string }>> = {
  'Resume Screening': FileText,
  'AI Technical Interview': Brain,
  'Technical Assessment': Code,
  'HR Round': UserCheck,
  'Viva': Video,
  'Final Review': ListChecks,
  'Offer Stage': Mail,
};

// Fallback icons by order
const stageIconsByOrder: Record<number, React.ComponentType<{ className?: string }>> = {
  1: FileText,        // Resume Screening
  2: Brain,           // AI Technical Interview
  3: Code,            // Technical Assessment
  4: UserCheck,       // HR Round
  5: Video,           // Viva
  6: ListChecks,      // Final Review
  7: Mail,            // Offer Stage
};

export const InterviewProgressTracker = ({
  stages,
  currentStageOrder,
  stageResults,
  className,
}: InterviewProgressTrackerProps) => {
  const getStageStatus = (stageOrder: number) => {
    const result = stageResults.find((r) => r.stage_order === stageOrder);
    if (result?.completed_at) return "completed";
    if (stageOrder === currentStageOrder) return "current";
    if (stageOrder < currentStageOrder) return "completed";
    return "locked";
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop/Tablet: Horizontal Layout */}
      <div className="hidden md:flex items-start justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" style={{ marginLeft: "2.5rem", marginRight: "2.5rem" }}>
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{
              width: `${Math.max(0, ((currentStageOrder - 1) / (stages.length - 1)) * 100)}%`,
            }}
          />
        </div>

        {stages.map((stage) => {
          const status = getStageStatus(stage.order);
          const Icon = stageIconsByName[stage.name] || stageIconsByOrder[stage.order] || Circle;
          const result = stageResults.find((r) => r.stage_order === stage.order);

          return (
            <div
              key={stage.order}
              className="flex flex-col items-center relative z-10"
              style={{ width: `${100 / stages.length}%` }}
            >
              {/* Circle Indicator */}
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                  status === "completed" && "bg-green-500 border-green-500 text-white",
                  status === "current" && "bg-primary border-primary text-primary-foreground animate-pulse",
                  status === "locked" && "bg-muted border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : status === "locked" ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              {/* Stage Info */}
              <div className="mt-2 text-center px-1">
                <p
                  className={cn(
                    "text-xs font-medium leading-tight",
                    status === "current" && "text-primary",
                    status === "completed" && "text-green-600 dark:text-green-400",
                    status === "locked" && "text-muted-foreground"
                  )}
                >
                  {stage.name}
                </p>
                {result?.ai_score !== undefined && (
                  <span className="text-[10px] text-green-600 font-medium">
                    {result.ai_score.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: Vertical Compact Layout */}
      <div className="md:hidden space-y-2">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage.order);
          const Icon = stageIconsByName[stage.name] || stageIconsByOrder[stage.order] || Circle;
          const result = stageResults.find((r) => r.stage_order === stage.order);
          const isLast = index === stages.length - 1;

          return (
            <div key={stage.order} className="flex items-start gap-3">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 border-2 flex-shrink-0",
                    status === "completed" && "bg-green-500 border-green-500 text-white",
                    status === "current" && "bg-primary border-primary text-primary-foreground",
                    status === "locked" && "bg-muted border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : status === "locked" ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 h-4 mt-1",
                      status === "completed" || stage.order < currentStageOrder
                        ? "bg-green-500"
                        : "bg-muted"
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      status === "current" && "text-primary",
                      status === "completed" && "text-green-600 dark:text-green-400",
                      status === "locked" && "text-muted-foreground"
                    )}
                  >
                    {stage.name}
                  </p>
                  {result?.ai_score !== undefined && (
                    <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                      {result.ai_score.toFixed(0)}%
                    </span>
                  )}
                  {status === "current" && (
                    <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded animate-pulse">
                      Current
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

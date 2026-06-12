import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Play,
  Loader2,
  UserPlus,
  Award,
  Mail,
  Calendar,
  Code,
  Monitor,
  BarChart3,
  FileText,
  ListChecks,
  ArrowLeft,
  Clock,
  Crown,
  Lock,
  Zap
} from "lucide-react";
import { useMockTestLimits } from "@/hooks/useMockTestLimits";
import { useActionPayment } from "@/hooks/useActionPayment";

const stagesList = [
  { order: 1, name: "Interview Instructions", icon: Mail },
  { order: 2, name: "Technical Assessment Slot Booking", icon: Calendar },
  { order: 3, name: "Technical Assessment", icon: Code },
  { order: 4, name: "Demo Slot Booking", icon: Calendar },
  { order: 5, name: "Demo Round", icon: Monitor },
  { order: 6, name: "Demo Feedback", icon: BarChart3 },
  { order: 7, name: "Final Review (HR)", icon: FileText },
  { order: 8, name: "All Reviews", icon: ListChecks },
];

const MockInterviewStart = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const mockTestLimits = useMockTestLimits(user?.id);
  const { startPayment, isProcessing: isPaying } = useActionPayment();

  const handlePayForExtraTest = async () => {
    const ok = await startPayment({
      actionKey: "extra_mock_test",
      userName: profile?.full_name,
      userEmail: profile?.email,
    });
    if (ok) await mockTestLimits.refetch();
  };

  const isNewEmployee = type === "new-employee";
  const title = isNewEmployee ? "New Employee" : "Promotions";

  // Load profile on mount
  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          setProfile(data);
          setProfileLoaded(true);
        });
    }
  }, [user]);

  const sendInterviewInstructionsEmail = async (sessionId: string) => {
    try {
      const { error } = await supabase.functions.invoke("send-mock-interview-invitation", {
        body: {
          candidateEmail: profile?.email,
          candidateName: profile?.full_name,
          sessionId,
          stageOrder: 1,
          stageName: "Interview Instructions",
          stageDescription: "Receive detailed interview process instructions and guidelines via email.",
          appUrl: window.location.origin,
        },
      });
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  };

  const completeInstructionsStage = async (sessionId: string) => {
    try {
      await supabase.from("mock_interview_stage_results").insert({
        session_id: sessionId,
        stage_name: "Interview Instructions",
        stage_order: 1,
        ai_score: 100,
        ai_feedback: "Interview instructions sent successfully via email.",
        passed: true,
        completed_at: new Date().toISOString(),
      });
      await supabase
        .from("mock_interview_sessions")
        .update({ current_stage_order: 2 })
        .eq("id", sessionId);
      return true;
    } catch {
      return false;
    }
  };

  const startMockTest = async () => {
    if (!user || !profile) {
      toast.error("Please complete your profile first");
      return;
    }

    setIsStarting(true);
    try {
      const { data: session, error } = await supabase
        .from("mock_interview_sessions")
        .insert({
          candidate_id: user.id,
          status: "in_progress",
          current_stage_order: 1,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const emailSent = await sendInterviewInstructionsEmail(session.id);

      if (emailSent) {
        await completeInstructionsStage(session.id);
        toast.success("Instructions sent! Book your Technical Assessment slot.");
      } else {
        toast.warning("Mock test started, but email sending failed.");
      }

      // Navigate to the first interview stage (stage 2 since stage 1 is auto-completed)
      navigate(`/candidate/mock-interview/${session.id}/2`);
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error("Failed to start mock test");
    } finally {
      setIsStarting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/candidate/dashboard")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Main Card */}
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              {isNewEmployee ? (
                <UserPlus className="h-8 w-8 text-primary" />
              ) : (
                <Award className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-xl">{title} Interview</CardTitle>
            <CardDescription>
              Complete a comprehensive 8-stage interview simulation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Interview Stages */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground">Interview Stages:</h4>
              <div className="grid gap-2">
                {stagesList.map((stage) => (
                  <div key={stage.order} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <stage.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">
                      {stage.order}. {stage.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Usage Counter */}
            {!mockTestLimits.isLoading && (
              <div className="flex items-center justify-center gap-3 pb-2">
                <Badge variant={mockTestLimits.canStart ? "secondary" : "destructive"} className="gap-1 text-xs">
                  {mockTestLimits.plan === 'elite' ? (
                    <><Crown className="h-3 w-3" /> Unlimited</>
                  ) : (
                    <>{mockTestLimits.usedTests}/{mockTestLimits.maxTests} used this month</>
                  )}
                </Badge>
                <Badge variant="outline" className="gap-1 text-xs capitalize">
                  <Zap className="h-3 w-3" /> {mockTestLimits.plan}
                </Badge>
              </div>
            )}

            {/* Limit Reached Prompt */}
            {!mockTestLimits.isLoading && !mockTestLimits.canStart ? (
              <div className="space-y-3 text-center">
                <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-sm text-muted-foreground">
                  You've used your free mock test for this month. Pay ₹{mockTestLimits.extraTestPrice} to attend another one.
                </p>
                <Button className="w-full gap-2" onClick={handlePayForExtraTest} disabled={isPaying}>
                  {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Pay ₹{mockTestLimits.extraTestPrice} & Attend Mock Test
                </Button>
                <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/candidate/dashboard')}>
                  <Crown className="h-4 w-4" />
                  Or Upgrade Plan
                </Button>
              </div>
            ) : (
              <>
                {/* Start Button */}
                <div className="pt-4">
                  <Button
                    onClick={startMockTest}
                    disabled={isStarting}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isStarting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                    Start Interview
                  </Button>
                </div>

                <div className="flex justify-center">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Clock className="h-3 w-3" />
                    Estimated time: 45-60 minutes
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MockInterviewStart;

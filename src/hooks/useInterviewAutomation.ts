import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useInterviewAutomation = () => {
  const analyzeResume = async (candidateId: string, jobId: string, candidateProfile: any, jobDetails: any, resumeUrl?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-resume', {
        body: { candidateId, jobId, resumeUrl, candidateProfile, jobDetails }
      });
      
      if (error) throw error;
      toast.success("Resume analyzed successfully!");
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze resume");
      throw error;
    }
  };

  const processStage = async (interviewCandidateId: string, action: 'advance' | 'reject' | 'evaluate', feedback?: string, score?: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-interview-stage', {
        body: { interviewCandidateId, action, feedback, score }
      });
      
      if (error) throw error;
      toast.success(data.message || "Stage processed successfully!");
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to process stage");
      throw error;
    }
  };

  const sendInvitation = async (interviewCandidateId: string, stageName: string, scheduledDate: string, meetingLink?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-interview-invitation', {
        body: { interviewCandidateId, stageName, scheduledDate, meetingLink }
      });
      
      if (error) throw error;
      toast.success("Interview invitation sent!");
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
      throw error;
    }
  };

  const generateOfferLetter = async (interviewCandidateId: string, salaryOffered: number, startDate: string, customContent?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-offer-letter', {
        body: { interviewCandidateId, salaryOffered, startDate, customContent }
      });
      
      if (error) throw error;
      toast.success("Offer letter generated and sent!");
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to generate offer letter");
      throw error;
    }
  };

  const autoProgressPipeline = async (interviewCandidateId: string, autoProgressAll: boolean = true) => {
    try {
      const loadingToast = toast.loading("AI is processing interview stages...");
      
      const { data, error } = await supabase.functions.invoke('auto-progress-pipeline', {
        body: { interviewCandidateId, autoProgressAll }
      });
      
      toast.dismiss(loadingToast);
      
      if (error) throw error;
      
      if (data.status === 'completed') {
        toast.success("🎉 " + data.message);
      } else if (data.status === 'rejected') {
        toast.error(data.message);
      } else {
        toast.success(data.message);
      }
      
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to auto-progress pipeline");
      throw error;
    }
  };

  return { analyzeResume, processStage, sendInvitation, generateOfferLetter, autoProgressPipeline };
};

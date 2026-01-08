import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type StatusType = 'shortlisted' | 'interview_scheduled' | 'offer_received' | 'rejected' | 'hired';

interface AdditionalInfo {
  interviewDate?: string;
  interviewType?: string;
  meetingLink?: string;
  salary?: string;
  startDate?: string;
  rejectionReason?: string;
}

export const useStatusNotification = () => {
  const sendStatusNotification = async (
    candidateId: string,
    jobId: string,
    status: StatusType,
    additionalInfo?: AdditionalInfo
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-status-notification', {
        body: {
          candidateId,
          jobId,
          status,
          additionalInfo,
        },
      });

      if (error) {
        console.error('Error sending status notification:', error);
        toast.error("Failed to send notification email");
        return { success: false, error };
      }

      console.log('Status notification sent:', data);
      toast.success("Notification email sent to candidate");
      return { success: true, data };
    } catch (error) {
      console.error('Error invoking status notification:', error);
      toast.error("Failed to send notification email");
      return { success: false, error };
    }
  };

  const notifyShortlisted = (candidateId: string, jobId: string) => 
    sendStatusNotification(candidateId, jobId, 'shortlisted');

  const notifyInterviewScheduled = (
    candidateId: string, 
    jobId: string, 
    interviewDate: string,
    interviewType?: string,
    meetingLink?: string
  ) => sendStatusNotification(candidateId, jobId, 'interview_scheduled', {
    interviewDate,
    interviewType,
    meetingLink,
  });

  const notifyOfferReceived = (
    candidateId: string,
    jobId: string,
    salary?: string,
    startDate?: string
  ) => sendStatusNotification(candidateId, jobId, 'offer_received', {
    salary,
    startDate,
  });

  const notifyRejected = (
    candidateId: string,
    jobId: string,
    rejectionReason?: string
  ) => sendStatusNotification(candidateId, jobId, 'rejected', {
    rejectionReason,
  });

  const notifyHired = (candidateId: string, jobId: string) => 
    sendStatusNotification(candidateId, jobId, 'hired');

  return {
    sendStatusNotification,
    notifyShortlisted,
    notifyInterviewScheduled,
    notifyOfferReceived,
    notifyRejected,
    notifyHired,
  };
};
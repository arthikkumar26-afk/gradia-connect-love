import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, Link2, Users, Mail, Loader2, Video } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ManualInterviewScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  interviewCandidateId: string;
  stageName: string;
  onSuccess?: () => void;
}

export const ManualInterviewScheduleModal = ({
  isOpen,
  onClose,
  candidateName,
  candidateEmail,
  jobTitle,
  interviewCandidateId,
  stageName,
  onSuccess,
}: ManualInterviewScheduleModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    interviewLink: '',
    scheduleDate: '',
    scheduleTime: '',
    panelAttendeeEmails: '',
    assessmentMemberEmails: '',
    additionalNotes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.scheduleDate || !formData.scheduleTime) {
      toast.error('Please fill in date and time');
      return;
    }

    if (!formData.interviewLink) {
      toast.error('Please provide an interview link');
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      const scheduledAt = new Date(`${formData.scheduleDate}T${formData.scheduleTime}`).toISOString();

      // Parse email lists
      const panelEmails = formData.panelAttendeeEmails
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);
      
      const assessmentEmails = formData.assessmentMemberEmails
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);

      // Call the edge function to send invitation
      const { data, error } = await supabase.functions.invoke('send-interview-invitation', {
        body: {
          interviewCandidateId,
          stageName,
          scheduledDate: scheduledAt,
          meetingLink: formData.interviewLink,
          isManualInterview: true,
          panelAttendeeEmails: panelEmails,
          assessmentMemberEmails: assessmentEmails,
          additionalNotes: formData.additionalNotes,
        },
      });

      if (error) throw error;

      toast.success(`Interview scheduled and invitation sent to ${candidateName}`);
      
      // Reset form
      setFormData({
        interviewLink: '',
        scheduleDate: '',
        scheduleTime: '',
        panelAttendeeEmails: '',
        assessmentMemberEmails: '',
        additionalNotes: '',
      });
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error scheduling interview:', error);
      toast.error(error.message || 'Failed to schedule interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Schedule Manual Interview
          </DialogTitle>
          <DialogDescription>
            Schedule a panel interview for <strong>{candidateName}</strong> - {stageName} round for {jobTitle}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Interview Link */}
          <div className="space-y-2">
            <Label htmlFor="interviewLink" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Interview Link *
            </Label>
            <Input
              id="interviewLink"
              type="url"
              value={formData.interviewLink}
              onChange={(e) => setFormData({ ...formData, interviewLink: e.target.value })}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              required
            />
            <p className="text-xs text-muted-foreground">
              Google Meet, Zoom, or any video conferencing link
            </p>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduleDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date *
              </Label>
              <Input
                id="scheduleDate"
                type="date"
                value={formData.scheduleDate}
                onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduleTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time *
              </Label>
              <Input
                id="scheduleTime"
                type="time"
                value={formData.scheduleTime}
                onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Panel Attendee Emails */}
          <div className="space-y-2">
            <Label htmlFor="panelAttendeeEmails" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Panel Attendee Emails
            </Label>
            <Input
              id="panelAttendeeEmails"
              type="text"
              value={formData.panelAttendeeEmails}
              onChange={(e) => setFormData({ ...formData, panelAttendeeEmails: e.target.value })}
              placeholder="interviewer1@company.com, interviewer2@company.com"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of panel member emails who will attend the interview
            </p>
          </div>

          {/* Assessment Member Emails */}
          <div className="space-y-2">
            <Label htmlFor="assessmentMemberEmails" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Assessment Member Emails
            </Label>
            <Input
              id="assessmentMemberEmails"
              type="text"
              value={formData.assessmentMemberEmails}
              onChange={(e) => setFormData({ ...formData, assessmentMemberEmails: e.target.value })}
              placeholder="assessor1@company.com, assessor2@company.com"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of assessment team member emails for evaluation
            </p>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Notes</Label>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
              placeholder="Any special instructions or topics to be covered..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Schedule & Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ManualInterviewScheduleModal;

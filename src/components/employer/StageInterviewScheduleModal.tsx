import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, Link2, Users, Mail, Loader2, Video, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface StageInterviewScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  interviewCandidateId: string;
  stageId: string;
  stageName: string;
  onSuccess?: () => void;
}

export const StageInterviewScheduleModal = ({
  isOpen,
  onClose,
  candidateName,
  candidateEmail,
  jobTitle,
  interviewCandidateId,
  stageId,
  stageName,
  onSuccess,
}: StageInterviewScheduleModalProps) => {
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

      // Create or update interview event
      const { data: existingEvent } = await supabase
        .from('interview_events')
        .select('id')
        .eq('interview_candidate_id', interviewCandidateId)
        .eq('stage_id', stageId)
        .single();

      if (existingEvent) {
        // Update existing event
        const { error: updateError } = await supabase
          .from('interview_events')
          .update({
            scheduled_at: scheduledAt,
            status: 'pending',
            notes: formData.additionalNotes || null,
          })
          .eq('id', existingEvent.id);

        if (updateError) throw updateError;

        // Update invitation
        await supabase
          .from('interview_invitations')
          .update({
            meeting_link: formData.interviewLink,
          })
          .eq('interview_event_id', existingEvent.id);
      } else {
        // Create new event
        const { data: newEvent, error: createError } = await supabase
          .from('interview_events')
          .insert({
            interview_candidate_id: interviewCandidateId,
            stage_id: stageId,
            scheduled_at: scheduledAt,
            status: 'pending',
            notes: formData.additionalNotes || null,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Create invitation
        const { error: inviteError } = await supabase
          .from('interview_invitations')
          .insert({
            interview_event_id: newEvent.id,
            meeting_link: formData.interviewLink,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });

        if (inviteError) throw inviteError;
      }

      // Update candidate's current stage
      await supabase
        .from('interview_candidates')
        .update({
          current_stage_id: stageId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', interviewCandidateId);

      // Call the edge function to send invitation emails
      const { error: emailError } = await supabase.functions.invoke('send-interview-invitation', {
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

      if (emailError) {
        console.warn('Email sending failed:', emailError);
        toast.warning('Interview scheduled but email notification failed');
      } else {
        toast.success(`Interview scheduled and invitation sent to ${candidateName}`);
      }
      
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
            Schedule Interview - {stageName}
          </DialogTitle>
          <DialogDescription>
            Schedule interview for <strong>{candidateName}</strong> for the {stageName} stage ({jobTitle})
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
              Google Meet, Zoom, Microsoft Teams, or any video conferencing link
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
              Comma-separated list of panel members who will conduct the interview
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
              Comma-separated list of assessment team members for evaluation purposes
            </p>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Notes / Instructions</Label>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
              placeholder="Topics to cover, special instructions, assessment criteria..."
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
                  <Send className="h-4 w-4 mr-2" />
                  Schedule & Send Invites
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StageInterviewScheduleModal;

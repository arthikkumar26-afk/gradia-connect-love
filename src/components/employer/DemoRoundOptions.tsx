import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Video, Link2, Send, Loader2, Check, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DemoRoundOptionsProps {
  interviewCandidateId: string;
  candidateName: string;
  observerEmail?: string;
  existingMeetLink?: string;
  existingMeetType?: string;
  onUpdate?: () => void;
}

export const DemoRoundOptions = ({
  interviewCandidateId,
  candidateName,
  observerEmail,
  existingMeetLink,
  existingMeetType,
  onUpdate,
}: DemoRoundOptionsProps) => {
  const [meetType, setMeetType] = useState<'ai_video' | 'manual_link'>(
    (existingMeetType as 'ai_video' | 'manual_link') || 'ai_video'
  );
  const [meetLink, setMeetLink] = useState(existingMeetLink || '');
  const [isSending, setIsSending] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSendMeetLink = async () => {
    if (meetType === 'manual_link' && !meetLink.trim()) {
      toast.error('Please enter a meeting link');
      return;
    }

    setIsSending(true);
    try {
      // Send demo round emails (candidate + observer)
      const { error } = await supabase.functions.invoke('send-demo-round-emails', {
        body: {
          interviewCandidateId,
          observerEmail,
          meetLink: meetType === 'manual_link' ? meetLink : undefined,
          meetType,
        },
      });

      if (error) throw error;

      toast.success(`Demo round invitations sent!`, {
        description: observerEmail 
          ? `Emails sent to ${candidateName} and observer (${observerEmail})`
          : `Email sent to ${candidateName}`,
        duration: 5000,
      });
      setIsSaved(true);
      onUpdate?.();
    } catch (err) {
      console.error('Error sending demo round emails:', err);
      toast.error('Failed to send demo round emails');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mt-2 bg-pink-50 border border-pink-200 rounded-md p-2.5 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-pink-700">
        <Video className="h-3 w-3" />
        Demo Round - Meeting Options
      </div>

      {/* Two options */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={meetType === 'ai_video' ? 'default' : 'outline'}
          className={`h-7 text-[10px] px-2.5 flex-1 ${
            meetType === 'ai_video'
              ? 'bg-pink-600 hover:bg-pink-700 text-white'
              : 'border-pink-300 text-pink-600 hover:bg-pink-50'
          }`}
          onClick={() => setMeetType('ai_video')}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          AI Video Call
        </Button>
        <Button
          size="sm"
          variant={meetType === 'manual_link' ? 'default' : 'outline'}
          className={`h-7 text-[10px] px-2.5 flex-1 ${
            meetType === 'manual_link'
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'border-purple-300 text-purple-600 hover:bg-purple-50'
          }`}
          onClick={() => setMeetType('manual_link')}
        >
          <Link2 className="h-3 w-3 mr-1" />
          Manual Meet Link
        </Button>
      </div>

      {/* Manual Meet Link Input */}
      {meetType === 'manual_link' && (
        <div className="space-y-1.5">
          <Input
            type="url"
            placeholder="Paste Zoom, Google Meet, or Teams link"
            value={meetLink}
            onChange={(e) => { setMeetLink(e.target.value); setIsSaved(false); }}
            className="h-7 text-xs border-purple-200 focus:border-purple-400"
          />
          <p className="text-[9px] text-muted-foreground">
            Supports Google Meet, Zoom, Microsoft Teams, or any video call link
          </p>
        </div>
      )}

      {/* AI Video description */}
      {meetType === 'ai_video' && (
        <p className="text-[10px] text-pink-600">
          Candidate will record their demo via the AI-powered video platform. The recording will be available for review.
        </p>
      )}

      {/* Observer email display */}
      {observerEmail && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Badge variant="outline" className="text-[9px] px-1 py-0 border-purple-300 text-purple-600 bg-purple-50">
            Observer
          </Badge>
          {observerEmail}
        </div>
      )}

      {/* Send button */}
      <Button
        size="sm"
        className={`w-full h-7 text-[10px] ${
          meetType === 'ai_video' 
            ? 'bg-pink-600 hover:bg-pink-700' 
            : 'bg-purple-600 hover:bg-purple-700'
        }`}
        onClick={handleSendMeetLink}
        disabled={isSending || (meetType === 'manual_link' && !meetLink.trim())}
      >
        {isSending ? (
          <>
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Sending...
          </>
        ) : isSaved ? (
          <>
            <Check className="h-3 w-3 mr-1" />
            Sent!
          </>
        ) : (
          <>
            <Send className="h-3 w-3 mr-1" />
            Send Demo Invitations
          </>
        )}
      </Button>
    </div>
  );
};

export default DemoRoundOptions;

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Video, Link2, Send, Loader2, Check, Sparkles, Mail, Plus, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RoundMeetingOptionsProps {
  interviewCandidateId: string;
  candidateName: string;
  observerEmail?: string;
  existingMeetLink?: string;
  existingMeetType?: string;
  onUpdate?: () => void;
  stageName?: string;
}

export const RoundMeetingOptions = ({
  interviewCandidateId,
  candidateName,
  observerEmail,
  existingMeetLink,
  existingMeetType,
  onUpdate,
  stageName = 'Round',
}: RoundMeetingOptionsProps) => {
  const [meetType, setMeetType] = useState<'ai_video' | 'google_meet' | 'zoom_meet'>(
    (existingMeetType as 'ai_video' | 'google_meet' | 'zoom_meet') || 'ai_video'
  );
  const [meetLink, setMeetLink] = useState(existingMeetLink || '');
  const [isSending, setIsSending] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Observer email management
  const existingObserverEmails = observerEmail
    ? observerEmail.split(',').map(e => e.trim()).filter(Boolean)
    : [];
  const [observerEmails, setObserverEmails] = useState<string[]>(existingObserverEmails);
  const [newObserverEmail, setNewObserverEmail] = useState('');

  const isMeetReady = () => {
    if (meetType === 'ai_video') return true;
    return !!meetLink.trim();
  };

  const handleSendMeetLink = async (
    opts: { silent?: boolean; overrideObservers?: string[] } = {}
  ) => {
    const { silent = false, overrideObservers } = opts;
    const recipients = overrideObservers ?? observerEmails;

    if ((meetType === 'google_meet' || meetType === 'zoom_meet') && !meetLink.trim()) {
      if (!silent) toast.error('Please enter a meeting link');
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-demo-round-emails', {
        body: {
          interviewCandidateId,
          observerEmail: recipients.length > 0 ? recipients.join(',') : undefined,
          meetLink: (meetType === 'google_meet' || meetType === 'zoom_meet') ? meetLink : undefined,
          meetType: meetType === 'google_meet' || meetType === 'zoom_meet' ? 'manual_link' : meetType,
          roundName: stageName,
        },
      });

      if (error) throw error;

      toast.success(`${stageName} invitations sent!`, {
        description: recipients.length > 0
          ? `Emails sent to ${candidateName} and ${recipients.length} observer(s)`
          : `Email sent to ${candidateName}`,
        duration: 4000,
      });
      setIsSaved(true);
      onUpdate?.();
    } catch (err) {
      console.error('Error sending round emails:', err);
      if (!silent) toast.error('Failed to send round emails');
    } finally {
      setIsSending(false);
    }
  };

  const handleAddObserver = () => {
    const email = newObserverEmail.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (observerEmails.includes(email)) {
      toast.error('Email already added');
      return;
    }
    const next = [...observerEmails, email];
    setObserverEmails(next);
    setNewObserverEmail('');
    setIsSaved(false);
    // Auto-send observer invitation as soon as meet details are ready
    if (isMeetReady()) {
      void handleSendMeetLink({ silent: false, overrideObservers: next });
    }
  };

  const handleRemoveObserver = (email: string) => {
    setObserverEmails(prev => prev.filter(e => e !== email));
    setIsSaved(false);
  };

  // Auto-send when meeting link finalizes (blur/Enter) and observers already exist
  const handleMeetLinkSubmit = () => {
    if (!isMeetReady() || observerEmails.length === 0 || isSending || isSaved) return;
    void handleSendMeetLink({ silent: false });
  };

  return (
    <div className="mt-2 bg-pink-50 border border-pink-200 rounded-md p-2.5 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-pink-700">
        <Video className="h-3 w-3" />
        {stageName} - Meeting Options
      </div>

      {/* Three options */}
      <div className="grid grid-cols-3 gap-1.5">
        <Button
          size="sm"
          variant={meetType === 'ai_video' ? 'default' : 'outline'}
          className={`h-7 text-[10px] px-1.5 ${
            meetType === 'ai_video'
              ? 'bg-pink-600 hover:bg-pink-700 text-white'
              : 'border-pink-300 text-pink-600 hover:bg-pink-50'
          }`}
          onClick={() => setMeetType('ai_video')}
        >
          <Sparkles className="h-3 w-3 mr-0.5" />
          AI Interview
        </Button>
        <Button
          size="sm"
          variant={meetType === 'google_meet' ? 'default' : 'outline'}
          className={`h-7 text-[10px] px-1.5 ${
            meetType === 'google_meet'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'border-blue-300 text-blue-600 hover:bg-blue-50'
          }`}
          onClick={() => setMeetType('google_meet')}
        >
          <Link2 className="h-3 w-3 mr-0.5" />
          Google Meet
        </Button>
        <Button
          size="sm"
          variant={meetType === 'zoom_meet' ? 'default' : 'outline'}
          className={`h-7 text-[10px] px-1.5 ${
            meetType === 'zoom_meet'
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'border-purple-300 text-purple-600 hover:bg-purple-50'
          }`}
          onClick={() => setMeetType('zoom_meet')}
        >
          <Video className="h-3 w-3 mr-0.5" />
          Zoom Meet
        </Button>
      </div>

      {/* Google Meet Link Input */}
      {meetType === 'google_meet' && (
        <div className="space-y-1.5">
          <Input
            type="url"
            placeholder="Paste Google Meet link (e.g., meet.google.com/abc-defg-hij)"
            value={meetLink}
            onChange={(e) => { setMeetLink(e.target.value); setIsSaved(false); }}
            className="h-7 text-xs border-blue-200 focus:border-blue-400"
          />
          <p className="text-[9px] text-muted-foreground">
            Paste your Google Meet link. Candidate and observers will receive this link via email.
          </p>
        </div>
      )}

      {/* Zoom Meet Link Input */}
      {meetType === 'zoom_meet' && (
        <div className="space-y-1.5">
          <Input
            type="url"
            placeholder="Paste Zoom link (e.g., zoom.us/j/123456789)"
            value={meetLink}
            onChange={(e) => { setMeetLink(e.target.value); setIsSaved(false); }}
            className="h-7 text-xs border-purple-200 focus:border-purple-400"
          />
          <p className="text-[9px] text-muted-foreground">
            Paste your Zoom meeting link. Candidate and observers will receive this link via email.
          </p>
        </div>
      )}

      {/* AI Video description */}
      {meetType === 'ai_video' && (
        <p className="text-[10px] text-pink-600">
          Candidate will record their demo via the AI-powered video platform. The recording will be available for review in Demo Feedback.
        </p>
      )}

      {/* Observer Email Input */}
      <div className="space-y-1.5 pt-1.5 border-t border-pink-200" onClick={(e) => e.stopPropagation()}>
        <label className="text-[10px] font-medium text-pink-700 flex items-center gap-1">
          <Mail className="h-3 w-3" />
          Observer Emails
        </label>
        <div className="flex gap-1.5">
          <Input
            type="email"
            placeholder="Add observer email"
            value={newObserverEmail}
            onChange={(e) => setNewObserverEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddObserver(); }}}
            className="h-6 text-[10px] flex-1 border-pink-200 focus:border-pink-400"
          />
          <Button
            size="sm"
            className={`h-6 text-[9px] px-2 ${
              meetType === 'ai_video' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-purple-600 hover:bg-purple-700'
            }`}
            onClick={handleAddObserver}
            disabled={!newObserverEmail.trim()}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {observerEmails.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {observerEmails.map((email) => (
              <Badge key={email} variant="secondary" className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" />
                {email}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveObserver(email); }}
                  className="ml-0.5 hover:text-red-500 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <p className="text-[9px] text-muted-foreground">
          {meetType === 'ai_video'
            ? 'Observers can watch the live demo and provide feedback'
            : `Observers will receive the ${meetType === 'google_meet' ? 'Google Meet' : 'Zoom'} link to join as viewers`}
        </p>
      </div>

      {/* Send button */}
      <Button
        size="sm"
        className={`w-full h-7 text-[10px] ${
          meetType === 'ai_video' 
            ? 'bg-pink-600 hover:bg-pink-700' 
            : meetType === 'google_meet'
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-purple-600 hover:bg-purple-700'
        }`}
        onClick={() => handleSendMeetLink()}
        disabled={isSending || ((meetType === 'google_meet' || meetType === 'zoom_meet') && !meetLink.trim())}
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
            Send {stageName} Invitations
          </>
        )}
      </Button>
    </div>
  );
};

export default RoundMeetingOptions;

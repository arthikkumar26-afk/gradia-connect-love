import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Video, Link2, Send, Loader2, Check, Sparkles, Mail, Plus, X, CheckCircle2 } from 'lucide-react';
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

  // Observer email management
  const existingObserverEmails = observerEmail
    ? observerEmail.split(',').map(e => e.trim()).filter(Boolean)
    : [];
  const [observerEmails, setObserverEmails] = useState<string[]>(existingObserverEmails);
  const [newObserverEmail, setNewObserverEmail] = useState('');

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
    setObserverEmails(prev => [...prev, email]);
    setNewObserverEmail('');
    setIsSaved(false);
  };

  const handleRemoveObserver = (email: string) => {
    setObserverEmails(prev => prev.filter(e => e !== email));
    setIsSaved(false);
  };

  const handleSendMeetLink = async () => {
    if (meetType === 'manual_link' && !meetLink.trim()) {
      toast.error('Please enter a meeting link');
      return;
    }

    setIsSending(true);
    try {
      // Send demo round emails (candidate + observers)
      const { error } = await supabase.functions.invoke('send-demo-round-emails', {
        body: {
          interviewCandidateId,
          observerEmail: observerEmails.length > 0 ? observerEmails.join(',') : undefined,
          meetLink: meetType === 'manual_link' ? meetLink : undefined,
          meetType,
        },
      });

      if (error) throw error;

      toast.success(`Demo round invitations sent!`, {
        description: observerEmails.length > 0
          ? `Emails sent to ${candidateName} and ${observerEmails.length} observer(s)`
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
            : 'Observers will receive the meeting link to join as viewers'}
        </p>
      </div>

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

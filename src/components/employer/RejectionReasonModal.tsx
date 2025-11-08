import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

interface RejectionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, comments: string) => void;
  candidateName: string;
  stage?: string;
}

const REJECTION_REASONS = [
  'Skill gap',
  'Failed test',
  'Cultural mismatch',
  'Experience mismatch',
  'Salary expectations',
  'Communication issues',
  'Background verification failed',
  'Candidate withdrew',
  'Position filled',
  'Other',
];

export default function RejectionReasonModal({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  stage,
}: RejectionReasonModalProps) {
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reason) return;
    
    setLoading(true);
    try {
      await onConfirm(reason, comments);
      setReason('');
      setComments('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Reason for Rejection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm">
              <span className="text-muted-foreground">Candidate:</span>{' '}
              <span className="font-semibold">{candidateName}</span>
            </p>
            {stage && (
              <p className="text-sm mt-1">
                <span className="text-muted-foreground">Stage:</span>{' '}
                <span className="font-semibold">{stage}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Rejection Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Additional Comments (Optional)</Label>
            <Textarea
              id="comments"
              placeholder="Add any additional notes..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
            <p className="text-blue-800 dark:text-blue-400">
              The candidate will be redirected to a Learning Platform with personalized course recommendations
              to help them improve their skills.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason || loading}
          >
            {loading ? 'Confirming...' : 'Confirm Rejection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

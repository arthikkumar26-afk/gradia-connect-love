import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OfferLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  placementId: string;
  candidateName: string;
  candidateEmail?: string;
  onSuccess: () => void;
}

export default function OfferLetterModal({
  isOpen,
  onClose,
  placementId,
  candidateName,
  candidateEmail,
  onSuccess,
}: OfferLetterModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    salary: '',
    joiningDate: '',
    probationPeriod: '3 months',
    customNotes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.salary || !formData.joiningDate) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Parse salary to number (remove currency symbols and commas)
      const salaryNumber = parseFloat(formData.salary.replace(/[^0-9.]/g, ''));
      
      if (isNaN(salaryNumber)) {
        throw new Error('Invalid salary format. Please enter a numeric value.');
      }

      // Call the edge function to generate and send offer letter
      const { data, error } = await supabase.functions.invoke('generate-offer-letter', {
        body: {
          interviewCandidateId: placementId,
          salaryOffered: salaryNumber,
          startDate: formData.joiningDate,
          customContent: formData.customNotes,
        }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to send offer letter');
      }

      toast({ title: 'Success', description: 'Offer letter sent successfully to ' + (candidateEmail || candidateName) });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Offer letter error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to send offer letter', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Offer Letter for {candidateName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="salary">Salary Package *</Label>
            <Input
              id="salary"
              type="text"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              placeholder="$120,000/year or ₹12,00,000/year"
              required
            />
          </div>
          <div>
            <Label htmlFor="joiningDate">Joining Date *</Label>
            <Input
              id="joiningDate"
              type="date"
              value={formData.joiningDate}
              onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="probationPeriod">Probation Period</Label>
            <Input
              id="probationPeriod"
              type="text"
              value={formData.probationPeriod}
              onChange={(e) => setFormData({ ...formData, probationPeriod: e.target.value })}
              placeholder="3 months"
            />
          </div>
          <div>
            <Label htmlFor="customNotes">Additional Notes</Label>
            <Textarea
              id="customNotes"
              value={formData.customNotes}
              onChange={(e) => setFormData({ ...formData, customNotes: e.target.value })}
              placeholder="Any additional terms or welcome message..."
              rows={4}
            />
          </div>
          
          {/* Preview Section */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2 text-sm">Offer Letter Preview</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Dear {candidateName},</p>
              <p>
                We are pleased to offer you a position with the following terms:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Salary: {formData.salary || '[To be specified]'}</li>
                <li>Joining Date: {formData.joiningDate || '[To be specified]'}</li>
                <li>Probation Period: {formData.probationPeriod}</li>
              </ul>
              {formData.customNotes && (
                <p className="mt-2">{formData.customNotes}</p>
              )}
              <p className="mt-4">We look forward to having you on our team.</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Offer Letter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

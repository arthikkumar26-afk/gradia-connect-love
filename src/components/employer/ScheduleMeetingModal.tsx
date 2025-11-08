import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { mockScheduleMeeting } from '@/utils/mockApi';
import { Placement } from '@/contexts/EmployerContext';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  placementId: string;
  onSuccess: (placement: Placement) => void;
}

export default function ScheduleMeetingModal({
  isOpen,
  onClose,
  placementId,
  onSuccess,
}: ScheduleMeetingModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    timezone: 'UTC',
    participants: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.time || !formData.participants) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const updated = await mockScheduleMeeting(placementId, {
        date: formData.date,
        time: formData.time,
        timezone: formData.timezone,
        participants: formData.participants.split(',').map((p) => p.trim()),
      });
      
      toast({ title: 'Success', description: 'Meeting scheduled successfully' });
      onSuccess(updated);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to schedule meeting', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Panel Interview</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="time">Time *</Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              type="text"
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              placeholder="UTC"
            />
          </div>
          <div>
            <Label htmlFor="participants">Participants (comma-separated) *</Label>
            <Input
              id="participants"
              type="text"
              value={formData.participants}
              onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
              placeholder="John Doe, Jane Smith"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Scheduling...' : 'Schedule Meeting'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

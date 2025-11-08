import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { mockGetApplications, mockUpdateApplicationStage, mockGetJobs, mockGetCandidates } from '@/utils/mockApi';
import { Application, Job, Candidate } from '@/contexts/EmployerContext';
import { ChevronRight, FileText, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STAGES: Application['stage'][] = [
  'Screening Test',
  'Panel Interview',
  'Feedback',
  'Confirmation',
  'Offer Letter',
];

export default function ApplicationTracker() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appsData, jobsData, candidatesData] = await Promise.all([
        mockGetApplications(),
        mockGetJobs(),
        mockGetCandidates(),
      ]);
      setApplications(appsData);
      setJobs(jobsData);
      setCandidates(candidatesData);
    } finally {
      setLoading(false);
    }
  };

  const getJobTitle = (jobId: string) => jobs.find((j) => j.id === jobId)?.title || 'Unknown Job';
  const getCandidateName = (candidateId: string) =>
    candidates.find((c) => c.id === candidateId)?.name || 'Unknown Candidate';

  const handleMoveStage = async (appId: string, newStage: Application['stage']) => {
    if (!notes.trim()) {
      toast({ title: 'Please add notes', variant: 'destructive' });
      return;
    }

    try {
      const updated = await mockUpdateApplicationStage(appId, newStage, notes);
      setApplications(applications.map((a) => (a.id === appId ? updated : a)));
      setSelectedApp(updated);
      setNotes('');
      toast({ title: 'Stage updated', description: `Moved to ${newStage}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update stage', variant: 'destructive' });
    }
  };

  const currentStageIndex = selectedApp ? STAGES.indexOf(selectedApp.stage) : -1;
  const nextStage = currentStageIndex < STAGES.length - 1 ? STAGES[currentStageIndex + 1] : null;

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">Loading applications...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Applications List */}
      <Card className="lg:col-span-1 p-4">
        <h3 className="font-semibold text-foreground mb-4">Active Applications</h3>
        <div className="space-y-2">
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No applications yet</p>
          ) : (
            applications.map((app) => (
              <button
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedApp?.id === app.id
                    ? 'bg-primary/10 border-primary'
                    : 'hover:bg-muted/50 border-transparent'
                }`}
              >
                <p className="font-medium text-sm text-foreground">{getCandidateName(app.candidateId)}</p>
                <p className="text-xs text-muted-foreground">{getJobTitle(app.jobId)}</p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  {app.stage}
                </Badge>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Application Details */}
      <Card className="lg:col-span-2 p-6">
        {!selectedApp ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Select an application to view details</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-foreground">{getCandidateName(selectedApp.candidateId)}</h2>
              <p className="text-muted-foreground">{getJobTitle(selectedApp.jobId)}</p>
              <p className="text-sm text-muted-foreground mt-1">Applied on {selectedApp.appliedDate}</p>
            </div>

            {/* Pipeline Stages */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Application Pipeline</h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {STAGES.map((stage, index) => {
                  const isPast = index < currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  const isFuture = index > currentStageIndex;

                  return (
                    <div key={stage} className="flex items-center">
                      <div
                        className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
                          isCurrent
                            ? 'bg-primary text-primary-foreground font-medium'
                            : isPast
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {stage}
                      </div>
                      {index < STAGES.length - 1 && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Timeline</h3>
              <div className="space-y-3">
                {selectedApp.timeline.map((event, index) => (
                  <div key={index} className="flex gap-3 pb-3 border-b last:border-0">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium text-sm text-foreground">{event.stage}</p>
                        <p className="text-xs text-muted-foreground">{event.date}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.notes}</p>
                      {event.completedBy && (
                        <p className="text-xs text-muted-foreground mt-1">By {event.completedBy}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Move to Next Stage */}
            {nextStage && (
              <div className="border-t pt-6">
                <h3 className="font-semibold text-foreground mb-3">Move to Next Stage</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="notes">Notes *</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={`Add notes for moving to ${nextStage}...`}
                      rows={3}
                    />
                  </div>
                  <Button onClick={() => handleMoveStage(selectedApp.id, nextStage)} className="w-full">
                    Move to {nextStage}
                  </Button>
                </div>
              </div>
            )}

            {!nextStage && (
              <div className="border-t pt-6">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Application Complete
                </Badge>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

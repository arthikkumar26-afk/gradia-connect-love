import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Placement } from '@/contexts/EmployerContext';
import { mockGetPlacements, mockGetJobs, mockGetCandidates, mockGetClients } from '@/utils/mockApi';
import { Job, Candidate, Client } from '@/contexts/EmployerContext';
import { ChevronRight, CheckCircle, Circle, AlertCircle, FileText } from 'lucide-react';
import PlacementDetail from './PlacementDetail';

const PLACEMENT_STAGES = [
  'Applied',
  'Screening Test',
  'Panel Interview',
  'Feedback',
  'BGV',
  'Confirmation',
  'Offer Letter',
  'Hired',
  'Rejected',
] as const;

export default function PlacementsContent() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [placementsData, jobsData, candidatesData, clientsData] = await Promise.all([
        mockGetPlacements(),
        mockGetJobs(),
        mockGetCandidates(),
        mockGetClients(),
      ]);
      setPlacements(placementsData);
      setJobs(jobsData);
      setCandidates(candidatesData);
      setClients(clientsData);
    } finally {
      setLoading(false);
    }
  };

  const getJobTitle = (jobId: string) => jobs.find((j) => j.id === jobId)?.title || 'Unknown Job';
  const getCandidateName = (candidateId: string) =>
    candidates.find((c) => c.id === candidateId)?.name || 'Unknown Candidate';
  const getClientName = (clientId: string) =>
    clients.find((c) => c.id === clientId)?.name || 'Unknown Client';

  const handlePlacementUpdate = (updatedPlacement: Placement) => {
    setPlacements(placements.map((p) => (p.id === updatedPlacement.id ? updatedPlacement : p)));
    setSelectedPlacement(updatedPlacement);
  };

  const getStageColor = (stage: Placement['stage']) => {
    if (stage === 'Hired') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (stage === 'Rejected') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  };

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">Loading placements...</div>;
  }

  if (selectedPlacement) {
    return (
      <PlacementDetail
        placement={selectedPlacement}
        job={jobs.find((j) => j.id === selectedPlacement.jobId)!}
        candidate={candidates.find((c) => c.id === selectedPlacement.candidateId)!}
        client={clients.find((c) => c.id === selectedPlacement.clientId)!}
        onBack={() => setSelectedPlacement(null)}
        onUpdate={handlePlacementUpdate}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Placements</h2>
        <div className="text-sm text-muted-foreground">
          Total: {placements.length} | Active: {placements.filter((p) => !['Hired', 'Rejected'].includes(p.stage)).length}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {placements.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No placements yet</p>
            </div>
          </Card>
        ) : (
          placements.map((placement) => (
            <Card
              key={placement.id}
              className="p-6 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedPlacement(placement)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {getCandidateName(placement.candidateId)}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">{getJobTitle(placement.jobId)}</p>
                  <p className="text-sm text-muted-foreground">Client: {getClientName(placement.clientId)}</p>
                </div>
                <Badge className={getStageColor(placement.stage)}>{placement.stage}</Badge>
              </div>

              {/* Visual Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  {PLACEMENT_STAGES.filter((s) => s !== 'Hired' && s !== 'Rejected').map((stage, index) => {
                    const currentIndex = PLACEMENT_STAGES.indexOf(placement.stage);
                    const stageIndex = PLACEMENT_STAGES.indexOf(stage);
                    const isPast = stageIndex < currentIndex;
                    const isCurrent = stage === placement.stage;

                    return (
                      <div key={stage} className="flex items-center">
                        <div
                          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs whitespace-nowrap ${
                            isCurrent
                              ? 'bg-primary text-primary-foreground font-medium'
                              : isPast
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isPast && <CheckCircle className="w-3 h-3" />}
                          {isCurrent && <Circle className="w-3 h-3 fill-current" />}
                          {stage}
                        </div>
                        {index < PLACEMENT_STAGES.filter((s) => s !== 'Hired' && s !== 'Rejected').length - 1 && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Applied: {placement.appliedDate}</span>
                <span>Last Updated: {placement.lastUpdated}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

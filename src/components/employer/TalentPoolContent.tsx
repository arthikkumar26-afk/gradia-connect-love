import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, UserPlus, Mail, Phone, Eye } from 'lucide-react';
import { mockGetCandidates, mockShortlistCandidate, mockRejectPlacement, mockGetJobs, mockGetClients } from '@/utils/mockApi';
import { Candidate } from '@/contexts/EmployerContext';
import CandidateProfileModal from './CandidateProfileModal';
import RejectionReasonModal from './RejectionReasonModal';
import { useToast } from '@/hooks/use-toast';

export default function TalentPoolContent() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const data = await mockGetCandidates();
      setCandidates(data);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter(
    (candidate) =>
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.skills.some((skill) => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleViewProfile = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowProfileModal(true);
  };

  const handleShortlist = async () => {
    if (!selectedCandidate) return;

    try {
      // Get first job and client for demo
      const jobs = await mockGetJobs();
      const clients = await mockGetClients();
      
      await mockShortlistCandidate(selectedCandidate.id, jobs[0]?.id || '1', clients[0]?.id || '1');
      
      toast({
        title: 'Candidate Shortlisted',
        description: `${selectedCandidate.name} has been added to Placements.`,
      });
      
      setShowProfileModal(false);
      setSelectedCandidate(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to shortlist candidate',
        variant: 'destructive',
      });
    }
  };

  const handleRejectFromModal = () => {
    setShowProfileModal(false);
    setShowRejectionModal(true);
  };

  const handleConfirmRejection = async (reason: string, comments: string) => {
    if (!selectedCandidate) return;

    try {
      toast({
        title: 'Candidate Rejected',
        description: 'Reason recorded successfully.',
      });
      
      setShowRejectionModal(false);
      setSelectedCandidate(null);
      
      // Redirect candidate to learning platform
      setTimeout(() => {
        navigate(`/learning-platform?reason=${encodeURIComponent(reason)}`);
      }, 1500);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record rejection',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: Candidate['status']) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'In Process':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Placed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading candidates...</div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No candidates found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>AI Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((candidate) => (
                <TableRow key={candidate.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{candidate.name}</p>
                      <p className="text-sm text-muted-foreground">{candidate.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {candidate.skills.slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {candidate.skills.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{candidate.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{candidate.experience}</TableCell>
                  <TableCell>
                    {candidate.aiScore ? (
                      <Badge
                        className={
                          candidate.aiScore >= 80
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : candidate.aiScore >= 60
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                        }
                      >
                        {candidate.aiScore}/100
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(candidate.status)}>{candidate.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProfile(candidate)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modals */}
      <CandidateProfileModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedCandidate(null);
        }}
        candidate={selectedCandidate}
        onShortlist={handleShortlist}
        onReject={handleRejectFromModal}
      />

      <RejectionReasonModal
        isOpen={showRejectionModal}
        onClose={() => {
          setShowRejectionModal(false);
          setSelectedCandidate(null);
        }}
        onConfirm={handleConfirmRejection}
        candidateName={selectedCandidate?.name || ''}
        stage="Talent Pool"
      />
    </div>
  );
}

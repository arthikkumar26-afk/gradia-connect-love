import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserCheck, Search, Filter, CheckCircle, XCircle, Clock, Send, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ConfirmationCandidate {
  id: string;
  interviewCandidateId: string;
  candidateName: string;
  email: string;
  jobTitle: string;
  finalScore: number;
  status: string;
  completedAt: string;
}

export const ConfirmationContent = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<ConfirmationCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState<ConfirmationCandidate | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmationNote, setConfirmationNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, [user?.id]);

  const fetchCandidates = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch candidates who have completed all interview stages
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('employer_id', user.id);

      if (!jobs || jobs.length === 0) {
        setCandidates([]);
        setIsLoading(false);
        return;
      }

      const jobIds = jobs.map(j => j.id);

      const { data: interviewCandidates, error } = await supabase
        .from('interview_candidates')
        .select(`
          id,
          status,
          ai_score,
          updated_at,
          candidate_id,
          job_id,
          profiles:candidate_id (full_name, email),
          jobs:job_id (job_title)
        `)
        .in('job_id', jobIds)
        .in('status', ['hired', 'pending_confirmation', 'interview_complete', 'offer_sent'])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formattedCandidates: ConfirmationCandidate[] = (interviewCandidates || []).map((c: any) => ({
        id: c.candidate_id,
        interviewCandidateId: c.id,
        candidateName: c.profiles?.full_name || 'Unknown',
        email: c.profiles?.email || '',
        jobTitle: c.jobs?.job_title || 'Unknown',
        finalScore: c.ai_score || 0,
        status: c.status || 'pending_confirmation',
        completedAt: c.updated_at || '',
      }));

      setCandidates(formattedCandidates);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to load candidates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (action: 'confirm' | 'reject') => {
    if (!selectedCandidate) return;
    
    setIsSubmitting(true);
    try {
      const newStatus = action === 'confirm' ? 'hired' : 'rejected';
      
      const { error } = await supabase
        .from('interview_candidates')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCandidate.interviewCandidateId);

      if (error) throw error;

      toast.success(`Candidate ${action === 'confirm' ? 'confirmed' : 'rejected'} successfully`);
      setIsConfirmModalOpen(false);
      setSelectedCandidate(null);
      setConfirmationNote("");
      fetchCandidates();
    } catch (error) {
      console.error('Error updating candidate:', error);
      toast.error('Failed to update candidate status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'hired':
        return <Badge className="bg-success/10 text-success">Confirmed</Badge>;
      case 'offer_sent':
        return <Badge className="bg-primary/10 text-primary">Offer Sent</Badge>;
      case 'pending_confirmation':
      case 'interview_complete':
        return <Badge className="bg-warning/10 text-warning">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <UserCheck className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle>Candidate Confirmation</CardTitle>
              <p className="text-sm text-muted-foreground">
                Confirm or reject candidates who have completed the interview process
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-2xl font-bold">
                  {candidates.filter(c => ['pending_confirmation', 'interview_complete'].includes(c.status)).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offer Sent</p>
                <p className="text-2xl font-bold">
                  {candidates.filter(c => c.status === 'offer_sent').length}
                </p>
              </div>
              <Send className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold">
                  {candidates.filter(c => c.status === 'hired').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">
                  {candidates.filter(c => c.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by candidate or job..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_confirmation">Pending</SelectItem>
                <SelectItem value="offer_sent">Offer Sent</SelectItem>
                <SelectItem value="hired">Confirmed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Candidates Table */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Candidates Found</h3>
              <p className="text-muted-foreground">
                Candidates will appear here after completing their interview process.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Final Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.map((candidate) => (
                  <TableRow key={candidate.interviewCandidateId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <span className="font-medium">{candidate.candidateName}</span>
                          <p className="text-xs text-muted-foreground">{candidate.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{candidate.jobTitle}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {candidate.finalScore}%
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(candidate.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {candidate.completedAt ? new Date(candidate.completedAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      {['pending_confirmation', 'interview_complete'].includes(candidate.status) && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedCandidate(candidate);
                              setIsConfirmModalOpen(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Candidate Decision</DialogTitle>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedCandidate.candidateName}</p>
                <p className="text-sm text-muted-foreground">{selectedCandidate.jobTitle}</p>
                <p className="text-sm mt-2">
                  Final Score: <Badge variant="outline">{selectedCandidate.finalScore}%</Badge>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Add any notes about this decision..."
                  value={confirmationNote}
                  onChange={(e) => setConfirmationNote(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => handleConfirm('reject')}
              disabled={isSubmitting}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              onClick={() => handleConfirm('confirm')}
              disabled={isSubmitting}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Confirm Hire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

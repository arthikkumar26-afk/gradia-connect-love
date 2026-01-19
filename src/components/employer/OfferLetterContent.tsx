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
import { FileText, Search, Filter, Send, Eye, User, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import OfferLetterModal from "./OfferLetterModal";

interface OfferLetter {
  id: string;
  interviewCandidateId: string;
  candidateName: string;
  email: string;
  jobTitle: string;
  salaryOffered: number;
  startDate: string;
  status: string;
  sentAt: string;
  respondedAt: string | null;
}

export const OfferLetterContent = () => {
  const { user } = useAuth();
  const [offerLetters, setOfferLetters] = useState<OfferLetter[]>([]);
  const [eligibleCandidates, setEligibleCandidates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  useEffect(() => {
    fetchOfferLetters();
    fetchEligibleCandidates();
  }, [user?.id]);

  const fetchOfferLetters = async () => {
    if (!user?.id) return;
    
    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('employer_id', user.id);

      if (!jobs || jobs.length === 0) {
        setOfferLetters([]);
        setIsLoading(false);
        return;
      }

      const jobIds = jobs.map(j => j.id);

      const { data: offers, error } = await supabase
        .from('offer_letters')
        .select(`
          id,
          interview_candidate_id,
          position_title,
          salary_offered,
          start_date,
          status,
          sent_at,
          responded_at,
          interview_candidates!inner (
            id,
            job_id,
            candidate_id,
            profiles:candidate_id (full_name, email)
          )
        `)
        .in('interview_candidates.job_id', jobIds)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      const formattedOffers: OfferLetter[] = (offers || []).map((o: any) => ({
        id: o.id,
        interviewCandidateId: o.interview_candidate_id,
        candidateName: o.interview_candidates?.profiles?.full_name || 'Unknown',
        email: o.interview_candidates?.profiles?.email || '',
        jobTitle: o.position_title || 'Unknown',
        salaryOffered: o.salary_offered || 0,
        startDate: o.start_date || '',
        status: o.status || 'draft',
        sentAt: o.sent_at || '',
        respondedAt: o.responded_at,
      }));

      setOfferLetters(formattedOffers);
    } catch (error) {
      console.error('Error fetching offer letters:', error);
      toast.error('Failed to load offer letters');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEligibleCandidates = async () => {
    if (!user?.id) return;
    
    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, job_title')
        .eq('employer_id', user.id);

      if (!jobs || jobs.length === 0) return;

      const jobIds = jobs.map(j => j.id);

      // Get candidates who are hired or interview_complete but don't have an offer letter yet
      const { data: candidates, error } = await supabase
        .from('interview_candidates')
        .select(`
          id,
          job_id,
          candidate_id,
          ai_score,
          profiles:candidate_id (full_name, email),
          jobs:job_id (job_title)
        `)
        .in('job_id', jobIds)
        .in('status', ['hired', 'interview_complete', 'pending_confirmation']);

      if (error) throw error;

      // Filter out candidates who already have offer letters
      const { data: existingOffers } = await supabase
        .from('offer_letters')
        .select('interview_candidate_id')
        .in('interview_candidate_id', (candidates || []).map(c => c.id));

      const existingOfferIds = new Set((existingOffers || []).map(o => o.interview_candidate_id));
      
      const eligible = (candidates || [])
        .filter(c => !existingOfferIds.has(c.id))
        .map(c => ({
          id: c.id,
          candidateId: c.candidate_id,
          candidateName: (c.profiles as any)?.full_name || 'Unknown',
          email: (c.profiles as any)?.email || '',
          jobTitle: (c.jobs as any)?.job_title || 'Unknown',
          score: c.ai_score || 0,
        }));

      setEligibleCandidates(eligible);
    } catch (error) {
      console.error('Error fetching eligible candidates:', error);
    }
  };

  const filteredOffers = offerLetters.filter(o => {
    const matchesSearch = o.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         o.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-success/10 text-success">Accepted</Badge>;
      case 'sent':
        return <Badge className="bg-primary/10 text-primary">Sent</Badge>;
      case 'pending':
      case 'draft':
        return <Badge className="bg-warning/10 text-warning">Pending</Badge>;
      case 'rejected':
      case 'declined':
        return <Badge className="bg-destructive/10 text-destructive">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Offer Letters</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Generate and manage offer letters for selected candidates
                </p>
              </div>
            </div>
            {eligibleCandidates.length > 0 && (
              <Select 
                value="" 
                onValueChange={(value) => {
                  const candidate = eligibleCandidates.find(c => c.id === value);
                  if (candidate) {
                    setSelectedCandidate(candidate);
                    setIsModalOpen(true);
                  }
                }}
              >
                <SelectTrigger className="w-48">
                  <Plus className="h-4 w-4 mr-2" />
                  <span>New Offer Letter</span>
                </SelectTrigger>
                <SelectContent>
                  {eligibleCandidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.candidateName} - {c.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{offerLetters.length}</p>
              </div>
              <Send className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Response</p>
                <p className="text-2xl font-bold">
                  {offerLetters.filter(o => o.status === 'sent').length}
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
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold">
                  {offerLetters.filter(o => o.status === 'accepted').length}
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
                <p className="text-sm text-muted-foreground">Declined</p>
                <p className="text-2xl font-bold">
                  {offerLetters.filter(o => ['rejected', 'declined'].includes(o.status)).length}
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
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Offer Letters Table */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Offer Letters Found</h3>
              <p className="text-muted-foreground">
                {eligibleCandidates.length > 0 
                  ? "Select a candidate above to create a new offer letter."
                  : "Offer letters will appear here after candidates complete the interview process."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Salary Offered</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOffers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <span className="font-medium">{offer.candidateName}</span>
                          <p className="text-xs text-muted-foreground">{offer.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{offer.jobTitle}</TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(offer.salaryOffered)}
                    </TableCell>
                    <TableCell>
                      {offer.startDate ? new Date(offer.startDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(offer.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {offer.sentAt ? new Date(offer.sentAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Offer Letter Modal */}
      {selectedCandidate && (
        <OfferLetterModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCandidate(null);
          }}
          candidateName={`${selectedCandidate.candidateName} (${selectedCandidate.jobTitle})`}
          candidateEmail={selectedCandidate.email}
          placementId={selectedCandidate.id}
          onSuccess={() => {
            fetchOfferLetters();
            fetchEligibleCandidates();
          }}
        />
      )}
    </div>
  );
};

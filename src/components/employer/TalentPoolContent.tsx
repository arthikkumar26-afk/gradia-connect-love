import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Search, Filter, Mail, Phone, Eye, Brain, Star, FileText, Users, UserPlus, Trash2, LayoutGrid, List, MapPin, Briefcase, Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AddCandidateModal } from './AddCandidateModal';
import CandidateDetailModal from './CandidateDetailModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AppliedCandidate {
  id: string;
  candidate_id: string;
  job_id: string;
  ai_score: number | null;
  ai_analysis: any;
  status: string;
  current_stage_id: string | null;
  applied_at: string;
  resume_url: string | null;
  candidate: {
    id: string;
    full_name: string;
    email: string;
    mobile: string | null;
    location: string | null;
    experience_level: string | null;
    preferred_role: string | null;
    profile_picture: string | null;
  } | null;
  job: {
    job_title: string;
    department: string | null;
  } | null;
  current_stage: {
    name: string;
    stage_order: number;
  } | null;
}

export default function TalentPoolContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<AppliedCandidate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<AppliedCandidate | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [deleteCandidate, setDeleteCandidate] = useState<AppliedCandidate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [stats, setStats] = useState({
    total: 0,
    shortlisted: 0,
    interviewing: 0,
    avgScore: 0
  });

  useEffect(() => {
    if (user?.id) {
      loadAppliedCandidates();
      loadJobs();
    }
  }, [user?.id]);

  const loadJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('id, job_title, department, description, requirements, skills, experience_required, location')
      .eq('employer_id', user?.id)
      .eq('status', 'active');
    setJobs(data || []);
  };

  const loadAppliedCandidates = async () => {
    setLoading(true);
    try {
      // Get all interview candidates for jobs posted by this employer
      const { data, error } = await supabase
        .from("interview_candidates")
        .select(`
          id,
          candidate_id,
          job_id,
          ai_score,
          ai_analysis,
          status,
          current_stage_id,
          applied_at,
          resume_url,
          candidate:profiles!interview_candidates_candidate_id_fkey (
            id,
            full_name,
            email,
            mobile,
            location,
            experience_level,
            preferred_role,
            profile_picture
          ),
          job:jobs!interview_candidates_job_id_fkey (
            job_title,
            department
          ),
          current_stage:interview_stages!interview_candidates_current_stage_id_fkey (
            name,
            stage_order
          )
        `)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      
      // Filter to only show candidates for jobs posted by this employer
      const { data: myJobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('employer_id', user?.id);
      
      const myJobIds = myJobs?.map(j => j.id) || [];
      const filteredCandidates = (data || []).filter(c => myJobIds.includes(c.job_id));
      
      setCandidates(filteredCandidates);
      
      // Calculate stats
      const totalScore = filteredCandidates.reduce((acc, c) => acc + (c.ai_score || 0), 0);
      const avgScore = filteredCandidates.length > 0 ? Math.round(totalScore / filteredCandidates.length) : 0;
      
      setStats({
        total: filteredCandidates.length,
        shortlisted: filteredCandidates.filter(c => c.status === 'shortlisted').length,
        interviewing: filteredCandidates.filter(c => c.current_stage?.stage_order && c.current_stage.stage_order > 1).length,
        avgScore
      });
    } catch (error: any) {
      console.error('Error loading candidates:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get candidate data - prefer ai_analysis.candidate_data, fallback to profile
  const getCandidateData = (candidate: AppliedCandidate) => {
    const aiData = candidate.ai_analysis?.candidate_data;
    const profile = candidate.candidate;
    
    return {
      full_name: aiData?.full_name || profile?.full_name || 'Unknown',
      email: aiData?.email || profile?.email || '',
      mobile: aiData?.mobile || profile?.mobile || null,
      location: aiData?.location || profile?.location || null,
      experience_level: aiData?.experience_level || profile?.experience_level || null,
      preferred_role: aiData?.preferred_role || profile?.preferred_role || null,
      skills: aiData?.skills || [],
      education: aiData?.education || null,
      profile_picture: profile?.profile_picture || null,
    };
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const data = getCandidateData(candidate);
    return (
      data.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      data.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.job?.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (data.location && data.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const getScoreBadge = (score: number | null) => {
    if (!score) return <Badge variant="outline">N/A</Badge>;
    if (score >= 80) return <Badge className="bg-green-500 text-white">{score}%</Badge>;
    if (score >= 60) return <Badge className="bg-blue-500 text-white">{score}%</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-500 text-white">{score}%</Badge>;
    return <Badge variant="destructive">{score}%</Badge>;
  };

  const getRecommendationBadge = (analysis: any) => {
    if (!analysis?.recommendation) return null;
    const rec = analysis.recommendation;
    if (rec === 'strong_yes') return <Badge className="bg-green-600 text-white">⭐ Strong Yes</Badge>;
    if (rec === 'yes') return <Badge className="bg-green-500 text-white">✓ Yes</Badge>;
    if (rec === 'maybe') return <Badge className="bg-yellow-500 text-white">? Maybe</Badge>;
    return <Badge variant="destructive">✗ No</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDeleteCandidate = async () => {
    if (!deleteCandidate) return;
    
    setDeleting(true);
    try {
      // Delete interview events first
      await supabase
        .from('interview_events')
        .delete()
        .eq('interview_candidate_id', deleteCandidate.id);
      
      // Delete interview responses
      const { data: events } = await supabase
        .from('interview_events')
        .select('id')
        .eq('interview_candidate_id', deleteCandidate.id);
      
      if (events?.length) {
        await supabase
          .from('interview_responses')
          .delete()
          .in('interview_event_id', events.map(e => e.id));
      }
      
      // Delete the interview candidate record
      const { error } = await supabase
        .from('interview_candidates')
        .delete()
        .eq('id', deleteCandidate.id);
      
      if (error) throw error;
      
      toast({
        title: 'Candidate removed',
        description: 'The candidate has been removed from the talent pool.',
      });
      
      setDeleteCandidate(null);
      loadAppliedCandidates();
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete candidate',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Applicants</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Star className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.shortlisted}</p>
              <p className="text-sm text-muted-foreground">Shortlisted</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.interviewing}</p>
              <p className="text-sm text-muted-foreground">In Interview</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-accent/10 to-accent/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-lg">
              <Brain className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.avgScore}%</p>
              <p className="text-sm text-muted-foreground">Avg AI Score</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates, jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button 
              variant={viewMode === 'cards' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'table' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" onClick={loadAppliedCandidates}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Add Candidate Modal */}
      <AddCandidateModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        jobs={jobs}
        onCandidateAdded={loadAppliedCandidates}
      />

      {/* Candidate Detail Modal */}
      <CandidateDetailModal
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        candidate={selectedCandidate}
      />

      {/* Candidates Display */}
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading candidates...</div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Applicants Yet</h3>
            <p className="text-muted-foreground">
              Candidates who apply to your jobs will appear here with AI analysis
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          /* Card View */
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCandidates.map((candidate) => {
              const candidateData = getCandidateData(candidate);
              const aiAnalysis = candidate.ai_analysis;
              return (
                <Card 
                  key={candidate.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => setSelectedCandidate(candidate)}
                >
                  {/* AI Score Banner */}
                  <div className={`h-2 ${
                    candidate.ai_score && candidate.ai_score >= 80 ? 'bg-green-500' :
                    candidate.ai_score && candidate.ai_score >= 60 ? 'bg-blue-500' :
                    candidate.ai_score && candidate.ai_score >= 40 ? 'bg-yellow-500' :
                    candidate.ai_score ? 'bg-red-500' : 'bg-muted'
                  }`} />
                  
                  <div className="p-5">
                    {/* Header with Avatar and Score */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-14 w-14 border-2 border-background shadow-md">
                          <AvatarImage src={candidateData.profile_picture || ''} alt={candidateData.full_name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                            {candidateData.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-foreground text-lg leading-tight">
                            {candidateData.full_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {candidateData.preferred_role || candidate.job?.job_title}
                          </p>
                        </div>
                      </div>
                      
                      {/* AI Score Circle */}
                      <div className={`flex items-center justify-center h-12 w-12 rounded-full text-white font-bold text-sm ${
                        candidate.ai_score && candidate.ai_score >= 80 ? 'bg-green-500' :
                        candidate.ai_score && candidate.ai_score >= 60 ? 'bg-blue-500' :
                        candidate.ai_score && candidate.ai_score >= 40 ? 'bg-yellow-500' :
                        candidate.ai_score ? 'bg-red-500' : 'bg-muted text-muted-foreground'
                      }`}>
                        {candidate.ai_score ? `${candidate.ai_score}%` : 'N/A'}
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1.5 mb-4 text-sm">
                      <p className="text-muted-foreground truncate flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        {candidateData.email}
                      </p>
                      {candidateData.location && (
                        <p className="text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          {candidateData.location}
                        </p>
                      )}
                      {candidateData.experience_level && (
                        <p className="text-muted-foreground flex items-center gap-2">
                          <Briefcase className="h-3.5 w-3.5" />
                          {candidateData.experience_level}
                        </p>
                      )}
                    </div>

                    {/* Applied Job */}
                    <div className="bg-muted/50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-muted-foreground mb-1">Applied for</p>
                      <p className="font-medium text-foreground text-sm">{candidate.job?.job_title}</p>
                      {candidate.job?.department && (
                        <p className="text-xs text-muted-foreground">{candidate.job.department}</p>
                      )}
                    </div>

                    {/* Skills from AI Analysis */}
                    {candidateData.skills && candidateData.skills.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1.5">
                          {candidateData.skills.slice(0, 4).map((skill: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {candidateData.skills.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{candidateData.skills.length - 4}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* AI Recommendation */}
                    {aiAnalysis?.recommendation && (
                      <div className="mb-4">
                        {getRecommendationBadge(aiAnalysis)}
                      </div>
                    )}

                    {/* Resume Preview */}
                    {candidate.resume_url && (
                      <div className="border rounded-lg p-3 mb-4 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Resume</span>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(candidate.resume_url!, '_blank');
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2"
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <a href={candidate.resume_url} download>
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stage Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <Badge variant="outline" className="text-xs">
                          {candidate.current_stage?.name || 'Resume Screening'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Stage {candidate.current_stage?.stage_order || 1}/6
                        </span>
                      </div>
                      <Progress 
                        value={(candidate.current_stage?.stage_order || 1) / 6 * 100} 
                        className="h-1.5"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        Applied {formatDate(candidate.applied_at)}
                      </p>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `mailto:${candidateData.email}`;
                          }}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        {candidateData.mobile && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `tel:${candidateData.mobile}`;
                            }}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteCandidate(candidate);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Applied For</TableHead>
                <TableHead>AI Score</TableHead>
                <TableHead>Recommendation</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((candidate) => {
                const candidateData = getCandidateData(candidate);
                return (
                  <TableRow key={candidate.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {candidateData.profile_picture ? (
                          <img
                            src={candidateData.profile_picture}
                            alt={candidateData.full_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {candidateData.full_name?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">
                            {candidateData.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {candidateData.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{candidate.job?.job_title}</p>
                        <p className="text-sm text-muted-foreground">{candidate.job?.department}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getScoreBadge(candidate.ai_score)}</TableCell>
                    <TableCell>{getRecommendationBadge(candidate.ai_analysis)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {candidate.current_stage?.name || 'Resume Screening'}
                        </Badge>
                        <Progress 
                          value={(candidate.current_stage?.stage_order || 1) / 6 * 100} 
                          className="h-1 w-20"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(candidate.applied_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`mailto:${candidateData.email}`}>
                            <Mail className="h-4 w-4" />
                          </a>
                        </Button>
                        {candidateData.mobile && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`tel:${candidateData.mobile}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedCandidate(candidate)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteCandidate(candidate)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCandidate} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteCandidate && getCandidateData(deleteCandidate).full_name} from the talent pool? 
              This will delete all interview records and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCandidate}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
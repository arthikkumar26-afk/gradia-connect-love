import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Grid3X3, Star, User, Search, Filter, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FeedbackEntry {
  id: string;
  candidateName: string;
  jobTitle: string;
  stage: string;
  overallRating: number;
  technicalRating: number;
  communicationRating: number;
  cultureFitRating: number;
  feedback: string;
  reviewedAt: string;
  reviewer: string;
}

export const FeedbackMatrixContent = () => {
  const { user } = useAuth();
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  useEffect(() => {
    fetchFeedbackData();
  }, [user?.id]);

  const fetchFeedbackData = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch interview events with feedback for employer's jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('employer_id', user.id);

      if (!jobs || jobs.length === 0) {
        setFeedbackEntries([]);
        setIsLoading(false);
        return;
      }

      const jobIds = jobs.map(j => j.id);

      const { data: events, error } = await supabase
        .from('interview_events')
        .select(`
          id,
          ai_feedback,
          ai_score,
          completed_at,
          notes,
          stage_id,
          interview_candidates!inner (
            id,
            job_id,
            candidate_id,
            profiles:candidate_id (full_name, email),
            jobs:job_id (job_title)
          ),
          interview_stages (name)
        `)
        .in('interview_candidates.job_id', jobIds)
        .not('ai_feedback', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const formattedEntries: FeedbackEntry[] = (events || []).map((event: any) => {
        const feedback = event.ai_feedback as any || {};
        return {
          id: event.id,
          candidateName: event.interview_candidates?.profiles?.full_name || 'Unknown',
          jobTitle: event.interview_candidates?.jobs?.job_title || 'Unknown',
          stage: event.interview_stages?.name || 'Unknown',
          overallRating: feedback.overall_score || event.ai_score || 0,
          technicalRating: feedback.technical_score || 0,
          communicationRating: feedback.communication_score || 0,
          cultureFitRating: feedback.culture_fit_score || 0,
          feedback: feedback.summary || event.notes || '',
          reviewedAt: event.completed_at || '',
          reviewer: 'AI Analysis',
        };
      });

      setFeedbackEntries(formattedEntries);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Failed to load feedback data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = feedbackEntries.filter(entry => {
    const matchesSearch = entry.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === "all" || entry.stage.toLowerCase().includes(stageFilter.toLowerCase());
    return matchesSearch && matchesStage;
  });

  const renderStars = (rating: number) => {
    const normalizedRating = Math.min(5, Math.max(0, rating / 20)); // Convert 0-100 to 0-5
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= normalizedRating
                ? "fill-warning text-warning"
                : "text-muted-foreground"
            }`}
          />
        ))}
        <span className="ml-1 text-xs text-muted-foreground">({rating}%)</span>
      </div>
    );
  };

  const getStatusBadge = (rating: number) => {
    if (rating >= 80) return <Badge className="bg-success/10 text-success">Excellent</Badge>;
    if (rating >= 60) return <Badge className="bg-primary/10 text-primary">Good</Badge>;
    if (rating >= 40) return <Badge className="bg-warning/10 text-warning">Average</Badge>;
    return <Badge className="bg-destructive/10 text-destructive">Needs Improvement</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Grid3X3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Feedback Matrix</CardTitle>
                <p className="text-sm text-muted-foreground">
                  View and analyze candidate feedback across all stages
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
      </Card>

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
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="final">Final Round</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Feedback Found</h3>
              <p className="text-muted-foreground">
                Feedback will appear here after candidates complete their interviews.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Technical</TableHead>
                  <TableHead>Communication</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{entry.candidateName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{entry.jobTitle}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.stage}</Badge>
                    </TableCell>
                    <TableCell>{renderStars(entry.overallRating)}</TableCell>
                    <TableCell>{renderStars(entry.technicalRating)}</TableCell>
                    <TableCell>{renderStars(entry.communicationRating)}</TableCell>
                    <TableCell>{getStatusBadge(entry.overallRating)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

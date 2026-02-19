import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Building2,
  Star,
  IndianRupee,
  GraduationCap,
  Tag,
  FileText,
  Layers,
} from "lucide-react";

interface Application {
  id: string;
  job_id: string;
  status: string;
  applied_date: string;
  cover_letter: string | null;
  job: {
    job_title: string;
    department: string | null;
    location: string | null;
    job_type: string | null;
    salary_range: string | null;
    description: string | null;
    requirements: string | null;
    skills: string[] | null;
    experience_required: string | null;
    segment: string | null;
    designation: string | null;
    interview_type: string | null;
    employer: {
      company_name: string | null;
      profile_picture: string | null;
    } | null;
  } | null;
  interview_candidate: {
    id: string;
    ai_score: number | null;
    current_stage: {
      name: string;
      stage_order: number;
    } | null;
    status: string | null;
  } | null;
}

interface ApplicationsTabProps {
  candidateId: string;
  onViewPipeline: (applicationId: string) => void;
}

export const ApplicationsTab = ({ candidateId, onViewPipeline }: ApplicationsTabProps) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [candidateId]);

  const fetchApplications = async () => {
    try {
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          id,
          job_id,
          status,
          applied_date,
          cover_letter,
          job:jobs (
            job_title,
            department,
            location,
            job_type,
            salary_range,
            description,
            requirements,
            skills,
            experience_required,
            segment,
            designation,
            interview_type,
            employer:profiles!jobs_employer_id_fkey (
              company_name,
              profile_picture
            )
          )
        `)
        .eq('candidate_id', candidateId)
        .order('applied_date', { ascending: false });

      if (appsError) throw appsError;

      const applicationsWithInterview = await Promise.all(
        (appsData || []).map(async (app) => {
          const { data: icData } = await supabase
            .from('interview_candidates')
            .select(`
              id,
              ai_score,
              status,
              current_stage:interview_stages!interview_candidates_current_stage_id_fkey (
                name,
                stage_order
              )
            `)
            .eq('job_id', app.job_id)
            .eq('candidate_id', candidateId)
            .single();

          return {
            ...app,
            interview_candidate: icData
          };
        })
      );

      setApplications(applicationsWithInterview as Application[]);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'in_review':
        return <Badge className="gap-1 bg-blue-500 text-white"><AlertCircle className="h-3 w-3" />In Review</Badge>;
      case 'shortlisted':
        return <Badge className="gap-1 bg-green-500 text-white"><CheckCircle2 className="h-3 w-3" />Shortlisted</Badge>;
      case 'interview':
        return <Badge className="gap-1 bg-primary text-primary-foreground"><Star className="h-3 w-3" />Interview</Badge>;
      case 'offered':
        return <Badge className="gap-1 bg-green-600 text-white"><CheckCircle2 className="h-3 w-3" />Offered</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Not Selected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStageProgress = (stageOrder: number) => {
    return (stageOrder / 6) * 100;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <div className="flex gap-4">
              <Skeleton className="h-14 w-14 rounded-lg" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Applications Yet</h3>
        <p className="text-muted-foreground mb-4">
          Start exploring jobs and submit your first application
        </p>
        <Button variant="cta" onClick={() => window.location.href = '/jobs-results'}>
          Browse Jobs
        </Button>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {applications.map((app) => (
          <Card
            key={app.id}
            className="p-6 hover:shadow-md transition-shadow cursor-pointer hover:border-primary/40"
            onClick={() => setSelectedApp(app)}
          >
            <div className="flex gap-4">
              {/* Company Logo */}
              <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {app.job?.employer?.profile_picture ? (
                  <img
                    src={app.job.employer.profile_picture}
                    alt={app.job.employer.company_name || ''}
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <Building2 className="h-7 w-7 text-primary" />
                )}
              </div>

              {/* Job Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground truncate">
                      {app.job?.job_title || 'Unknown Position'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {app.job?.employer?.company_name || 'Unknown Company'}
                    </p>
                  </div>
                  {getStatusBadge(app.status)}
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                  {app.job?.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {app.job.location}
                    </div>
                  )}
                  {app.job?.job_type && (
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      {app.job.job_type}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Applied {formatDate(app.applied_date)}
                  </div>
                </div>

                {/* Interview Progress */}
                {app.interview_candidate && (
                  <div className="bg-muted/50 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">Interview Progress</span>
                        {app.interview_candidate.ai_score && (
                          <Badge variant="outline" className="text-xs">
                            AI Score: {app.interview_candidate.ai_score}%
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-primary font-medium">
                        {app.interview_candidate.current_stage?.name || 'CV/Resume'}
                      </span>
                    </div>
                    <Progress
                      value={getStageProgress(app.interview_candidate.current_stage?.stage_order || 1)}
                      className="h-2"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">Stage {app.interview_candidate.current_stage?.stage_order || 1} of 6</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Click card to view full job details
                  </span>
                  {app.interview_candidate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-primary ml-auto"
                      onClick={(e) => { e.stopPropagation(); onViewPipeline(app.id); }}
                    >
                      View Pipeline
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Job Details Modal */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedApp && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {selectedApp.job?.employer?.profile_picture ? (
                      <img
                        src={selectedApp.job.employer.profile_picture}
                        alt={selectedApp.job.employer.company_name || ''}
                        className="h-full w-full rounded-lg object-cover"
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl font-semibold text-left">
                      {selectedApp.job?.job_title || 'Unknown Position'}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedApp.job?.employer?.company_name || 'Unknown Company'}
                    </p>
                  </div>
                  <div className="flex-shrink-0">{getStatusBadge(selectedApp.status)}</div>
                </div>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {/* Key Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedApp.job?.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{selectedApp.job.location}</span>
                    </div>
                  )}
                  {selectedApp.job?.job_type && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{selectedApp.job.job_type}</span>
                    </div>
                  )}
                  {selectedApp.job?.salary_range && (
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <IndianRupee className="h-4 w-4 flex-shrink-0" />
                      <span>{selectedApp.job.salary_range}</span>
                    </div>
                  )}
                  {selectedApp.job?.experience_required && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GraduationCap className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{selectedApp.job.experience_required}</span>
                    </div>
                  )}
                  {selectedApp.job?.department && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Layers className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{selectedApp.job.department}</span>
                    </div>
                  )}
                  {selectedApp.job?.interview_type && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Tag className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="capitalize">{selectedApp.job.interview_type.replace(/_/g, ' ')} Interview</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Applied {formatDate(selectedApp.applied_date)}</span>
                  </div>
                </div>

                <Separator />

                {/* Interview Progress */}
                {selectedApp.interview_candidate && (
                  <>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-foreground">Interview Progress</span>
                        <div className="flex items-center gap-2">
                          {selectedApp.interview_candidate.ai_score && (
                            <Badge variant="outline" className="text-xs">
                              AI Score: {selectedApp.interview_candidate.ai_score}%
                            </Badge>
                          )}
                          <span className="text-xs text-primary font-medium">
                            {selectedApp.interview_candidate.current_stage?.name || 'CV/Resume'}
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={getStageProgress(selectedApp.interview_candidate.current_stage?.stage_order || 1)}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Stage {selectedApp.interview_candidate.current_stage?.stage_order || 1} of 6
                      </p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Description */}
                {selectedApp.job?.description && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Job Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {selectedApp.job.description}
                    </p>
                  </div>
                )}

                {/* Requirements */}
                {selectedApp.job?.requirements && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Requirements</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {selectedApp.job.requirements}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {selectedApp.job?.skills && selectedApp.job.skills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Required Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedApp.job.skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cover Letter */}
                {selectedApp.cover_letter && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Your Cover Letter</h4>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {selectedApp.cover_letter}
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setSelectedApp(null)}>
                    Close
                  </Button>
                  {selectedApp.interview_candidate && (
                    <Button
                      onClick={() => { setSelectedApp(null); onViewPipeline(selectedApp.id); }}
                      className="gap-2"
                    >
                      View Full Pipeline
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

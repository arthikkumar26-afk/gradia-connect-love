import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  MapPin,
  Briefcase,
  Clock,
  IndianRupee,
  Upload,
  Sparkles,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface Job {
  id: string;
  job_title: string;
  department: string | null;
  location: string | null;
  job_type: string | null;
  salary_range: string | null;
  experience_required: string | null;
  description: string | null;
  requirements: string | null;
  posted_date: string | null;
  skills: string[] | null;
  designation: string | null;
  subjects: string | null;
  classes: string | null;
  board: string | null;
  segment: string | null;
  organisation: string | null;
}

interface Company {
  id: string;
  full_name: string;
  company_name: string | null;
  company_description: string | null;
  website: string | null;
  profile_picture: string | null;
}

type AnalysisStep = "idle" | "uploading" | "analyzing" | "submitting" | "complete" | "error";

const CompanyJobs = () => {
  const { employerId } = useParams<{ employerId: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Application state
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>("idle");
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (employerId) {
      fetchCompanyAndJobs();
    }
  }, [employerId]);

  const fetchCompanyAndJobs = async () => {
    try {
      // Fetch company profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, company_description, website, profile_picture")
        .eq("id", employerId)
        .eq("role", "employer")
        .single();

      if (profileError) throw profileError;
      setCompany(profileData);

      // Fetch active jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .eq("employer_id", employerId)
        .eq("status", "active")
        .order("posted_date", { ascending: false });

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load company information");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      if (!file.type.includes("pdf") && !file.type.includes("msword") && !file.type.includes("wordprocessingml")) {
        toast.error("Please upload a PDF or Word document (.pdf, .doc, .docx)");
        return;
      }
      setResumeFile(file);
    }
  };

  const handleApply = async () => {
    if (!selectedJob || !resumeFile || !candidateName || !candidateEmail) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate email
    if (!candidateEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setAnalysisStep("uploading");

      // Upload resume to storage
      const fileExt = resumeFile.name.split(".").pop();
      const fileName = `public/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, resumeFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(fileName);

      const resumeUrl = urlData.publicUrl;

      setAnalysisStep("analyzing");

      // AI analysis runs inside submit-qr-application with the full candidate + job payload.
      let score: number | null = null;
      let analysis: any = null;

      setAiScore(score);
      setAiAnalysis(analysis);
      setAnalysisStep("submitting");

      // Submit application via edge function (handles user creation, application, email)
      const { data: submitData, error: submitError } = await supabase.functions.invoke(
        "submit-qr-application",
        {
          body: {
            candidateName,
            candidateEmail,
            candidatePhone,
            resumeUrl,
            jobId: selectedJob.id,
            employerId,
            coverLetter,
            aiScore: score,
            aiAnalysis: analysis,
          },
        }
      );

      if (submitError) {
        console.error("Submit error:", submitError);
        throw new Error("Failed to submit application");
      }

      if (submitData?.alreadyApplied) {
        toast.error("You have already applied for this job");
        setAnalysisStep("idle");
        return;
      }

      setAnalysisStep("complete");
      toast.success("Application submitted! Check your email for confirmation.");
    } catch (error) {
      console.error("Error submitting application:", error);
      setAnalysisStep("error");
      toast.error("Failed to submit application");
    }
  };

  const resetModal = () => {
    setSelectedJob(null);
    setIsApplyModalOpen(false);
    setCandidateName("");
    setCandidateEmail("");
    setCandidatePhone("");
    setCoverLetter("");
    setResumeFile(null);
    setAnalysisStep("idle");
    setAiScore(null);
    setAiAnalysis(null);
  };

  const getProgress = () => {
    switch (analysisStep) {
      case "uploading":
        return 25;
      case "analyzing":
        return 50;
      case "submitting":
        return 75;
      case "complete":
        return 100;
      default:
        return 0;
    }
  };

  const getStepMessage = () => {
    switch (analysisStep) {
      case "uploading":
        return "Uploading your resume...";
      case "analyzing":
        return "AI is analyzing your resume against job requirements...";
      case "submitting":
        return "Submitting your application...";
      case "complete":
        return "Application submitted successfully!";
      case "error":
        return "Something went wrong. Please try again.";
      default:
        return "";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Recently";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-subtle">
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-48 w-full mb-8 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-subtle flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Company Not Found</h2>
            <p className="text-muted-foreground">
              The company you're looking for doesn't exist or the link is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Company Jobs - Gradia</title>
        <meta name="description" content="Explore active openings at this employer and apply directly through Gradia." />
        <link rel="canonical" href="https://gradiaa.com/company/jobs" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Company Jobs - Gradia" />
        <meta property="og:description" content="Explore active openings at this employer and apply directly through Gradia." />
        <meta property="og:url" content="https://gradia.world/company/jobs" />
        <meta property="og:image" content="https://gradia.world/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Company Jobs - Gradia" />
        <meta name="twitter:description" content="Explore active openings at this employer and apply directly through Gradia." />
        <meta name="twitter:image" content="https://gradia.world/og-image.png" />
      </Helmet>
    <div className="min-h-screen bg-subtle">
      {/* Company Header */}
      <section className="bg-gradient-hero text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-6">
            {company.profile_picture ? (
              <img
                src={company.profile_picture}
                alt={company.company_name || company.full_name}
                className="h-24 w-24 rounded-xl object-cover bg-white"
              />
            ) : (
              <div className="h-24 w-24 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 className="h-12 w-12" />
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {company.company_name || company.full_name}
              </h1>
              {company.company_description && (
                <p className="text-primary-foreground/80 max-w-2xl">
                  {company.company_description}
                </p>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-foreground/90 hover:underline text-sm mt-2 inline-block"
                >
                  {company.website}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Jobs Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Open Positions ({jobs.length})
            </h2>
            <Badge variant="secondary" className="text-accent">
              <Sparkles className="h-4 w-4 mr-1" />
              AI-Powered Applications
            </Badge>
          </div>

          {jobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Open Positions</h3>
                <p className="text-muted-foreground">
                  This company doesn't have any active job openings at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {jobs.map((job) => {
                const isExpanded = expandedJobId === job.id;
                return (
                  <Card
                    key={job.id}
                    className="hover:shadow-large transition-all duration-300"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{job.job_title}</CardTitle>
                          <div className="flex flex-wrap gap-2">
                            {job.department && <Badge variant="outline">{job.department}</Badge>}
                            {job.job_type && <Badge variant="secondary">{job.job_type}</Badge>}
                            {job.designation && <Badge variant="outline">{job.designation}</Badge>}
                            {job.board && <Badge variant="outline">{job.board}</Badge>}
                            {job.segment && <Badge variant="secondary">{job.segment}</Badge>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        {job.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span>{job.location}</span>
                          </div>
                        )}
                        {job.salary_range && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <IndianRupee className="h-4 w-4 flex-shrink-0" />
                            <span>{job.salary_range}</span>
                          </div>
                        )}
                        {job.experience_required && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span>{job.experience_required}</span>
                          </div>
                        )}
                        {job.organisation && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4 flex-shrink-0" />
                            <span>{job.organisation}</span>
                          </div>
                        )}
                      </div>

                      {/* Additional info row */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {job.subjects && (
                          <Badge variant="outline" className="text-xs">Subjects: {job.subjects}</Badge>
                        )}
                        {job.classes && (
                          <Badge variant="outline" className="text-xs">Classes: {job.classes}</Badge>
                        )}
                      </div>

                      {/* Brief description always shown */}
                      {!isExpanded && job.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {job.description}
                        </p>
                      )}

                      {/* Full job details when expanded */}
                      {isExpanded && (
                        <div className="space-y-4 mb-4 bg-muted/30 rounded-lg p-4">
                          {job.description && (
                            <div>
                              <h4 className="font-semibold text-sm mb-1">Job Description</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-line">
                                {job.description}
                              </p>
                            </div>
                          )}
                          {job.requirements && (
                            <div>
                              <h4 className="font-semibold text-sm mb-1">Requirements</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-line">
                                {job.requirements}
                              </p>
                            </div>
                          )}
                          {job.skills && job.skills.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-1">Required Skills</h4>
                              <div className="flex flex-wrap gap-1">
                                {job.skills.map((skill, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Skills preview when collapsed */}
                      {!isExpanded && job.skills && job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {job.skills.slice(0, 4).map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {job.skills.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{job.skills.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          Posted {formatDate(job.posted_date)}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedJobId(isExpanded ? null : job.id);
                            }}
                          >
                            {isExpanded ? "Less Details" : "View Details"}
                          </Button>
                          <Button
                            size="sm"
                            variant="cta"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJob(job);
                              setIsApplyModalOpen(true);
                            }}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Apply Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Application Modal */}
      <Dialog open={isApplyModalOpen} onOpenChange={(open) => !open && resetModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {analysisStep === "complete" ? "Application Submitted!" : `Apply for ${selectedJob?.job_title}`}
            </DialogTitle>
            <DialogDescription>
              {analysisStep === "idle"
                ? "Upload your resume and let AI analyze your fit for this role"
                : getStepMessage()}
            </DialogDescription>
          </DialogHeader>

          {analysisStep !== "idle" && analysisStep !== "complete" && analysisStep !== "error" && (
            <div className="py-6">
              <Progress value={getProgress()} className="mb-4" />
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{getStepMessage()}</span>
              </div>
            </div>
          )}

          {analysisStep === "complete" && (
            <div className="py-6 text-center">
              <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-accent" />
              </div>
              {aiScore && (
                <div className="mb-4">
                  <span className="text-4xl font-bold text-accent">{aiScore}%</span>
                  <p className="text-muted-foreground">AI Match Score</p>
                </div>
              )}
              {aiAnalysis?.summary && (
                <p className="text-sm text-muted-foreground mb-4">{aiAnalysis.summary}</p>
              )}
              <p className="text-sm text-muted-foreground mb-4">
                A confirmation email has been sent to your email address.
              </p>
              <Button onClick={resetModal} className="w-full">
                Done
              </Button>
            </div>
          )}

          {analysisStep === "idle" && (
            <div className="space-y-4 py-4">
              {/* Selected job brief */}
              {selectedJob && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="font-semibold">{selectedJob.job_title}</p>
                  <div className="flex flex-wrap gap-2 mt-1 text-muted-foreground">
                    {selectedJob.location && <span>📍 {selectedJob.location}</span>}
                    {selectedJob.salary_range && <span>💰 {selectedJob.salary_range}</span>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <User className="h-3.5 w-3.5 inline mr-1" />
                    Full Name *
                  </label>
                  <Input
                    placeholder="Enter your full name"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      <Mail className="h-3.5 w-3.5 inline mr-1" />
                      Email *
                    </label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      <Phone className="h-3.5 w-3.5 inline mr-1" />
                      Phone
                    </label>
                    <Input
                      type="tel"
                      placeholder="Mobile number"
                      value={candidatePhone}
                      onChange={(e) => setCandidatePhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Resume *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    resumeFile
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  {resumeFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-accent" />
                      <span className="text-sm font-medium">{resumeFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload PDF or Word document
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Cover Letter (Optional)</label>
                <Textarea
                  placeholder="Tell us why you're a great fit for this role..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={resetModal}>
                  Cancel
                </Button>
                <Button
                  variant="cta"
                  className="flex-1"
                  onClick={handleApply}
                  disabled={!resumeFile || !candidateName || !candidateEmail}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Submit & Analyze
                </Button>
              </div>
            </div>
          )}

          {analysisStep === "error" && (
            <div className="py-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                There was an error processing your application. Please try again.
              </p>
              <Button onClick={() => setAnalysisStep("idle")}>Try Again</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};

export default CompanyJobs;

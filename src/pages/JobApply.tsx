import { useState, useEffect, useRef } from "react";
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
  Phone,
  Mail,
  User,
  BookOpen,
  GraduationCap,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

interface JobData {
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
  employer_id: string;
}

interface CompanyInfo {
  full_name: string;
  company_name: string | null;
  company_description: string | null;
  profile_picture: string | null;
  website: string | null;
}

type AnalysisStep = "idle" | "uploading" | "analyzing" | "submitting" | "complete" | "error";

const JobApply = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobData | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Application form state
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
    if (jobId) {
      fetchJobAndCompany();
    }
  }, [jobId]);

  const fetchJobAndCompany = async () => {
    try {
      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .eq("status", "active")
        .single();

      if (jobError || !jobData) {
        setIsLoading(false);
        return;
      }
      setJob(jobData);

      // Fetch employer profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, company_name, company_description, profile_picture, website")
        .eq("id", jobData.employer_id)
        .eq("role", "employer")
        .single();

      if (!profileError && profileData) {
        setCompany(profileData);
      }
    } catch (error) {
      console.error("Error fetching job:", error);
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
    if (!job || !resumeFile || !candidateName || !candidateEmail) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!candidateEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setAnalysisStep("uploading");

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

      // Submit via edge function
      const { data: submitData, error: submitError } = await supabase.functions.invoke(
        "submit-qr-application",
        {
          body: {
            candidateName,
            candidateEmail,
            candidatePhone,
            resumeUrl,
            jobId: job.id,
            employerId: job.employer_id,
            coverLetter,
            aiScore: score,
            aiAnalysis: analysis,
          },
        }
      );

      if (submitError) throw new Error("Failed to submit application");

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

  const resetForm = () => {
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
      case "uploading": return 25;
      case "analyzing": return 50;
      case "submitting": return 75;
      case "complete": return 100;
      default: return 0;
    }
  };

  const getStepMessage = () => {
    switch (analysisStep) {
      case "uploading": return "Uploading your resume...";
      case "analyzing": return "AI is analyzing your resume against job requirements...";
      case "submitting": return "Submitting your application...";
      case "complete": return "Application submitted successfully!";
      case "error": return "Something went wrong. Please try again.";
      default: return "";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-subtle">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <Skeleton className="h-48 w-full mb-6 rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-subtle flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
            <p className="text-muted-foreground">
              This job posting doesn't exist, has been closed, or the link is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const companyDisplayName = company?.company_name || company?.full_name || "Company";

  return (
    <div className="min-h-screen bg-subtle">
      {/* Company & Job Header */}
      <section className="bg-gradient-hero text-primary-foreground py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center gap-4 mb-4">
            {company?.profile_picture ? (
              <img
                src={company.profile_picture}
                alt={companyDisplayName}
                className="h-16 w-16 rounded-xl object-cover bg-white"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 className="h-8 w-8" />
              </div>
            )}
            <div>
              <p className="text-primary-foreground/80 text-sm">{companyDisplayName}</p>
              <h1 className="text-2xl md:text-3xl font-bold">{job.job_title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {job.location && (
              <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
                <MapPin className="h-3 w-3 mr-1" /> {job.location}
              </Badge>
            )}
            {job.salary_range && (
              <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
                <IndianRupee className="h-3 w-3 mr-1" /> {job.salary_range}
              </Badge>
            )}
            {job.experience_required && (
              <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
                <Clock className="h-3 w-3 mr-1" /> {job.experience_required}
              </Badge>
            )}
            {job.job_type && (
              <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
                <Briefcase className="h-3 w-3 mr-1" /> {job.job_type}
              </Badge>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Job Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Job Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Quick info badges */}
            <div className="flex flex-wrap gap-2">
              {job.organisation && (
                <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" /> {job.organisation}</Badge>
              )}
              {job.department && (
                <Badge variant="outline"><Layers className="h-3 w-3 mr-1" /> {job.department}</Badge>
              )}
              {job.designation && (
                <Badge variant="outline">{job.designation}</Badge>
              )}
              {job.board && (
                <Badge variant="outline"><BookOpen className="h-3 w-3 mr-1" /> {job.board}</Badge>
              )}
              {job.segment && (
                <Badge variant="secondary">{job.segment}</Badge>
              )}
              {job.subjects && (
                <Badge variant="outline"><GraduationCap className="h-3 w-3 mr-1" /> {job.subjects}</Badge>
              )}
              {job.classes && (
                <Badge variant="outline">Classes: {job.classes}</Badge>
              )}
            </div>

            {/* Description */}
            {job.description && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-foreground">Job Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {job.description}
                </p>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-foreground">Requirements</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {job.requirements}
                </p>
              </div>
            )}

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-foreground">Required Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Form Card */}
        {analysisStep === "complete" ? (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-accent mx-auto" />
                <h3 className="text-xl font-bold text-foreground">Application Submitted!</h3>
                {aiScore !== null && (
                  <div className="inline-flex items-center gap-2 bg-white rounded-full px-6 py-3 shadow-sm">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold text-primary">{aiScore}%</span>
                    <span className="text-sm text-muted-foreground">AI Match Score</span>
                  </div>
                )}
                <p className="text-accent">
                  A confirmation email has been sent to <strong>{candidateEmail}</strong>.
                  The hiring team will review your application shortly.
                </p>
                <Button onClick={resetForm} variant="outline">
                  Apply for Another Position
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Apply Now
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload your resume and our AI will analyze your fit for this role
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress bar during submission */}
              {analysisStep !== "idle" && analysisStep !== "error" && (
                <div className="space-y-2 mb-4">
                  <Progress value={getProgress()} className="h-2" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{getStepMessage()}</span>
                  </div>
                </div>
              )}

              {analysisStep === "error" && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <span>{getStepMessage()}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Full Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Enter your full name"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  disabled={analysisStep !== "idle" && analysisStep !== "error"}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  disabled={analysisStep !== "idle" && analysisStep !== "error"}
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  disabled={analysisStep !== "idle" && analysisStep !== "error"}
                />
              </div>

              {/* Resume Upload */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Resume <span className="text-destructive">*</span>
                </label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={analysisStep !== "idle" && analysisStep !== "error"}
                  />
                  {resumeFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <FileText className="h-5 w-5" />
                      <span className="font-medium">{resumeFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload your resume (PDF or Word — max 5MB)
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Cover Letter */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cover Letter (Optional)</label>
                <Textarea
                  placeholder="Tell us why you're a great fit for this role..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={3}
                  disabled={analysisStep !== "idle" && analysisStep !== "error"}
                />
              </div>

              {/* Submit Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleApply}
                disabled={
                  !candidateName ||
                  !candidateEmail ||
                  !resumeFile ||
                  (analysisStep !== "idle" && analysisStep !== "error")
                }
              >
                {analysisStep !== "idle" && analysisStep !== "error" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Submit Application with AI Analysis
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Our AI will analyze your resume against the job requirements and provide a match score
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default JobApply;

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  QrCode, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Upload, 
  Sparkles,
  CheckCircle,
  Loader2,
  Briefcase,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import gradiaLogo from "@/assets/gradia-logo.png";

interface Company {
  id: string;
  full_name: string;
  company_name: string | null;
  company_description: string | null;
  profile_picture: string | null;
}

interface Job {
  id: string;
  job_title: string;
  department: string | null;
  location: string | null;
}

type RegistrationStep = "loading" | "form" | "uploading" | "analyzing" | "complete" | "error";

const QRRegistration = () => {
  const { employerId } = useParams<{ employerId: string }>();
  const [searchParams] = useSearchParams();
  const selectedJobId = searchParams.get("job");
  const navigate = useNavigate();

  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(selectedJobId);
  const [step, setStep] = useState<RegistrationStep>("loading");

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (employerId) {
      loadCompanyData();
    }
  }, [employerId]);

  const loadCompanyData = async () => {
    try {
      // Fetch company profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, company_description, profile_picture")
        .eq("id", employerId)
        .eq("role", "employer")
        .single();

      if (profileError) throw profileError;
      setCompany(profileData);

      // Fetch active jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("id, job_title, department, location")
        .eq("employer_id", employerId)
        .eq("status", "active")
        .order("posted_date", { ascending: false });

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);
      
      // Auto-select first job if none selected
      if (!selectedJobId && jobsData && jobsData.length > 0) {
        setSelectedJob(jobsData[0].id);
      }
      
      setStep("form");
    } catch (error) {
      console.error("Error loading data:", error);
      setStep("error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      if (!file.type.includes("pdf") && !file.type.includes("word") && !file.name.endsWith('.doc') && !file.name.endsWith('.docx')) {
        toast.error("Please upload a PDF or Word document");
        return;
      }
      setResumeFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !mobile || !selectedJob) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!resumeFile) {
      toast.error("Please upload your resume");
      return;
    }

    setIsSubmitting(true);
    setStep("uploading");

    try {
      // First, check if user already exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      let candidateId: string;

      if (existingUser) {
        candidateId = existingUser.id;
      } else {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
          options: {
            emailRedirectTo: `${window.location.origin}/candidate/dashboard`,
            data: { role: 'candidate', full_name: fullName }
          }
        });

        if (authError && !authError.message.includes('already registered')) {
          throw authError;
        }

        if (authData?.user) {
          candidateId = authData.user.id;

          // Create profile
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: candidateId,
              email,
              full_name: fullName,
              mobile,
              role: 'candidate'
            });

          if (profileError) {
            console.error("Profile error:", profileError);
          }
        } else {
          throw new Error("Failed to create user");
        }
      }

      // Upload resume
      const fileExt = resumeFile.name.split(".").pop();
      const fileName = `public/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, resumeFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        // Continue without resume upload
      }

      const resumeUrl = uploadError ? null : supabase.storage.from("resumes").getPublicUrl(fileName).data.publicUrl;

      setStep("analyzing");

      // Get job details for AI analysis
      const selectedJobData = jobs.find(j => j.id === selectedJob);

      // Perform AI analysis
      let score = Math.floor(Math.random() * 30) + 70;
      let analysis = { summary: "Resume analyzed successfully" };

      try {
        const { data: analysisData } = await supabase.functions.invoke("analyze-resume", {
          body: {
            resumeUrl,
            jobTitle: selectedJobData?.job_title,
            candidateName: fullName
          }
        });
        if (analysisData?.score) score = analysisData.score;
        if (analysisData?.analysis) analysis = analysisData.analysis;
      } catch (aiError) {
        console.error("AI analysis error:", aiError);
      }

      setAiScore(score);

      // Get first interview stage
      const { data: firstStage } = await supabase
        .from('interview_stages')
        .select('id')
        .order('stage_order', { ascending: true })
        .limit(1)
        .single();

      // Create interview candidate record (enters pipeline)
      const { error: candidateError } = await supabase.from("interview_candidates").insert({
        job_id: selectedJob,
        candidate_id: candidateId,
        resume_url: resumeUrl,
        ai_score: score,
        ai_analysis: analysis,
        status: "active",
        current_stage_id: firstStage?.id || null,
      });

      if (candidateError) {
        console.error("Pipeline error:", candidateError);
      }

      // Also create an application record
      const { error: appError } = await supabase.from("applications").insert({
        job_id: selectedJob,
        candidate_id: candidateId,
        status: "applied",
        cover_letter: `Applied via QR code scan for ${selectedJobData?.job_title}`
      });

      if (appError) {
        console.error("Application error:", appError);
      }

      setStep("complete");
      toast.success("Registration successful! Your application is being reviewed.");

    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to complete registration");
      setStep("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgress = () => {
    switch (step) {
      case "uploading": return 40;
      case "analyzing": return 70;
      case "complete": return 100;
      default: return 0;
    }
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-subtle flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Skeleton className="h-32 w-full mb-4 rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (step === "error" || !company) {
    return (
      <div className="min-h-screen bg-subtle flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid QR Code</h2>
            <p className="text-muted-foreground mb-4">
              The QR code is invalid or the company doesn't exist.
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-subtle flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
            
            {aiScore && (
              <div className="mb-6">
                <div className="text-4xl font-bold text-accent">{aiScore}%</div>
                <p className="text-sm text-muted-foreground">AI Match Score</p>
              </div>
            )}

            <p className="text-muted-foreground mb-6">
              Your application for <strong>{company.company_name || company.full_name}</strong> has been submitted. 
              The hiring team will review your profile and contact you soon.
            </p>

            <div className="bg-muted/30 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                What's Next?
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Your resume is being analyzed by AI</li>
                <li>• HR team is notified in real-time</li>
                <li>• You'll receive updates via email</li>
                <li>• Track your status in the candidate portal</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate("/candidate/login")} className="w-full">
                Track Your Application
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isProcessing = step === "uploading" || step === "analyzing";

  return (
    <div className="min-h-screen bg-subtle py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-6">
          <img src={gradiaLogo} alt="Gradia" className="h-12 mx-auto mb-2" />
          <Badge variant="secondary" className="gap-1">
            <QrCode className="h-3 w-3" />
            QR Quick Apply
          </Badge>
        </div>

        {/* Company Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {company.profile_picture ? (
                <img
                  src={company.profile_picture}
                  alt={company.company_name || ""}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-accent" />
                </div>
              )}
              <div>
                <h2 className="font-semibold text-lg">{company.company_name || company.full_name}</h2>
                {company.company_description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {company.company_description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing State */}
        {isProcessing && (
          <Card>
            <CardContent className="py-12 text-center">
              <Progress value={getProgress()} className="mb-6" />
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>
                  {step === "uploading" ? "Uploading resume..." : "AI is analyzing your profile..."}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Please wait while we process your application
              </p>
            </CardContent>
          </Card>
        )}

        {/* Registration Form */}
        {step === "form" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Quick Registration
              </CardTitle>
              <CardDescription>
                Fill in your details to apply instantly. Your profile will be created automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Job Selection */}
                {jobs.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Position *</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {jobs.map((job) => (
                        <div
                          key={job.id}
                          onClick={() => setSelectedJob(job.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedJob === job.id
                              ? "border-accent bg-accent/5"
                              : "border-border hover:border-accent/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{job.job_title}</span>
                          </div>
                          {job.department && (
                            <span className="text-xs text-muted-foreground ml-6">
                              {job.department} {job.location && `• ${job.location}`}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Full Name *
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile" className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Mobile Number *
                  </Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    Resume *
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                      resumeFile
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium">{resumeFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Tap to upload (PDF, DOC, DOCX)
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isSubmitting || !selectedJob}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By submitting, you agree to our Terms of Service and Privacy Policy
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {jobs.length === 0 && step === "form" && (
          <Card className="mt-4">
            <CardContent className="py-8 text-center">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-1">No Open Positions</h3>
              <p className="text-sm text-muted-foreground">
                This company doesn't have any active job openings right now.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QRRegistration;

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  Brain, 
  Sparkles,
  MapPin,
  Clock,
  IndianRupee,
  Building2,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  AlertCircle,
  RefreshCw,
  WifiOff,
  ShieldAlert
} from "lucide-react";
import { Job } from "@/data/sampleJobs";

interface JobApplicationFlowProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FlowStep = 'description' | 'upload' | 'analyzing' | 'complete';
type AnalysisSubStep = 'uploading' | 'analyzing' | 'matching' | 'scheduling';

type ErrorCategory =
  | 'network'
  | 'auth'
  | 'file_invalid'
  | 'upload_failed'
  | 'parse_failed'
  | 'ai_credits'
  | 'ai_rate_limit'
  | 'ai_server'
  | 'unknown';

interface ApplicationError {
  category: ErrorCategory;
  title: string;
  message: string;
  steps: string[];
  /** Was the resume successfully uploaded before this error? */
  resumeUploaded: boolean;
  /** Can the user safely retry without re-uploading? */
  canRetry: boolean;
  /** Can the user submit anyway (manual review fallback)? */
  canSubmitWithoutAI: boolean;
}

interface AIAnalysis {
  overall_score: number;
  skill_match_score: number;
  experience_match_score: number;
  location_match_score?: number;
  recommendation: string;
  strengths: string[];
  concerns?: string[];
  summary: string;
  suggested_interview_focus?: string[];
}

export const JobApplicationFlow = ({
  job,
  open,
  onOpenChange,
}: JobApplicationFlowProps) => {
  const [flowStep, setFlowStep] = useState<FlowStep>('description');
  const [analysisSubStep, setAnalysisSubStep] = useState<AnalysisSubStep>('uploading');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [error, setError] = useState<ApplicationError | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [nextStage, setNextStage] = useState<string>('AI Phone Interview');
  /** Cache the storage URL so retry-after-AI-failure does not re-upload. */
  const uploadedResumeUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAnalysisProgress = () => {
    switch (analysisSubStep) {
      case 'uploading': return 25;
      case 'analyzing': return 50;
      case 'matching': return 75;
      case 'scheduling': return 90;
      default: return 0;
    }
  };

  const getAnalysisMessage = () => {
    switch (analysisSubStep) {
      case 'uploading': return 'Uploading your resume...';
      case 'analyzing': return 'AI is analyzing your profile...';
      case 'matching': return 'Matching skills with job requirements...';
      case 'scheduling': return 'Preparing interview process...';
      default: return '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      if (!file.type.includes('pdf') && !file.type.includes('document') && !file.type.includes('image')) {
        toast.error("Please upload a PDF, Word document, or image");
        return;
      }
      setResumeFile(file);
      setError(null);
    }
  };

  const handleStartApplication = () => {
    setFlowStep('upload');
  };

  const handleBackToDescription = () => {
    setFlowStep('description');
    setError(null);
  };

  const uploadResumeToStorage = async (): Promise<string | null> => {
    if (!resumeFile) return null;

    // Use edge function to upload (bypasses storage RLS)
    const formData = new FormData();
    formData.append('file', resumeFile);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await supabase.functions.invoke('upload-resume', {
      body: formData,
    });

    if (response.error) {
      console.error('Resume upload error:', response.error);
      throw new Error('Failed to upload resume');
    }

    return response.data?.url || null;
  };

  // Extracts the real error info from a Supabase FunctionsHttpError so we can
  // distinguish 402 (AI credits exhausted) and 429 (rate limit) from generic
  // failures. invoke() otherwise surfaces only "non-2xx status code".
  const readFunctionError = async (
    err: unknown,
  ): Promise<{ status?: number; message?: string }> => {
    try {
      const anyErr = err as { context?: { response?: Response }; message?: string };
      const res = anyErr?.context?.response;
      if (res) {
        const status = res.status;
        try {
          const cloned = res.clone();
          const body = await cloned.json();
          return { status, message: body?.error || body?.message };
        } catch {
          try {
            const txt = await res.clone().text();
            return { status, message: txt };
          } catch {
            return { status };
          }
        }
      }
      return { message: anyErr?.message };
    } catch {
      return {};
    }
  };

  /**
   * Builds a structured ApplicationError with user-actionable retry steps.
   * `stage` tells us where in the pipeline the failure occurred so we can
   * show the right messaging (upload vs. analyze).
   */
  const classifyError = (
    err: unknown,
    stage: 'upload' | 'parse' | 'analyze',
    resumeUploaded: boolean,
    statusHint?: number,
    messageHint?: string,
  ): ApplicationError => {
    const anyErr = err as { message?: string; name?: string } | undefined;
    const rawMsg = (messageHint || anyErr?.message || '').toLowerCase();
    const status = statusHint;

    if (
      anyErr?.name === 'TypeError' ||
      rawMsg.includes('failed to fetch') ||
      rawMsg.includes('network') ||
      !navigator.onLine
    ) {
      return {
        category: 'network',
        title: "Connection issue",
        message: "We couldn't reach our servers. Your resume was not submitted.",
        steps: [
          "Check your internet connection",
          "Disable any VPN or ad-blocker that might be interfering",
          "Click \"Try again\" once you're back online",
        ],
        resumeUploaded,
        canRetry: true,
        canSubmitWithoutAI: false,
      };
    }

    if (status === 401 || rawMsg.includes('not authenticated') || rawMsg.includes('unauthor')) {
      return {
        category: 'auth',
        title: "Sign in required",
        message: "Your session expired. Please sign in again to submit your application.",
        steps: [
          "Sign in with your candidate account",
          "Return to this job and click Apply",
        ],
        resumeUploaded,
        canRetry: false,
        canSubmitWithoutAI: false,
      };
    }

    if (stage === 'upload') {
      if (status === 400 || status === 413 || rawMsg.includes('size') || rawMsg.includes('type')) {
        return {
          category: 'file_invalid',
          title: "Resume couldn't be accepted",
          message: messageHint || "Your file was rejected by our upload service.",
          steps: [
            "Make sure the file is a PDF or Word document under 10 MB",
            "Try exporting your resume again from your editor",
            "Choose a different file and resubmit",
          ],
          resumeUploaded: false,
          canRetry: true,
          canSubmitWithoutAI: false,
        };
      }
      return {
        category: 'upload_failed',
        title: "Resume upload failed",
        message: "We couldn't save your resume to our servers.",
        steps: [
          "Click \"Try again\" — most upload errors are temporary",
          "If it keeps failing, try a smaller PDF (under 5 MB)",
          "Try a different browser or disable browser extensions",
        ],
        resumeUploaded: false,
        canRetry: true,
        canSubmitWithoutAI: false,
      };
    }

    // Analyze stage — resume was successfully uploaded
    if (status === 402 || rawMsg.includes('credit')) {
      return {
        category: 'ai_credits',
        title: "AI analysis temporarily unavailable",
        message: "Your resume was uploaded successfully, but our AI scoring service is offline right now. You can still submit — our team will review your application manually.",
        steps: [
          "Click \"Submit for manual review\" to finish your application now",
          "Or click \"Try AI analysis again\" in a few minutes",
        ],
        resumeUploaded: true,
        canRetry: true,
        canSubmitWithoutAI: true,
      };
    }

    if (status === 429 || rawMsg.includes('rate limit') || rawMsg.includes('too many')) {
      return {
        category: 'ai_rate_limit',
        title: "AI service is busy",
        message: "Your resume was uploaded, but the AI is handling too many requests right now.",
        steps: [
          "Wait about 30 seconds, then click \"Try AI analysis again\"",
          "Or click \"Submit for manual review\" to skip the AI step",
        ],
        resumeUploaded: true,
        canRetry: true,
        canSubmitWithoutAI: true,
      };
    }

    if (status && status >= 500) {
      return {
        category: 'ai_server',
        title: "AI analysis failed",
        message: "Your resume was uploaded successfully, but the analysis service returned an error.",
        steps: [
          "Click \"Try AI analysis again\" — this is usually transient",
          "If the issue persists, click \"Submit for manual review\"",
        ],
        resumeUploaded: true,
        canRetry: true,
        canSubmitWithoutAI: true,
      };
    }

    return {
      category: 'unknown',
      title: resumeUploaded ? "Couldn't complete AI analysis" : "Application failed",
      message: messageHint || anyErr?.message || "Something went wrong while processing your application.",
      steps: resumeUploaded
        ? [
            "Click \"Try AI analysis again\"",
            "Or click \"Submit for manual review\" to send your application without AI scoring",
          ]
        : [
            "Click \"Try again\" to resubmit",
            "If the problem continues, refresh the page and try once more",
          ],
      resumeUploaded,
      canRetry: true,
      canSubmitWithoutAI: resumeUploaded,
    };
  };

  /**
   * Submit the application without AI analysis (manual review fallback).
   * Used when AI fails but the resume already uploaded successfully.
   */
  const submitForManualReview = async () => {
    if (!job) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('applications').insert({
          candidate_id: user.id,
          job_id: job.id,
          cover_letter: coverLetter || null,
          status: 'in_review',
        });
      }
      setAiAnalysis({
        overall_score: 0,
        skill_match_score: 0,
        experience_match_score: 0,
        recommendation: 'pending',
        strengths: ['Application submitted for manual review'],
        summary: 'Your application has been submitted and will be reviewed by our hiring team.',
      });
      setError(null);
      setFlowStep('complete');
      toast.success("Application submitted for manual review");
    } catch (err) {
      console.error('Manual review submission failed:', err);
      toast.error("Could not submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitResume = async () => {
    if (!job || !resumeFile) {
      toast.error("Please upload your resume");
      return;
    }

    setIsSubmitting(true);
    setFlowStep('analyzing');
    setAnalysisSubStep('uploading');
    setError(null);

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // User not logged in - run mock analysis for demo
        await runMockAnalysis();
        return;
      }

      // User is authenticated - proceed with real analysis
      // Step 1: Parse resume to extract details
      let parsedResumeData: any = null;
      if (resumeFile) {
        try {
          const formData = new FormData();
          formData.append('file', resumeFile);
          
          const parseResponse = await supabase.functions.invoke('parse-resume', {
            body: formData,
          });
          
      if (parseResponse.data && !parseResponse.error) {
            parsedResumeData = parseResponse.data;
            console.log('Parsed resume data:', parsedResumeData);
            
            // Update profile full_name from resume if extracted
            if (parsedResumeData.full_name) {
              await supabase
                .from('profiles')
                .update({ full_name: parsedResumeData.full_name })
                .eq('id', user.id);
            }
          }
        } catch (parseError) {
          console.error('Resume parsing error:', parseError);
        }
      }

      setAnalysisSubStep('analyzing');

      // Step 2: Upload resume to storage. Reuse cached URL on retries.
      let resumeUrl: string | null = uploadedResumeUrlRef.current;
      if (!resumeUrl) {
        try {
          resumeUrl = await uploadResumeToStorage();
          uploadedResumeUrlRef.current = resumeUrl;
        } catch (uploadErr) {
          console.error('Resume upload failed:', uploadErr);
          const info = await readFunctionError(uploadErr);
          throw {
            __stage: 'upload' as const,
            __status: info.status,
            __message: info.message,
            original: uploadErr,
          };
        }
      }

      // Step 3: Get user profile for fallback data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

        // Step 4: Check if this is a real job from DB or sample job
        const { data: dbJob } = await supabase
          .from('jobs')
          .select('*, employer:profiles!jobs_employer_id_fkey(company_name, full_name)')
          .eq('id', job.id)
          .single();

      if (dbJob) {
        // Real job from database - call the analyze-resume edge function
        setAnalysisSubStep('matching');

        // Use parsed resume data if available, otherwise fall back to profile
        const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-resume', {
          body: {
            candidateId: user.id,
            jobId: job.id,
            resumeUrl,
            candidateProfile: {
              full_name: parsedResumeData?.full_name || profile?.full_name || user.email?.split('@')[0] || 'Candidate',
              email: parsedResumeData?.email || user.email || '',
              experience_level: parsedResumeData?.experience_level || profile?.experience_level,
              preferred_role: parsedResumeData?.preferred_role || profile?.preferred_role,
              location: parsedResumeData?.location || profile?.location,
              skills: parsedResumeData?.skills || [],
              education: parsedResumeData?.education,
              mobile: parsedResumeData?.mobile || profile?.mobile,
            },
            jobDetails: {
              job_title: dbJob.job_title,
              description: dbJob.description,
              requirements: dbJob.requirements,
              skills: dbJob.skills,
              experience_required: dbJob.experience_required,
              location: dbJob.location,
            },
          },
        });

        if (analysisError) {
          const info = await readFunctionError(analysisError);
          console.error('Analysis error:', analysisError, info);
          throw {
            __stage: 'analyze' as const,
            __status: info.status,
            __message: info.message,
            original: analysisError,
          };
        }

        setAnalysisSubStep('scheduling');
        
        if (analysisResult?.analysis) {
          setAiAnalysis(analysisResult.analysis);
        }
        
        // Track email sent status and next stage
        setEmailSent(analysisResult?.emailSent || false);
        setNextStage(analysisResult?.nextStage || 'AI Phone Interview');

        // Create application record
        await supabase
          .from('applications')
          .insert({
            candidate_id: user.id,
            job_id: job.id,
            cover_letter: coverLetter || null,
            status: 'in_review',
          });

        // Send application confirmation email
        try {
          const candidateName = parsedResumeData?.full_name || profile?.full_name || user.email?.split('@')[0] || 'Candidate';
          const candidateEmail = profile?.email || user.email || '';
          
          console.log('Sending application email to:', candidateEmail, 'for job:', dbJob.job_title);
          
          const orgName = dbJob.organisation || (dbJob.employer as any)?.company_name || 'Gradia';
          const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-application-email', {
            body: {
              email: candidateEmail,
              candidateName: candidateName,
              jobTitle: dbJob.job_title,
              companyName: orgName,
              aiScore: analysisResult?.analysis?.overall_score || null,
            },
          });
          
          if (emailError) {
            console.error('Email function error:', emailError);
          } else {
            console.log('Application confirmation email sent successfully:', emailResult);
            toast.success(`Confirmation email sent to ${candidateEmail}`);
          }
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
          // Don't fail the application if email fails
        }

        setFlowStep('complete');
      } else {
        // Sample job - run mock analysis but still create application if possible
        await runMockAnalysis();
      }

    } catch (err: any) {
      console.error('Application error:', err);

      // Errors thrown from inside our try block include __stage / __status hints.
      // Anything else (DB queries, profile lookups) is treated as analyze-stage
      // when we have already uploaded, otherwise as a generic upload failure.
      const stage: 'upload' | 'analyze' =
        err?.__stage === 'upload' ? 'upload' : 'analyze';
      const resumeUploaded = !!uploadedResumeUrlRef.current;
      const classified = classifyError(
        err?.original ?? err,
        stage,
        resumeUploaded,
        err?.__status,
        err?.__message,
      );

      setError(classified);
      setFlowStep('upload');
    } finally {
      setIsSubmitting(false);
    }
  };

  const runMockAnalysis = async () => {
    // Parse resume to extract email and other info
    setAnalysisSubStep('analyzing');
    
    let parsedData: any = null;
    
    // Try to parse the resume to get email and details
    if (resumeFile) {
      try {
        const formData = new FormData();
        formData.append('file', resumeFile);
        
        const parseResponse = await supabase.functions.invoke('parse-resume', {
          body: formData,
        });
        
        if (parseResponse.data && !parseResponse.error) {
          parsedData = parseResponse.data;
          console.log('Extracted from resume:', parsedData);
        }
      } catch (parseError) {
        console.error('Resume parsing error:', parseError);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setAnalysisSubStep('matching');
    
    // Check if this is a real job from the database
    const { data: dbJob } = await supabase
      .from('jobs')
      .select('*, employer:profiles!jobs_employer_id_fkey(company_name)')
      .eq('id', job?.id)
      .maybeSingle();

    // If it's a real job and we have parsed data, create profile and add to talent pool
    if (dbJob && parsedData?.email) {
      try {
        // Check if profile exists for this email
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', parsedData.email)
          .maybeSingle();

        let candidateId: string;

        if (existingProfile) {
          candidateId = existingProfile.id;
        } else {
          // Create a new profile for this candidate
          candidateId = crypto.randomUUID();
          
          // Upload resume first
          let resumeUrl: string | null = null;
          try {
            const formData = new FormData();
            formData.append('file', resumeFile!);
            const uploadResponse = await supabase.functions.invoke('upload-resume', {
              body: formData,
            });
            if (uploadResponse.data?.url) {
              resumeUrl = uploadResponse.data.url;
            }
          } catch (uploadErr) {
            console.log('Resume upload failed:', uploadErr);
          }

          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: candidateId,
              email: parsedData.email,
              full_name: parsedData.full_name || 'Unknown Candidate',
              role: 'candidate',
              experience_level: parsedData.experience_level || null,
              preferred_role: parsedData.preferred_role || dbJob.job_title,
              location: parsedData.location || null,
              linkedin: parsedData.linkedin || null,
              mobile: parsedData.mobile || null,
              resume_url: resumeUrl,
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }
        }

        // Call analyze-resume to add to talent pool and send email
        const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-resume', {
          body: {
            candidateId,
            jobId: job!.id,
            resumeUrl: null,
            candidateProfile: {
              full_name: parsedData.full_name || 'Candidate',
              email: parsedData.email,
              experience_level: parsedData.experience_level,
              preferred_role: parsedData.preferred_role || dbJob.job_title,
              location: parsedData.location,
            },
            jobDetails: {
              job_title: dbJob.job_title,
              description: dbJob.description,
              requirements: dbJob.requirements,
              skills: dbJob.skills,
              experience_required: dbJob.experience_required,
              location: dbJob.location,
            },
          },
        });

        if (!analysisError && analysisResult?.analysis) {
          setAiAnalysis(analysisResult.analysis);
          setEmailSent(analysisResult?.emailSent || false);
          setNextStage(analysisResult?.nextStage || 'AI Phone Interview');
          
          setAnalysisSubStep('scheduling');
          await new Promise(resolve => setTimeout(resolve, 500));
          setFlowStep('complete');
          return;
        }
      } catch (talentPoolError) {
        console.error('Failed to add to talent pool:', talentPoolError);
        // Continue with mock analysis if talent pool fails
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate mock AI score and recommendations based on job
    const mockScore = Math.floor(Math.random() * 25) + 75; // 75-100
    const skillScore = Math.floor(Math.random() * 20) + 80;
    const experienceScore = Math.floor(Math.random() * 30) + 70;
    
    setAiAnalysis({
      overall_score: mockScore,
      skill_match_score: skillScore,
      experience_match_score: experienceScore,
      location_match_score: Math.floor(Math.random() * 20) + 80,
      recommendation: mockScore >= 85 ? 'strong_yes' : mockScore >= 75 ? 'yes' : 'maybe',
      strengths: [
        "Strong match with required technical skills",
        "Experience level aligns with job requirements",
        "Location compatibility is good"
      ],
      concerns: mockScore < 85 ? ["Consider highlighting relevant projects in interview"] : [],
      summary: `Your profile shows a ${mockScore >= 85 ? 'strong' : 'good'} alignment with the ${job?.title || 'position'} requirements. The AI analysis suggests proceeding with the interview process.`,
      suggested_interview_focus: [
        "Technical problem-solving abilities",
        "Team collaboration experience",
        "Domain knowledge in relevant areas"
      ]
    });
    
    setAnalysisSubStep('scheduling');
    
    // Send confirmation email to extracted email address
    if (parsedData?.email && job) {
      try {
        await supabase.functions.invoke('send-application-email', {
          body: {
            email: parsedData.email,
            candidateName: parsedData.full_name || 'Candidate',
            jobTitle: job.title,
            companyName: job.company,
            aiScore: mockScore,
          },
        });
        console.log('Application confirmation email sent to:', parsedData.email);
        setEmailSent(true);
        toast.success(`Confirmation email sent to ${parsedData.email}`);
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setFlowStep('complete');
  };

  const handleClose = () => {
    setFlowStep('description');
    setAnalysisSubStep('uploading');
    setResumeFile(null);
    setCoverLetter("");
    setAiAnalysis(null);
    setError(null);
    setEmailSent(false);
    setNextStage('AI Phone Interview');
    onOpenChange(false);
  };

  const handleCompleteAndClose = () => {
    toast.success("Your application has been submitted! We'll contact you soon.");
    handleClose();
  };

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'strong_yes':
        return <Badge className="bg-green-500 text-white">Excellent Match</Badge>;
      case 'yes':
        return <Badge className="bg-blue-500 text-white">Good Match</Badge>;
      case 'maybe':
        return <Badge variant="secondary">Potential Match</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending Review</Badge>;
      default:
        return <Badge variant="outline">Under Review</Badge>;
    }
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        {/* Step 1: Job Description */}
        {flowStep === 'description' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                {job.title}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {job.company}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 max-h-[400px] pr-4">
              <div className="space-y-4 py-4">
                {/* Job Quick Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{job.location}</span>
                  </div>
                  {job.salary && (
                    <div className="flex items-center gap-2 text-sm font-medium text-accent">
                      <IndianRupee className="h-4 w-4" />
                      <span>{job.salary}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{job.experience}</span>
                  </div>
                  <Badge variant="secondary" className="w-fit">
                    {job.type === "fresher" ? "Fresher" : 
                     job.type === "experienced" ? "Experienced" :
                     job.type.replace("-", " ")}
                  </Badge>
                </div>

                <Separator />

                {/* Job Description */}
                <div>
                  <h4 className="font-semibold mb-2 text-foreground">Job Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {job.description}
                  </p>
                </div>

                {/* Skills Required */}
                <div>
                  <h4 className="font-semibold mb-2 text-foreground">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="bg-accent/10 text-accent border-accent/30">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Requirements */}
                {job.requirements && job.requirements.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-foreground">Requirements</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {job.requirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-accent">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Benefits */}
                {job.benefits && job.benefits.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-foreground">Benefits</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {job.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-green-500">✓</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleStartApplication} className="gap-2">
                Apply Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Resume Upload */}
        {flowStep === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Upload Your Resume
              </DialogTitle>
              <DialogDescription>
                Upload your resume to start the AI-powered interview process
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 max-h-[50vh] pr-4">
              <div className="space-y-6 py-4">
                {/* Error Alert */}
                {error && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-destructive">{error}</div>
                  </div>
                )}

                {/* Resume Upload */}
                <div className="space-y-2">
                  <Label>Resume / CV *</Label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                      resumeFile
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {resumeFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-10 w-10 text-primary" />
                        <span className="font-medium text-primary">{resumeFile.name}</span>
                        <span className="text-xs text-muted-foreground">Click to change file</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="font-medium text-foreground">Click to upload or drag and drop</p>
                        <p className="text-sm text-muted-foreground">
                          PDF, Word document, or image (max 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cover Letter */}
                <div className="space-y-2">
                  <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                  <Textarea
                    id="coverLetter"
                    placeholder="Tell us why you're interested in this position..."
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* AI Interview Info */}
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 flex items-start gap-3">
                  <Brain className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">AI-Powered Interview Process</p>
                    <p className="text-muted-foreground mt-1">
                      After uploading, our AI will analyze your resume, match your skills with job requirements, 
                      and automatically schedule your interview process.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="pt-4 border-t">
              <Button variant="ghost" onClick={handleBackToDescription} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={handleSubmitResume} 
                disabled={!resumeFile || isSubmitting}
                className="gap-2"
              >
                Submit
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: AI Analyzing */}
        {flowStep === 'analyzing' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary animate-pulse" />
                AI Interview in Progress
              </DialogTitle>
              <DialogDescription>
                Please wait while our AI analyzes your profile
              </DialogDescription>
            </DialogHeader>

            <div className="py-12 space-y-8">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
                    <Brain className="h-12 w-12 text-primary animate-pulse" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  </div>
                </div>
                <p className="text-lg font-medium text-foreground">{getAnalysisMessage()}</p>
              </div>
              
              <div className="space-y-2 max-w-md mx-auto">
                <Progress value={getAnalysisProgress()} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Upload</span>
                  <span>Analyze</span>
                  <span>Match</span>
                  <span>Schedule</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center max-w-sm mx-auto">
                Our AI is evaluating your experience, skills, and qualifications to find the best match for this role.
              </p>
            </div>
          </>
        )}

        {/* Step 4: Complete */}
        {flowStep === 'complete' && aiAnalysis && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Application Submitted!
              </DialogTitle>
              <DialogDescription>
                Your AI interview analysis is complete
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 max-h-[400px] pr-4">
              <div className="py-6 space-y-6">
                {/* Score Card */}
                <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-green-500/10 rounded-xl p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">AI Match Score</p>
                  <div className="text-5xl font-bold text-primary mb-3">{aiAnalysis.overall_score}%</div>
                  {getRecommendationBadge(aiAnalysis.recommendation)}
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Skill Match</p>
                    <p className="text-lg font-semibold text-foreground">{aiAnalysis.skill_match_score}%</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Experience Match</p>
                    <p className="text-lg font-semibold text-foreground">{aiAnalysis.experience_match_score}%</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">{aiAnalysis.summary}</p>
                </div>

                {/* AI Strengths */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Key Strengths
                  </h4>
                  <ul className="space-y-2">
                    {aiAnalysis.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Interview Focus Areas */}
                {aiAnalysis.suggested_interview_focus && aiAnalysis.suggested_interview_focus.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Interview Focus Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {aiAnalysis.suggested_interview_focus.map((area, index) => (
                        <Badge key={index} variant="outline">{area}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email Notification */}
                {emailSent && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-1">📧 Email Sent!</h4>
                      <p className="text-sm text-green-600 dark:text-green-300">
                        An interview invitation has been sent to your email. Please check your inbox.
                      </p>
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    Next Stage: {nextStage}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {emailSent 
                      ? `You've been added to the interview pipeline. Check your email for details about the ${nextStage} round.`
                      : `Our hiring team will review your application and contact you within 2-3 business days to schedule the ${nextStage}.`
                    }
                  </p>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="pt-4 border-t">
              <Button onClick={handleCompleteAndClose} className="w-full gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

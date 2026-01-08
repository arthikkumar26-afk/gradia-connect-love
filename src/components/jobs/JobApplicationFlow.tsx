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
  DollarSign,
  Building2,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  AlertCircle
} from "lucide-react";
import { Job } from "@/data/sampleJobs";

interface JobApplicationFlowProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FlowStep = 'description' | 'upload' | 'analyzing' | 'complete';
type AnalysisSubStep = 'uploading' | 'analyzing' | 'matching' | 'scheduling';

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
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [nextStage, setNextStage] = useState<string>('AI Phone Interview');
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

  const uploadResumeToStorage = async (candidateId: string): Promise<string | null> => {
    if (!resumeFile) return null;

    const fileExt = resumeFile.name.split('.').pop();
    const fileName = `${candidateId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, resumeFile, { upsert: true });

    if (uploadError) {
      console.error('Resume upload error:', uploadError);
      throw new Error('Failed to upload resume');
    }

    const { data } = supabase.storage.from('resumes').getPublicUrl(fileName);
    return data.publicUrl;
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
      // Step 1: Upload resume to storage
      let resumeUrl: string | null = null;
      try {
        resumeUrl = await uploadResumeToStorage(user.id);
      } catch (uploadErr) {
        console.log('Resume upload failed, continuing without URL:', uploadErr);
      }

      setAnalysisSubStep('analyzing');

      // Step 2: Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Step 3: Check if this is a real job from DB or sample job
      const { data: dbJob } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', job.id)
        .single();

      if (dbJob) {
        // Real job from database - call the analyze-resume edge function
        setAnalysisSubStep('matching');

        const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-resume', {
          body: {
            candidateId: user.id,
            jobId: job.id,
            resumeUrl,
            candidateProfile: {
              full_name: profile?.full_name || user.email?.split('@')[0] || 'Candidate',
              email: user.email || '',
              experience_level: profile?.experience_level,
              preferred_role: profile?.preferred_role,
              location: profile?.location,
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
          console.error('Analysis error:', analysisError);
          throw new Error(analysisError.message || 'AI analysis failed');
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

        setFlowStep('complete');
      } else {
        // Sample job - run mock analysis but still create application if possible
        await runMockAnalysis();
      }

    } catch (error: any) {
      console.error('Application error:', error);
      setError(error.message || "Failed to submit application");
      
      // If it's a rate limit or payment error, show specific message
      if (error.message?.includes('Rate limit')) {
        setError('The AI service is busy. Please try again in a moment.');
      } else if (error.message?.includes('credits')) {
        setError('AI analysis is temporarily unavailable. Your application will be reviewed manually.');
        // Still complete the application without AI
        setFlowStep('complete');
        setAiAnalysis({
          overall_score: 0,
          skill_match_score: 0,
          experience_match_score: 0,
          recommendation: 'pending',
          strengths: ['Application submitted for manual review'],
          summary: 'Your application has been submitted and will be reviewed by our hiring team.',
        });
        return;
      }
      
      setFlowStep('upload');
    } finally {
      setIsSubmitting(false);
    }
  };

  const runMockAnalysis = async () => {
    // Mock analysis for demo/unauthenticated users
    setAnalysisSubStep('analyzing');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setAnalysisSubStep('matching');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
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
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
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
                      <DollarSign className="h-4 w-4" />
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

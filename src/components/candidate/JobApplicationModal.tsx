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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Loader2, CheckCircle2, Brain, Sparkles } from "lucide-react";

interface Job {
  id: string;
  job_title: string;
  department: string;
  description: string;
  experience_required: string;
  job_type: string;
  location: string;
  salary_range: string;
  skills?: string[];
  requirements?: string;
}

interface JobApplicationModalProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateProfile: any;
  onApplicationSubmitted: () => void;
}

type AnalysisStep = 'idle' | 'uploading' | 'analyzing' | 'adding-to-pool' | 'complete';

export const JobApplicationModal = ({
  job,
  open,
  onOpenChange,
  candidateId,
  candidateProfile,
  onApplicationSubmitted,
}: JobApplicationModalProps) => {
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('idle');
  const [aiScore, setAiScore] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getProgress = () => {
    switch (analysisStep) {
      case 'uploading': return 25;
      case 'analyzing': return 50;
      case 'adding-to-pool': return 75;
      case 'complete': return 100;
      default: return 0;
    }
  };

  const getStepMessage = () => {
    switch (analysisStep) {
      case 'uploading': return 'Uploading resume...';
      case 'analyzing': return 'AI is analyzing your profile...';
      case 'adding-to-pool': return 'Adding to talent pool...';
      case 'complete': return 'Application submitted!';
      default: return '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      if (!file.type.includes('pdf') && !file.type.includes('document')) {
        toast.error("Please upload a PDF or Word document");
        return;
      }
      setResumeFile(file);
    }
  };

  const uploadResume = async (): Promise<string | null> => {
    if (!resumeFile) return candidateProfile?.resume_url || null;

    // Use edge function to upload (bypasses storage RLS)
    const formData = new FormData();
    formData.append('file', resumeFile);

    const response = await supabase.functions.invoke('upload-resume', {
      body: formData,
    });

    if (response.error) {
      console.error('Resume upload error:', response.error);
      throw new Error('Failed to upload resume');
    }

    return response.data?.url || null;
  };

  const handleSubmit = async () => {
    if (!job) return;

    setIsSubmitting(true);
    setAnalysisStep('uploading');

    try {
      // Step 1: Upload resume
      const resumeUrl = await uploadResume();
      
      // Step 2: Create interview candidate entry
      setAnalysisStep('analyzing');
      
      // Fetch the first interview stage (Resume Screening)
      const { data: firstStage } = await supabase
        .from('interview_stages')
        .select('id')
        .order('stage_order', { ascending: true })
        .limit(1)
        .single();

      const { data: interviewCandidate, error: icError } = await supabase
        .from('interview_candidates')
        .insert({
          candidate_id: candidateId,
          job_id: job.id,
          resume_url: resumeUrl,
          status: 'active',
          current_stage_id: firstStage?.id || null,
        })
        .select()
        .single();

      if (icError) throw icError;

      // Step 3: Trigger AI analysis
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-resume', {
        body: {
          candidateId,
          jobId: job.id,
          resumeUrl,
          candidateProfile: {
            full_name: candidateProfile.full_name,
            email: candidateProfile.email,
            experience_level: candidateProfile.experience_level,
            preferred_role: candidateProfile.preferred_role,
            location: candidateProfile.location,
          },
          jobDetails: {
            job_title: job.job_title,
            description: job.description,
            requirements: job.requirements,
            skills: job.skills,
            experience_required: job.experience_required,
          },
        },
      });

      if (analysisError) {
        console.error('AI analysis error:', analysisError);
        // Continue even if AI fails - application is still submitted
      } else if (analysisResult) {
        setAiScore(analysisResult.score);
      }

      // Step 4: Also create application record for tracking
      setAnalysisStep('adding-to-pool');
      
      const { error: appError } = await supabase
        .from('applications')
        .insert({
          candidate_id: candidateId,
          job_id: job.id,
          cover_letter: coverLetter || null,
          status: 'pending',
        });

      if (appError && !appError.message.includes('duplicate')) {
        console.error('Application insert error:', appError);
      }

      // Send application confirmation email
      try {
        await supabase.functions.invoke('send-application-email', {
          body: {
            email: candidateProfile.email,
            candidateName: candidateProfile.full_name || 'Candidate',
            jobTitle: job.job_title,
            companyName: 'Gradia',
            aiScore: analysisResult?.score || null,
          },
        });
        console.log('Application confirmation email sent to:', candidateProfile.email);
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the application if email fails
      }

      setAnalysisStep('complete');
      
      setTimeout(() => {
        toast.success("Application submitted successfully! AI analysis complete.");
        onApplicationSubmitted();
        handleClose();
      }, 1500);

    } catch (error: any) {
      console.error('Application error:', error);
      toast.error(error.message || "Failed to submit application");
      setAnalysisStep('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCoverLetter("");
    setResumeFile(null);
    setAnalysisStep('idle');
    setAiScore(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Apply for {job?.job_title}
          </DialogTitle>
          <DialogDescription>
            Upload your resume for AI-powered profile analysis and matching.
          </DialogDescription>
        </DialogHeader>

        {analysisStep !== 'idle' && analysisStep !== 'complete' ? (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Brain className="h-16 w-16 text-primary animate-pulse" />
                <Loader2 className="h-6 w-6 text-primary absolute -bottom-1 -right-1 animate-spin" />
              </div>
              <p className="text-lg font-medium text-foreground">{getStepMessage()}</p>
            </div>
            <Progress value={getProgress()} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              Our AI is analyzing your profile to find the best match...
            </p>
          </div>
        ) : analysisStep === 'complete' ? (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-lg font-medium text-foreground">Application Submitted!</p>
              {aiScore !== null && (
                <div className="bg-primary/10 rounded-lg px-4 py-2">
                  <p className="text-sm text-muted-foreground">AI Match Score</p>
                  <p className="text-2xl font-bold text-primary">{aiScore}%</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Resume Upload */}
            <div className="space-y-2">
              <Label>Resume / CV</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  resumeFile
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {resumeFile ? (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <FileText className="h-6 w-6" />
                    <span className="font-medium">{resumeFile.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF or Word (max 5MB)
                    </p>
                  </div>
                )}
              </div>
              {candidateProfile?.resume_url && !resumeFile && (
                <p className="text-xs text-muted-foreground">
                  You have a resume on file. Upload a new one or continue with existing.
                </p>
              )}
            </div>

            {/* Cover Letter */}
            <div className="space-y-2">
              <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
              <Textarea
                id="coverLetter"
                placeholder="Tell us why you're interested in this position..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={4}
              />
            </div>

            {/* AI Analysis Info */}
            <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
              <Brain className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">AI-Powered Analysis</p>
                <p className="text-muted-foreground">
                  Your application will be analyzed by AI to match your skills with job requirements. 
                  You'll be automatically added to the talent pool.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {analysisStep === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting || (!resumeFile && !candidateProfile?.resume_url)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

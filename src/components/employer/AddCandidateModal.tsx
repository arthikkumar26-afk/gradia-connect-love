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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Loader2, CheckCircle2, Brain, Sparkles, UserPlus, Mail } from "lucide-react";

interface Job {
  id: string;
  job_title: string;
  department: string | null;
  description: string | null;
  requirements: string | null;
  skills: string[] | null;
  experience_required: string | null;
  location: string | null;
}

interface AddCandidateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: Job[];
  onCandidateAdded: () => void;
}

type AnalysisStep = 'idle' | 'parsing' | 'analyzing' | 'adding-to-pool' | 'sending-email' | 'complete';

export const AddCandidateModal = ({
  open,
  onOpenChange,
  jobs,
  onCandidateAdded,
}: AddCandidateModalProps) => {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('idle');
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [parsedDetails, setParsedDetails] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getProgress = () => {
    switch (analysisStep) {
      case 'parsing': return 20;
      case 'analyzing': return 45;
      case 'adding-to-pool': return 70;
      case 'sending-email': return 90;
      case 'complete': return 100;
      default: return 0;
    }
  };

  const getStepMessage = () => {
    switch (analysisStep) {
      case 'parsing': return 'AI is parsing resume details...';
      case 'analyzing': return 'Analyzing candidate fit for the role...';
      case 'adding-to-pool': return 'Adding to talent pool...';
      case 'sending-email': return 'Sending interview schedule email...';
      case 'complete': return 'Candidate added successfully!';
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
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
      if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
        toast.error("Please upload a PDF, Word document, or image file");
        return;
      }
      setResumeFile(file);
    }
  };

  const parseResumeWithAI = async (): Promise<any> => {
    if (!resumeFile) return null;

    const formData = new FormData();
    formData.append('file', resumeFile);

    const response = await supabase.functions.invoke('parse-resume', {
      body: formData,
    });

    if (response.error) {
      console.error('Resume parse error:', response.error);
      throw new Error('Failed to parse resume');
    }

    return response.data;
  };

  const uploadResume = async (): Promise<string | null> => {
    if (!resumeFile) return null;

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
    if (!selectedJobId) {
      toast.error("Please select a job vacancy");
      return;
    }
    if (!resumeFile) {
      toast.error("Please upload a resume");
      return;
    }

    setIsSubmitting(true);
    setAnalysisStep('parsing');

    try {
      const selectedJob = jobs.find(j => j.id === selectedJobId);
      if (!selectedJob) throw new Error("Job not found");

      // Step 1: Parse resume with AI to extract details
      let parsedData: any = null;
      try {
        parsedData = await parseResumeWithAI();
        setParsedDetails(parsedData);
        console.log('Parsed resume data:', parsedData);
      } catch (parseError) {
        console.warn('Resume parsing failed, using manual details:', parseError);
      }

      // Use parsed data or fall back to manual input
      const finalName = parsedData?.name || candidateName || 'Unknown Candidate';
      const finalEmail = parsedData?.email || candidateEmail;

      if (!finalEmail) {
        toast.error("Could not extract email from resume. Please enter email manually.");
        setIsSubmitting(false);
        setAnalysisStep('idle');
        return;
      }

      // Step 2: Upload resume file
      const resumeUrl = await uploadResume();

      // Step 3: Create a profile or use existing one
      setAnalysisStep('analyzing');

      // Check if profile exists for this email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', finalEmail)
        .maybeSingle();

      let candidateId: string;

      if (existingProfile) {
        candidateId = existingProfile.id;
      } else {
        // Create a new profile record for this candidate
        const newCandidateId = crypto.randomUUID();
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: newCandidateId,
            email: finalEmail,
            full_name: parsedData?.full_name || finalName,
            role: 'candidate',
            experience_level: parsedData?.experience_level || null,
            preferred_role: parsedData?.preferred_role || selectedJob.job_title,
            location: parsedData?.location || null,
            linkedin: parsedData?.linkedin || null,
            mobile: parsedData?.mobile || null,
            resume_url: resumeUrl,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw new Error('Failed to create candidate profile');
        }
        candidateId = newCandidateId;
      }

      // Step 4: Trigger AI analysis and add to talent pool
      setAnalysisStep('adding-to-pool');

      const candidateProfile = {
        full_name: parsedData?.full_name || finalName,
        email: finalEmail,
        experience_level: parsedData?.experience_level || 'Not specified',
        preferred_role: parsedData?.preferred_role || selectedJob.job_title,
        location: parsedData?.location || 'Not specified',
        skills: parsedData?.skills || [],
        education: parsedData?.education || 'Not specified',
      };

      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-resume', {
        body: {
          candidateId,
          jobId: selectedJobId,
          resumeUrl,
          candidateProfile,
          jobDetails: {
            job_title: selectedJob.job_title,
            description: selectedJob.description,
            requirements: selectedJob.requirements,
            skills: selectedJob.skills,
            experience_required: selectedJob.experience_required,
            location: selectedJob.location,
          },
        },
      });

      if (analysisError) {
        console.error('AI analysis error:', analysisError);
        toast.error("AI analysis failed, but candidate was added");
      } else if (analysisResult) {
        setAiScore(analysisResult.analysis?.overall_score);
        console.log('Analysis result:', analysisResult);
      }

      setAnalysisStep('sending-email');
      
      // Email is sent automatically by analyze-resume function
      await new Promise(resolve => setTimeout(resolve, 500));

      setAnalysisStep('complete');
      
      setTimeout(() => {
        toast.success(`${finalName} added to talent pool! Interview invitation sent to ${finalEmail}`);
        onCandidateAdded();
        handleClose();
      }, 1500);

    } catch (error: any) {
      console.error('Add candidate error:', error);
      toast.error(error.message || "Failed to add candidate");
      setAnalysisStep('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedJobId("");
    setCandidateName("");
    setCandidateEmail("");
    setResumeFile(null);
    setAnalysisStep('idle');
    setAiScore(null);
    setParsedDetails(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Candidate to Talent Pool
          </DialogTitle>
          <DialogDescription>
            Upload a resume to automatically extract details, analyze with AI, and send interview invitation.
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
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p>✓ AI extracts candidate details from resume</p>
              <p>✓ Analyzes skills match for the job</p>
              <p>✓ Adds to talent pool automatically</p>
              <p>✓ Sends interview schedule email</p>
            </div>
          </div>
        ) : analysisStep === 'complete' ? (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-lg font-medium text-foreground">Candidate Added!</p>
              {aiScore !== null && (
                <div className="bg-primary/10 rounded-lg px-6 py-3">
                  <p className="text-sm text-muted-foreground">AI Match Score</p>
                  <p className="text-3xl font-bold text-primary">{aiScore}%</p>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Mail className="h-4 w-4" />
                Interview invitation email sent!
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Job Selection */}
            <div className="space-y-2">
              <Label>Select Job Vacancy *</Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a job position" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.job_title} {job.department && `- ${job.department}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Resume Upload */}
            <div className="space-y-2">
              <Label>Upload Resume *</Label>
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
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
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
                      Click to upload resume
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, Word, or Image (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Manual Input */}
            <div className="space-y-4 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Optional: Enter details if resume parsing fails
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="candidateName">Candidate Name</Label>
                  <Input
                    id="candidateName"
                    placeholder="Auto-detected from resume"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidateEmail">Email Address</Label>
                  <Input
                    id="candidateEmail"
                    type="email"
                    placeholder="Auto-detected from resume"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* AI Info */}
            <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">AI-Powered Processing</p>
                <p className="text-muted-foreground">
                  AI will extract all details from the resume, analyze job fit, 
                  add to talent pool, and automatically send interview invitation email.
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
                disabled={isSubmitting || !resumeFile || !selectedJobId}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Add & Analyze
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/ui/PasswordStrengthIndicator";
import { CandidateFormData } from "./SignupWizard";

interface PersonalInfoStepProps {
  formData: CandidateFormData;
  updateFormData: (updates: Partial<CandidateFormData>) => void;
  onResumeUpload: (file: File) => void;
  isParsingResume: boolean;
  onNext: () => void;
}

export const PersonalInfoStep = ({
  formData,
  updateFormData,
  onResumeUpload,
  isParsingResume,
  onNext,
}: PersonalInfoStepProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onResumeUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onResumeUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Personal Information</h2>
        <p className="text-muted-foreground">Let's start with your basic details</p>
      </div>

      {/* Resume Upload - AI Auto-fill */}
      <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-accent" />
          <span className="font-medium text-foreground">Quick Fill with AI</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Upload your resume and our AI will automatically fill in your details. You can edit them afterwards.
        </p>
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-accent bg-accent/10"
              : "border-muted-foreground/30 hover:border-accent"
          }`}
          onClick={() => document.getElementById("resume-upload")?.click()}
        >
          <input
            id="resume-upload"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {isParsingResume ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-accent animate-spin" />
              <p className="text-sm text-muted-foreground">Analyzing your resume...</p>
            </div>
          ) : formData.resumeFile ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-6 w-6 text-accent" />
              <span className="text-sm font-medium text-foreground">{formData.resumeFile.name}</span>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag & drop your resume or <span className="text-accent font-medium">browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX (Max 5MB)</p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={(e) => updateFormData({ fullName: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => updateFormData({ dateOfBirth: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => updateFormData({ email: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile Number *</Label>
          <Input
            id="mobile"
            type="tel"
            placeholder="+91 9876543210"
            value={formData.mobile}
            onChange={(e) => updateFormData({ mobile: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => updateFormData({ gender: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a password"
            value={formData.password}
            onChange={(e) => updateFormData({ password: e.target.value })}
            required
            minLength={6}
          />
          <PasswordStrengthIndicator password={formData.password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => updateFormData({ confirmPassword: e.target.value })}
            required
            minLength={6}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} className="gap-2">
          Next: Education & Experience
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

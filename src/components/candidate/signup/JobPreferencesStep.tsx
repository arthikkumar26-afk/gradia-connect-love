import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { CandidateFormData } from "./SignupWizard";
import { useState } from "react";
import { Link } from "react-router-dom";

interface JobPreferencesStepProps {
  formData: CandidateFormData;
  updateFormData: (updates: Partial<CandidateFormData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
}

const jobTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Freelance",
  "Remote",
];

const salaryRanges = [
  "0-3 LPA",
  "3-6 LPA",
  "6-10 LPA",
  "10-15 LPA",
  "15-25 LPA",
  "25+ LPA",
];

export const JobPreferencesStep = ({
  formData,
  updateFormData,
  onSubmit,
  onBack,
  isLoading,
}: JobPreferencesStepProps) => {
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Job Preferences</h2>
        <p className="text-muted-foreground">Help us find the perfect opportunities for you</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="preferredRole">Preferred Role/Position</Label>
          <Input
            id="preferredRole"
            placeholder="e.g., Frontend Developer"
            value={formData.preferredRole}
            onChange={(e) => updateFormData({ preferredRole: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredLocation">Preferred Location</Label>
          <Input
            id="preferredLocation"
            placeholder="e.g., Bangalore, Remote"
            value={formData.preferredLocation}
            onChange={(e) => updateFormData({ preferredLocation: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobType">Job Type</Label>
          <Select
            value={formData.jobType}
            onValueChange={(value) => updateFormData({ jobType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select job type" />
            </SelectTrigger>
            <SelectContent>
              {jobTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedSalary">Expected Salary</Label>
          <Select
            value={formData.expectedSalary}
            onValueChange={(value) => updateFormData({ expectedSalary: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select salary range" />
            </SelectTrigger>
            <SelectContent>
              {salaryRanges.map((range) => (
                <SelectItem key={range} value={range}>
                  {range}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-subtle rounded-lg border">
        <h3 className="font-semibold text-foreground mb-3">Profile Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Name:</span>
            <p className="font-medium">{formData.fullName || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Email:</span>
            <p className="font-medium">{formData.email || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Qualification:</span>
            <p className="font-medium">{formData.highestQualification || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Experience:</span>
            <p className="font-medium">{formData.experienceLevel || "-"}</p>
          </div>
          {formData.resumeFile && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Resume:</span>
              <p className="font-medium flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-success" />
                {formData.resumeFile.name}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Terms */}
      <div className="flex items-start space-x-3">
        <Checkbox
          id="terms"
          checked={agreeToTerms}
          onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
        />
        <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
          I agree to the{" "}
          <Link to="/privacy" className="text-accent hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/employer/terms" className="text-accent hover:underline">
            Terms of Service
          </Link>
        </Label>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isLoading || !agreeToTerms}
          className="gap-2"
          variant="cta"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground pt-4 border-t">
        Already have an account?{" "}
        <Link to="/candidate/login" className="text-accent hover:underline font-medium">
          Sign In
        </Link>
      </div>
    </div>
  );
};

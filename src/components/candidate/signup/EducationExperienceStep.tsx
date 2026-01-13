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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { CandidateFormData } from "./SignupWizard";
import { useState } from "react";

interface EducationExperienceStepProps {
  formData: CandidateFormData;
  updateFormData: (updates: Partial<CandidateFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const qualifications = [
  "High School",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD",
  "Other",
];

const experienceLevels = [
  "Fresher (0-1 years)",
  "Junior (1-3 years)",
  "Mid-Level (3-5 years)",
  "Senior (5-8 years)",
  "Lead (8-12 years)",
  "Expert (12+ years)",
];

export const EducationExperienceStep = ({
  formData,
  updateFormData,
  onNext,
  onBack,
}: EducationExperienceStepProps) => {
  const [skillInput, setSkillInput] = useState("");

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      updateFormData({ skills: [...formData.skills, skillInput.trim()] });
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    updateFormData({
      skills: formData.skills.filter((skill) => skill !== skillToRemove),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Education & Experience</h2>
        <p className="text-muted-foreground">Tell us about your educational and professional background</p>
      </div>

      {/* Education Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Education</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="highestQualification">Highest Qualification *</Label>
            <Select
              value={formData.highestQualification}
              onValueChange={(value) => updateFormData({ highestQualification: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select qualification" />
              </SelectTrigger>
              <SelectContent>
                {qualifications.map((qual) => (
                  <SelectItem key={qual} value={qual}>
                    {qual}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fieldOfStudy">Field of Study</Label>
            <Input
              id="fieldOfStudy"
              placeholder="e.g., Computer Science"
              value={formData.fieldOfStudy}
              onChange={(e) => updateFormData({ fieldOfStudy: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution">Institution/University</Label>
            <Input
              id="institution"
              placeholder="e.g., Delhi University"
              value={formData.institution}
              onChange={(e) => updateFormData({ institution: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="graduationYear">Graduation Year</Label>
            <Input
              id="graduationYear"
              placeholder="e.g., 2023"
              value={formData.graduationYear}
              onChange={(e) => updateFormData({ graduationYear: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Experience Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Professional Experience</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="experienceLevel">Experience Level</Label>
            <Select
              value={formData.experienceLevel}
              onValueChange={(value) => updateFormData({ experienceLevel: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent>
                {experienceLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalExperience">Total Experience (Years)</Label>
            <Input
              id="totalExperience"
              placeholder="e.g., 3"
              value={formData.totalExperience}
              onChange={(e) => updateFormData({ totalExperience: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentCompany">Current/Last Company</Label>
            <Input
              id="currentCompany"
              placeholder="e.g., Tech Corp"
              value={formData.currentCompany}
              onChange={(e) => updateFormData({ currentCompany: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentRole">Current/Last Role</Label>
            <Input
              id="currentRole"
              placeholder="e.g., Software Developer"
              value={formData.currentRole}
              onChange={(e) => updateFormData({ currentRole: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Skills</h3>
        
        <div className="space-y-2">
          <Label htmlFor="skills">Add Your Skills</Label>
          <div className="flex gap-2">
            <Input
              id="skills"
              placeholder="Type a skill and press Enter"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button type="button" variant="outline" onClick={addSkill}>
              Add
            </Button>
          </div>
          
          {formData.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="gap-2">
          Next: Job Preferences
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

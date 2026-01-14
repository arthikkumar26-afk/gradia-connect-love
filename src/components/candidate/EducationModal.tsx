import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export interface EducationRecord {
  id?: string;
  user_id?: string;
  education_level: string;
  school_college_name: string;
  specialization: string;
  board_university: string;
  year_of_passing: number | null;
  percentage_marks: number | null;
  display_order?: number;
}

interface EducationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EducationRecord) => Promise<void>;
  editingRecord?: EducationRecord | null;
  isLoading?: boolean;
}

const educationLevels = [
  "10th / SSLC",
  "12th / HSC / PUC",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD / Doctorate",
  "Professional Certification",
  "Other"
];

export const EducationModal = ({
  isOpen,
  onClose,
  onSave,
  editingRecord,
  isLoading = false
}: EducationModalProps) => {
  const [formData, setFormData] = useState<EducationRecord>({
    education_level: "",
    school_college_name: "",
    specialization: "",
    board_university: "",
    year_of_passing: null,
    percentage_marks: null
  });

  useEffect(() => {
    if (editingRecord) {
      setFormData(editingRecord);
    } else {
      setFormData({
        education_level: "",
        school_college_name: "",
        specialization: "",
        board_university: "",
        year_of_passing: null,
        percentage_marks: null
      });
    }
  }, [editingRecord, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingRecord ? "Edit Education" : "Add Education"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="education_level">Education Level *</Label>
            <Select
              value={formData.education_level}
              onValueChange={(value) => setFormData({ ...formData, education_level: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select education level" />
              </SelectTrigger>
              <SelectContent>
                {educationLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="school_college_name">School/College Name</Label>
            <Input
              id="school_college_name"
              value={formData.school_college_name}
              onChange={(e) => setFormData({ ...formData, school_college_name: e.target.value })}
              placeholder="Enter institution name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialization">Specialization</Label>
            <Input
              id="specialization"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              placeholder="e.g., Computer Science, Commerce"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="board_university">Board/University</Label>
            <Input
              id="board_university"
              value={formData.board_university}
              onChange={(e) => setFormData({ ...formData, board_university: e.target.value })}
              placeholder="e.g., CBSE, State Board, University Name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year_of_passing">Year of Passing</Label>
              <Select
                value={formData.year_of_passing?.toString() || ""}
                onValueChange={(value) => setFormData({ ...formData, year_of_passing: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="percentage_marks">% of Marks</Label>
              <Input
                id="percentage_marks"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.percentage_marks ?? ""}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  percentage_marks: e.target.value ? parseFloat(e.target.value) : null 
                })}
                placeholder="e.g., 85.5"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.education_level || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingRecord ? "Update" : "Add"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
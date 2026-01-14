import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface FamilyRecord {
  id?: string;
  blood_relation: string;
  name_as_per_aadhar: string;
  date_of_birth: string;
  is_dependent: boolean;
  age: number | null;
}

interface FamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FamilyRecord) => Promise<void>;
  editingRecord?: FamilyRecord | null;
}

const relationOptions = [
  "Father",
  "Mother",
  "Spouse",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Grandfather",
  "Grandmother",
  "Father-in-law",
  "Mother-in-law",
  "Other"
];

const FamilyModal = ({ isOpen, onClose, onSave, editingRecord }: FamilyModalProps) => {
  const [formData, setFormData] = useState<FamilyRecord>({
    blood_relation: "",
    name_as_per_aadhar: "",
    date_of_birth: "",
    is_dependent: false,
    age: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        ...editingRecord,
        date_of_birth: editingRecord.date_of_birth || "",
      });
    } else {
      setFormData({
        blood_relation: "",
        name_as_per_aadhar: "",
        date_of_birth: "",
        is_dependent: false,
        age: null,
      });
    }
  }, [editingRecord, isOpen]);

  // Calculate age from DOB
  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleDobChange = (dob: string) => {
    const age = calculateAge(dob);
    setFormData({ ...formData, date_of_birth: dob, age });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.blood_relation) {
      toast.error("Blood relation is required");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving family details:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingRecord ? "Edit Family Member" : "Add Family Member"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blood_relation">Blood Relation *</Label>
            <Select
              value={formData.blood_relation}
              onValueChange={(value) => setFormData({ ...formData, blood_relation: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relation" />
              </SelectTrigger>
              <SelectContent>
                {relationOptions.map((relation) => (
                  <SelectItem key={relation} value={relation}>
                    {relation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name_as_per_aadhar">Name as per Aadhar</Label>
            <Input
              id="name_as_per_aadhar"
              value={formData.name_as_per_aadhar}
              onChange={(e) => setFormData({ ...formData, name_as_per_aadhar: e.target.value })}
              placeholder="Enter full name as per Aadhar card"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleDobChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={formData.age || ""}
                onChange={(e) => setFormData({ ...formData, age: e.target.value ? Number(e.target.value) : null })}
                placeholder="Auto-calculated"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
            <Switch
              id="is_dependent"
              checked={formData.is_dependent}
              onCheckedChange={(checked) => setFormData({ ...formData, is_dependent: checked })}
            />
            <Label htmlFor="is_dependent">Is Dependent</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingRecord ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FamilyModal;

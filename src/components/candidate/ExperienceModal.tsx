import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ExperienceRecord {
  id?: string;
  organization: string;
  department: string;
  designation: string;
  from_date: string;
  to_date: string;
  salary_per_month: number | null;
  place: string;
  reference_name: string;
  reference_mobile: string;
  worked_with_narayana: boolean;
  narayana_emp_id: string;
}

interface ExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExperienceRecord) => Promise<void>;
  editingRecord?: ExperienceRecord | null;
}

const ExperienceModal = ({ isOpen, onClose, onSave, editingRecord }: ExperienceModalProps) => {
  const [formData, setFormData] = useState<ExperienceRecord>({
    organization: "",
    department: "",
    designation: "",
    from_date: "",
    to_date: "",
    salary_per_month: null,
    place: "",
    reference_name: "",
    reference_mobile: "",
    worked_with_narayana: false,
    narayana_emp_id: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        ...editingRecord,
        from_date: editingRecord.from_date || "",
        to_date: editingRecord.to_date || "",
      });
    } else {
      setFormData({
        organization: "",
        department: "",
        designation: "",
        from_date: "",
        to_date: "",
        salary_per_month: null,
        place: "",
        reference_name: "",
        reference_mobile: "",
        worked_with_narayana: false,
        narayana_emp_id: "",
      });
    }
  }, [editingRecord, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organization) {
      toast.error("Organization is required");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving experience:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRecord ? "Edit Experience" : "Add Experience"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization *</Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="place">Place</Label>
              <Input
                id="place"
                value={formData.place}
                onChange={(e) => setFormData({ ...formData, place: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_date">From Date</Label>
              <Input
                id="from_date"
                type="date"
                value={formData.from_date}
                onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to_date">To Date</Label>
              <Input
                id="to_date"
                type="date"
                value={formData.to_date}
                onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_per_month">Salary (Per Month)</Label>
              <Input
                id="salary_per_month"
                type="number"
                value={formData.salary_per_month || ""}
                onChange={(e) => setFormData({ ...formData, salary_per_month: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference_name">Reference Name</Label>
              <Input
                id="reference_name"
                value={formData.reference_name}
                onChange={(e) => setFormData({ ...formData, reference_name: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reference_mobile">Reference Mobile No.</Label>
              <Input
                id="reference_mobile"
                value={formData.reference_mobile}
                onChange={(e) => setFormData({ ...formData, reference_mobile: e.target.value })}
              />
            </div>
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

export default ExperienceModal;

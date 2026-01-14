import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface AddressData {
  id?: string;
  present_door_flat_no: string;
  present_street: string;
  present_village_area: string;
  present_mandal: string;
  present_district: string;
  present_state: string;
  present_pin_code: string;
  permanent_door_flat_no: string;
  permanent_street: string;
  permanent_village_area: string;
  permanent_mandal: string;
  permanent_district: string;
  permanent_state: string;
  permanent_pin_code: string;
  same_as_present: boolean;
}

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddressData) => Promise<void>;
  existingData?: AddressData | null;
}

const defaultAddress: AddressData = {
  present_door_flat_no: "",
  present_street: "",
  present_village_area: "",
  present_mandal: "",
  present_district: "",
  present_state: "",
  present_pin_code: "",
  permanent_door_flat_no: "",
  permanent_street: "",
  permanent_village_area: "",
  permanent_mandal: "",
  permanent_district: "",
  permanent_state: "",
  permanent_pin_code: "",
  same_as_present: false,
};

const AddressModal = ({ isOpen, onClose, onSave, existingData }: AddressModalProps) => {
  const [formData, setFormData] = useState<AddressData>(defaultAddress);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingData) {
      setFormData(existingData);
    } else {
      setFormData(defaultAddress);
    }
  }, [existingData, isOpen]);

  const handleSameAsPresent = (checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        same_as_present: true,
        permanent_door_flat_no: formData.present_door_flat_no,
        permanent_street: formData.present_street,
        permanent_village_area: formData.present_village_area,
        permanent_mandal: formData.present_mandal,
        permanent_district: formData.present_district,
        permanent_state: formData.present_state,
        permanent_pin_code: formData.present_pin_code,
      });
    } else {
      setFormData({ ...formData, same_as_present: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving address:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Address Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Present Address */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground border-b pb-2">Present Address</h3>
              <div className="space-y-2">
                <Label htmlFor="present_door_flat_no">D.No. / Flat No.</Label>
                <Input
                  id="present_door_flat_no"
                  value={formData.present_door_flat_no}
                  onChange={(e) => setFormData({ ...formData, present_door_flat_no: e.target.value })}
                  placeholder="Enter door/flat number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="present_street">Street</Label>
                <Input
                  id="present_street"
                  value={formData.present_street}
                  onChange={(e) => setFormData({ ...formData, present_street: e.target.value })}
                  placeholder="Enter street name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="present_village_area">Village / Area</Label>
                <Input
                  id="present_village_area"
                  value={formData.present_village_area}
                  onChange={(e) => setFormData({ ...formData, present_village_area: e.target.value })}
                  placeholder="Enter village/area"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="present_mandal">Mandal</Label>
                <Input
                  id="present_mandal"
                  value={formData.present_mandal}
                  onChange={(e) => setFormData({ ...formData, present_mandal: e.target.value })}
                  placeholder="Enter mandal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="present_district">District</Label>
                <Input
                  id="present_district"
                  value={formData.present_district}
                  onChange={(e) => setFormData({ ...formData, present_district: e.target.value })}
                  placeholder="Enter district"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="present_state">State</Label>
                  <Input
                    id="present_state"
                    value={formData.present_state}
                    onChange={(e) => setFormData({ ...formData, present_state: e.target.value })}
                    placeholder="State"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="present_pin_code">Pin Code</Label>
                  <Input
                    id="present_pin_code"
                    value={formData.present_pin_code}
                    onChange={(e) => setFormData({ ...formData, present_pin_code: e.target.value })}
                    placeholder="Pin code"
                  />
                </div>
              </div>
            </div>

            {/* Permanent Address */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-semibold text-foreground">Permanent Address</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="same_as_present"
                    checked={formData.same_as_present}
                    onCheckedChange={handleSameAsPresent}
                  />
                  <Label htmlFor="same_as_present" className="text-sm cursor-pointer">Same as Present</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="permanent_door_flat_no">D.No. / Flat No.</Label>
                <Input
                  id="permanent_door_flat_no"
                  value={formData.permanent_door_flat_no}
                  onChange={(e) => setFormData({ ...formData, permanent_door_flat_no: e.target.value })}
                  placeholder="Enter door/flat number"
                  disabled={formData.same_as_present}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permanent_street">Street</Label>
                <Input
                  id="permanent_street"
                  value={formData.permanent_street}
                  onChange={(e) => setFormData({ ...formData, permanent_street: e.target.value })}
                  placeholder="Enter street name"
                  disabled={formData.same_as_present}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permanent_village_area">Village / Area</Label>
                <Input
                  id="permanent_village_area"
                  value={formData.permanent_village_area}
                  onChange={(e) => setFormData({ ...formData, permanent_village_area: e.target.value })}
                  placeholder="Enter village/area"
                  disabled={formData.same_as_present}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permanent_mandal">Mandal</Label>
                <Input
                  id="permanent_mandal"
                  value={formData.permanent_mandal}
                  onChange={(e) => setFormData({ ...formData, permanent_mandal: e.target.value })}
                  placeholder="Enter mandal"
                  disabled={formData.same_as_present}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permanent_district">District</Label>
                <Input
                  id="permanent_district"
                  value={formData.permanent_district}
                  onChange={(e) => setFormData({ ...formData, permanent_district: e.target.value })}
                  placeholder="Enter district"
                  disabled={formData.same_as_present}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="permanent_state">State</Label>
                  <Input
                    id="permanent_state"
                    value={formData.permanent_state}
                    onChange={(e) => setFormData({ ...formData, permanent_state: e.target.value })}
                    placeholder="State"
                    disabled={formData.same_as_present}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permanent_pin_code">Pin Code</Label>
                  <Input
                    id="permanent_pin_code"
                    value={formData.permanent_pin_code}
                    onChange={(e) => setFormData({ ...formData, permanent_pin_code: e.target.value })}
                    placeholder="Pin code"
                    disabled={formData.same_as_present}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Address"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddressModal;
export type { AddressData };

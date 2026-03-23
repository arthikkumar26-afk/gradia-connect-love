import { useState, useEffect } from "react";
import {
  Plus, Trash2, GripVertical, Save, Edit2, Copy, Star,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Loader2, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TemplateField {
  id?: string;
  field_label: string;
  field_type: "rating" | "text" | "textarea" | "dropdown" | "checkbox";
  field_options: any;
  is_required: boolean;
  display_order: number;
}

interface FeedbackTemplate {
  id: string;
  template_name: string;
  stage_type: string;
  rating_scale: number;
  is_default: boolean;
  created_at: string;
  fields: TemplateField[];
}

const FIELD_TYPES = [
  { value: "rating", label: "Star Rating" },
  { value: "text", label: "Text Input" },
  { value: "textarea", label: "Text Area" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

const STAGE_TYPES = [
  { value: "demo", label: "Demo Feedback" },
  { value: "hr", label: "HR Feedback" },
  { value: "technical", label: "Technical Review" },
  { value: "custom", label: "Custom" },
];

const DEFAULT_FIELDS: TemplateField[] = [
  { field_label: "Overall Rating", field_type: "rating", field_options: null, is_required: true, display_order: 0 },
  { field_label: "Communication Skills", field_type: "rating", field_options: null, is_required: true, display_order: 1 },
  { field_label: "Subject Knowledge", field_type: "rating", field_options: null, is_required: true, display_order: 2 },
  { field_label: "Recommendation", field_type: "dropdown", field_options: { options: ["Strongly Recommend", "Recommend", "Neutral", "Not Recommend"] }, is_required: true, display_order: 3 },
  { field_label: "Strengths", field_type: "textarea", field_options: null, is_required: false, display_order: 4 },
  { field_label: "Areas for Improvement", field_type: "textarea", field_options: null, is_required: false, display_order: 5 },
];

export const FeedbackTemplatesContent = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FeedbackTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<FeedbackTemplate | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newStageType, setNewStageType] = useState("demo");
  const [newRatingScale, setNewRatingScale] = useState(5);
  const [newFields, setNewFields] = useState<TemplateField[]>([...DEFAULT_FIELDS]);

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: tplData, error: tplError } = await supabase
        .from("feedback_form_templates")
        .select("*")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false });

      if (tplError) throw tplError;

      const templatesWithFields: FeedbackTemplate[] = [];
      for (const tpl of tplData || []) {
        const { data: fields } = await supabase
          .from("feedback_template_fields")
          .select("*")
          .eq("template_id", tpl.id)
          .order("display_order", { ascending: true });

        templatesWithFields.push({
          ...tpl,
          fields: (fields || []).map((f: any) => ({
            id: f.id,
            field_label: f.field_label,
            field_type: f.field_type,
            field_options: f.field_options,
            is_required: f.is_required,
            display_order: f.display_order,
          })),
        });
      }
      setTemplates(templatesWithFields);
    } catch (err: any) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const handleCreateTemplate = async () => {
    if (!user || !newName.trim()) return;
    setSaving(true);
    try {
      const { data: tpl, error: tplError } = await supabase
        .from("feedback_form_templates")
        .insert({
          employer_id: user.id,
          template_name: newName.trim(),
          stage_type: newStageType,
          rating_scale: newRatingScale,
          is_default: templates.length === 0,
        })
        .select()
        .single();

      if (tplError) throw tplError;

      if (newFields.length > 0) {
        const { error: fieldsError } = await supabase
          .from("feedback_template_fields")
          .insert(
            newFields.map((f, i) => ({
              template_id: tpl.id,
              field_label: f.field_label,
              field_type: f.field_type,
              field_options: f.field_options,
              is_required: f.is_required,
              display_order: i,
            }))
          );
        if (fieldsError) throw fieldsError;
      }

      toast.success("Template created successfully");
      setShowCreateDialog(false);
      resetCreateForm();
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const { error: tplError } = await supabase
        .from("feedback_form_templates")
        .update({
          template_name: editingTemplate.template_name,
          stage_type: editingTemplate.stage_type,
          rating_scale: editingTemplate.rating_scale,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTemplate.id);

      if (tplError) throw tplError;

      // Delete existing fields and re-insert
      await supabase
        .from("feedback_template_fields")
        .delete()
        .eq("template_id", editingTemplate.id);

      if (editingTemplate.fields.length > 0) {
        const { error: fieldsError } = await supabase
          .from("feedback_template_fields")
          .insert(
            editingTemplate.fields.map((f, i) => ({
              template_id: editingTemplate.id,
              field_label: f.field_label,
              field_type: f.field_type,
              field_options: f.field_options,
              is_required: f.is_required,
              display_order: i,
            }))
          );
        if (fieldsError) throw fieldsError;
      }

      toast.success("Template updated");
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplate) return;
    try {
      const { error } = await supabase
        .from("feedback_form_templates")
        .delete()
        .eq("id", deleteTemplate.id);
      if (error) throw error;
      toast.success("Template deleted");
      setDeleteTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleDuplicate = async (template: FeedbackTemplate) => {
    if (!user) return;
    try {
      const { data: tpl, error } = await supabase
        .from("feedback_form_templates")
        .insert({
          employer_id: user.id,
          template_name: `${template.template_name} (Copy)`,
          stage_type: template.stage_type,
          rating_scale: template.rating_scale,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;

      if (template.fields.length > 0) {
        await supabase
          .from("feedback_template_fields")
          .insert(
            template.fields.map((f, i) => ({
              template_id: tpl.id,
              field_label: f.field_label,
              field_type: f.field_type,
              field_options: f.field_options,
              is_required: f.is_required,
              display_order: i,
            }))
          );
      }

      toast.success("Template duplicated");
      fetchTemplates();
    } catch (err: any) {
      toast.error("Failed to duplicate");
    }
  };

  const handleSetDefault = async (template: FeedbackTemplate) => {
    if (!user) return;
    try {
      // Unset all defaults for same stage_type
      await supabase
        .from("feedback_form_templates")
        .update({ is_default: false })
        .eq("employer_id", user.id)
        .eq("stage_type", template.stage_type);

      await supabase
        .from("feedback_form_templates")
        .update({ is_default: true })
        .eq("id", template.id);

      toast.success("Default template updated");
      fetchTemplates();
    } catch {
      toast.error("Failed to set default");
    }
  };

  const resetCreateForm = () => {
    setNewName("");
    setNewStageType("demo");
    setNewRatingScale(5);
    setNewFields([...DEFAULT_FIELDS]);
  };

  const addField = (fields: TemplateField[], setFields: (f: TemplateField[]) => void) => {
    setFields([
      ...fields,
      {
        field_label: "",
        field_type: "rating",
        field_options: null,
        is_required: true,
        display_order: fields.length,
      },
    ]);
  };

  const removeField = (
    index: number,
    fields: TemplateField[],
    setFields: (f: TemplateField[]) => void
  ) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (
    index: number,
    key: keyof TemplateField,
    value: any,
    fields: TemplateField[],
    setFields: (f: TemplateField[]) => void
  ) => {
    const updated = [...fields];
    (updated[index] as any)[key] = value;
    setFields(updated);
  };

  const moveField = (
    index: number,
    direction: "up" | "down",
    fields: TemplateField[],
    setFields: (f: TemplateField[]) => void
  ) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const updated = [...fields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setFields(updated);
  };

  const renderFieldEditor = (
    fields: TemplateField[],
    setFields: (f: TemplateField[]) => void
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Form Fields</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addField(fields, setFields)}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Field
        </Button>
      </div>
      {fields.map((field, index) => (
        <Card key={index} className="border-dashed">
          <CardContent className="pt-3 pb-3 px-3 space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={field.field_label}
                onChange={(e) =>
                  updateField(index, "field_label", e.target.value, fields, setFields)
                }
                placeholder="Field label"
                className="flex-1 h-8 text-sm"
              />
              <Select
                value={field.field_type}
                onValueChange={(v) =>
                  updateField(index, "field_type", v, fields, setFields)
                }
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value}>
                      {ft.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Switch
                  checked={field.is_required}
                  onCheckedChange={(v) =>
                    updateField(index, "is_required", v, fields, setFields)
                  }
                />
                <span className="text-xs text-muted-foreground">Req</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => moveField(index, "up", fields, setFields)}
                disabled={index === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => moveField(index, "down", fields, setFields)}
                disabled={index === fields.length - 1}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive"
                onClick={() => removeField(index, fields, setFields)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {field.field_type === "dropdown" && (
              <div className="ml-6">
                <Input
                  placeholder="Options (comma-separated)"
                  value={field.field_options?.options?.join(", ") || ""}
                  onChange={(e) =>
                    updateField(
                      index,
                      "field_options",
                      {
                        options: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                      fields,
                      setFields
                    )
                  }
                  className="h-8 text-xs"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No fields added. Click "Add Field" to start building your form.
        </p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Feedback Form Templates</h2>
          <p className="text-sm text-muted-foreground">
            Create and customize feedback forms for different interview stages
          </p>
        </div>
        <Button onClick={() => { resetCreateForm(); setShowCreateDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">No templates yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first feedback form template to get started
            </p>
            <Button onClick={() => { resetCreateForm(); setShowCreateDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {tpl.template_name}
                      {tpl.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {STAGE_TYPES.find((s) => s.value === tpl.stage_type)?.label || tpl.stage_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3" /> {tpl.rating_scale}-point scale
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tpl.fields.length} field{tpl.fields.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!tpl.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleSetDefault(tpl)}
                        title="Set as default"
                      >
                        <ToggleLeft className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleDuplicate(tpl)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditingTemplate({ ...tpl, fields: [...tpl.fields] })}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive"
                      onClick={() => setDeleteTemplate(tpl)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() =>
                    setExpandedTemplate(expandedTemplate === tpl.id ? null : tpl.id)
                  }
                >
                  {expandedTemplate === tpl.id ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" /> Hide Fields
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" /> Show Fields
                    </>
                  )}
                </Button>
                {expandedTemplate === tpl.id && (
                  <div className="mt-2 space-y-1.5">
                    {tpl.fields.map((field, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-muted/50"
                      >
                        <span className="text-muted-foreground">{i + 1}.</span>
                        <span className="font-medium flex-1">{field.field_label}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {FIELD_TYPES.find((ft) => ft.value === field.field_type)?.label}
                        </Badge>
                        {field.is_required && (
                          <span className="text-destructive text-[10px]">*</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Feedback Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Demo Round Feedback"
                />
              </div>
              <div>
                <Label>Stage Type</Label>
                <Select value={newStageType} onValueChange={setNewStageType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_TYPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Rating Scale</Label>
              <Select
                value={String(newRatingScale)}
                onValueChange={(v) => setNewRatingScale(Number(v))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3-point</SelectItem>
                  <SelectItem value="5">5-point</SelectItem>
                  <SelectItem value="7">7-point</SelectItem>
                  <SelectItem value="10">10-point</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {renderFieldEditor(newFields, setNewFields)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={saving || !newName.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={editingTemplate.template_name}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        template_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Stage Type</Label>
                  <Select
                    value={editingTemplate.stage_type}
                    onValueChange={(v) =>
                      setEditingTemplate({ ...editingTemplate, stage_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_TYPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Rating Scale</Label>
                <Select
                  value={String(editingTemplate.rating_scale)}
                  onValueChange={(v) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      rating_scale: Number(v),
                    })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3-point</SelectItem>
                    <SelectItem value="5">5-point</SelectItem>
                    <SelectItem value="7">7-point</SelectItem>
                    <SelectItem value="10">10-point</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {renderFieldEditor(editingTemplate.fields, (fields) =>
                setEditingTemplate({ ...editingTemplate, fields })
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTemplate?.template_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FeedbackTemplatesContent;

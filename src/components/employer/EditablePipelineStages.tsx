import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CheckCircle2, Bot, User, X, Plus, GripVertical, Pencil, Sparkles, Loader2, Library, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAllPipelineStagesCatalog, type PipelineStage, type CatalogStage } from "@/data/interviewPipelineConfig";


interface EditablePipelineStagesProps {
  stages: PipelineStage[];
  onStagesChange: (stages: PipelineStage[]) => void;
}

const EditablePipelineStages = ({ stages, onStagesChange }: EditablePipelineStagesProps) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newStageName, setNewStageName] = useState("");
  const [newStageDesc, setNewStageDesc] = useState("");
  const [newStageType, setNewStageType] = useState<"manual" | "ai">("manual");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [automationConfig, setAutomationConfig] = useState<any>(null);
  const [disabledOptionalStages, setDisabledOptionalStages] = useState<Set<number>>(new Set());
  const [showStagePicker, setShowStagePicker] = useState(false);

  const stageCatalog = useMemo<CatalogStage[]>(() => getAllPipelineStagesCatalog(), []);
  const existingNames = useMemo(
    () => new Set(stages.map((s) => s.name.trim().toLowerCase())),
    [stages]
  );

  const applyCatalogStage = (cs: CatalogStage) => {
    setNewStageName(cs.name);
    setNewStageDesc(cs.description);
    setNewStageType(cs.isAutomated ? "ai" : "manual");
    setAutomationConfig(null);
    setShowStagePicker(false);
    toast.success(`Loaded "${cs.name}" — review and save.`);
  };


  const handleToggleOptionalStage = (index: number) => {
    const newDisabled = new Set(disabledOptionalStages);
    if (newDisabled.has(index)) {
      newDisabled.delete(index);
    } else {
      newDisabled.add(index);
    }
    setDisabledOptionalStages(newDisabled);
    
    const updated = stages.map((s, i) => {
      if (i === index && s.isOptional) {
        return { ...s, isOptional: true };
      }
      return s;
    });
    onStagesChange(updated);
  };

  const handleRemoveStage = (index: number) => {
    const updated = stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
    onStagesChange(updated);
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    const newStage: PipelineStage = {
      order: stages.length + 1,
      name: newStageName.trim(),
      description: newStageDesc.trim() || "Custom stage",
      isAutomated: newStageType === "ai",
      ...(automationConfig ? { automationConfig } : {}),
    };
    onStagesChange([...stages, newStage]);
    resetForm();
    setShowAddDialog(false);
  };

  const handleEditStage = () => {
    if (editingIndex === null || !newStageName.trim()) return;
    const updated = stages.map((s, i) =>
      i === editingIndex
        ? { ...s, name: newStageName.trim(), description: newStageDesc.trim() || s.description, isAutomated: newStageType === "ai", ...(automationConfig ? { automationConfig } : {}) }
        : s
    );
    onStagesChange(updated);
    resetForm();
    setEditingIndex(null);
    setShowAddDialog(false);
  };

  const openEditDialog = (index: number) => {
    const stage = stages[index];
    setEditingIndex(index);
    setNewStageName(stage.name);
    setNewStageDesc(stage.description);
    setNewStageType(stage.isAutomated ? "ai" : "manual");
    setShowAiPrompt(false);
    setAiPrompt("");
    setAutomationConfig(null);
    setShowAddDialog(true);
  };

  const openAddDialog = () => {
    resetForm();
    setEditingIndex(null);
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setNewStageName("");
    setNewStageDesc("");
    setNewStageType("manual");
    setAiPrompt("");
    setShowAiPrompt(false);
    setAutomationConfig(null);
    setIsAiLoading(false);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please describe what this stage should do");
      return;
    }
    
    setIsAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-stage-config', {
        body: {
          prompt: aiPrompt.trim(),
          existingStages: stages.map(s => ({ name: s.name, description: s.description })),
        }
      });

      if (error) throw error;

      setNewStageName(data.name || "");
      setNewStageDesc(data.description || "");
      setNewStageType(data.isAutomated ? "ai" : "manual");
      if (data.automationConfig) {
        setAutomationConfig(data.automationConfig);
      }
      toast.success("AI configured the stage! Review and adjust if needed.");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate stage config");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const updated = [...stages];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);
    onStagesChange(updated.map((s, i) => ({ ...s, order: i + 1 })));
    setDraggedIndex(null);
  };

  if (stages.length === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">
            Interview Pipeline Stages ({stages.length})
          </h4>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={openAddDialog} className="gap-1 h-7 text-xs">
          <Plus className="h-3 w-3" /> Add Stage
        </Button>
      </div>

      <div className="space-y-2">
        {stages.map((stage, index) => (
          <div
            key={`${stage.name}-${index}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
            className={`flex items-center gap-2 rounded-md border bg-background p-2.5 transition-all ${draggedIndex === index ? "opacity-50" : ""} ${stage.isOptional && disabledOptionalStages.has(index) ? "opacity-40 border-dashed" : ""}`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{stage.name}</p>
              <p className="text-xs text-muted-foreground truncate">{stage.description}</p>
            </div>
            {stage.isOptional && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Switch
                  checked={!disabledOptionalStages.has(index)}
                  onCheckedChange={() => handleToggleOptionalStage(index)}
                  className="scale-75"
                />
                <span className="text-[10px] text-muted-foreground">
                  {disabledOptionalStages.has(index) ? "Off" : "On"}
                </span>
              </div>
            )}
            <Badge variant={stage.isAutomated ? "default" : "outline"} className="shrink-0 text-[10px] gap-1">
              {stage.isAutomated ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {stage.isAutomated ? "AI" : "Manual"}
            </Badge>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => openEditDialog(index)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive hover:text-destructive" onClick={() => handleRemoveStage(index)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? "Edit Stage" : "Add Custom Stage"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* AI Prompt Section */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
              <button
                type="button"
                onClick={() => setShowAiPrompt(!showAiPrompt)}
                className="flex items-center gap-2 text-sm font-medium text-primary w-full"
              >
                <Sparkles className="h-4 w-4" />
                <span>AI Auto-Configure Stage</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {showAiPrompt ? "Hide" : "Click to expand"}
                </span>
              </button>
              {showAiPrompt && (
                <div className="space-y-2 pt-1">
                  <Textarea
                    placeholder="Describe what this stage should do... e.g., 'Conduct a 30-minute live coding test where candidate solves 2 DSA problems with screen sharing' or 'Group discussion round with 5 candidates discussing a business case study'"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAiGenerate}
                    disabled={isAiLoading || !aiPrompt.trim()}
                    className="gap-1.5 w-full"
                  >
                    {isAiLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        AI is configuring...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate Stage Config
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Stage Name *</label>
              <Input
                placeholder="e.g., Group Discussion, Portfolio Review"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Brief description of this stage"
                value={newStageDesc}
                onChange={(e) => setNewStageDesc(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Stage Type</label>
              <Select value={newStageType} onValueChange={(v) => setNewStageType(v as "manual" | "ai")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="ai">AI Automated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show automation config summary if AI generated it */}
            {automationConfig && (
              <div className="rounded-md border bg-muted/50 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-primary flex items-center gap-1">
                  <Bot className="h-3 w-3" /> Backend Automation Config
                </p>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>Trigger:</span>
                  <span className="font-medium text-foreground capitalize">{automationConfig.triggerType?.replace('_', ' ')}</span>
                  <span>Evaluation:</span>
                  <span className="font-medium text-foreground capitalize">{automationConfig.evaluationType?.replace('_', ' ')}</span>
                  {automationConfig.duration && (
                    <>
                      <span>Duration:</span>
                      <span className="font-medium text-foreground">{automationConfig.duration} min</span>
                    </>
                  )}
                  {automationConfig.emailTemplate && (
                    <>
                      <span>Email:</span>
                      <span className="font-medium text-foreground capitalize">{automationConfig.emailTemplate}</span>
                    </>
                  )}
                </div>
                {automationConfig.instructions && (
                  <p className="text-xs text-muted-foreground mt-1 border-t pt-1.5">
                    <span className="font-medium">Instructions:</span> {automationConfig.instructions}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button type="button" onClick={editingIndex !== null ? handleEditStage : handleAddStage} disabled={!newStageName.trim()}>
              {editingIndex !== null ? "Save Changes" : "Add Stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditablePipelineStages;

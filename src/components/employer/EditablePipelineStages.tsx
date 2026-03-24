import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, Bot, User, X, Plus, GripVertical, Pencil, RotateCcw } from "lucide-react";
import type { PipelineStage } from "@/data/interviewPipelineConfig";

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
    };
    onStagesChange([...stages, newStage]);
    resetForm();
    setShowAddDialog(false);
  };

  const handleEditStage = () => {
    if (editingIndex === null || !newStageName.trim()) return;
    const updated = stages.map((s, i) =>
      i === editingIndex
        ? { ...s, name: newStageName.trim(), description: newStageDesc.trim() || s.description, isAutomated: newStageType === "ai" }
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
            className={`flex items-center gap-2 rounded-md border bg-background p-2.5 transition-opacity ${draggedIndex === index ? "opacity-50" : ""}`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{stage.name}</p>
              <p className="text-xs text-muted-foreground truncate">{stage.description}</p>
            </div>
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
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? "Edit Stage" : "Add Custom Stage"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, ArrowRight, ArrowLeft, Sparkles, Eye, CheckCircle2, Building2, Briefcase, FileText, Send, Image as ImageIcon } from "lucide-react";
import FlyerGenerator from "@/components/hr/FlyerGenerator";
import { toast } from "sonner";

const schema = z.object({
  job_title: z.string().trim().min(2, "Job title is required").max(120),
  department: z.string().trim().max(80).optional().or(z.literal("")),
  job_type: z.string().min(1, "Select a job type"),
  location: z.string().trim().min(2, "Location is required").max(120),
  experience_required: z.string().min(1, "Select experience"),
  salary_range: z.string().trim().max(80).optional().or(z.literal("")),
  closing_date: z.string().optional().or(z.literal("")),
  skills: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().trim().min(20, "Add a description (min 20 chars)").max(5000),
  requirements: z.string().trim().min(10, "Add requirements").max(3000),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  parentEmployerId: string;
  parentEmployerName: string;
  onPosted: () => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, label: "Basics", icon: Briefcase },
  { id: 2, label: "Details", icon: FileText },
  { id: 3, label: "Preview", icon: Eye },
];

export const HRJobPostingWizard = ({ parentEmployerId, parentEmployerName, onPosted, onCancel }: Props) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      job_title: "", department: "", job_type: "", location: "",
      experience_required: "", salary_range: "", closing_date: "",
      skills: "", description: "", requirements: "",
    },
    mode: "onChange",
  });

  const values = form.watch();

  const validateStep = async (s: number) => {
    if (s === 1) return form.trigger(["job_title", "job_type", "location", "experience_required"]);
    if (s === 2) return form.trigger(["description", "requirements"]);
    return true;
  };

  const next = async () => {
    const ok = await validateStep(step);
    if (!ok) {
      toast.error("Please fill required fields before continuing.");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  const handleAIGenerate = async () => {
    const v = form.getValues();
    if (!v.job_title || !v.job_type || !v.location || !v.experience_required) {
      toast.error("Fill Job Title, Type, Location & Experience first.");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-description", {
        body: {
          jobTitle: v.job_title, department: v.department, jobType: v.job_type,
          location: v.location, experienceRequired: v.experience_required, skills: v.skills,
        },
      });
      if (error) throw error;
      if (data?.description) form.setValue("description", typeof data.description === "string" ? data.description : JSON.stringify(data.description));
      if (data?.requirements) form.setValue("requirements", typeof data.requirements === "string" ? data.requirements : Array.isArray(data.requirements) ? data.requirements.join("\n") : JSON.stringify(data.requirements));
      if (data?.skills && !v.skills) form.setValue("skills", Array.isArray(data.skills) ? data.skills.join(", ") : String(data.skills));
      toast.success("AI generated description & requirements.");
    } catch (e: any) {
      toast.error(e.message || "AI generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const publish = async () => {
    setSubmitting(true);
    try {
      const v = form.getValues();
      const skillsArray = (v.skills || "").split(",").map((s) => s.trim()).filter(Boolean);

      const { error } = await supabase.from("jobs").insert([{
        employer_id: parentEmployerId,
        job_title: v.job_title,
        department: v.department || null,
        job_type: v.job_type,
        location: v.location,
        experience_required: v.experience_required,
        salary_range: v.salary_range || null,
        description: v.description,
        requirements: v.requirements,
        skills: skillsArray.length ? skillsArray : null,
        closing_date: v.closing_date || null,
        status: "active",
      } as any]);

      if (error) throw error;
      toast.success(`Job posted on behalf of ${parentEmployerName}.`);
      setConfirmOpen(false);
      onPosted();
    } catch (e: any) {
      toast.error(e.message || "Failed to post job.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-primary" /> Post Job (HR Wizard)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Posting on behalf of <span className="font-medium text-foreground">{parentEmployerName}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mt-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 ${active ? "text-primary" : done ? "text-green-600" : "text-muted-foreground"}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${active ? "border-primary bg-primary/10" : done ? "border-green-600 bg-green-50" : "border-border"}`}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${done ? "bg-green-600" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Job Title *</Label>
              <Input {...form.register("job_title")} placeholder="e.g. Math Teacher - Class 9&10" />
              {form.formState.errors.job_title && <p className="text-xs text-destructive mt-1">{form.formState.errors.job_title.message}</p>}
            </div>
            <div>
              <Label>Department</Label>
              <Input {...form.register("department")} placeholder="e.g. Academics" />
            </div>
            <div>
              <Label>Job Type *</Label>
              <Select value={values.job_type} onValueChange={(v) => form.setValue("job_type", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-Time">Full-Time</SelectItem>
                  <SelectItem value="Part-Time">Part-Time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Internship">Internship</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.job_type && <p className="text-xs text-destructive mt-1">{form.formState.errors.job_type.message}</p>}
            </div>
            <div>
              <Label>Location *</Label>
              <Input {...form.register("location")} placeholder="City, State" />
              {form.formState.errors.location && <p className="text-xs text-destructive mt-1">{form.formState.errors.location.message}</p>}
            </div>
            <div>
              <Label>Experience Required *</Label>
              <Select value={values.experience_required} onValueChange={(v) => form.setValue("experience_required", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-1 years">0-1 years</SelectItem>
                  <SelectItem value="1-3 years">1-3 years</SelectItem>
                  <SelectItem value="3-5 years">3-5 years</SelectItem>
                  <SelectItem value="5-8 years">5-8 years</SelectItem>
                  <SelectItem value="8+ years">8+ years</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.experience_required && <p className="text-xs text-destructive mt-1">{form.formState.errors.experience_required.message}</p>}
            </div>
            <div>
              <Label>Salary Range</Label>
              <Input {...form.register("salary_range")} placeholder="e.g. ₹30,000 - ₹50,000" />
            </div>
            <div>
              <Label>Closing Date</Label>
              <Input type="date" {...form.register("closing_date")} />
            </div>
            <div className="md:col-span-2">
              <Label>Skills (comma separated)</Label>
              <Input {...form.register("skills")} placeholder="e.g. CBSE Curriculum, Smart Class, Lesson Planning" />
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Write details or let AI draft them for you.</p>
              <Button type="button" variant="outline" size="sm" onClick={handleAIGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                AI Generate
              </Button>
            </div>
            <div>
              <Label>Job Description *</Label>
              <Textarea rows={8} {...form.register("description")} placeholder="Role overview, responsibilities, what success looks like..." />
              {form.formState.errors.description && <p className="text-xs text-destructive mt-1">{form.formState.errors.description.message}</p>}
            </div>
            <div>
              <Label>Requirements *</Label>
              <Textarea rows={6} {...form.register("requirements")} placeholder="Qualifications, certifications, must-have skills..." />
              {form.formState.errors.requirements && <p className="text-xs text-destructive mt-1">{form.formState.errors.requirements.message}</p>}
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="border border-border rounded-lg p-5 bg-muted/30">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold">{values.job_title}</h3>
                <p className="text-sm text-muted-foreground">{parentEmployerName} · {values.location}</p>
              </div>
              <Badge variant="secondary">{values.job_type}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 mb-4 text-xs">
              {values.department && <Badge variant="outline">{values.department}</Badge>}
              <Badge variant="outline">{values.experience_required}</Badge>
              {values.salary_range && <Badge variant="outline">{values.salary_range}</Badge>}
              {values.closing_date && <Badge variant="outline">Closes {values.closing_date}</Badge>}
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Description</h4>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{values.description}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Requirements</h4>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{values.requirements}</p>
              </div>
              {values.skills && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {values.skills.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button variant="outline" onClick={back} disabled={step === 1}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={next}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => setConfirmOpen(true)} className="bg-primary">
              <Send className="h-4 w-4 mr-1" /> Publish Job
            </Button>
          )}
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish this job?</DialogTitle>
            <DialogDescription>
              This job will be posted publicly under <strong>{parentEmployerName}</strong>. Candidates will be able to apply immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/30 rounded-md p-3 text-sm space-y-1">
            <p><strong>Title:</strong> {values.job_title}</p>
            <p><strong>Location:</strong> {values.location} · {values.job_type}</p>
            <p><strong>Experience:</strong> {values.experience_required}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={publish} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Confirm & Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default HRJobPostingWizard;

import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Briefcase, ArrowLeft, Sparkles, RefreshCw } from "lucide-react";
import { getPipelineTypesForInterviewType, getPipelineStages, getRolesForPipeline, pipelineRoleOptions, defaultRoleOptions, type PipelineStage } from "@/data/interviewPipelineConfig";

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return dp[m][n];
}

function JobTitleAutocomplete({ value, onChange, interviewType, pipelineType }: {
  value: string; onChange: (v: string) => void; interviewType: string; pipelineType: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value || "");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputVal(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Collect all role labels for the current pipeline
  const allRoles = useMemo(() => {
    const key = `${interviewType}.${pipelineType}`;
    const roles = pipelineRoleOptions[key] || [];
    // If no specific roles, gather all roles from the interview type
    if (roles.length === 0 && interviewType) {
      const allForType = Object.entries(pipelineRoleOptions)
        .filter(([k]) => k.startsWith(`${interviewType}.`))
        .flatMap(([, v]) => v);
      if (allForType.length > 0) return [...new Set(allForType.map(r => r.label))];
    }
    return roles.length > 0 ? roles.map(r => r.label) : defaultRoleOptions.map(r => r.label);
  }, [interviewType, pipelineType]);

  const suggestions = useMemo(() => {
    if (!inputVal.trim()) return allRoles.slice(0, 10);
    const q = inputVal.toLowerCase();
    // Score: exact substring match first, then fuzzy
    return allRoles
      .map(role => {
        const rl = role.toLowerCase();
        if (rl === q) return { role, score: 0 };
        if (rl.startsWith(q)) return { role, score: 1 };
        if (rl.includes(q)) return { role, score: 2 };
        const dist = levenshtein(q, rl.slice(0, Math.max(q.length, 3)));
        if (dist <= Math.ceil(q.length * 0.4)) return { role, score: 3 + dist };
        // Check each word
        const words = rl.split(/\s+/);
        const wordMatch = words.some(w => w.startsWith(q) || levenshtein(q, w.slice(0, q.length)) <= 2);
        if (wordMatch) return { role, score: 5 };
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.score - b!.score)
      .map(r => r!.role)
      .slice(0, 8);
  }, [inputVal, allRoles]);

  // Auto-correct: if user typed something close to a role, fix on blur
  const handleBlur = () => {
    if (!inputVal.trim()) return;
    const q = inputVal.toLowerCase();
    const exact = allRoles.find(r => r.toLowerCase() === q);
    if (exact) { onChange(exact); setInputVal(exact); return; }
    // Find closest match
    let best = { role: "", dist: Infinity };
    for (const role of allRoles) {
      const d = levenshtein(q, role.toLowerCase());
      if (d < best.dist) best = { role, dist: d };
    }
    if (best.dist <= Math.ceil(q.length * 0.3) && best.dist <= 3) {
      onChange(best.role);
      setInputVal(best.role);
    } else {
      onChange(inputVal);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        placeholder={allRoles.length > 0 ? `e.g., ${allRoles[0]}` : "e.g., Senior Full Stack Developer"}
        value={inputVal}
        onChange={(e) => { setInputVal(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(handleBlur, 200)}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((role) => (
            <button
              key={role}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                setInputVal(role);
                onChange(role);
                setOpen(false);
              }}
            >
              {role}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const jobFormSchema = z.object({
  job_title: z.string().min(3, "Job title must be at least 3 characters").max(100),
  department: z.string().optional(),
  job_type: z.string().min(1, "Please select a job type"),
  location: z.string().min(2, "Location is required"),
  experience_required: z.string().min(1, "Please select experience level"),
  salary_range: z.string().optional(),
  description: z.string().min(50, "Description must be at least 50 characters").max(5000),
  requirements: z.string().min(20, "Requirements must be at least 20 characters").max(3000),
  skills: z.string().min(2, "Please add at least one skill"),
  closing_date: z.string().optional(),
  interview_type: z.string().min(1, "Please select interview type"),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

const PostJob = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [selectedPipelineType, setSelectedPipelineType] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [customStages, setCustomStages] = useState<PipelineStage[]>([]);
  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, string>>({});

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      job_title: "",
      department: "",
      job_type: "",
      location: "",
      experience_required: "",
      salary_range: "",
      description: "",
      requirements: "",
      skills: "",
      closing_date: "",
      interview_type: "standard",
    },
  });

  const watchedInterviewType = form.watch("interview_type");
  const pipelineTypes = getPipelineTypesForInterviewType(watchedInterviewType);
  const defaultPipelineStages = selectedPipelineType ? getPipelineStages(watchedInterviewType, selectedPipelineType, selectedRole) : [];
  
  const pipelineStagesKey = defaultPipelineStages.map(s => s.name).join(',');
  const [prevStagesKey, setPrevStagesKey] = useState("");
  if (pipelineStagesKey && pipelineStagesKey !== prevStagesKey) {
    setCustomStages([...defaultPipelineStages]);
    setPrevStagesKey(pipelineStagesKey);
  }

  const handleDynamicFieldChange = (fieldName: string, value: string, additionalResets?: Record<string, string>) => {
    setDynamicFieldValues(prev => ({ ...prev, [fieldName]: value, ...additionalResets }));
    if (watchedInterviewType === 'education') {
      form.setValue("job_title", "");
    }
  };

  const getJobTitleOptions = (): string[] => {
    const { segment, designation, subjects, specialized_subjects, department_type, program, hs_classes, category, function: fn } = dynamicFieldValues;
    const sector = dynamicFieldValues["sector_division"];
    const titles: string[] = [];
    if (!sector) return titles;

    if (category === "non_academic" && fn === "admin") {
      const adminDesignationMap: Record<string, string> = {
        cluster: "Cluster Head", principal: "Principal", vice_principal: "Vice-Principal",
        zonal_coordinator: "Zonal Coordinator", resource_person: "Resource Person",
        sme: "Subject Matter Expert (SME)", rnd_head: "R&D Head",
      };
      if (designation && adminDesignationMap[designation]) {
        const base = adminDesignationMap[designation];
        const subj = specialized_subjects && specialized_subjects !== "all" ? ` - ${specialized_subjects.charAt(0).toUpperCase() + specialized_subjects.slice(1)}` : "";
        titles.push(`${base}${subj}`);
        if (specialized_subjects === "all") titles.push(`${base} - All Subjects`);
      }
      return titles;
    }

    if (segment === "Pre-Primary") {
      const preDesigMap: Record<string, string> = { mother_teacher: "Mother Teacher", asso_teacher: "Associate Teacher", care_taker: "Care Taker" };
      if (designation && preDesigMap[designation]) titles.push(preDesigMap[designation]);
      if (subjects) titles.push(`${subjects} Teacher - Pre-Primary`);
      return titles;
    }

    if (segment === "Primary") {
      const classLabel = hs_classes === "classes_1_2" ? "Classes 1&2" : dynamicFieldValues["classes"] === "classes_1_2" ? "Classes 1&2" : dynamicFieldValues["classes"] === "classes_3_4_5" ? "Classes 3,4&5" : "";
      if (designation) {
        const desigLabel = designation.charAt(0).toUpperCase() + designation.slice(1);
        titles.push(classLabel ? `${desigLabel} Teacher - ${classLabel}` : `${desigLabel} Teacher`);
      }
      if (department_type) {
        const deptLabels: Record<string, string> = {
          asso_teacher: "Associate Teacher", mother_teacher: "Mother Teacher",
          "1st_language": "1st Language Teacher", "2nd_language": "2nd Language Teacher",
          "3rd_language": "3rd Language Teacher", maths: "Mathematics Teacher",
          english: "English Teacher", gen_science: "General Science Teacher",
          social: "Social Studies Teacher", computers: "Computer Teacher",
          physical_education: "Physical Education Teacher", cca_art_craft: "Art & Craft Teacher",
        };
        if (deptLabels[department_type]) {
          const deptTitle = deptLabels[department_type];
          titles.push(classLabel ? `${deptTitle} - ${classLabel}` : deptTitle);
        }
      }
      return [...new Set(titles)];
    }

    if (segment === "High School") {
      const classLabel = hs_classes === "class_6_7_8" ? "CLASS 6,7&8" : hs_classes === "class_9_10" ? "CLASS 9&10" : "";
      const programLabel = program === "competitive" ? "Competitive" : "Board";
      if (designation) {
        const desigLabels: Record<string, string> = {
          "1st_language": "1st Language", "2nd_language": "2nd Language", "3rd_language": "3rd Language",
          maths: "Mathematics", physics: "Physics", chemistry: "Chemistry", biology: "Biology",
          botany: "Botany", zoology: "Zoology", social: "Social Studies",
          academic: "Academic Coordinator", dean: "Dean", computers: "Computer Science",
          physical_education: "Physical Education", soft_skills: "Soft Skills",
          trainer: "Trainer", mental_ability: "Mental Ability", counsellor: "Counsellor",
        };
        const desigName = desigLabels[designation] || designation;
        const suffix = program === "competitive" ? "Faculty" : "Teacher";
        if (classLabel) {
          titles.push(`${desigName} ${suffix} - ${classLabel} (${programLabel})`);
          titles.push(`${desigName} ${suffix} - ${classLabel}`);
        } else {
          titles.push(`${desigName} ${suffix} (${programLabel})`);
        }
      }
      return titles;
    }

    if (designation) {
      titles.push(designation);
      if (subjects) titles.push(`${designation} - ${subjects}`);
    }
    return titles;
  };

  const jobTitleOptions = getJobTitleOptions();

  const handleRefineWithAI = async () => {
    if (!refineFeedback.trim()) {
      toast({ title: "Feedback required", description: "Please provide feedback on what you'd like to improve.", variant: "destructive" });
      return;
    }
    const currentDescription = form.getValues("description");
    const currentRequirements = form.getValues("requirements");
    const currentSkills = form.getValues("skills");
    if (!currentDescription || !currentRequirements || !currentSkills) {
      toast({ title: "No content to refine", description: "Please generate a job description first.", variant: "destructive" });
      return;
    }
    setIsRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-description", {
        body: {
          jobTitle: form.getValues("job_title"), department: form.getValues("department"),
          jobType: form.getValues("job_type"), location: form.getValues("location"),
          experienceRequired: form.getValues("experience_required"), skills: currentSkills,
          isRefinement: true, currentDescription, currentRequirements, currentSkills, feedback: refineFeedback,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.description || !data?.requirements || !data?.skills) throw new Error("Invalid response from AI service");
      form.setValue("description", typeof data.description === 'string' ? data.description : String(data.description));
      form.setValue("requirements", typeof data.requirements === 'string' ? data.requirements : String(data.requirements));
      form.setValue("skills", typeof data.skills === 'string' ? data.skills : String(data.skills));
      setShowRefineDialog(false);
      setRefineFeedback("");
      toast({ title: "Content refined!", description: "AI has improved the content based on your feedback." });
    } catch (error: any) {
      console.error("Error refining job description:", error);
      toast({ title: "Failed to refine content", description: error.message || "Please try again later.", variant: "destructive" });
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateJD = async () => {
    const jobTitle = form.getValues("job_title");
    const department = form.getValues("department");
    const jobType = form.getValues("job_type");
    const location = form.getValues("location");
    const experienceRequired = form.getValues("experience_required");
    const skills = form.getValues("skills");
    if (!jobTitle || !jobType || !location || !experienceRequired) {
      toast({ title: "Missing information", description: "Please fill in Job Title, Job Type, Location, and Experience Required.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-description", {
        body: { jobTitle, department, jobType, location, experienceRequired, skills },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.description || !data?.requirements || !data?.skills) throw new Error("Invalid response from AI service");
      form.setValue("description", typeof data.description === 'string' ? data.description : String(data.description));
      form.setValue("requirements", typeof data.requirements === 'string' ? data.requirements : String(data.requirements));
      form.setValue("skills", typeof data.skills === 'string' ? data.skills : String(data.skills));
      setHasGenerated(true);
      toast({ title: "Job description generated!", description: "AI has generated job description, requirements, and skills." });
    } catch (error: any) {
      console.error("Error generating job description:", error);
      toast({ title: "Failed to generate description", description: error.message || "Please try again later.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (values: JobFormValues) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Authentication required", description: "Please log in to post a job.", variant: "destructive" });
        navigate("/employer/login");
        return;
      }
      const skillsArray = values.skills.split(",").map((skill) => skill.trim()).filter((skill) => skill.length > 0);
      const jobData = {
        employer_id: user.id,
        job_title: values.job_title,
        department: values.department || null,
        job_type: values.job_type,
        location: values.location,
        experience_required: values.experience_required,
        salary_range: values.salary_range || null,
        description: values.description,
        requirements: values.requirements,
        skills: skillsArray,
        closing_date: values.closing_date || null,
        status: "active",
        interview_type: values.interview_type,
        designation: selectedRole || dynamicFieldValues["designation"] || null,
        segment: dynamicFieldValues["segment"] || null,
        sector_division: dynamicFieldValues["sector_division"] || null,
        board: dynamicFieldValues["board"] || null,
        subjects: dynamicFieldValues["subjects"] || dynamicFieldValues["specialized_subjects"] || null,
        classes: dynamicFieldValues["hs_classes"] || dynamicFieldValues["classes"] || null,
        programme: dynamicFieldValues["program"] || null,
        category: dynamicFieldValues["category"] || null,
        function_type: dynamicFieldValues["function"] || null,
        pipeline_stages: customStages.length > 0 ? customStages : null,
      };

      const { data: inserted, error } = await supabase.from("jobs").insert([jobData] as any).select("id").single();
      if (error) throw error;
      if (inserted?.id) {
        supabase.functions.invoke("notify-job-event", {
          body: { event: "job_posted", jobId: inserted.id },
        }).catch((e) => console.warn("notify-job-event failed", e));
      }
      toast({ title: "Job posted successfully!", description: "Your job listing is now live and visible to candidates." });
      navigate("/employer/dashboard");
    } catch (error: any) {
      console.error("Error posting job:", error);
      toast({ title: "Failed to post job", description: error.message || "Please try again later.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-subtle py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/employer/dashboard")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Post a New Job</CardTitle>
                <CardDescription>Fill in the details below to post a new job</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Interview Type & Pipeline Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="interview_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interview Type *</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            setSelectedPipelineType("");
                            setSelectedRole("");
                            setDynamicFieldValues({});
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select interview type" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">Standard (MCQ-based)</SelectItem>
                            <SelectItem value="it_corporate">IT Corporate (Coding + MCQ)</SelectItem>
                            <SelectItem value="education">Education (Includes Demo Video Round)</SelectItem>
                            <SelectItem value="sales">Sales (Presentation + MCQ)</SelectItem>
                            <SelectItem value="management">Management (Case Study + MCQ)</SelectItem>
                            <SelectItem value="non_it_corporate">Non-IT Corporate (Aptitude + Interview)</SelectItem>
                            <SelectItem value="legal">Legal (Instruction + Written + Management Meet)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          {field.value === 'education' && "📹 Includes Demo Video round for teaching positions"}
                          {field.value === 'it_corporate' && "💻 For IT companies — includes coding assessments"}
                          {field.value === 'non_it_corporate' && "🏢 For non-tech corporate roles — aptitude & interview based"}
                          {field.value === 'sales' && "📊 Includes presentation & pitch assessment"}
                          {field.value === 'management' && "📋 Includes case study & leadership analysis"}
                          {field.value === 'standard' && "📝 Standard MCQ-based screening interviews"}
                          {field.value === 'legal' && "⚖️ Instruction mail + Written test + Management meet"}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {pipelineTypes.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Interview Pipeline Type *</label>
                      <Select value={selectedPipelineType} onValueChange={(val) => { setSelectedPipelineType(val); setSelectedRole(""); }}>
                        <SelectTrigger><SelectValue placeholder="Select pipeline type" /></SelectTrigger>
                        <SelectContent>
                          {pipelineTypes.map((pt) => (
                            <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Choose the role type to see the interview stages</p>
                    </div>
                  )}
                </div>

                {/* Role Selection */}
                {selectedPipelineType && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Role *</label>
                    <Select value={selectedRole || undefined} onValueChange={setSelectedRole} key={`role-${watchedInterviewType}-${selectedPipelineType}`}>
                      <SelectTrigger><SelectValue placeholder="Select role / designation" /></SelectTrigger>
                      <SelectContent>
                        {getRolesForPipeline(watchedInterviewType, selectedPipelineType).map((role) => (
                          <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Select the role for this position</p>
                  </div>
                )}

                {/* Pipeline Stages Preview */}
                {customStages.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      Interview Stages ({customStages.length} steps)
                    </h4>
                    <div className="space-y-2">
                      {customStages.map((stage, index) => (
                        <div key={stage.order} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{index + 1}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                              {stage.name}
                              {stage.isAutomated && <span className="text-[10px] opacity-70">⚡</span>}
                            </p>
                            {stage.description && <p className="text-xs text-muted-foreground truncate">{stage.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education-specific cascading fields */}
                {watchedInterviewType === 'education' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium leading-none">Sector</label>
                        <Select value={dynamicFieldValues["sector_division"] || undefined} onValueChange={(val) => handleDynamicFieldChange("sector_division", val, { category: "", function: "", board: "", segment: "", department_type: "", designation: "", subjects: "", classes: "", program: "", hs_classes: "", specialized_subjects: "" })}>
                          <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="school">School</SelectItem>
                            <SelectItem value="college">College</SelectItem>
                            <SelectItem value="coaching_center">Coaching Center</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium leading-none">Category</label>
                        <Select key={`category-${dynamicFieldValues["sector_division"] || "default"}`} value={dynamicFieldValues["category"] || undefined} onValueChange={(val) => handleDynamicFieldChange("category", val, { function: "", segment: "", department_type: "", designation: "", subjects: "", classes: "", program: "", hs_classes: "", specialized_subjects: "" })}>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {dynamicFieldValues["sector_division"] === "college" ? (
                              <>
                                <SelectItem value="academic">Academic</SelectItem>
                                <SelectItem value="non_academic">Non-Academic</SelectItem>
                                <SelectItem value="research">Research</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="academic">Academic</SelectItem>
                                <SelectItem value="non_academic">Non-Academic</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium leading-none">Function</label>
                        <Select value={dynamicFieldValues["function"] || undefined} onValueChange={(val) => handleDynamicFieldChange("function", val, { board: "", segment: "", department_type: "", designation: "", subjects: "", classes: "", program: "", hs_classes: "", specialized_subjects: "" })}>
                          <SelectTrigger><SelectValue placeholder="Select function" /></SelectTrigger>
                          <SelectContent>
                            {dynamicFieldValues["category"] === "non_academic" ? (
                              <>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="coaching_center">Coaching Center</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="teaching">Teaching</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="support">Support</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Board, Segment, Department, Designation, Subjects */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium leading-none">Board</label>
                        <Select key={`board-select-${dynamicFieldValues["function"] || "default"}`} value={dynamicFieldValues["board"] || undefined} onValueChange={(val) => handleDynamicFieldChange("board", val, { segment: "", department_type: "", designation: "", subjects: "", classes: "", program: "", hs_classes: "", specialized_subjects: "" })}>
                          <SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CBSE">CBSE</SelectItem>
                            <SelectItem value="ICSE">ICSE / ISC</SelectItem>
                            <SelectItem value="State Board">State Board</SelectItem>
                            <SelectItem value="IB">IB (International Baccalaureate)</SelectItem>
                            <SelectItem value="Cambridge">Cambridge (IGCSE)</SelectItem>
                            <SelectItem value="Montessori">Montessori</SelectItem>
                            <SelectItem value="Play School">Play School / Pre-School</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium leading-none">Segment</label>
                        <Select key={`segment-${dynamicFieldValues["board"] || "default"}`} value={dynamicFieldValues["segment"] || undefined} onValueChange={(val) => handleDynamicFieldChange("segment", val, { department_type: "", designation: "", subjects: "", classes: "", program: "", hs_classes: "", specialized_subjects: "" })} disabled={!dynamicFieldValues["board"]}>
                          <SelectTrigger><SelectValue placeholder={dynamicFieldValues["board"] ? "Select segment" : "Select board first"} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pre-Primary">Pre-Primary</SelectItem>
                            <SelectItem value="Primary">Primary</SelectItem>
                            <SelectItem value="High School">High School</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Primary: Non-Academic Admin */}
                      {dynamicFieldValues["segment"] === "Primary" && dynamicFieldValues["category"] === "non_academic" && dynamicFieldValues["function"] === "admin" ? (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium leading-none">Designation</label>
                            <Select key={`desig-admin-primary`} value={dynamicFieldValues["designation"] || undefined} onValueChange={(val) => handleDynamicFieldChange("designation", val)}>
                              <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="vice_principal">Vice-Principal</SelectItem>
                                <SelectItem value="principal">Principal</SelectItem>
                                <SelectItem value="zonal_coordinator">Zonal Coordinator</SelectItem>
                                <SelectItem value="resource_person">Resource Person</SelectItem>
                                <SelectItem value="sme">SME</SelectItem>
                                <SelectItem value="rnd_head">R&D Head</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium leading-none">Specialized Subjects</label>
                            <Select key={`specialized-subjects-admin-primary`} value={dynamicFieldValues["specialized_subjects"] || undefined} onValueChange={(val) => handleDynamicFieldChange("specialized_subjects", val)}>
                              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Subjects</SelectItem>
                                <SelectItem value="telugu">Telugu</SelectItem>
                                <SelectItem value="hindi">Hindi</SelectItem>
                                <SelectItem value="english">English</SelectItem>
                                <SelectItem value="maths">Maths</SelectItem>
                                <SelectItem value="science">Science</SelectItem>
                                <SelectItem value="social">Social</SelectItem>
                                <SelectItem value="chemistry">Chemistry</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : dynamicFieldValues["segment"] === "Primary" ? (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium leading-none">Classes</label>
                            <Select key={`classes-primary`} value={dynamicFieldValues["classes"] || undefined} onValueChange={(val) => handleDynamicFieldChange("classes", val, { department_type: "", designation: "" })}>
                              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="classes_1_2">Classes 1&2</SelectItem>
                                <SelectItem value="classes_3_4_5">Classes 3,4&5</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium leading-none">Department</label>
                            <Select key={`dept-primary-${dynamicFieldValues["classes"] || "none"}`} value={dynamicFieldValues["department_type"] || undefined} onValueChange={(val) => handleDynamicFieldChange("department_type", val)}>
                              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                              <SelectContent>
                                {dynamicFieldValues["classes"] === "classes_1_2" ? (
                                  <>
                                    <SelectItem value="asso_teacher">Asso.Teacher</SelectItem>
                                    <SelectItem value="mother_teacher">Mother Teacher</SelectItem>
                                    <SelectItem value="1st_language">1st Language</SelectItem>
                                    <SelectItem value="2nd_language">2nd Language</SelectItem>
                                  </>
                                ) : (
                                  <>
                                    <SelectItem value="1st_language">1st Language</SelectItem>
                                    <SelectItem value="2nd_language">2nd Language</SelectItem>
                                    <SelectItem value="3rd_language">3rd Language</SelectItem>
                                    <SelectItem value="maths">MATHS</SelectItem>
                                    <SelectItem value="english">ENGLISH</SelectItem>
                                    <SelectItem value="gen_science">GEN.SCIENCE</SelectItem>
                                    <SelectItem value="social">SOCIAL</SelectItem>
                                    <SelectItem value="computers">COMPUTERS</SelectItem>
                                    <SelectItem value="physical_education">PHYSICAL EDUCATION</SelectItem>
                                    <SelectItem value="cca_art_craft">CCA-Art&Craft</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium leading-none">Designation</label>
                            <Select key={`desig-primary-${dynamicFieldValues["classes"] || "none"}`} value={dynamicFieldValues["designation"] || undefined} onValueChange={(val) => handleDynamicFieldChange("designation", val)}>
                              <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                              <SelectContent>
                                {dynamicFieldValues["classes"] === "classes_1_2" ? (
                                  <>
                                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                                    <SelectItem value="English">English</SelectItem>
                                    <SelectItem value="EVS">EVS</SelectItem>
                                    <SelectItem value="Telugu">Telugu</SelectItem>
                                    <SelectItem value="Hindi">Hindi</SelectItem>
                                  </>
                                ) : (
                                  <SelectItem value="Teacher">Teacher</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : dynamicFieldValues["segment"] === "High School" && dynamicFieldValues["category"] === "non_academic" && dynamicFieldValues["function"] === "admin" ? (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium leading-none">Designation</label>
                            <Select key={`desig-admin-highschool`} value={dynamicFieldValues["designation"] || undefined} onValueChange={(val) => handleDynamicFieldChange("designation", val)}>
                              <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cluster">Cluster</SelectItem>
                                <SelectItem value="principal">Principal</SelectItem>
                                <SelectItem value="vice_principal">Vice-Principal</SelectItem>
                                <SelectItem value="zonal_coordinator">Zonal Coordinator</SelectItem>
                                <SelectItem value="resource_person">Resource Person</SelectItem>
                                <SelectItem value="sme">SME</SelectItem>
                                <SelectItem value="rnd_head">R&D Head</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium leading-none">Specialized Subjects</label>
                            <Select key={`specialized-subjects-admin-hs`} value={dynamicFieldValues["specialized_subjects"] || undefined} onValueChange={(val) => handleDynamicFieldChange("specialized_subjects", val)}>
                              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Subjects</SelectItem>
                                <SelectItem value="telugu">Telugu</SelectItem>
                                <SelectItem value="hindi">Hindi</SelectItem>
                                <SelectItem value="english">English</SelectItem>
                                <SelectItem value="maths">Maths</SelectItem>
                                <SelectItem value="physics">Physics</SelectItem>
                                <SelectItem value="chemistry">Chemistry</SelectItem>
                                <SelectItem value="biology">Biology</SelectItem>
                                <SelectItem value="science">Science</SelectItem>
                                <SelectItem value="computer">Computer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : dynamicFieldValues["segment"] === "High School" ? (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium leading-none">Program</label>
                            <Select key={`program-highschool`} value={dynamicFieldValues["program"] || undefined} onValueChange={(val) => handleDynamicFieldChange("program", val, { hs_classes: "", department_type: "", designation: "" })}>
                              <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="board">Board</SelectItem>
                                <SelectItem value="competitive">Competitive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium leading-none">Classes</label>
                            <Select key={`hs-classes-${dynamicFieldValues["program"] || "none"}`} value={dynamicFieldValues["hs_classes"] || undefined} onValueChange={(val) => handleDynamicFieldChange("hs_classes", val, { department_type: "", designation: "" })}>
                              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="class_6_7_8">CLASS-6,7&8</SelectItem>
                                <SelectItem value="class_9_10">CLASS-9&10</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium leading-none">Designation</label>
                            <Select key={`desig-highschool-${dynamicFieldValues["program"] || "none"}-${dynamicFieldValues["hs_classes"] || "none"}`} value={dynamicFieldValues["designation"] || undefined} onValueChange={(val) => handleDynamicFieldChange("designation", val)}>
                              <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                              <SelectContent>
                                {dynamicFieldValues["program"] === "competitive" ? (
                                  <>
                                    <SelectItem value="maths">MATHS</SelectItem>
                                    <SelectItem value="physics">PHYSICS</SelectItem>
                                    <SelectItem value="chemistry">CHEMISTRY</SelectItem>
                                    <SelectItem value="biology">BIOLOGY</SelectItem>
                                    <SelectItem value="botany">BOTANY</SelectItem>
                                    <SelectItem value="zoology">ZOOLOGY</SelectItem>
                                    <SelectItem value="mental_ability">MENTAL ABILITY</SelectItem>
                                    <SelectItem value="counsellor">COUNSELLOR</SelectItem>
                                  </>
                                ) : dynamicFieldValues["hs_classes"] === "class_9_10" ? (
                                  <>
                                    <SelectItem value="1st_language">1st Language</SelectItem>
                                    <SelectItem value="2nd_language">2nd Language</SelectItem>
                                    <SelectItem value="3rd_language">3rd Language</SelectItem>
                                    <SelectItem value="maths">MATHS</SelectItem>
                                    <SelectItem value="physics">PHYSICS</SelectItem>
                                    <SelectItem value="chemistry">CHEMISTRY</SelectItem>
                                    <SelectItem value="biology">BIOLOGY</SelectItem>
                                    <SelectItem value="botany">BOTANY</SelectItem>
                                    <SelectItem value="zoology">ZOOLOGY</SelectItem>
                                    <SelectItem value="social">SOCIAL</SelectItem>
                                    <SelectItem value="academic">ACADEMIC</SelectItem>
                                    <SelectItem value="dean">DEAN</SelectItem>
                                    <SelectItem value="computers">COMPUTERS</SelectItem>
                                    <SelectItem value="physical_education">PHYSICAL EDUCATION</SelectItem>
                                    <SelectItem value="soft_skills">SOFT SKILLS</SelectItem>
                                    <SelectItem value="trainer">TRAINER</SelectItem>
                                  </>
                                ) : (
                                  <>
                                    <SelectItem value="1st_language">1st Language</SelectItem>
                                    <SelectItem value="2nd_language">2nd Language</SelectItem>
                                    <SelectItem value="3rd_language">3rd Language</SelectItem>
                                    <SelectItem value="maths">MATHS</SelectItem>
                                    <SelectItem value="physics">PHYSICS</SelectItem>
                                    <SelectItem value="chemistry">CHEMISTRY</SelectItem>
                                    <SelectItem value="biology">BIOLOGY</SelectItem>
                                    <SelectItem value="social">SOCIAL</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : dynamicFieldValues["segment"] === "Pre-Primary" && dynamicFieldValues["category"] === "non_academic" && dynamicFieldValues["function"] === "admin" ? (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium leading-none">Designation</label>
                            <Select key={`desig-admin-preprimary`} value={dynamicFieldValues["designation"] || undefined} onValueChange={(val) => handleDynamicFieldChange("designation", val)}>
                              <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="vice_principal">Vice-Principal</SelectItem>
                                <SelectItem value="zonal_coordinator">Zonal Coordinator</SelectItem>
                                <SelectItem value="resource_person">Resource Person</SelectItem>
                                <SelectItem value="sme">SME</SelectItem>
                                <SelectItem value="rnd_head">R&D Head</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {dynamicFieldValues["designation"] && (
                            <div className="space-y-1.5">
                              <label className="text-sm font-medium leading-none">Specialized Subjects</label>
                              <Select key={`specialized-subjects-admin-preprimary`} value={dynamicFieldValues["specialized_subjects"] || undefined} onValueChange={(val) => handleDynamicFieldChange("specialized_subjects", val)}>
                                <SelectTrigger><SelectValue placeholder="Select specialized subject" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Subjects</SelectItem>
                                  <SelectItem value="telugu">Telugu</SelectItem>
                                  <SelectItem value="hindi">Hindi</SelectItem>
                                  <SelectItem value="numeracy">Numeracy</SelectItem>
                                  <SelectItem value="literacy">Literacy</SelectItem>
                                  <SelectItem value="rhymes">Rhymes</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </>
                      ) : dynamicFieldValues["segment"] ? (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium leading-none">Department</label>
                            <Select key={`dept-${dynamicFieldValues["segment"] || "none"}`} value={dynamicFieldValues["department_type"] || undefined} onValueChange={(val) => handleDynamicFieldChange("department_type", val)}>
                              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                              <SelectContent>
                                {dynamicFieldValues["segment"] === "Pre-Primary" ? (
                                  <>
                                    <SelectItem value="mother_teacher">Mother Teacher</SelectItem>
                                    <SelectItem value="asso_teacher">Asso.Teacher</SelectItem>
                                    <SelectItem value="care_taker">Care Taker</SelectItem>
                                  </>
                                ) : (
                                  <>
                                    <SelectItem value="academics">Academics</SelectItem>
                                    <SelectItem value="administration">Administration</SelectItem>
                                    <SelectItem value="sports">Sports & Physical Education</SelectItem>
                                    <SelectItem value="library">Library</SelectItem>
                                    <SelectItem value="lab">Laboratory</SelectItem>
                                    <SelectItem value="counseling">Counseling</SelectItem>
                                    <SelectItem value="it">IT / Computer Lab</SelectItem>
                                    <SelectItem value="accounts">Accounts & Finance</SelectItem>
                                    <SelectItem value="transport">Transport</SelectItem>
                                    <SelectItem value="hostel">Hostel</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium leading-none">Designation</label>
                            <Select key={`desig-${dynamicFieldValues["segment"] || "none"}`} value={dynamicFieldValues["designation"] || undefined} onValueChange={(val) => handleDynamicFieldChange("designation", val)}>
                              <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                              <SelectContent>
                                {dynamicFieldValues["segment"] === "Pre-Primary" ? (
                                  <>
                                    <SelectItem value="mother_teacher">Mother Teacher</SelectItem>
                                    <SelectItem value="asso_teacher">Asso.Teacher</SelectItem>
                                    <SelectItem value="care_taker">Care Taker</SelectItem>
                                  </>
                                ) : (
                                  <>
                                    <SelectItem value="PRT">PRT (Primary Teacher)</SelectItem>
                                    <SelectItem value="TGT">TGT (Trained Graduate Teacher)</SelectItem>
                                    <SelectItem value="PGT">PGT (Post Graduate Teacher)</SelectItem>
                                    <SelectItem value="Head Teacher">Head Teacher / HoD</SelectItem>
                                    <SelectItem value="Vice Principal">Vice Principal</SelectItem>
                                    <SelectItem value="Principal">Principal</SelectItem>
                                    <SelectItem value="Coordinator">Academic Coordinator</SelectItem>
                                    <SelectItem value="Counselor">Counselor</SelectItem>
                                    <SelectItem value="Librarian">Librarian</SelectItem>
                                    <SelectItem value="Lab Assistant">Lab Assistant</SelectItem>
                                    <SelectItem value="Sports Coach">Sports Coach / PET</SelectItem>
                                    <SelectItem value="Special Educator">Special Educator</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium leading-none">Subjects</label>
                            <Select key={`subj-${dynamicFieldValues["segment"] || "none"}`} value={dynamicFieldValues["subjects"] || undefined} onValueChange={(val) => handleDynamicFieldChange("subjects", val)}>
                              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                              <SelectContent>
                                {dynamicFieldValues["segment"] === "Pre-Primary" ? (
                                  <>
                                    <SelectItem value="Numeracy">Numeracy</SelectItem>
                                    <SelectItem value="Literacy">Literacy</SelectItem>
                                    <SelectItem value="Rhymes">Rhymes</SelectItem>
                                  </>
                                ) : (
                                  <>
                                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                                    <SelectItem value="Physics">Physics</SelectItem>
                                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                                    <SelectItem value="Biology">Biology</SelectItem>
                                    <SelectItem value="English">English</SelectItem>
                                    <SelectItem value="Hindi">Hindi</SelectItem>
                                    <SelectItem value="Telugu">Telugu</SelectItem>
                                    <SelectItem value="Social Studies">Social Studies</SelectItem>
                                    <SelectItem value="Science">Science (General)</SelectItem>
                                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                                    <SelectItem value="Commerce">Commerce / Accounts</SelectItem>
                                    <SelectItem value="Economics">Economics</SelectItem>
                                    <SelectItem value="Political Science">Political Science</SelectItem>
                                    <SelectItem value="History">History</SelectItem>
                                    <SelectItem value="Geography">Geography</SelectItem>
                                    <SelectItem value="Physical Education">Physical Education</SelectItem>
                                    <SelectItem value="Art">Art & Craft</SelectItem>
                                    <SelectItem value="Music">Music</SelectItem>
                                    <SelectItem value="Sanskrit">Sanskrit</SelectItem>
                                    <SelectItem value="EVS">EVS (Environmental Studies)</SelectItem>
                                    <SelectItem value="All Subjects">All Subjects</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </>
                )}

                {/* Job Title */}
                <FormField
                  control={form.control}
                  name="job_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title *</FormLabel>
                      {watchedInterviewType === 'education' ? (
                        <Select key={`job-title-${JSON.stringify(dynamicFieldValues)}`} value={field.value || undefined} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder={jobTitleOptions.length > 0 ? "Select job title" : "Select fields above to see job titles"} /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {jobTitleOptions.length > 0 ? (
                              jobTitleOptions.map((title) => (
                                <SelectItem key={title} value={title}>{title}</SelectItem>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-muted-foreground">
                                Please select Sector, Segment & Designation first
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <JobTitleAutocomplete
                          value={field.value}
                          onChange={field.onChange}
                          interviewType={watchedInterviewType}
                          pipelineType={selectedPipelineType}
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Department & Job Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Engineering" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="job_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select job type" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Full-time">Full-time</SelectItem>
                            <SelectItem value="Part-time">Part-time</SelectItem>
                            <SelectItem value="Contract">Contract</SelectItem>
                            <SelectItem value="Internship">Internship</SelectItem>
                            <SelectItem value="Remote">Remote</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Location & Experience */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Bangalore, India" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="experience_required"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience Required *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select experience level" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0-1 years">0-1 years (Entry Level)</SelectItem>
                            <SelectItem value="1-3 years">1-3 years</SelectItem>
                            <SelectItem value="3-5 years">3-5 years</SelectItem>
                            <SelectItem value="5-8 years">5-8 years</SelectItem>
                            <SelectItem value="8+ years">8+ years (Senior)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Salary Range & Closing Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="salary_range"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salary Range</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., ₹10-15 LPA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="closing_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Closing Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Generate JD & Refine Buttons */}
                <div className="flex justify-end gap-3">
                  {hasGenerated && (
                    <Button type="button" variant="outline" onClick={() => setShowRefineDialog(true)} disabled={isGenerating || isRefining} className="gap-2">
                      <RefreshCw className="h-4 w-4" /> Refine with AI
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={handleGenerateJD} disabled={isGenerating || isRefining} className="gap-2">
                    {isGenerating ? (<><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>) : (<><Sparkles className="h-4 w-4" /> Generate JD</>)}
                  </Button>
                </div>

                {/* Job Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Description *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Provide a detailed description of the role, responsibilities, and what the candidate will be doing..." className="min-h-[150px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Requirements */}
                <FormField
                  control={form.control}
                  name="requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requirements *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="List the qualifications, skills, and experience required for this position..." className="min-h-[120px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Skills */}
                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skills (comma-separated) *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., React, Node.js, TypeScript, AWS" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate("/employer/dashboard")} disabled={isSubmitting} className="flex-1">Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Posting Job...</>) : (<><Briefcase className="h-4 w-4 mr-2" /> Post Job</>)}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Refine with AI Dialog */}
        <Dialog open={showRefineDialog} onOpenChange={setShowRefineDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" /> Refine with AI
              </DialogTitle>
              <DialogDescription>
                Tell the AI how you'd like to improve the job description, requirements, or skills.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="feedback" className="text-sm font-medium">Your Feedback</label>
                <Textarea id="feedback" placeholder="e.g., 'Make the description more concise', 'Add more technical skills'..." value={refineFeedback} onChange={(e) => setRefineFeedback(e.target.value)} className="min-h-[120px]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowRefineDialog(false); setRefineFeedback(""); }} disabled={isRefining}>Cancel</Button>
              <Button onClick={handleRefineWithAI} disabled={isRefining || !refineFeedback.trim()}>
                {isRefining ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Refining...</>) : (<><Sparkles className="h-4 w-4 mr-2" /> Refine Content</>)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PostJob;

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Briefcase, Sparkles, RefreshCw, CheckCircle2, Bot, User, FileText, Upload, Eye, Wand2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getPipelineTypesForInterviewType, getPipelineStages, getRolesForPipeline } from "@/data/interviewPipelineConfig";
import { getFormConfigForInterviewType, defaultFormConfig } from "@/data/interviewFormOptions";
import { indiaLocationData } from "@/data/indiaLocations";

const jobFormSchema = z.object({
  job_title: z.string().min(3, "Job title must be at least 3 characters").max(100),
  department: z.string().optional(),
  job_type: z.string().min(1, "Please select a job type"),
  location: z.string().min(2, "Location is required"),
  experience_required: z.string().min(1, "Please select experience level"),
  salary_range: z.string().optional(),
  organisation: z.string().optional(),
  description: z.string().min(50, "Description must be at least 50 characters").max(5000),
  requirements: z.string().min(20, "Requirements must be at least 20 characters").max(3000),
  skills: z.string().min(2, "Please add at least one skill"),
  closing_date: z.string().optional(),
  interview_type: z.string().min(1, "Please select interview type"),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

interface InlineJobCreationFormProps {
  onJobCreated: () => void;
  onCancel: () => void;
}

export const InlineJobCreationForm = ({ onJobCreated, onCancel }: InlineJobCreationFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isGeneratingReq, setIsGeneratingReq] = useState(false);
  const [hasGeneratedReq, setHasGeneratedReq] = useState(false);
  const [isRefiningReq, setIsRefiningReq] = useState(false);
  const [selectedPipelineType, setSelectedPipelineType] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, string>>({});
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [requirementText, setRequirementText] = useState("");
  const [isParsingRequirements, setIsParsingRequirements] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string> | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      job_title: "",
      department: "",
      job_type: "",
      location: "",
      experience_required: "",
      salary_range: "",
      organisation: "",
      description: "",
      requirements: "",
      skills: "",
      closing_date: "",
      interview_type: "",
    },
  });

  const watchedInterviewType = form.watch("interview_type");
  const pipelineTypes = getPipelineTypesForInterviewType(watchedInterviewType);
  const pipelineStages = selectedPipelineType ? getPipelineStages(watchedInterviewType, selectedPipelineType, selectedRole) : [];

  // Get dynamic form config based on interview type
  const formConfig = getFormConfigForInterviewType(watchedInterviewType);
  const activeConfig = formConfig || defaultFormConfig;

  // Reset dynamic fields when interview type changes
  useEffect(() => {
    setDynamicFieldValues({});
    setSelectedPipelineType("");
    setSelectedRole("");
  }, [watchedInterviewType]);

  const handleDynamicFieldChange = (fieldName: string, value: string, additionalResets?: Record<string, string>) => {
    setDynamicFieldValues(prev => ({ ...prev, [fieldName]: value, ...additionalResets }));
    // Clear job title when upstream fields change so user re-selects
    form.setValue("job_title", "");
  };

  // Generate job title options based on selected cascading fields
  const getJobTitleOptions = (): string[] => {
    const { segment, designation, subjects, specialized_subjects, department_type, program, hs_classes, category, function: fn } = dynamicFieldValues;
    const sector = dynamicFieldValues["sector_division"];
    const titles: string[] = [];

    if (!sector) return titles;

    // Non-Academic Admin roles — use designation directly
    if (category === "non_academic" && fn === "admin") {
      const adminDesignationMap: Record<string, string> = {
        cluster: "Cluster Head",
        principal: "Principal",
        vice_principal: "Vice-Principal",
        zonal_coordinator: "Zonal Coordinator",
        resource_person: "Resource Person",
        sme: "Subject Matter Expert (SME)",
        rnd_head: "R&D Head",
      };
      if (designation && adminDesignationMap[designation]) {
        const base = adminDesignationMap[designation];
        const subj = specialized_subjects && specialized_subjects !== "all" ? ` - ${specialized_subjects.charAt(0).toUpperCase() + specialized_subjects.slice(1)}` : "";
        titles.push(`${base}${subj}`);
        if (specialized_subjects === "all") titles.push(`${base} - All Subjects`);
      }
      return titles;
    }

    // Pre-Primary teaching
    if (segment === "Pre-Primary") {
      const preDesigMap: Record<string, string> = {
        mother_teacher: "Mother Teacher",
        asso_teacher: "Associate Teacher",
        care_taker: "Care Taker",
      };
      if (designation && preDesigMap[designation]) {
        titles.push(preDesigMap[designation]);
      }
      if (subjects) {
        titles.push(`${subjects} Teacher - Pre-Primary`);
      }
      return titles;
    }

    // Primary teaching
    if (segment === "Primary") {
      const classLabel = hs_classes === "classes_1_2" ? "Classes 1&2" : dynamicFieldValues["classes"] === "classes_1_2" ? "Classes 1&2" : dynamicFieldValues["classes"] === "classes_3_4_5" ? "Classes 3,4&5" : "";
      if (designation) {
        const desigLabel = designation.charAt(0).toUpperCase() + designation.slice(1);
        if (classLabel) {
          titles.push(`${desigLabel} Teacher - ${classLabel}`);
        } else {
          titles.push(`${desigLabel} Teacher`);
        }
      }
      if (department_type) {
        const deptLabels: Record<string, string> = {
          asso_teacher: "Associate Teacher",
          mother_teacher: "Mother Teacher",
          "1st_language": "1st Language Teacher",
          "2nd_language": "2nd Language Teacher",
          "3rd_language": "3rd Language Teacher",
          maths: "Mathematics Teacher",
          english: "English Teacher",
          gen_science: "General Science Teacher",
          social: "Social Studies Teacher",
          computers: "Computer Teacher",
          physical_education: "Physical Education Teacher",
          cca_art_craft: "Art & Craft Teacher",
        };
        if (deptLabels[department_type]) {
          const deptTitle = deptLabels[department_type];
          titles.push(classLabel ? `${deptTitle} - ${classLabel}` : deptTitle);
        }
      }
      return [...new Set(titles)];
    }

    // High School
    if (segment === "High School") {
      const classLabel = hs_classes === "class_6_7_8" ? "CLASS 6,7&8" : hs_classes === "class_9_10" ? "CLASS 9&10" : "";
      const programLabel = program === "competitive" ? "Competitive" : "Board";

      if (designation) {
        const desigLabels: Record<string, string> = {
          "1st_language": "1st Language",
          "2nd_language": "2nd Language",
          "3rd_language": "3rd Language",
          maths: "Mathematics",
          physics: "Physics",
          chemistry: "Chemistry",
          biology: "Biology",
          botany: "Botany",
          zoology: "Zoology",
          social: "Social Studies",
          academic: "Academic Coordinator",
          dean: "Dean",
          computers: "Computer Science",
          physical_education: "Physical Education",
          soft_skills: "Soft Skills",
          trainer: "Trainer",
          mental_ability: "Mental Ability",
          counsellor: "Counsellor",
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

    // Fallback: general designations
    if (designation) {
      titles.push(designation);
      if (subjects) titles.push(`${designation} - ${subjects}`);
    }

    return titles;
  };

  const jobTitleOptions = getJobTitleOptions();

  const handleGenerateJD = async () => {
    const jobTitle = form.getValues("job_title");
    const department = form.getValues("department");
    const jobType = form.getValues("job_type");
    const location = form.getValues("location");
    const experienceRequired = form.getValues("experience_required");
    const skills = form.getValues("skills");

    if (!jobTitle || !jobType || !location || !experienceRequired) {
      toast({
        title: "Missing information",
        description: "Please fill in Job Title, Job Type, Location, and Experience Required to generate a job description.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-description", {
        body: { jobTitle, department, jobType, location, experienceRequired, skills, interviewType: watchedInterviewType, dynamicFields: dynamicFieldValues },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.description || !data?.requirements || !data?.skills) throw new Error("Invalid response from AI service");

      form.setValue("description", typeof data.description === 'string' ? data.description : JSON.stringify(data.description));
      form.setValue("requirements", typeof data.requirements === 'string' ? data.requirements : Array.isArray(data.requirements) ? data.requirements.join('\n') : JSON.stringify(data.requirements));
      form.setValue("skills", typeof data.skills === 'string' ? data.skills : Array.isArray(data.skills) ? data.skills.join(', ') : JSON.stringify(data.skills));
      setHasGenerated(true);
      setHasGeneratedReq(true);

      toast({ title: "Job description generated!", description: "AI has generated job description, requirements, and skills." });
    } catch (error: any) {
      console.error("Error generating job description:", error);
      toast({ title: "Failed to generate description", description: error.message || "Please try again later.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateRequirements = async () => {
    const jobTitle = form.getValues("job_title");
    const jobType = form.getValues("job_type");
    const location = form.getValues("location");
    const experienceRequired = form.getValues("experience_required");
    const skills = form.getValues("skills");
    const department = form.getValues("department");

    if (!jobTitle || !jobType || !location || !experienceRequired) {
      toast({
        title: "Missing information",
        description: "Please fill in Job Title, Job Type, Location, and Experience Required to generate requirements.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingReq(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-description", {
        body: { jobTitle, department, jobType, location, experienceRequired, skills, interviewType: watchedInterviewType, dynamicFields: dynamicFieldValues },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.requirements) throw new Error("Invalid response from AI service");

      form.setValue("requirements", typeof data.requirements === 'string' ? data.requirements : Array.isArray(data.requirements) ? data.requirements.join('\n') : JSON.stringify(data.requirements));
      setHasGeneratedReq(true);

      toast({ title: "Requirements generated!", description: "AI has generated the requirements for this position." });
    } catch (error: any) {
      console.error("Error generating requirements:", error);
      toast({ title: "Failed to generate requirements", description: error.message || "Please try again later.", variant: "destructive" });
    } finally {
      setIsGeneratingReq(false);
    }
  };

  const handleRefineRequirements = async () => {
    const currentRequirements = form.getValues("requirements");
    if (!currentRequirements || currentRequirements.length < 10) {
      toast({
        title: "No requirements to refine",
        description: "Please generate or enter requirements first before refining.",
        variant: "destructive",
      });
      return;
    }

    setIsRefiningReq(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-description", {
        body: {
          jobTitle: form.getValues("job_title"),
          department: form.getValues("department"),
          jobType: form.getValues("job_type"),
          location: form.getValues("location"),
          experienceRequired: form.getValues("experience_required"),
          skills: form.getValues("skills"),
          isRefinement: true,
          currentDescription: form.getValues("description"),
          currentRequirements,
          currentSkills: form.getValues("skills"),
          feedback: "Please improve and refine the requirements section to be more comprehensive, well-structured, and professional.",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.requirements) throw new Error("Invalid response from AI service");

      form.setValue("requirements", typeof data.requirements === 'string' ? data.requirements : Array.isArray(data.requirements) ? data.requirements.join('\n') : JSON.stringify(data.requirements));

      toast({ title: "Requirements refined!", description: "AI has improved the requirements." });
    } catch (error: any) {
      console.error("Error refining requirements:", error);
      toast({ title: "Failed to refine requirements", description: error.message || "Please try again later.", variant: "destructive" });
    } finally {
      setIsRefiningReq(false);
    }
  };

  const onSubmit = async (values: JobFormValues) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({ title: "Authentication required", description: "Please log in to post a job.", variant: "destructive" });
        return;
      }

      const skillsArray = values.skills.split(",").map((s) => s.trim()).filter((s) => s.length > 0);

      const { error } = await supabase.from("jobs").insert([{
        employer_id: user.id,
        job_title: values.job_title,
        department: values.department || null,
        job_type: values.job_type,
        location: values.location,
        experience_required: values.experience_required,
        salary_range: values.salary_range || null,
        organisation: values.organisation || null,
        description: values.description,
        requirements: values.requirements,
        skills: skillsArray,
        closing_date: values.closing_date || null,
        status: "active",
        interview_type: values.interview_type,
        sector_division: dynamicFieldValues["sector_division"] || null,
        category: dynamicFieldValues["category"] || null,
        function_type: dynamicFieldValues["function"] || null,
        segment: dynamicFieldValues["segment"] || null,
        program: dynamicFieldValues["program"] || null,
        classes: dynamicFieldValues["hs_classes"] || dynamicFieldValues["classes"] || null,
        board: dynamicFieldValues["board"] || null,
        designation: selectedRole || dynamicFieldValues["designation"] || null,
        subjects: dynamicFieldValues["subjects"] || dynamicFieldValues["specialized_subjects"] || null,
      } as any]);

      if (error) throw error;

      toast({ title: "Job posted successfully!", description: "Your job listing is now live." });
      onJobCreated();
    } catch (error: any) {
      console.error("Error posting job:", error);
      toast({ title: "Failed to post job", description: error.message || "Please try again later.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden max-w-full">
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Create New Vacancy</h3>
            <p className="text-sm text-muted-foreground">Fill in the details below to post a new job</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 overflow-hidden">
            {/* Interview Type & Pipeline Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select interview type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="education">Education (Includes Demo Video Round)</SelectItem>
                        <SelectItem value="standard">Standard (MCQ-based)</SelectItem>
                        <SelectItem value="it_corporate">IT Corporate (Coding + MCQ)</SelectItem>
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
                  <label className="text-sm font-medium leading-none">
                    Interview Pipeline Type *
                  </label>
                  <Select value={selectedPipelineType} onValueChange={(val) => {
                    setSelectedPipelineType(val);
                    setSelectedRole("");
                  }}>
                    <SelectTrigger className="border-input bg-background">
                      <SelectValue placeholder="Select pipeline type" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelineTypes.map((pt) => (
                        <SelectItem key={pt.value} value={pt.value}>
                          {pt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Choose the role type to see the interview stages</p>
                </div>
              )}
            </div>

            {/* Role Selection */}
            {selectedPipelineType && (
              <div className="space-y-2 max-w-sm">
                <label className="text-sm font-medium leading-none">
                  Role *
                </label>
                <Select
                  value={selectedRole || undefined}
                  onValueChange={setSelectedRole}
                  key={`role-${watchedInterviewType}-${selectedPipelineType}`}
                >
                  <SelectTrigger className="border-input bg-background">
                    <SelectValue placeholder="Select role / designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {getRolesForPipeline(watchedInterviewType, selectedPipelineType).map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the role for this position
                </p>
              </div>
            )}

            {/* Pipeline Stages Preview */}
            {pipelineStages.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">
                    Interview Pipeline Stages ({pipelineStages.length} stages)
                  </h4>
                </div>
                <div className="space-y-2">
                  {pipelineStages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-md border bg-background p-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{stage.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{stage.description}</p>
                      </div>
                      <Badge variant={stage.isAutomated ? "default" : "outline"} className="shrink-0 text-[10px] gap-1">
                        {stage.isAutomated ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {stage.isAutomated ? 'AI' : 'Manual'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Education-specific fields: Sector, Category, Function, Board, Segment, etc. */}
            {watchedInterviewType === 'education' && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">Sector</label>
                <Select
                   value={dynamicFieldValues["sector_division"] || undefined}
                   onValueChange={(val) => handleDynamicFieldChange("sector_division", val, { category: "", function: "", board: "", segment: "", department_type: "" })}
                 >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="college">College</SelectItem>
                    <SelectItem value="coaching_center">Coaching Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>

               <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">Category</label>
                <Select
                   key={`category-${dynamicFieldValues["sector_division"] || "default"}`}
                   value={dynamicFieldValues["category"] || undefined}
                   onValueChange={(val) => {
                     handleDynamicFieldChange("category", val, { function: "", segment: "", department_type: "" });
                   }}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select category" />
                   </SelectTrigger>
                   <SelectContent>
                     {dynamicFieldValues["sector_division"] === "school" ? (
                       <>
                         <SelectItem value="academic">Academic</SelectItem>
                         <SelectItem value="non_academic">Non-Academic</SelectItem>
                       </>
                     ) : dynamicFieldValues["sector_division"] === "college" ? (
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
                <Select
                  value={dynamicFieldValues["function"] || undefined}
                  onValueChange={(val) => {
                    handleDynamicFieldChange("function", val, { board: "", segment: "", department_type: "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select function" />
                  </SelectTrigger>
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
                <Select
                  key={`board-select-${dynamicFieldValues["function"] || "default"}`}
                  value={dynamicFieldValues["board"] || undefined}
                  onValueChange={(val) => {
                    handleDynamicFieldChange("board", val, { segment: "", department_type: "", designation: "", subjects: "", classes: "", program: "", hs_classes: "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-[200]">
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
                <Select
                  key={`segment-${dynamicFieldValues["board"] || "default"}-${dynamicFieldValues["function"] || "default"}`}
                  value={dynamicFieldValues["segment"] || undefined}
                  onValueChange={(val) => {
                    handleDynamicFieldChange("segment", val, { department_type: "", designation: "", subjects: "", classes: "", program: "", hs_classes: "" });
                  }}
                  disabled={!dynamicFieldValues["board"]}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={dynamicFieldValues["board"] ? "Select segment" : "Select board first"} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-[200]">
                    <SelectItem value="Pre-Primary">Pre-Primary</SelectItem>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="High School">High School</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Primary: Classes, Department, Designation */}
              {dynamicFieldValues["segment"] === "Primary" && dynamicFieldValues["category"] === "non_academic" && dynamicFieldValues["function"] === "admin" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium leading-none">Designation</label>
                    <Select
                      key={`desig-admin-primary`}
                      value={dynamicFieldValues["designation"] || undefined}
                      onValueChange={(val) => handleDynamicFieldChange("designation", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[200]">
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
                    <Select
                      key={`specialized-subjects-admin-primary`}
                      value={dynamicFieldValues["specialized_subjects"] || undefined}
                      onValueChange={(val) => handleDynamicFieldChange("specialized_subjects", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[200]">
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
                  <div />
                </>
              ) : dynamicFieldValues["segment"] === "Primary" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium leading-none">Classes</label>
                    <Select
                      key={`classes-primary`}
                      value={dynamicFieldValues["classes"] || undefined}
                      onValueChange={(val) => handleDynamicFieldChange("classes", val, { department_type: "", designation: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[200]">
                        <SelectItem value="classes_1_2">Classes 1&2</SelectItem>
                        <SelectItem value="classes_3_4_5">Classes 3,4&5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium leading-none">Department</label>
                    <Select
                      key={`dept-primary-${dynamicFieldValues["classes"] || "none"}`}
                      value={dynamicFieldValues["department_type"] || undefined}
                      onValueChange={(val) => handleDynamicFieldChange("department_type", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[200]">
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
                    <Select
                      key={`desig-primary-${dynamicFieldValues["classes"] || "none"}`}
                      value={dynamicFieldValues["designation"] || undefined}
                      onValueChange={(val) => handleDynamicFieldChange("designation", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[200]">
                        {dynamicFieldValues["classes"] === "classes_1_2" ? (
                          <>
                            <SelectItem value="Mathematics">Mathematics</SelectItem>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="EVS">EVS</SelectItem>
                            <SelectItem value="Telugu">Telugu</SelectItem>
                            <SelectItem value="Hindi">Hindi</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="Teacher">Teacher</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : dynamicFieldValues["segment"] === "High School" && dynamicFieldValues["category"] === "non_academic" && dynamicFieldValues["function"] === "admin" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium leading-none">Designation</label>
                    <Select
                      key={`desig-admin-highschool`}
                      value={dynamicFieldValues["designation"] || undefined}
                      onValueChange={(val) => handleDynamicFieldChange("designation", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[200]">
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
                    <Select
                      key={`specialized-subjects-admin-hs`}
                      value={dynamicFieldValues["specialized_subjects"] || undefined}
                      onValueChange={(val) => handleDynamicFieldChange("specialized_subjects", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[200]">
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
                  <div />
                </>
              ) : dynamicFieldValues["segment"] === "High School" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium leading-none">Program</label>
                    <Select
                      key={`program-highschool`}
                      value={dynamicFieldValues["program"] || undefined}
                      onValueChange={(val) => handleDynamicFieldChange("program", val, { hs_classes: "", department_type: "", designation: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[200]">
                        <SelectItem value="board">Board</SelectItem>
                        <SelectItem value="competitive">Competitive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium leading-none">Classes</label>
                    <Select
                      key={`hs-classes-${dynamicFieldValues["program"] || "none"}`}
                      value={dynamicFieldValues["hs_classes"] || undefined}
                      onValueChange={(val) => handleDynamicFieldChange("hs_classes", val, { department_type: "", designation: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[200]">
                        <SelectItem value="class_6_7_8">CLASS-6,7&8</SelectItem>
                        <SelectItem value="class_9_10">CLASS-9&10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium leading-none">Designation</label>
                    <Select
                      key={`desig-highschool-${dynamicFieldValues["program"] || "none"}-${dynamicFieldValues["hs_classes"] || "none"}`}
                      value={dynamicFieldValues["designation"] || undefined}
                      onValueChange={(val) => handleDynamicFieldChange("designation", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[200]">
                        {dynamicFieldValues["program"] === "competitive" ? (
                          dynamicFieldValues["hs_classes"] === "class_9_10" ? (
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
                          ) : (
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
                          )
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
                    <Select
                      key={`desig-admin-preprimary`}
                      value={dynamicFieldValues["designation"] || undefined}
                      onValueChange={(val) => handleDynamicFieldChange("designation", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[200]">
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
                      <Select
                        key={`specialized-subjects-admin-preprimary`}
                        value={dynamicFieldValues["specialized_subjects"] || undefined}
                        onValueChange={(val) => handleDynamicFieldChange("specialized_subjects", val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select specialized subject" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-[200]">
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
              ) : (
                <>
                  {/* Pre-Primary / Other: Department, Designation, Subjects */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium leading-none">Department</label>
                    <Select
                      key={`dept-${dynamicFieldValues["segment"] || "none"}-${dynamicFieldValues["function"] || "none"}`}
                      value={dynamicFieldValues["department_type"] || undefined}
                      onValueChange={(val) => handleDynamicFieldChange("department_type", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[200]">
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
                    <Select
                      key={`desig-${dynamicFieldValues["segment"] || "none"}`}
                      value={dynamicFieldValues["designation"] || undefined}
                      onValueChange={(val) => handleDynamicFieldChange("designation", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[200]">
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
                    <Select
                      key={`subj-${dynamicFieldValues["segment"] || "none"}`}
                      value={dynamicFieldValues["subjects"] || undefined}
                      onValueChange={(val) => handleDynamicFieldChange("subjects", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-[200]">
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
              )}
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
                    <Select
                      key={`job-title-${JSON.stringify(dynamicFieldValues)}`}
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={jobTitleOptions.length > 0 ? "Select job title" : "Select fields above to see job titles"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover z-[200]">
                        {jobTitleOptions.length > 0 ? (
                          jobTitleOptions.map((title) => (
                            <SelectItem key={title} value={title}>
                              {title}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Please select Sector, Segment & Designation first
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <FormControl>
                      <Input placeholder={activeConfig.jobTitlePlaceholder || "e.g., Senior Software Engineer"} {...field} />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Department & Job Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{activeConfig.departmentLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={activeConfig.departmentPlaceholder} {...field} />
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
                        <SelectTrigger>
                          <SelectValue placeholder="Select job type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeConfig.jobTypeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* State, City, Organisation & Experience */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State *</FormLabel>
                    <Select
                      value={selectedState || undefined}
                      onValueChange={(val) => {
                        setSelectedState(val);
                        setSelectedCity("");
                        field.onChange(val);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover z-[200] max-h-60">
                        <SelectItem value="All">All</SelectItem>
                        {Object.keys(indiaLocationData).sort().map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">City *</label>
                <Select
                  key={`city-${selectedState}`}
                  value={selectedCity || undefined}
                    onValueChange={(val) => {
                      setSelectedCity(val);
                      if (val === 'All') {
                        form.setValue("location", selectedState === 'All' ? 'All India' : `All, ${selectedState}`);
                      } else if (selectedState === 'All') {
                        const [district, state] = val.split('__');
                        form.setValue("location", `${district}, ${state}`);
                      } else {
                        form.setValue("location", `${val}, ${selectedState}`);
                      }
                    }}
                    disabled={!selectedState}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedState ? "Select city" : "Select state first"} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[200] max-h-60">
                      <SelectItem value="All">All</SelectItem>
                      {selectedState === 'All' 
                        ? Object.keys(indiaLocationData).sort().flatMap((state) =>
                            Object.keys(indiaLocationData[state] || {}).sort().map((district) => (
                              <SelectItem key={`${state}-${district}`} value={`${district}__${state}`}>{district} ({state})</SelectItem>
                            ))
                          )
                        : selectedState && Object.keys(indiaLocationData[selectedState] || {}).sort().map((district) => (
                            <SelectItem key={district} value={district}>{district}</SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
              </div>

              <FormField
                control={form.control}
                name="organisation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organisation / School / College</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Delhi Public School" {...field} />
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
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeConfig.experienceOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Salary Range & Closing Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="salary_range"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary Range</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select salary range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="₹5,000 - ₹10,000">₹5,000 - ₹10,000</SelectItem>
                        <SelectItem value="₹10,000 - ₹15,000">₹10,000 - ₹15,000</SelectItem>
                        <SelectItem value="₹15,000 - ₹20,000">₹15,000 - ₹20,000</SelectItem>
                        <SelectItem value="₹20,000 - ₹25,000">₹20,000 - ₹25,000</SelectItem>
                        <SelectItem value="₹25,000 - ₹30,000">₹25,000 - ₹30,000</SelectItem>
                        <SelectItem value="₹30,000 - ₹40,000">₹30,000 - ₹40,000</SelectItem>
                        <SelectItem value="₹40,000 - ₹50,000">₹40,000 - ₹50,000</SelectItem>
                        <SelectItem value="₹50,000 - ₹75,000">₹50,000 - ₹75,000</SelectItem>
                        <SelectItem value="₹75,000 - ₹1,00,000">₹75,000 - ₹1,00,000</SelectItem>
                        <SelectItem value="₹1,00,000+">₹1,00,000+</SelectItem>
                        <SelectItem value="Negotiable">Negotiable</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Closing Date</FormLabel>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Template</span>
                    <Switch
                      checked={isTemplate}
                      onCheckedChange={(checked) => {
                        setIsTemplate(checked);
                        if (checked) {
                          form.setValue("closing_date", "");
                        }
                      }}
                    />
                  </div>
                </div>
                {!isTemplate && (
                  <FormField
                    control={form.control}
                    name="closing_date"
                    render={({ field }) => (
                      <>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </>
                    )}
                  />
                )}
                {isTemplate && (
                  <p className="text-xs text-muted-foreground mt-1">No closing date — vacancy stays open</p>
                )}
              </FormItem>
            </div>

            {/* Skills */}
            <FormField
              control={form.control}
              name="skills"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Skills (comma-separated) *</FormLabel>
                    <div className="flex gap-2">
                      {hasGenerated && (
                        <Button type="button" variant="outline" size="sm" disabled={isGenerating} className="gap-1.5 h-7 text-xs">
                          <RefreshCw className="h-3.5 w-3.5" />
                          Refine with AI
                        </Button>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={handleGenerateJD} disabled={isGenerating} className="gap-1.5 h-7 text-xs">
                        {isGenerating ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles className="h-3.5 w-3.5" /> Generate JD</>
                        )}
                      </Button>
                    </div>
                  </div>
                  <FormControl>
                    <Input placeholder={activeConfig.skillsPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Job Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Description *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Provide a detailed description of the role..." className="min-h-[120px]" {...field} />
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Requirements *</FormLabel>
                    <div className="flex gap-2">
                      {hasGeneratedReq && (
                        <Button type="button" variant="outline" size="sm" onClick={handleRefineRequirements} disabled={isRefiningReq} className="gap-1.5 h-7 text-xs">
                          {isRefiningReq ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Refining...</>
                          ) : (
                            <><RefreshCw className="h-3.5 w-3.5" /> Refine with AI</>
                          )}
                        </Button>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={handleGenerateRequirements} disabled={isGeneratingReq} className="gap-1.5 h-7 text-xs">
                        {isGeneratingReq ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles className="h-3.5 w-3.5" /> Generate Requirements</>
                        )}
                      </Button>
                    </div>
                  </div>
                  <FormControl>
                    <Textarea placeholder="List the qualifications and experience required..." className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Posting Job...</>
                ) : (
                  <><Briefcase className="h-4 w-4 mr-2" /> Post Job</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

import { useState, useEffect } from "react";
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
import { Loader2, Briefcase, Sparkles, RefreshCw, CheckCircle2, Bot, User } from "lucide-react";
import { getPipelineTypesForInterviewType, getPipelineStages } from "@/data/interviewPipelineConfig";
import { getFormConfigForInterviewType, defaultFormConfig } from "@/data/interviewFormOptions";

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

interface InlineJobCreationFormProps {
  onJobCreated: () => void;
  onCancel: () => void;
}

export const InlineJobCreationForm = ({ onJobCreated, onCancel }: InlineJobCreationFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [selectedPipelineType, setSelectedPipelineType] = useState("");
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
      interview_type: "",
    },
  });

  const watchedInterviewType = form.watch("interview_type");
  const pipelineTypes = getPipelineTypesForInterviewType(watchedInterviewType);
  const pipelineStages = selectedPipelineType ? getPipelineStages(watchedInterviewType, selectedPipelineType) : [];

  // Get dynamic form config based on interview type
  const formConfig = getFormConfigForInterviewType(watchedInterviewType);
  const activeConfig = formConfig || defaultFormConfig;

  // Reset dynamic fields when interview type changes
  useEffect(() => {
    setDynamicFieldValues({});
    setSelectedPipelineType("");
  }, [watchedInterviewType]);

  const handleDynamicFieldChange = (fieldName: string, value: string, additionalResets?: Record<string, string>) => {
    setDynamicFieldValues(prev => ({ ...prev, [fieldName]: value, ...additionalResets }));
  };

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

      form.setValue("description", String(data.description));
      form.setValue("requirements", String(data.requirements));
      form.setValue("skills", String(data.skills));
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
        description: values.description,
        requirements: values.requirements,
        skills: skillsArray,
        closing_date: values.closing_date || null,
        status: "active",
        interview_type: values.interview_type,
      }]);

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
    <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Create New Vacancy</h3>
            <p className="text-sm text-muted-foreground">Fill in the details below to post a new job</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Interview Type & Pipeline Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                        <SelectItem value="technical">Technical (Coding + MCQ)</SelectItem>
                        <SelectItem value="sales">Sales (Presentation + MCQ)</SelectItem>
                        <SelectItem value="management">Management (Case Study + MCQ)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {field.value === 'education' && "📹 Includes Demo Video round for teaching positions"}
                      {field.value === 'technical' && "💻 For IT companies — includes coding assessments"}
                      {field.value === 'sales' && "📊 Includes presentation & pitch assessment"}
                      {field.value === 'management' && "📋 Includes case study & leadership analysis"}
                      {field.value === 'standard' && "📝 Standard MCQ-based screening interviews"}
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
                  <Select value={selectedPipelineType} onValueChange={setSelectedPipelineType}>
                    <SelectTrigger>
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


            {/* Sector/Division, Category, Function */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">Sector / Division</label>
                <Select
                   value={dynamicFieldValues["sector_division"] || ""}
                   onValueChange={(val) => handleDynamicFieldChange("sector_division", val, { category: "", function: "", segment: "", department_type: "" })}
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
                  value={dynamicFieldValues["function"] || ""}
                  onValueChange={(val) => {
                    handleDynamicFieldChange("function", val, { segment: "", department_type: "" });
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

            {/* Segment, Department, Designation, Subjects */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">Segment / Board</label>
                <Select
                  key={`segment-${dynamicFieldValues["function"] || "default"}`}
                  value={dynamicFieldValues["segment"] || undefined}
                  onValueChange={(val) => {
                    handleDynamicFieldChange("segment", val, { department_type: "", designation: "", subjects: "", classes: "", program: "", hs_classes: "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select segment" />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicFieldValues["function"] === "teaching" || (dynamicFieldValues["category"] === "non_academic" && dynamicFieldValues["function"] === "admin") ? (
                      <>
                        <SelectItem value="Pre-Primary">Pre-Primary</SelectItem>
                        <SelectItem value="Primary">Primary</SelectItem>
                        <SelectItem value="High School">High School</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="CBSE">CBSE</SelectItem>
                        <SelectItem value="ICSE">ICSE / ISC</SelectItem>
                        <SelectItem value="State Board">State Board</SelectItem>
                        <SelectItem value="IB">IB (International Baccalaureate)</SelectItem>
                        <SelectItem value="Cambridge">Cambridge (IGCSE)</SelectItem>
                        <SelectItem value="Montessori">Montessori</SelectItem>
                        <SelectItem value="Play School">Play School / Pre-School</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Primary: Classes, Department, Designation */}
              {dynamicFieldValues["segment"] === "Primary" ? (
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

            {/* Job Title */}
            <FormField
              control={form.control}
              name="job_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title *</FormLabel>
                  <FormControl>
                    <Input placeholder={activeConfig.jobTitlePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Department & Job Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

            {/* Location & Experience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="salary_range"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary Range</FormLabel>
                    <FormControl>
                      <Input placeholder={activeConfig.salaryPlaceholder} {...field} />
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

            {/* Skills */}
            <FormField
              control={form.control}
              name="skills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills (comma-separated) *</FormLabel>
                  <FormControl>
                    <Input placeholder={activeConfig.skillsPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Generate JD Button */}
            <div className="flex justify-end gap-3">
              {hasGenerated && (
                <Button type="button" variant="outline" disabled={isGenerating} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refine with AI
                </Button>
              )}
              <Button type="button" variant="outline" onClick={handleGenerateJD} disabled={isGenerating} className="gap-2">
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generate JD</>
                )}
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
                  <FormLabel>Requirements *</FormLabel>
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

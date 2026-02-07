import { useState } from "react";
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
        body: { jobTitle, department, jobType, location, experienceRequired, skills },
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
    <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden w-full">
      <div className="p-4 sm:p-6">
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
            {/* Interview Type & Pipeline Type - shown first as dropdown */}
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
                        <SelectItem value="standard">Standard (MCQ-based)</SelectItem>
                        <SelectItem value="technical">Technical (Coding + MCQ)</SelectItem>
                        <SelectItem value="education">Education (Includes Demo Video Round)</SelectItem>
                        <SelectItem value="sales">Sales (Presentation + MCQ)</SelectItem>
                        <SelectItem value="management">Management (Case Study + MCQ)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {field.value === 'education' && "📹 Includes Demo Video round"}
                      {field.value === 'technical' && "💻 Includes coding assessments"}
                      {field.value === 'sales' && "📊 Includes presentation assessment"}
                      {field.value === 'management' && "📋 Includes case study analysis"}
                      {field.value === 'standard' && "📝 Standard MCQ-based interviews"}
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

            {/* Job Title */}
            <FormField
              control={form.control}
              name="job_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Senior Software Engineer" {...field} />
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
                        <SelectTrigger>
                          <SelectValue placeholder="Select job type" />
                        </SelectTrigger>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

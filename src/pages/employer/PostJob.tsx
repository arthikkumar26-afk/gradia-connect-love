import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Briefcase, ArrowLeft, Sparkles } from "lucide-react";

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
});

type JobFormValues = z.infer<typeof jobFormSchema>;

const PostJob = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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
    },
  });

  const handleGenerateJD = async () => {
    console.log("Generate JD button clicked");
    const jobTitle = form.getValues("job_title");
    const department = form.getValues("department");
    const jobType = form.getValues("job_type");
    const location = form.getValues("location");
    const experienceRequired = form.getValues("experience_required");
    const skills = form.getValues("skills");

    console.log("Form values:", { jobTitle, jobType, location, experienceRequired });

    if (!jobTitle || !jobType || !location || !experienceRequired) {
      toast({
        title: "Missing information",
        description: "Please fill in Job Title, Job Type, Location, and Experience Required to generate a job description.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    console.log("Calling generate-job-description function...");
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-description", {
        body: {
          jobTitle,
          department,
          jobType,
          location,
          experienceRequired,
          skills,
        },
      });

      console.log("Function response:", { data, error });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.description || !data?.requirements) {
        throw new Error("Invalid response from AI service");
      }

      form.setValue("description", data.description);
      form.setValue("requirements", data.requirements);

      toast({
        title: "Job description generated!",
        description: "AI has generated a professional job description and requirements.",
      });
    } catch (error: any) {
      console.error("Error generating job description:", error);
      toast({
        title: "Failed to generate description",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (values: JobFormValues) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to post a job.",
          variant: "destructive",
        });
        navigate("/employer/login");
        return;
      }

      const skillsArray = values.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0);

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
      };

      const { error } = await supabase.from("jobs").insert([jobData]);

      if (error) throw error;

      toast({
        title: "Job posted successfully!",
        description: "Your job listing is now live and visible to candidates.",
      });

      navigate("/employer/dashboard");
    } catch (error: any) {
      console.error("Error posting job:", error);
      toast({
        title: "Failed to post job",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-subtle py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/employer/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Post a New Job</CardTitle>
                <CardDescription>
                  Fill in the details below to create a new job listing
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                {/* Generate JD Button */}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateJD}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate JD
                      </>
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
                        <Textarea
                          placeholder="Provide a detailed description of the role, responsibilities, and what the candidate will be doing..."
                          className="min-h-[150px]"
                          {...field}
                        />
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
                        <Textarea
                          placeholder="List the qualifications, skills, and experience required for this position..."
                          className="min-h-[120px]"
                          {...field}
                        />
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
                        <Input
                          placeholder="e.g., React, Node.js, TypeScript, AWS"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/employer/dashboard")}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Posting Job...
                      </>
                    ) : (
                      <>
                        <Briefcase className="h-4 w-4 mr-2" />
                        Post Job
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostJob;

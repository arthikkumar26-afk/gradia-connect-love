import { useState, useEffect } from "react";
import { 
  Bell, 
  Plus, 
  Table, 
  Bot, 
  FileText, 
  Receipt, 
  CheckCircle, 
  Video, 
  Megaphone,
  Sparkles,
  Download,
  FileSpreadsheet,
  Monitor,
  MessageSquare,
  ClipboardList,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Segment to department mapping
const segmentDepartmentMapping: Record<string, string[]> = {
  "education": ["Primary", "Secondary", "Higher Secondary", "Pre-Primary", "Special Education", "Administration"],
  "corporate": ["HR", "Finance", "Marketing", "Sales", "IT", "Operations", "Legal"],
  "healthcare": ["Nursing", "Administration", "Lab Technician", "Pharmacy", "Radiology"],
  "hospitality": ["Front Office", "Housekeeping", "F&B", "Kitchen", "Events"],
};

// Department to designation mapping
const departmentDesignationMapping: Record<string, string[]> = {
  "Primary": ["PRT", "TGT", "Head Teacher", "Coordinator"],
  "Secondary": ["TGT", "PGT", "HOD", "Vice Principal"],
  "Higher Secondary": ["PGT", "Lecturer", "HOD", "Principal"],
  "Pre-Primary": ["Nursery Teacher", "Montessori Teacher", "Activity Teacher"],
  "Special Education": ["Special Educator", "Counselor", "Therapist"],
  "Administration": ["Office Admin", "Accountant", "HR Executive", "Data Entry"],
  "HR": ["HR Executive", "HR Manager", "Recruiter", "HR Director"],
  "Finance": ["Accountant", "Finance Manager", "CFO", "Analyst"],
  "Marketing": ["Marketing Executive", "Brand Manager", "Digital Marketing"],
  "Sales": ["Sales Executive", "Sales Manager", "Business Development"],
  "IT": ["Software Developer", "System Admin", "IT Manager", "Data Analyst"],
  "Operations": ["Operations Manager", "Logistics", "Supply Chain"],
  "Legal": ["Legal Advisor", "Company Secretary", "Compliance Officer"],
  "Nursing": ["Staff Nurse", "Head Nurse", "Nursing Supervisor"],
  "Lab Technician": ["Lab Technician", "Senior Lab Technician", "Lab Manager"],
  "Pharmacy": ["Pharmacist", "Store Manager", "Clinical Pharmacist"],
  "Radiology": ["Radiologist", "X-Ray Technician", "MRI Technician"],
  "Front Office": ["Receptionist", "Front Office Manager", "Concierge"],
  "Housekeeping": ["Housekeeping Supervisor", "Room Attendant", "Executive Housekeeper"],
  "F&B": ["F&B Manager", "Restaurant Manager", "Captain"],
  "Kitchen": ["Chef", "Sous Chef", "Kitchen Manager"],
  "Events": ["Event Manager", "Event Coordinator", "Banquet Manager"],
};

const segmentOptions = Object.keys(segmentDepartmentMapping);

interface SavedJob {
  id: string;
  date: string;
  city: string;
  schoolName: string;
  segment: string;
  department: string;
  designation: string;
  salary: string;
  qualification: string;
  experience: string;
  status: string;
}

type JobAlertSubOption = 
  | "vacancies-list" 
  | "payment" 
  | "advertisement" 
  | "get-data-cvs" 
  | "cv-dashboard" 
  | "interview-process"
  | "feedback-report"
  | "offer-letter";

type VacanciesSubOption = "manual-job" | "ai-job";
type PaymentSubOption = "tariffs" | "receipts" | "confirmation";
type AdvertisementSubOption = "flyers-videos";

const jobAlertSubItems = [
  { id: "vacancies-list" as JobAlertSubOption, label: "Vacancies List", icon: FileSpreadsheet },
  { id: "payment" as JobAlertSubOption, label: "Payment", icon: Receipt },
  { id: "advertisement" as JobAlertSubOption, label: "Advertisement", icon: Megaphone },
  { id: "get-data-cvs" as JobAlertSubOption, label: "Get DATA/CVs", icon: ClipboardList },
  { id: "cv-dashboard" as JobAlertSubOption, label: "CV Dashboard", icon: Monitor },
  { id: "interview-process" as JobAlertSubOption, label: "Interview Process", icon: MessageSquare },
  { id: "feedback-report" as JobAlertSubOption, label: "Feedback Report", icon: ClipboardList },
  { id: "offer-letter" as JobAlertSubOption, label: "Offer Letter", icon: Award },
];

export const JobAlertContent = () => {
  const { user } = useAuth();
  const [jobAlertSubOption, setJobAlertSubOption] = useState<JobAlertSubOption>("vacancies-list");
  const [vacanciesSubOption, setVacanciesSubOption] = useState<VacanciesSubOption>("manual-job");
  const [paymentSubOption, setPaymentSubOption] = useState<PaymentSubOption>("tariffs");
  const [advertisementSubOption, setAdvertisementSubOption] = useState<AdvertisementSubOption>("flyers-videos");
  
  // Job form states
  const [showAddJobForm, setShowAddJobForm] = useState(false);
  const [jobDate, setJobDate] = useState("");
  const [jobCity, setJobCity] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [jobSegment, setJobSegment] = useState("");
  const [jobDepartment, setJobDepartment] = useState("");
  const [jobDesignation, setJobDesignation] = useState("");
  const [jobSalary, setJobSalary] = useState("");
  const [jobQualification, setJobQualification] = useState("");
  const [jobExperience, setJobExperience] = useState("");
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [isSavingJob, setIsSavingJob] = useState(false);

  // Derived states for cascading selects
  const availableDepartments = jobSegment ? segmentDepartmentMapping[jobSegment] || [] : [];
  const availableDesignations = jobDepartment ? departmentDesignationMapping[jobDepartment] || [] : [];

  // Fetch saved jobs
  useEffect(() => {
    const fetchJobs = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('employer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data && !error) {
        setSavedJobs(data.map(job => ({
          id: job.id,
          date: job.posted_date || new Date(job.created_at || '').toISOString().split('T')[0],
          city: job.location || '-',
          schoolName: job.department || '-',
          segment: '-',
          department: job.department || '-',
          designation: job.job_title,
          salary: job.salary_range || '-',
          qualification: job.requirements || '-',
          experience: job.experience_required || '-',
          status: job.status || 'pending'
        })));
      }
    };
    
    fetchJobs();
  }, [user?.id]);

  const handleSegmentChange = (value: string) => {
    setJobSegment(value);
    setJobDepartment("");
    setJobDesignation("");
  };

  const handleDepartmentChange = (value: string) => {
    setJobDepartment(value);
    setJobDesignation("");
  };

  const handleSaveJob = async () => {
    if (!jobDesignation || !user?.id) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSavingJob(true);
    
    try {
      const { data, error } = await supabase.from('jobs').insert({
        employer_id: user.id,
        job_title: jobDesignation,
        department: jobDepartment || schoolName,
        location: jobCity,
        salary_range: jobSalary,
        experience_required: jobExperience,
        requirements: jobQualification,
        posted_date: jobDate || new Date().toISOString().split('T')[0],
        status: 'active'
      }).select().single();

      if (error) throw error;

      const newJob: SavedJob = {
        id: data.id,
        date: jobDate || new Date().toISOString().split('T')[0],
        city: jobCity,
        schoolName: schoolName,
        segment: jobSegment,
        department: jobDepartment,
        designation: jobDesignation,
        salary: jobSalary,
        qualification: jobQualification,
        experience: jobExperience,
        status: 'active'
      };
      
      setSavedJobs([newJob, ...savedJobs]);
      
      // Reset form
      setJobDate("");
      setJobCity("");
      setSchoolName("");
      setJobSegment("");
      setJobDepartment("");
      setJobDesignation("");
      setJobSalary("");
      setJobQualification("");
      setJobExperience("");
      setShowAddJobForm(false);
      
      toast.success("Job saved successfully!");
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error("Failed to save job. Please try again.");
    } finally {
      setIsSavingJob(false);
    }
  };

  return (
    <div>
      {/* Step 1: Main navigation tabs */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Step 1: Select Category</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {jobAlertSubItems.map((subItem) => (
            <Button
              key={subItem.id}
              variant="outline"
              size="sm"
              onClick={() => setJobAlertSubOption(subItem.id)}
              className={cn(
                "border-2 transition-all",
                jobAlertSubOption === subItem.id 
                  ? "bg-primary/20 border-primary text-primary hover:bg-primary/30" 
                  : "border-border text-foreground hover:bg-muted hover:border-muted-foreground"
              )}
            >
              <subItem.icon className="h-4 w-4 mr-2" />
              {subItem.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Step 2: Sub-category tabs for Vacancies List */}
      {jobAlertSubOption === "vacancies-list" && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Step 2: Choose Method</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVacanciesSubOption("manual-job")}
              className={cn(
                "border-2 transition-all",
                vacanciesSubOption === "manual-job" 
                  ? "bg-accent/20 border-accent text-accent hover:bg-accent/30" 
                  : "border-border text-foreground hover:bg-muted hover:border-muted-foreground"
              )}
            >
              <Table className="h-4 w-4 mr-2" />
              Manual Job Creation
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVacanciesSubOption("ai-job")}
              className={cn(
                "border-2 transition-all",
                vacanciesSubOption === "ai-job" 
                  ? "bg-accent/20 border-accent text-accent hover:bg-accent/30" 
                  : "border-border text-foreground hover:bg-muted hover:border-muted-foreground"
              )}
            >
              <Bot className="h-4 w-4 mr-2" />
              AI Job Creation
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Sub-category tabs for Payment */}
      {jobAlertSubOption === "payment" && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Step 2: Choose Option</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaymentSubOption("tariffs")}
              className={cn(
                "border-2 transition-all",
                paymentSubOption === "tariffs" 
                  ? "bg-accent/20 border-accent text-accent hover:bg-accent/30" 
                  : "border-border text-foreground hover:bg-muted hover:border-muted-foreground"
              )}
            >
              <FileText className="h-4 w-4 mr-2" />
              Tariffs/Plans
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaymentSubOption("receipts")}
              className={cn(
                "border-2 transition-all",
                paymentSubOption === "receipts" 
                  ? "bg-accent/20 border-accent text-accent hover:bg-accent/30" 
                  : "border-border text-foreground hover:bg-muted hover:border-muted-foreground"
              )}
            >
              <Receipt className="h-4 w-4 mr-2" />
              Payment Receipts
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaymentSubOption("confirmation")}
              className={cn(
                "border-2 transition-all",
                paymentSubOption === "confirmation" 
                  ? "bg-accent/20 border-accent text-accent hover:bg-accent/30" 
                  : "border-border text-foreground hover:bg-muted hover:border-muted-foreground"
              )}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmation
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Sub-category tabs for Advertisement */}
      {jobAlertSubOption === "advertisement" && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Step 2: Choose Option</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdvertisementSubOption("flyers-videos")}
              className={cn(
                "border-2 transition-all",
                advertisementSubOption === "flyers-videos" 
                  ? "bg-accent/20 border-accent text-accent hover:bg-accent/30" 
                  : "border-border text-foreground hover:bg-muted hover:border-muted-foreground"
              )}
            >
              <Video className="h-4 w-4 mr-2" />
              Flyers/Videos Creation
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Content Area */}
      <div className="mb-3">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {jobAlertSubOption === "vacancies-list" ? "Step 3: Manage Jobs" : 
           jobAlertSubOption === "payment" ? "Step 3: Payment Details" :
           jobAlertSubOption === "advertisement" ? "Step 3: Create Materials" :
           "Step 2: View Details"}
        </span>
      </div>

      {/* Vacancies List Content */}
      {jobAlertSubOption === "vacancies-list" && (
        <div className="space-y-6">
          {/* Manual Job Creation */}
          {vacanciesSubOption === "manual-job" && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Table className="h-5 w-5 text-accent" />
                    Manual Job Creation
                  </h3>
                  <Button 
                    size="sm" 
                    onClick={() => setShowAddJobForm(!showAddJobForm)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {showAddJobForm ? "Cancel" : "Add New Job"}
                  </Button>
                </div>
                
                {/* Add Job Form */}
                {showAddJobForm && (
                  <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
                    <h4 className="text-foreground font-medium mb-4">Add New Job</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input 
                          type="date"
                          value={jobDate}
                          onChange={(e) => setJobDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input 
                          placeholder="Enter city"
                          value={jobCity}
                          onChange={(e) => setJobCity(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>School Name</Label>
                        <Input 
                          placeholder="Enter school name"
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Segment</Label>
                        <Select value={jobSegment} onValueChange={handleSegmentChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select segment" />
                          </SelectTrigger>
                          <SelectContent>
                            {segmentOptions.map((seg) => (
                              <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Department/Category</Label>
                        <Select 
                          value={jobDepartment} 
                          onValueChange={handleDepartmentChange}
                          disabled={!jobSegment}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={jobSegment ? "Select department" : "Select segment first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDepartments.map((dept) => (
                              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Designation</Label>
                        <Select 
                          value={jobDesignation} 
                          onValueChange={setJobDesignation}
                          disabled={!jobDepartment}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={jobDepartment ? "Select designation" : "Select department first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDesignations.map((desig) => (
                              <SelectItem key={desig} value={desig}>{desig}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Salary (₹)</Label>
                        <Input 
                          placeholder="e.g., 25000-35000"
                          value={jobSalary}
                          onChange={(e) => setJobSalary(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Qualification</Label>
                        <Select value={jobQualification} onValueChange={setJobQualification}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select qualification" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="graduate">Graduate</SelectItem>
                            <SelectItem value="post-graduate">Post Graduate</SelectItem>
                            <SelectItem value="phd">PhD</SelectItem>
                            <SelectItem value="bed">B.Ed</SelectItem>
                            <SelectItem value="med">M.Ed</SelectItem>
                            <SelectItem value="diploma">Diploma</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Experience</Label>
                        <Select value={jobExperience} onValueChange={setJobExperience}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select experience" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fresher">Fresher</SelectItem>
                            <SelectItem value="1-2">1-2 Years</SelectItem>
                            <SelectItem value="2-5">2-5 Years</SelectItem>
                            <SelectItem value="5-10">5-10 Years</SelectItem>
                            <SelectItem value="10+">10+ Years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={handleSaveJob}
                        disabled={isSavingJob}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {isSavingJob ? "Saving..." : "Save Job"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAddJobForm(false)}
                        disabled={isSavingJob}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium text-xs">Date</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium text-xs">City</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium text-xs">School Name</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium text-xs">Segment</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium text-xs">Department</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium text-xs">Designation</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium text-xs">Salary</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium text-xs">Qualification</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium text-xs">Experience</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium text-xs">Status</th>
                        <th className="text-left py-3 px-2 text-muted-foreground font-medium text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedJobs.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-muted-foreground">
                            No jobs created yet. Click "Add New Job" to create your first job posting.
                          </td>
                        </tr>
                      ) : (
                        savedJobs.map((job) => (
                          <tr key={job.id} className="border-b border-border/50">
                            <td className="py-3 px-2 text-muted-foreground text-xs">{job.date || '-'}</td>
                            <td className="py-3 px-2 text-muted-foreground text-xs capitalize">{job.city}</td>
                            <td className="py-3 px-2 text-muted-foreground text-xs">{job.schoolName}</td>
                            <td className="py-3 px-2 text-muted-foreground text-xs capitalize">{job.segment || '-'}</td>
                            <td className="py-3 px-2 text-muted-foreground text-xs capitalize">{job.department || '-'}</td>
                            <td className="py-3 px-2 text-foreground text-xs capitalize font-medium">{job.designation}</td>
                            <td className="py-3 px-2 text-muted-foreground text-xs">₹{job.salary || '-'}</td>
                            <td className="py-3 px-2 text-muted-foreground text-xs capitalize">{job.qualification || '-'}</td>
                            <td className="py-3 px-2 text-muted-foreground text-xs capitalize">{job.experience || '-'}</td>
                            <td className="py-3 px-2">
                              <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">{job.status}</span>
                            </td>
                            <td className="py-3 px-2">
                              <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80 text-xs">Edit</Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Job Creation */}
          {vacanciesSubOption === "ai-job" && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">AI Job Creation</h3>
                    <p className="text-muted-foreground text-sm">Generate job descriptions with AI by selecting designation</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Designation</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a designation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="software-engineer">Software Engineer</SelectItem>
                        <SelectItem value="product-manager">Product Manager</SelectItem>
                        <SelectItem value="data-analyst">Data Analyst</SelectItem>
                        <SelectItem value="hr-manager">HR Manager</SelectItem>
                        <SelectItem value="marketing-executive">Marketing Executive</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button className="w-full">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Job Description with AI
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Payment Content */}
      {jobAlertSubOption === "payment" && (
        <div className="space-y-6">
          {paymentSubOption === "tariffs" && (
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <h4 className="text-lg font-semibold text-foreground mb-2">Basic Plan</h4>
                  <div className="text-3xl font-bold text-green-500 mb-4">₹5,000<span className="text-sm text-muted-foreground">/month</span></div>
                  <ul className="text-muted-foreground text-sm space-y-2 mb-4">
                    <li>• 5 Job Postings</li>
                    <li>• 50 CV Downloads</li>
                    <li>• Email Support</li>
                  </ul>
                  <Button className="w-full">Choose Plan</Button>
                </CardContent>
              </Card>
              <Card className="border-primary">
                <CardContent className="p-6 text-center">
                  <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">Popular</span>
                  <h4 className="text-lg font-semibold text-foreground mb-2 mt-2">Pro Plan</h4>
                  <div className="text-3xl font-bold text-primary mb-4">₹15,000<span className="text-sm text-muted-foreground">/month</span></div>
                  <ul className="text-muted-foreground text-sm space-y-2 mb-4">
                    <li>• 20 Job Postings</li>
                    <li>• 200 CV Downloads</li>
                    <li>• Priority Support</li>
                  </ul>
                  <Button className="w-full">Choose Plan</Button>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <h4 className="text-lg font-semibold text-foreground mb-2">Enterprise</h4>
                  <div className="text-3xl font-bold text-purple-500 mb-4">Custom</div>
                  <ul className="text-muted-foreground text-sm space-y-2 mb-4">
                    <li>• Unlimited Postings</li>
                    <li>• Unlimited Downloads</li>
                    <li>• Dedicated Support</li>
                  </ul>
                  <Button className="w-full" variant="outline">Contact Us</Button>
                </CardContent>
              </Card>
            </div>
          )}

          {paymentSubOption === "receipts" && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-accent" />
                  Payment Receipts
                </h3>
                <p className="text-muted-foreground">No payment receipts available yet.</p>
              </CardContent>
            </Card>
          )}

          {paymentSubOption === "confirmation" && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Payment Confirmation
                </h3>
                <p className="text-muted-foreground">No pending confirmations.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Advertisement Content */}
      {jobAlertSubOption === "advertisement" && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Flyers & Videos Creation</h3>
                <p className="text-muted-foreground text-sm">Create and download promotional materials</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-muted border-border">
                <CardContent className="p-4 text-center">
                  <FileText className="h-12 w-12 text-accent mx-auto mb-3" />
                  <h4 className="text-foreground font-medium mb-2">Job Flyers</h4>
                  <p className="text-muted-foreground text-sm mb-3">Generate professional job flyers for social media</p>
                  <Button size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Create Flyer
                  </Button>
                </CardContent>
              </Card>
              <Card className="bg-muted border-border">
                <CardContent className="p-4 text-center">
                  <Video className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                  <h4 className="text-foreground font-medium mb-2">Promo Videos</h4>
                  <p className="text-muted-foreground text-sm mb-3">Create video content for job promotions</p>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Create Video
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Get DATA/CVs Content */}
      {jobAlertSubOption === "get-data-cvs" && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-accent" />
              Get DATA/CVs
            </h3>
            <p className="text-muted-foreground">Browse and download candidate CVs matching your job requirements.</p>
          </CardContent>
        </Card>
      )}

      {/* CV Dashboard Content */}
      {jobAlertSubOption === "cv-dashboard" && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Monitor className="h-5 w-5 text-accent" />
              CV Dashboard
            </h3>
            <p className="text-muted-foreground">Manage and track all received CVs in one place.</p>
          </CardContent>
        </Card>
      )}

      {/* Interview Process Content */}
      {jobAlertSubOption === "interview-process" && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-accent" />
              Interview Process
            </h3>
            <p className="text-muted-foreground">Schedule and manage interviews with candidates.</p>
          </CardContent>
        </Card>
      )}

      {/* Feedback Report Content */}
      {jobAlertSubOption === "feedback-report" && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-accent" />
              Feedback Report
            </h3>
            <p className="text-muted-foreground">View interview feedback and candidate evaluations.</p>
          </CardContent>
        </Card>
      )}

      {/* Offer Letter Content */}
      {jobAlertSubOption === "offer-letter" && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" />
              Offer Letter
            </h3>
            <p className="text-muted-foreground">Generate and send offer letters to selected candidates.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

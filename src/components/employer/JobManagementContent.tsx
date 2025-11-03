import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Eye, Pencil, Plus } from "lucide-react";
import { JobDetailsDrawer } from "./JobDetailsDrawer";

interface Job {
  id: string;
  jobTitle: string;
  department: string;
  experience: string;
  skills: string;
  type: string;
  location: string;
  status: "Open" | "Under Review" | "Closed";
}

const sampleJobs: Job[] = [
  {
    id: "1",
    jobTitle: "Frontend Developer",
    department: "Engineering",
    experience: "1–2 yrs",
    skills: "React, JavaScript",
    type: "Full-Time",
    location: "Hyderabad",
    status: "Open"
  },
  {
    id: "2",
    jobTitle: "HR Coordinator",
    department: "HR",
    experience: "0–1 yrs",
    skills: "ATS basics, Communication",
    type: "Full-Time",
    location: "Remote",
    status: "Under Review"
  },
  {
    id: "3",
    jobTitle: "QA Tester",
    department: "QA",
    experience: "0–1 yrs",
    skills: "Manual Testing, Bug reporting",
    type: "Full-Time",
    location: "Hyderabad",
    status: "Open"
  },
  {
    id: "4",
    jobTitle: "Backend Developer",
    department: "Engineering",
    experience: "2–4 yrs",
    skills: "Node.js, Python, APIs",
    type: "Full-Time",
    location: "Bangalore",
    status: "Open"
  },
  {
    id: "5",
    jobTitle: "Product Designer",
    department: "Design",
    experience: "3–5 yrs",
    skills: "Figma, UI/UX, Prototyping",
    type: "Contract",
    location: "Remote",
    status: "Closed"
  }
];

export const JobManagementContent = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit">("view");

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setDrawerMode("view");
    setDrawerOpen(true);
  };

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setDrawerMode("edit");
    setDrawerOpen(true);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Open":
        return "default";
      case "Under Review":
        return "secondary";
      case "Closed":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header Section */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Job Management</h2>
          <p className="text-muted-foreground">Manage job requirements and postings</p>
        </div>

        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search job roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
          <Button variant="cta" className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Post Job
          </Button>
        </div>

        {/* Table Card */}
        <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-subtle border-b">
                  <TableHead className="font-semibold">Job Title</TableHead>
                  <TableHead className="font-semibold">Department</TableHead>
                  <TableHead className="font-semibold">Experience</TableHead>
                  <TableHead className="font-semibold">Skills</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleJobs.map((job) => (
                  <TableRow 
                    key={job.id}
                    className="hover:bg-accent/5 transition-colors"
                  >
                    <TableCell className="font-medium">{job.jobTitle}</TableCell>
                    <TableCell>{job.department}</TableCell>
                    <TableCell>{job.experience}</TableCell>
                    <TableCell className="max-w-xs truncate">{job.skills}</TableCell>
                    <TableCell>{job.type}</TableCell>
                    <TableCell>{job.location}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(job.status)} className="whitespace-nowrap">
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleViewJob(job)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditJob(job)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">1-5</span> of <span className="font-medium">5</span> jobs
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <JobDetailsDrawer
        job={selectedJob}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
      />
    </>
  );
};

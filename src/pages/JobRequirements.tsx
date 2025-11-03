import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Eye, Pencil } from "lucide-react";

interface JobRequirement {
  id: string;
  jobTitle: string;
  department: string;
  experience: string;
  skills: string;
  type: string;
  location: string;
  status: "Open" | "Under Review" | "Closed";
}

const sampleRequirements: JobRequirement[] = [
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
  }
];

const JobRequirements = () => {
  const [searchQuery, setSearchQuery] = useState("");

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
    <div className="min-h-screen bg-subtle py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Job Requirements</h1>
          <p className="text-muted-foreground">Manage and review job requirement details</p>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search job requirements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Table Card */}
        <Card className="shadow-soft">
          <CardHeader className="bg-gradient-subtle rounded-t-lg">
            <CardTitle>All Job Requirements</CardTitle>
            <CardDescription>View and manage all job postings and their requirements</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Job Title</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Experience</TableHead>
                    <TableHead className="font-semibold">Skills</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleRequirements.map((req) => (
                    <TableRow 
                      key={req.id}
                      className="hover:bg-accent/5 transition-colors"
                    >
                      <TableCell className="font-medium">{req.jobTitle}</TableCell>
                      <TableCell>{req.department}</TableCell>
                      <TableCell>{req.experience}</TableCell>
                      <TableCell className="max-w-xs truncate">{req.skills}</TableCell>
                      <TableCell>{req.type}</TableCell>
                      <TableCell>{req.location}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(req.status)}>
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobRequirements;

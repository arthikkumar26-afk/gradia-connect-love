import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Download, 
  Eye, 
  MessageSquare, 
  Star, 
  MoreHorizontal,
  Calendar,
  Filter,
  Users,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import SponsorDashboardLayout from "./SponsorDashboard";
import { toast } from "sonner";

// Mock data for demonstration
const mockLeads = [
  {
    id: "1",
    name: "Rahul Sharma",
    skills: ["React", "Node.js", "MongoDB"],
    experience: "3 years",
    qualification: "B.Tech Computer Science",
    sourceEvent: "Hyderabad Job Mela 2024",
    status: "new",
    appliedDate: "2024-01-15",
  },
  {
    id: "2",
    name: "Priya Patel",
    skills: ["Python", "Machine Learning", "TensorFlow"],
    experience: "5 years",
    qualification: "M.Tech AI/ML",
    sourceEvent: "Bangalore Tech Mela 2024",
    status: "contacted",
    appliedDate: "2024-01-14",
  },
  {
    id: "3",
    name: "Amit Kumar",
    skills: ["Java", "Spring Boot", "AWS"],
    experience: "4 years",
    qualification: "B.E. Information Technology",
    sourceEvent: "Delhi NCR Job Mela 2024",
    status: "interviewed",
    appliedDate: "2024-01-12",
  },
  {
    id: "4",
    name: "Sneha Reddy",
    skills: ["UI/UX", "Figma", "Adobe XD"],
    experience: "2 years",
    qualification: "B.Des Product Design",
    sourceEvent: "Hyderabad Job Mela 2024",
    status: "hired",
    appliedDate: "2024-01-10",
  },
  {
    id: "5",
    name: "Vikram Singh",
    skills: ["DevOps", "Docker", "Kubernetes"],
    experience: "6 years",
    qualification: "B.Tech Computer Science",
    sourceEvent: "Mumbai Hiring Mela 2024",
    status: "new",
    appliedDate: "2024-01-16",
  },
];

export default function CandidateLeads() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      new: { label: "New", className: "bg-blue-100 text-blue-800 border-blue-200" },
      contacted: { label: "Contacted", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      interviewed: { label: "Interviewed", className: "bg-purple-100 text-purple-800 border-purple-200" },
      hired: { label: "Hired", className: "bg-green-100 text-green-800 border-green-200" },
    };
    const config = statusConfig[status] || statusConfig.new;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredLeads = mockLeads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesEvent = eventFilter === "all" || lead.sourceEvent === eventFilter;
    return matchesSearch && matchesStatus && matchesEvent;
  });

  const handleExportCSV = () => {
    toast.success("Exporting leads to CSV...");
  };

  const uniqueEvents = [...new Set(mockLeads.map(lead => lead.sourceEvent))];

  const stats = {
    total: mockLeads.length,
    new: mockLeads.filter(l => l.status === "new").length,
    contacted: mockLeads.filter(l => l.status === "contacted").length,
    hired: mockLeads.filter(l => l.status === "hired").length,
  };

  return (
    <SponsorDashboardLayout activeTab="leads">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Candidate Leads</h1>
            <p className="text-muted-foreground mt-1">Manage candidates from job melas</p>
          </div>
          <Button onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.new}</p>
                  <p className="text-sm text-muted-foreground">New Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.contacted}</p>
                  <p className="text-sm text-muted-foreground">Contacted</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.hired}</p>
                  <p className="text-sm text-muted-foreground">Hired</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="interviewed">Interviewed</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                </SelectContent>
              </Select>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Source Event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {uniqueEvents.map((event) => (
                    <SelectItem key={event} value={event}>{event}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Disclaimer */}
        <div className="bg-muted/50 border rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Data Usage Notice</p>
            <p>All candidate data is collected with consent during job mela registration. Please ensure compliance with data protection regulations when contacting candidates.</p>
          </div>
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Leads ({filteredLeads.length})</CardTitle>
            <CardDescription>Candidates who registered at your sponsored events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Qualification</TableHead>
                    <TableHead>Source Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No leads found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-sm text-muted-foreground">Applied {lead.appliedDate}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {lead.skills.slice(0, 2).map((skill) => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {lead.skills.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{lead.skills.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{lead.experience}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{lead.qualification}</TableCell>
                        <TableCell className="max-w-[180px]">
                          <span className="text-sm">{lead.sourceEvent}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(lead.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toast.info("Opening resume...")}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Resume
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info("Adding notes...")}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Add Notes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.success("Added to shortlist!")}>
                                <Star className="mr-2 h-4 w-4" />
                                Shortlist
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info("Opening scheduler...")}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Schedule Interview
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SponsorDashboardLayout>
  );
}

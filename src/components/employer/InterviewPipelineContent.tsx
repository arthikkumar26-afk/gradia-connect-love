import { useState } from "react";
import { 
  Users, 
  Phone, 
  Code, 
  UserCheck, 
  FileCheck, 
  ChevronRight,
  MoreVertical,
  Calendar,
  Mail,
  GripVertical
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Candidate {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  appliedDate: string;
  rating: number;
  tags: string[];
}

interface PipelineStage {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  candidates: Candidate[];
}

const initialPipelineData: PipelineStage[] = [
  {
    id: "screening",
    title: "Screening",
    icon: Users,
    color: "bg-blue-500",
    candidates: [
      {
        id: "1",
        name: "Priya Sharma",
        email: "priya.sharma@email.com",
        role: "Frontend Developer",
        appliedDate: "2 days ago",
        rating: 4,
        tags: ["React", "TypeScript"],
      },
      {
        id: "2",
        name: "Rahul Kumar",
        email: "rahul.kumar@email.com",
        role: "Full Stack Developer",
        appliedDate: "3 days ago",
        rating: 5,
        tags: ["Node.js", "React"],
      },
      {
        id: "3",
        name: "Anita Desai",
        email: "anita.desai@email.com",
        role: "UI/UX Designer",
        appliedDate: "1 day ago",
        rating: 4,
        tags: ["Figma", "Design"],
      },
    ],
  },
  {
    id: "phone-interview",
    title: "Phone Interview",
    icon: Phone,
    color: "bg-purple-500",
    candidates: [
      {
        id: "4",
        name: "Vikram Singh",
        email: "vikram.singh@email.com",
        role: "Backend Developer",
        appliedDate: "5 days ago",
        rating: 4,
        tags: ["Python", "Django"],
      },
      {
        id: "5",
        name: "Meera Patel",
        email: "meera.patel@email.com",
        role: "Data Analyst",
        appliedDate: "4 days ago",
        rating: 5,
        tags: ["SQL", "Python"],
      },
    ],
  },
  {
    id: "technical-round",
    title: "Technical Round",
    icon: Code,
    color: "bg-orange-500",
    candidates: [
      {
        id: "6",
        name: "Arjun Reddy",
        email: "arjun.reddy@email.com",
        role: "Senior Developer",
        appliedDate: "1 week ago",
        rating: 5,
        tags: ["Java", "Spring"],
      },
    ],
  },
  {
    id: "hr-round",
    title: "HR Round",
    icon: UserCheck,
    color: "bg-green-500",
    candidates: [
      {
        id: "7",
        name: "Sneha Gupta",
        email: "sneha.gupta@email.com",
        role: "Product Manager",
        appliedDate: "2 weeks ago",
        rating: 5,
        tags: ["Agile", "Scrum"],
      },
      {
        id: "8",
        name: "Karthik Nair",
        email: "karthik.nair@email.com",
        role: "DevOps Engineer",
        appliedDate: "10 days ago",
        rating: 4,
        tags: ["AWS", "Docker"],
      },
    ],
  },
  {
    id: "offer",
    title: "Offer Stage",
    icon: FileCheck,
    color: "bg-emerald-500",
    candidates: [
      {
        id: "9",
        name: "Deepa Krishnan",
        email: "deepa.krishnan@email.com",
        role: "Tech Lead",
        appliedDate: "3 weeks ago",
        rating: 5,
        tags: ["Leadership", "Architecture"],
      },
    ],
  },
];

const CandidateCard = ({ candidate, onMoveNext, onSchedule, onEmail }: { 
  candidate: Candidate; 
  onMoveNext: () => void;
  onSchedule: () => void;
  onEmail: () => void;
}) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="mb-3 bg-card border border-border hover:shadow-md transition-all cursor-pointer group">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Avatar className="h-10 w-10">
            <AvatarImage src={candidate.avatar} />
            <AvatarFallback className="bg-accent/10 text-accent text-sm">
              {getInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground text-sm truncate">
                {candidate.name}
              </h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onSchedule}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Interview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEmail}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onMoveNext}>
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Move to Next Stage
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-xs text-muted-foreground truncate">{candidate.role}</p>
            <p className="text-xs text-muted-foreground mt-1">{candidate.appliedDate}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {candidate.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PipelineColumn = ({ stage, onMoveCandidate }: { 
  stage: PipelineStage;
  onMoveCandidate: (candidateId: string, fromStage: string, toStage: string) => void;
}) => {
  const Icon = stage.icon;

  return (
    <div className="flex-shrink-0 w-72">
      <Card className="bg-muted/30 border-border h-full">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${stage.color}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-sm font-semibold text-foreground">
                {stage.title}
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {stage.candidates.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <ScrollArea className="h-[calc(100vh-320px)]">
            {stage.candidates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No candidates
              </div>
            ) : (
              stage.candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onMoveNext={() => onMoveCandidate(candidate.id, stage.id, "next")}
                  onSchedule={() => console.log("Schedule interview for", candidate.name)}
                  onEmail={() => console.log("Send email to", candidate.email)}
                />
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export const InterviewPipelineContent = () => {
  const [pipelineData, setPipelineData] = useState<PipelineStage[]>(initialPipelineData);

  const handleMoveCandidate = (candidateId: string, fromStageId: string, direction: string) => {
    setPipelineData((prevData) => {
      const newData = [...prevData];
      const fromStageIndex = newData.findIndex((s) => s.id === fromStageId);
      
      if (fromStageIndex === -1) return prevData;
      
      const toStageIndex = direction === "next" ? fromStageIndex + 1 : fromStageIndex - 1;
      
      if (toStageIndex < 0 || toStageIndex >= newData.length) return prevData;
      
      const candidateIndex = newData[fromStageIndex].candidates.findIndex(
        (c) => c.id === candidateId
      );
      
      if (candidateIndex === -1) return prevData;
      
      const [candidate] = newData[fromStageIndex].candidates.splice(candidateIndex, 1);
      newData[toStageIndex].candidates.push(candidate);
      
      return newData;
    });
  };

  const totalCandidates = pipelineData.reduce(
    (acc, stage) => acc + stage.candidates.length,
    0
  );

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Interview Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            Track candidates through your hiring process
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{totalCandidates}</p>
            <p className="text-xs text-muted-foreground">Total Candidates</p>
          </div>
        </div>
      </div>

      {/* Pipeline Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {pipelineData.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              onMoveCandidate={handleMoveCandidate}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default InterviewPipelineContent;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Briefcase, Search, Users, GraduationCap, Star, 
  Clock, MapPin, DollarSign, ArrowRight, BookOpen,
  MessageSquare, Calendar, TrendingUp, User
} from "lucide-react";

const sampleProjects = [
  { id: 1, title: "React Dashboard Development", budget: "₹50,000 - ₹80,000", duration: "2-3 months", skills: ["React", "TypeScript", "Tailwind"], posted: "2 days ago", proposals: 12 },
  { id: 2, title: "Mobile App UI/UX Design", budget: "₹30,000 - ₹50,000", duration: "1 month", skills: ["Figma", "UI/UX", "Mobile"], posted: "1 day ago", proposals: 8 },
  { id: 3, title: "Python Data Analysis Script", budget: "₹20,000 - ₹35,000", duration: "2 weeks", skills: ["Python", "Pandas", "SQL"], posted: "3 hours ago", proposals: 5 },
];

const sampleMentorships = [
  { id: 1, student: "Rahul Sharma", topic: "Full Stack Development", sessions: 12, nextSession: "Tomorrow, 4 PM", status: "active" },
  { id: 2, student: "Priya Patel", topic: "Data Science Basics", sessions: 8, nextSession: "Wed, 6 PM", status: "active" },
  { id: 3, student: "Amit Kumar", topic: "React & Node.js", sessions: 20, nextSession: "Completed", status: "completed" },
];

const FreelancerDashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profile } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Freelancer"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Find projects, mentor students, and grow your freelance career.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Briefcase className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">5</p>
              <p className="text-xs text-muted-foreground">Active Projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <GraduationCap className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">3</p>
              <p className="text-xs text-muted-foreground">Students Mentoring</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">₹2.4L</p>
              <p className="text-xs text-muted-foreground">Total Earnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">4.8</p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="mentorship">Mentorship</TabsTrigger>
            <TabsTrigger value="proposals">My Proposals</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Find Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Available Projects</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-1" /> Filter
                </Button>
              </div>
            </div>
            
            {sampleProjects.map((project) => (
              <Card key={project.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{project.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" /> {project.budget}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {project.duration}
                        </span>
                        <span>{project.posted}</span>
                      </div>
                    </div>
                    <Badge variant="secondary">{project.proposals} proposals</Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {project.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                  <Button size="sm" className="gap-1">
                    Submit Proposal <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Mentorship Tab */}
          <TabsContent value="mentorship" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">My Mentorship</h2>
              <Button size="sm" className="gap-1">
                <Users className="h-4 w-4" /> Find Students
              </Button>
            </div>

            {sampleMentorships.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{m.student}</h3>
                      <p className="text-sm text-muted-foreground">{m.topic}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> {m.sessions} sessions
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {m.nextSession}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={m.status === "active" ? "default" : "secondary"}>
                    {m.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals">
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Active Proposals</h3>
                <p className="text-muted-foreground mb-4">Browse projects and submit proposals to get started.</p>
                <Button>Browse Projects</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Freelancer Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium text-foreground">{profile?.full_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground">{profile?.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium text-foreground">{profile?.mobile || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium text-foreground">{profile?.location || "—"}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => navigate("/profile/edit")}>
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FreelancerDashboard;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Eye, FileText, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function ResumeBuilder() {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
    experience: [{ title: "", company: "", duration: "", description: "" }],
    education: [{ degree: "", school: "", year: "" }],
    skills: [] as string[],
  });

  const handleExport = () => {
    toast({
      title: "Resume Downloaded!",
      description: "Your resume has been downloaded as PDF.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/jobs" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Resume Builder</h1>
              <p className="text-muted-foreground">Create a professional resume in minutes</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? "Edit" : "Preview"}
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {!showPreview ? (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Tell employers about yourself</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" placeholder="John Doe" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="john@example.com" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" placeholder="+1 234 567 8900" />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" placeholder="New York, NY" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="summary">Professional Summary</Label>
                  <Textarea
                    id="summary"
                    placeholder="Brief summary of your experience and skills..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Work Experience</CardTitle>
                    <CardDescription>Your professional background</CardDescription>
                  </div>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Experience
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Job Title</Label>
                      <Input placeholder="Software Engineer" />
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input placeholder="Tech Corp" />
                    </div>
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <Input placeholder="Jan 2020 - Present" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea placeholder="Describe your responsibilities and achievements..." rows={3} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Education</CardTitle>
                    <CardDescription>Your academic background</CardDescription>
                  </div>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Education
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Degree</Label>
                      <Input placeholder="Bachelor of Science in Computer Science" />
                    </div>
                    <div>
                      <Label>School</Label>
                      <Input placeholder="University Name" />
                    </div>
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Input placeholder="2016 - 2020" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
                <CardDescription>Add your technical and soft skills</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="e.g. JavaScript, React, Leadership..." />
                  <Button>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["JavaScript", "React", "Node.js", "TypeScript", "Leadership"].map((skill) => (
                    <Badge key={skill} variant="secondary" className="px-3 py-1">
                      {skill}
                      <Trash2 className="h-3 w-3 ml-2 cursor-pointer" />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="text-center border-b pb-6">
                <h2 className="text-3xl font-bold">John Doe</h2>
                <p className="text-muted-foreground">john@example.com | +1 234 567 8900 | New York, NY</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Professional Summary</h3>
                <p className="text-muted-foreground">
                  Experienced software engineer with 5+ years of expertise in full-stack development...
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="text-xl font-semibold mb-4">Work Experience</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">Senior Software Engineer</h4>
                        <p className="text-muted-foreground">Tech Corp</p>
                      </div>
                      <span className="text-sm text-muted-foreground">Jan 2020 - Present</span>
                    </div>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Led development of core features increasing user engagement by 40%</li>
                      <li>Mentored junior developers and conducted code reviews</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-xl font-semibold mb-4">Education</h3>
                <div>
                  <h4 className="font-semibold">Bachelor of Science in Computer Science</h4>
                  <p className="text-muted-foreground">University Name - 2016 - 2020</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-xl font-semibold mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {["JavaScript", "React", "Node.js", "TypeScript", "Leadership"].map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

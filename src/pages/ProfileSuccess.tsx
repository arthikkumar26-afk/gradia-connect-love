import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  User,
  Briefcase,
  MapPin,
  Edit,
  ArrowRight,
  X,
  Clock,
  Users,
  Building2,
} from "lucide-react";
import { sampleJobs } from "@/data/sampleJobs";

const ProfileSuccess = () => {
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(true);
  const [progress] = useState(80);

  // Get 3 sample jobs for recommendations
  const recommendedJobs = sampleJobs.slice(0, 3);

  useEffect(() => {
    // Auto-hide banner after 10 seconds
    const timer = setTimeout(() => {
      setShowBanner(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  // Mock user data (in real app, this would come from form submission)
  const userData = {
    name: "John Smith",
    email: "john.smith@example.com",
    role: "Candidate",
    experience: "3-5 years",
    location: "Hyderabad",
    skills: ["Python", "React", "Testing"],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-subtle to-background">
      {/* Success Banner */}
      {showBanner && (
        <div className="sticky top-16 z-40 animate-slide-up">
          <div className="bg-gradient-accent shadow-medium">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-accent-foreground">
                      Profile Created Successfully!
                    </h3>
                    <p className="text-sm text-accent-foreground/80">
                      Your journey to finding the perfect job starts now
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBanner(false)}
                  className="text-accent-foreground hover:bg-accent-foreground/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Message */}
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl font-bold text-foreground mb-3">
              Welcome to Gradia, {userData.name}!
            </h1>
            <p className="text-lg text-muted-foreground">
              Let's help you find your dream job
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Overview Card */}
            <div className="lg:col-span-1 animate-scale-in">
              <div className="bg-card rounded-2xl shadow-large p-8 sticky top-28">
                {/* Profile Header */}
                <div className="flex flex-col items-center mb-6">
                  <div className="h-24 w-24 rounded-full bg-gradient-accent flex items-center justify-center mb-4 shadow-glow">
                    <User className="h-12 w-12 text-accent-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    {userData.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {userData.email}
                  </p>
                  <Badge variant="secondary" className="mb-2">
                    {userData.role}
                  </Badge>
                </div>

                {/* Profile Completeness */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">
                      Profile Completeness
                    </span>
                    <span className="text-sm font-bold text-accent">
                      {progress}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Complete your profile to increase visibility
                  </p>
                </div>

                {/* Profile Details */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Experience
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {userData.experience}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Location
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {userData.location}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {userData.skills.map((skill, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="border-accent/30 text-foreground"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Edit Profile Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/candidate/dashboard")}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>

            {/* Similar Jobs Section */}
            <div className="lg:col-span-2 animate-slide-up">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    Jobs Recommended For You
                  </h2>
                  <p className="text-muted-foreground">
                    Based on your profile and preferences
                  </p>
                </div>
                <Button variant="ghost" asChild>
                  <Link to="/jobs">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>

              {/* Job Cards */}
              <div className="space-y-6">
                {recommendedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-card rounded-xl shadow-medium p-6 hover:shadow-large transition-all hover:-translate-y-1 cursor-pointer border border-border"
                    onClick={() => navigate(`/job/${job.id}`)}
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Company Logo Placeholder */}
                      <div className="flex-shrink-0">
                        <div className="h-16 w-16 rounded-lg bg-gradient-accent flex items-center justify-center shadow-soft">
                          <Building2 className="h-8 w-8 text-accent-foreground" />
                        </div>
                      </div>

                      {/* Job Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-foreground mb-1 hover:text-accent transition-colors">
                              {job.title}
                            </h3>
                            <p className="text-sm font-medium text-muted-foreground">
                              {job.company}
                            </p>
                          </div>
                          {job.featured && (
                            <Badge className="bg-gradient-accent border-0">
                              Featured
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 mb-3">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Briefcase className="h-4 w-4" />
                            {job.experience}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {job.posted}
                          </div>
                          {job.applicants && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users className="h-4 w-4" />
                              {job.applicants} applicants
                            </div>
                          )}
                        </div>

                        {job.salary && (
                          <p className="text-sm font-semibold text-accent mb-3">
                            {job.salary}
                          </p>
                        )}

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {job.description}
                        </p>

                        {/* Skills */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {job.skills.slice(0, 4).map((skill, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                          {job.skills.length > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{job.skills.length - 4} more
                            </Badge>
                          )}
                        </div>

                        {/* Apply Button */}
                        <Button
                          className="w-full sm:w-auto bg-gradient-accent hover:shadow-glow"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/job/${job.id}/apply`);
                          }}
                        >
                          Apply Now
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Browse All Jobs CTA */}
              <div className="mt-8 text-center bg-gradient-card rounded-xl p-8 shadow-soft">
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Explore More Opportunities
                </h3>
                <p className="text-muted-foreground mb-4">
                  Browse through hundreds of jobs matching your profile
                </p>
                <Button asChild size="lg" className="bg-gradient-accent hover:shadow-glow">
                  <Link to="/jobs">
                    Browse All Jobs
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSuccess;

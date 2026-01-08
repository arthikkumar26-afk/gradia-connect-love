import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { sampleJobs, Job } from "@/data/sampleJobs";
import { JobApplicationFlow } from "@/components/jobs/JobApplicationFlow";
import { 
  Search, 
  ArrowLeft, 
  MapPin, 
  Clock, 
  DollarSign, 
  Building2, 
  ArrowRight,
  Eye,
  X
} from "lucide-react";

const JobsResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [filteredJobs, setFilteredJobs] = useState<Job[]>(sampleJobs);

  // Filter jobs based on search parameters
  useEffect(() => {
    const query = searchParams.get('q')?.toLowerCase() || '';
    const loc = searchParams.get('location')?.toLowerCase() || '';
    
    const filtered = sampleJobs.filter(job => {
      const matchesQuery = !query || 
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        job.skills.some(skill => skill.toLowerCase().includes(query)) ||
        job.description.toLowerCase().includes(query);
      
      const matchesLocation = !loc || 
        job.location.toLowerCase().includes(loc);
      
      return matchesQuery && matchesLocation;
    });
    
    setFilteredJobs(filtered);
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (location) params.set('location', location);
    navigate(`/jobs-results?${params.toString()}`);
  };

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
  };

  const closeJobDetails = () => {
    setSelectedJob(null);
  };

  const handleApplyClick = (job: Job) => {
    setApplyingJob(job);
    setShowApplicationModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Search */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold">
              {filteredJobs.length} Jobs Found
              {searchParams.get('q') && ` for "${searchParams.get('q')}"`}
            </h1>
          </div>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 max-w-4xl">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Job title, company, or keywords..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Location (remote, city, country)"
                className="pl-10"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <Button type="submit" variant="default">
              Search Jobs
            </Button>
          </form>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Filter and Sort Options */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm">All Jobs</Button>
            <Button variant="outline" size="sm">Full-time</Button>
            <Button variant="outline" size="sm">Remote</Button>
            <Button variant="outline" size="sm">Software</Button>
            <Button variant="outline" size="sm">Education</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Relevance</Button>
            <Button variant="outline" size="sm">Date Posted</Button>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or browse all available positions.
              </p>
              <Button asChild>
                <Link to="/">Browse All Jobs</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Job Grid - 3 per row on desktop, responsive for mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job, index) => (
                <Card 
                  key={job.id} 
                  className="group hover:shadow-medium transition-all duration-200 hover:-translate-y-1 cursor-pointer"
                  onClick={() => handleJobSelect(job)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">{job.category === "software" ? "💻" : "🎓"}</span>
                        {job.featured && (
                          <Badge variant="secondary" className="text-xs">
                            Featured
                          </Badge>
                        )}
                        <Badge className={
                          job.type === "full-time" ? "bg-accent text-accent-foreground" :
                          job.type === "part-time" ? "bg-secondary text-secondary-foreground" :
                          job.type === "fresher" ? "bg-success text-success-foreground" :
                          job.type === "experienced" ? "bg-primary text-primary-foreground" :
                          job.type === "contract" ? "bg-muted text-muted-foreground" :
                          "bg-primary text-primary-foreground"
                        }>
                          {job.type === "fresher" ? "Fresher" : 
                           job.type === "experienced" ? "Experienced" :
                           job.type.replace("-", " ")}
                        </Badge>
                      </div>
                      {/* Add tags */}
                      <div className="flex gap-1 flex-wrap">
                        {job.tags?.map((tag, tagIndex) => (
                          <Badge 
                            key={tagIndex} 
                            variant={tag === "Urgent" ? "destructive" : "outline"} 
                            className={`text-xs ${
                              tag === "Easy Apply" ? "bg-accent/10 text-accent border-accent/30" :
                              tag === "Urgent" ? "" :
                              "bg-secondary/10 text-secondary border-secondary/30"
                            }`}
                          >
                            {tag}
                          </Badge>
                        ))}
                        {/* Random additional tags for variety */}
                        {index % 3 === 0 && !job.tags?.includes("Easy Apply") && (
                          <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/30">
                            Easy Apply
                          </Badge>
                        )}
                        {index % 5 === 0 && !job.tags?.includes("Urgent") && (
                          <Badge variant="destructive" className="text-xs">
                            Urgent
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-lg group-hover:text-accent transition-colors line-clamp-2 mb-1">
                      {job.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {job.company}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </div>
                      {job.salary && (
                        <div className="flex items-center gap-1 text-sm font-semibold text-accent">
                          <DollarSign className="h-4 w-4" />
                          {job.salary}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {job.experience}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {job.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      {job.skills.slice(0, 2).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {job.skills.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{job.skills.length - 2} more
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJobSelect(job);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyClick(job);
                        }}
                      >
                        Apply Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Job Application Flow Modal */}
            <JobApplicationFlow
              job={applyingJob}
              open={showApplicationModal}
              onOpenChange={setShowApplicationModal}
            />
          </>
        )}

        {/* Job Details Side Panel */}
        {selectedJob && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
            <Card className="w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-slide-up">
              {/* Header with Apply Now at top */}
              <CardHeader className="pb-4 border-b flex-shrink-0 bg-gradient-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{selectedJob.category === "software" ? "💻" : "🎓"}</span>
                      <div>
                        <CardTitle className="text-2xl mb-1">{selectedJob.title}</CardTitle>
                        <div className="flex items-center gap-4 text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            <span className="font-medium">{selectedJob.company}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{selectedJob.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {selectedJob.salary && (
                      <div className="flex items-center gap-1 text-accent font-semibold text-lg">
                        <DollarSign className="h-5 w-5" />
                        <span>{selectedJob.salary}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={closeJobDetails}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="default" 
                      size="lg" 
                      className="shadow-glow"
                      onClick={() => {
                        closeJobDetails();
                        handleApplyClick(selectedJob);
                      }}
                    >
                      Apply Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Content */}
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Job Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4 bg-muted/30 border-0">
                    <div className="text-sm text-muted-foreground mb-1">Job Type</div>
                    <div className="font-semibold capitalize">
                      {selectedJob.type === "fresher" ? "Fresher" : 
                       selectedJob.type === "experienced" ? "Experienced" :
                       selectedJob.type.replace("-", " ")}
                    </div>
                  </Card>
                  <Card className="p-4 bg-muted/30 border-0">
                    <div className="text-sm text-muted-foreground mb-1">Experience</div>
                    <div className="font-semibold">{selectedJob.experience}</div>
                  </Card>
                  <Card className="p-4 bg-muted/30 border-0">
                    <div className="text-sm text-muted-foreground mb-1">Posted</div>
                    <div className="font-semibold">{selectedJob.posted}</div>
                  </Card>
                  <Card className="p-4 bg-muted/30 border-0">
                    <div className="text-sm text-muted-foreground mb-1">Applicants</div>
                    <div className="font-semibold">{selectedJob.applicants || 0}+ applied</div>
                  </Card>
                </div>

                {/* Tags */}
                {selectedJob.tags && selectedJob.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.tags.map((tag, index) => (
                      <Badge 
                        key={index}
                        variant={tag === "Urgent" ? "destructive" : "secondary"}
                        className="text-sm py-1"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Job Description */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-primary">Job Description</h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-foreground leading-relaxed">
                      {selectedJob.description}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Skills */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-primary">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-sm py-1 px-3 bg-accent/10 text-accent border-accent/30">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-lg mb-3 text-primary">Requirements</h3>
                      <ul className="text-muted-foreground space-y-2 list-none">
                        {selectedJob.requirements.map((req, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-accent mt-1">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {selectedJob.benefits && selectedJob.benefits.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-lg mb-3 text-primary">Benefits</h3>
                      <ul className="text-muted-foreground space-y-2 list-none">
                        {selectedJob.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-success mt-1">✓</span>
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {selectedJob.companyDescription && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-lg mb-3 text-primary">About {selectedJob.company}</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {selectedJob.companyDescription}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                {/* Final Apply Section */}
                <div className="text-center gradient-card p-6 rounded-lg border">
                  <h3 className="font-semibold text-xl mb-2">Ready to Apply?</h3>
                  <p className="text-muted-foreground mb-6">
                    Join {selectedJob.company} and take the next step in your career journey.
                  </p>
                  <Button variant="default" size="lg" className="shadow-glow">
                    Apply for this Position
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsResults;
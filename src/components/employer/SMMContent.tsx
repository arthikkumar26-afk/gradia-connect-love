import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { 
  QrCode, 
  FileText, 
  Share2, 
  Download, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram,
  Copy,
  Check,
  Briefcase,
  ExternalLink,
  MapPin,
  IndianRupee
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import QRFlyerModal from "./QRFlyerModal";

interface Job {
  id: string;
  job_title: string;
  location: string | null;
  status: string | null;
  designation: string | null;
  organisation: string | null;
  salary_range: string | null;
  segment: string | null;
  category: string | null;
  sector_division: string | null;
  created_at: string | null;
  description: string | null;
  experience_required: string | null;
  skills: string[] | null;
  job_type: string | null;
  subjects: string | null;
  classes: string | null;
}

export const SMMContent = () => {
  const { user, profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    const fetchJobs = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from("jobs")
        .select("id, job_title, location, status, designation, organisation, salary_range, segment, category, sector_division, created_at")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false });
      
      if (data) {
        setJobs(data);
        if (data.length > 0) {
          setSelectedJob(data[0].id);
        }
      }
    };

    const fetchCompanyName = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from("employer_registrations")
        .select("company_name")
        .eq("employer_id", user.id)
        .single();
      
      if (data?.company_name) {
        setCompanyName(data.company_name);
      }
    };

    fetchJobs();
    fetchCompanyName();
  }, [user?.id]);

  const selectedJobData = jobs.find(j => j.id === selectedJob);
  const jobUrl = selectedJob 
    ? `${window.location.origin}/jobs/${selectedJob}` 
    : `${window.location.origin}/company/${user?.id}/jobs`;
  const companyJobsUrl = `${window.location.origin}/company/${user?.id}/jobs`;

  const getJobLabel = (job: Job) => {
    const parts = [job.designation || job.job_title];
    if (job.organisation) parts.push(job.organisation);
    if (job.location) parts.push(job.location);
    return parts.join(" — ");
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-600">Active</Badge>;
      case "closed":
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Closed</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Draft</Badge>;
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(jobUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("job-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      
      const downloadLink = document.createElement("a");
      downloadLink.download = `${selectedJobData?.job_title || "job"}-qr-code.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success("QR Code downloaded!");
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const shareToSocialMedia = (platform: string) => {
    const title = selectedJobData?.designation || selectedJobData?.job_title || "open position";
    const org = selectedJobData?.organisation || companyName || "our company";
    const loc = selectedJobData?.location ? ` in ${selectedJobData.location}` : "";
    const salary = selectedJobData?.salary_range ? ` | ${selectedJobData.salary_range}` : "";

    const text = selectedJobData 
      ? `🚀 We're hiring! ${title} at ${org}${loc}${salary}. Apply now!`
      : `Check out our job openings at ${org}!`;
    
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(jobUrl);

    let shareUrl = "";
    
    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case "instagram":
        navigator.clipboard.writeText(`${text} ${jobUrl}`);
        toast.success("Content copied! Open Instagram and paste in your post.");
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
      toast.success(`Opening ${platform} to share...`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Social Media Marketing</h2>
        <p className="text-muted-foreground">Create QR codes, flyers, and share your job postings on social media</p>
      </div>

      <Tabs defaultValue="qr-code" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="qr-code" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Job QR Code
          </TabsTrigger>
          <TabsTrigger value="flyer" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Create Flyer
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share on Social
          </TabsTrigger>
        </TabsList>

        {/* QR Code Tab */}
        <TabsContent value="qr-code" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                Generate Job QR Code
              </CardTitle>
              <CardDescription>
                Create a scannable QR code for your job posting that candidates can scan to apply
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Configuration */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="job-select">Select Job Posting</Label>
                    <Select value={selectedJob} onValueChange={setSelectedJob}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Jobs (Company Page)</SelectItem>
                        {jobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            <span className="flex items-center gap-2">
                              {getJobLabel(job)}
                              {getStatusBadge(job.status)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selected Job Details */}
                  {selectedJobData && selectedJob !== "all" && (
                    <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-sm">
                      <p className="font-medium text-foreground">{selectedJobData.designation || selectedJobData.job_title}</p>
                      {selectedJobData.organisation && (
                        <p className="text-muted-foreground">{selectedJobData.organisation}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {selectedJobData.location && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedJobData.location}</span>
                        )}
                        {selectedJobData.salary_range && (
                          <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{selectedJobData.salary_range}</span>
                        )}
                        {selectedJobData.segment && (
                          <span>{selectedJobData.segment}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Job URL</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={jobUrl} readOnly className="flex-1 text-sm" />
                      <Button variant="outline" size="icon" onClick={handleCopyLink}>
                        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleDownloadQR} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download QR
                    </Button>
                    <Button variant="outline" asChild className="flex-1">
                      <a href={jobUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Preview Page
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Right: QR Preview */}
                <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg border">
                  <div className="bg-white p-4 rounded-xl shadow-md">
                    <QRCodeSVG
                      id="job-qr-code"
                      value={selectedJob === "all" ? companyJobsUrl : jobUrl}
                      size={180}
                      level="H"
                      includeMargin
                      bgColor="#ffffff"
                      fgColor="#1a365d"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    {selectedJobData ? (selectedJobData.designation || selectedJobData.job_title) : "All Job Openings"}
                  </p>
                  <p className="text-xs text-muted-foreground">Scan to apply</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flyer Tab */}
        <TabsContent value="flyer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Create Job Flyer
              </CardTitle>
              <CardDescription>
                Design and download printable flyers with QR codes for offline recruitment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No jobs found. Post a job first to create flyers.</p>
                  </div>
                ) : (
                  jobs.map((job) => (
                    <Card key={job.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-foreground text-sm">{job.designation || job.job_title}</h3>
                          {getStatusBadge(job.status)}
                        </div>
                        {job.organisation && (
                          <p className="text-xs text-muted-foreground mb-0.5">{job.organisation}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                          {job.location && (
                            <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{job.location}</span>
                          )}
                          {job.salary_range && (
                            <span className="flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{job.salary_range}</span>
                          )}
                        </div>
                        <QRFlyerModal
                          employerId={user?.id || ""}
                          companyName={companyName || profile?.company_name || "Company"}
                          jobData={job}
                          trigger={
                            <Button variant="outline" size="sm" className="w-full">
                              <FileText className="h-4 w-4 mr-2" />
                              Create Flyer
                            </Button>
                          }
                        />
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* General Company Flyer */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-foreground mb-3">Company-Wide Hiring Flyer</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a general flyer for all your open positions
                </p>
                <QRFlyerModal
                  employerId={user?.id || ""}
                  companyName={companyName || profile?.company_name || "Company"}
                  trigger={
                    <Button>
                      <FileText className="h-4 w-4 mr-2" />
                      Create Company Flyer
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media Tab */}
        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                Share on Social Media
              </CardTitle>
              <CardDescription>
                Quickly share your job postings to popular social media platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Job Selection */}
              <div>
                <Label htmlFor="social-job-select">Select Job to Share</Label>
                <Select value={selectedJob} onValueChange={setSelectedJob}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jobs (Company Page)</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        <span className="flex items-center gap-2">
                          {getJobLabel(job)}
                          {getStatusBadge(job.status)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Job Preview */}
              {selectedJobData && selectedJob !== "all" && (
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{selectedJobData.designation || selectedJobData.job_title}</p>
                      {selectedJobData.organisation && (
                        <p className="text-sm text-muted-foreground">{selectedJobData.organisation}</p>
                      )}
                    </div>
                    {getStatusBadge(selectedJobData.status)}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {selectedJobData.location && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedJobData.location}</span>
                    )}
                    {selectedJobData.salary_range && (
                      <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{selectedJobData.salary_range}</span>
                    )}
                    {selectedJobData.segment && <Badge variant="outline" className="text-[10px]">{selectedJobData.segment}</Badge>}
                    {selectedJobData.category && <Badge variant="outline" className="text-[10px]">{selectedJobData.category}</Badge>}
                  </div>
                </div>
              )}

              {/* Social Media Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 hover:bg-[#1877F2]/10 hover:border-[#1877F2] hover:text-[#1877F2]"
                  onClick={() => shareToSocialMedia("facebook")}
                >
                  <Facebook className="h-6 w-6" />
                  <span className="text-sm">Facebook</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 hover:bg-[#1DA1F2]/10 hover:border-[#1DA1F2] hover:text-[#1DA1F2]"
                  onClick={() => shareToSocialMedia("twitter")}
                >
                  <Twitter className="h-6 w-6" />
                  <span className="text-sm">Twitter / X</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 hover:bg-[#0A66C2]/10 hover:border-[#0A66C2] hover:text-[#0A66C2]"
                  onClick={() => shareToSocialMedia("linkedin")}
                >
                  <Linkedin className="h-6 w-6" />
                  <span className="text-sm">LinkedIn</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 hover:bg-[#E4405F]/10 hover:border-[#E4405F] hover:text-[#E4405F]"
                  onClick={() => shareToSocialMedia("instagram")}
                >
                  <Instagram className="h-6 w-6" />
                  <span className="text-sm">Instagram</span>
                </Button>
              </div>

              {/* Quick Share Link */}
              <div className="bg-muted/30 rounded-lg p-4">
                <Label className="text-sm font-medium">Quick Share Link</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={jobUrl} readOnly className="flex-1" />
                  <Button onClick={handleCopyLink}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-2">{copied ? "Copied!" : "Copy"}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SMMContent;

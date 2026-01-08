import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, Users, TrendingUp, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CompanyQRCard from "@/components/CompanyQRCard";

interface EmployerWithJobs {
  id: string;
  full_name: string;
  company_name: string | null;
  company_description: string | null;
  location: string | null;
  profile_picture: string | null;
  job_count: number;
}

const Companies = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [employers, setEmployers] = useState<EmployerWithJobs[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEmployersWithJobs();
  }, []);

  const fetchEmployersWithJobs = async () => {
    try {
      // Fetch employers with their active job counts
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, company_description, location, profile_picture")
        .eq("role", "employer");

      if (profilesError) throw profilesError;

      // Get job counts for each employer
      const employersWithCounts = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { count } = await supabase
            .from("jobs")
            .select("*", { count: "exact", head: true })
            .eq("employer_id", profile.id)
            .eq("status", "active");

          return {
            ...profile,
            job_count: count || 0,
          };
        })
      );

      // Filter to only show employers with at least 1 job
      setEmployers(employersWithCounts.filter((e) => e.job_count > 0));
    } catch (error) {
      console.error("Error fetching employers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const staticCompanies = [
    {
      name: "TechFlow Solutions",
      logo: "🚀",
      industry: "Technology",
      location: "San Francisco, CA",
      employees: "500-1000",
      openPositions: 24,
      description: "Leading provider of cloud-based enterprise solutions, specializing in AI-powered workflow automation.",
      benefits: ["Remote Work", "Health Insurance", "401k Match", "Unlimited PTO"],
      rating: 4.8
    },
    {
      name: "Stanford University",
      logo: "🎓",
      industry: "Education",
      location: "Stanford, CA",
      employees: "10,000+",
      openPositions: 18,
      description: "World-renowned research university committed to excellence in teaching, learning, and research.",
      benefits: ["Tuition Assistance", "Retirement Plans", "Professional Development", "Health Benefits"],
      rating: 4.9
    },
    {
      name: "InnovateEd",
      logo: "💡",
      industry: "EdTech",
      location: "Austin, TX",
      employees: "100-500",
      openPositions: 12,
      description: "Revolutionary educational technology platform transforming how students learn through adaptive AI.",
      benefits: ["Stock Options", "Flexible Hours", "Learning Budget", "Modern Office"],
      rating: 4.7
    },
    {
      name: "Global Finance Corp",
      logo: "💼",
      industry: "Finance",
      location: "New York, NY",
      employees: "5,000+",
      openPositions: 31,
      description: "International financial services company providing innovative banking and investment solutions.",
      benefits: ["Competitive Salary", "Bonuses", "Career Growth", "Gym Membership"],
      rating: 4.6
    },
    {
      name: "HealthTech Innovations",
      logo: "🏥",
      industry: "Healthcare",
      location: "Boston, MA",
      employees: "1,000-5,000",
      openPositions: 22,
      description: "Pioneering healthcare technology company developing AI-powered diagnostic and treatment tools.",
      benefits: ["Health Insurance", "Remote Options", "Parental Leave", "Wellness Programs"],
      rating: 4.8
    },
    {
      name: "DataMinds Analytics",
      logo: "📊",
      industry: "Data Science",
      location: "Seattle, WA",
      employees: "200-500",
      openPositions: 15,
      description: "Data analytics and business intelligence firm helping companies make data-driven decisions.",
      benefits: ["Work From Home", "Professional Training", "Performance Bonuses", "Team Events"],
      rating: 4.7
    }
  ];

  const filteredStaticCompanies = staticCompanies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEmployers = employers.filter(employer =>
    (employer.company_name || employer.full_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employer.location || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: "Partner Companies", value: "500+", icon: Building2 },
    { label: "Open Positions", value: "2,400+", icon: TrendingUp },
    { label: "Industries", value: "25+", icon: Users }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Partner Companies</h1>
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto mb-8">
            Discover amazing companies across industries that are actively hiring talented professionals.
            Scan a QR code to view jobs and apply instantly!
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-accent rounded-lg mb-4">
                  <stat.icon className="h-8 w-8 text-accent-foreground" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Search and Filters */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by company name or location..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
          </div>

          {/* Real Employers with QR Codes */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredEmployers.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6">Companies Hiring Now</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployers.map((employer) => (
                  <CompanyQRCard
                    key={employer.id}
                    id={employer.id}
                    name={employer.company_name || employer.full_name}
                    logo={employer.profile_picture || undefined}
                    location={employer.location || undefined}
                    openPositions={employer.job_count}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Static Companies Grid */}
          <h2 className="text-2xl font-bold text-foreground mb-6">Featured Partners</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaticCompanies.map((company, index) => (
              <Card key={index} className="hover:shadow-large transition-all duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-5xl">{company.logo}</div>
                    <Badge variant="secondary" className="text-accent font-semibold">
                      {company.openPositions} Open Roles
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mb-2">{company.name}</CardTitle>
                  <CardDescription className="text-sm">{company.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{company.industry}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{company.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{company.employees} employees</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-foreground mb-2">Benefits:</p>
                    <div className="flex flex-wrap gap-2">
                      {company.benefits.slice(0, 3).map((benefit, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-foreground">Rating:</span>
                      <span className="text-accent font-bold">{company.rating}</span>
                    </div>
                    <Button size="sm" variant="default">
                      View Jobs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredStaticCompanies.length === 0 && filteredEmployers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No companies found matching your search.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Join a Leading Company?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Create your profile today and get connected with top employers actively hiring.
          </p>
          <Button variant="professional" size="xl" className="bg-background text-foreground hover:bg-background/90">
            Create Your Profile
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Companies;

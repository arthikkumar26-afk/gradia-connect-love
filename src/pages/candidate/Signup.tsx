import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, FileText, TrendingUp } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { SignupWizard } from "@/components/candidate/signup/SignupWizard";

const CandidateSignup = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profile } = useAuth();

  useEffect(() => {
    if (isAuthenticated && profile) {
      navigate("/candidate/dashboard");
    }
  }, [isAuthenticated, profile, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-subtle to-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground py-12">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-secondary/80" />
        
        <div className="relative z-10 container mx-auto px-4">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          
          <div className="flex items-center justify-center mb-4">
            <img 
              src={gradiaLogo} 
              alt="Gradia" 
              className="h-16 w-auto object-contain bg-white/10 rounded-lg p-2"
            />
          </div>
          
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Create Your Candidate Account
            </h1>
            <p className="text-lg text-primary-foreground/90">
              Join thousands of professionals finding their dream jobs
            </p>
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="relative block w-full h-10"
          >
            <path
              d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
              opacity=".5"
              className="fill-background"
            ></path>
            <path
              d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
              className="fill-background"
            ></path>
          </svg>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Benefits */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="bg-card rounded-xl p-6 shadow-medium border">
                <h3 className="font-semibold text-foreground mb-4">Why Join Gradia?</h3>
                
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Access Top Jobs</h4>
                      <p className="text-xs text-muted-foreground">
                        Verified openings from leading companies
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">AI-Powered Tools</h4>
                      <p className="text-xs text-muted-foreground">
                        Resume parsing & interview prep
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Track Progress</h4>
                      <p className="text-xs text-muted-foreground">
                        Real-time application updates
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Are you an employer?{" "}
                  <Link to="/signup?role=employer&section=registration" className="text-accent hover:underline font-medium">
                    Create employer account
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Main Form Area */}
          <div className="lg:col-span-3">
            <SignupWizard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateSignup;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, ArrowLeft, Users, Sparkles, Calendar, BarChart3, HeadphonesIcon, Wallet, CheckCircle, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import gradiaLogo from '@/assets/gradia-logo.png';
import OnboardingProgress from '@/components/employer/OnboardingProgress';

const benefits = [
  {
    icon: Users,
    title: 'Access to Qualified Candidates',
    description: 'Connect with a large pool of pre-screened, qualified candidates across various industries and skill levels.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Screening',
    description: 'Our AI technology automatically screens and matches candidates to your job requirements, saving you time and effort.',
  },
  {
    icon: Calendar,
    title: 'Streamlined Interview Scheduling',
    description: 'Easily schedule and manage interviews with integrated calendar tools and automated reminders.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Track applications, monitor hiring metrics, and gain insights into your recruitment performance.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Dedicated Support',
    description: 'Get personalized assistance from our recruitment experts to help you find the perfect candidates.',
  },
  {
    icon: Wallet,
    title: 'Cost-Effective Solutions',
    description: 'Flexible pricing plans designed to fit your budget while maximizing your hiring ROI.',
  },
  {
    icon: Building2,
    title: 'Employer Branding',
    description: 'Showcase your company culture and values to attract top talent with customizable company profiles.',
  },
  {
    icon: CheckCircle,
    title: 'Background Verification',
    description: 'Integrated background check services to ensure candidate authenticity and reliability.',
  },
];

export default function Agreement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/employer/signup");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleContinue = async () => {
    if (!accepted) {
      toast({ title: 'Please accept the agreement', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setRetryError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Authentication required', variant: 'destructive' });
        navigate("/employer/signup");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, company_name")
        .eq("id", user.id)
        .single();

      const { error } = await supabase
        .from("agreements")
        .insert({
          employer_id: user.id,
          admin_name: profile?.full_name || "Unknown",
          admin_email: profile?.email || user.email || "",
          company_name: profile?.company_name || "",
        });

      if (error) throw error;

      toast({ title: 'Agreement accepted', description: 'Proceeding to terms & conditions' });
      navigate('/employer/terms');
    } catch (error: any) {
      console.error("Agreement error:", error);
      setRetryError('Failed to record agreement. Please try again.');
      toast({ title: 'Error', description: 'Failed to record agreement', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 py-12">
      <div className="w-full max-w-4xl">
        <OnboardingProgress currentStep="agreement" />
        <Card className="w-full p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src={gradiaLogo} alt="Gradia" className="h-16 w-auto object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Benefits with Employer</h1>
            <p className="text-muted-foreground mt-2">
              Discover the advantages of partnering with Gradia Connect for your recruitment needs.
            </p>
          </div>

          {/* Benefits Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Agreement Section */}
          <div className="border-t border-border pt-8 mt-8">
            <h2 className="text-2xl font-bold text-foreground text-center mb-4">Service Agreement</h2>
            <p className="text-muted-foreground text-center mb-6">
              Please review and accept the following agreement to continue.
            </p>
            
            <ScrollArea className="h-[300px] rounded-md border p-6 mb-6 bg-muted/30">
              <div className="prose prose-sm max-w-none">
                <h2 className="text-xl font-semibold mb-4">Employer Service Agreement</h2>
                
                <h3 className="text-lg font-semibold mt-6 mb-3">1. Introduction</h3>
                <p className="text-muted-foreground mb-4">
                  This Service Agreement is entered into between the Company and our platform for the provision of recruitment services.
                </p>
                <h3 className="text-lg font-semibold mt-6 mb-3">2. Services Provided</h3>
                <p className="text-muted-foreground mb-4">
                  Our platform provides comprehensive recruitment solutions including job posting, candidate management, and tracking.
                </p>
                <h3 className="text-lg font-semibold mt-6 mb-3">3. Employer Responsibilities</h3>
                <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                  <li>Provide accurate information about job postings</li>
                  <li>Comply with employment laws</li>
                  <li>Treat candidates with professionalism</li>
                  <li>Pay subscription fees as per the selected plan</li>
                </ul>
                <h3 className="text-lg font-semibold mt-6 mb-3">4. Payment Terms</h3>
                <p className="text-muted-foreground mb-4">
                  Subscription fees are billed based on the selected plan. Payment is due at the start of each billing cycle.
                </p>
                <p className="text-muted-foreground mt-8 italic">Last updated: January 2025</p>
              </div>
            </ScrollArea>

            <div className="flex items-start gap-3 mb-6 p-4 bg-muted/50 rounded-md">
              <Checkbox id="accept-agreement" checked={accepted} onCheckedChange={(checked) => setAccepted(checked as boolean)} />
              <label htmlFor="accept-agreement" className="text-sm leading-relaxed cursor-pointer">
                I have read and agree to the Agreement
              </label>
            </div>

            {retryError && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                {retryError}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />Back
            </Button>
            <Button onClick={handleContinue} disabled={!accepted || loading} className="flex-1">
              {loading ? 'Processing...' : 'I Agree & Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

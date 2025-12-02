import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import gradiaLogo from '@/assets/gradia-logo.png';
import OnboardingProgress from '@/components/employer/OnboardingProgress';

export default function Agreement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/employer/signup");
        return;
      }
    };
    checkAuth();
  }, [navigate]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
    if (scrolledToBottom && !scrolledToEnd) {
      setScrolledToEnd(true);
    }
  };

  const handleContinue = async () => {
    if (!scrolledToEnd) {
      toast({ title: 'Please scroll to the end of the agreement', variant: 'destructive' });
      return;
    }
    
    if (!accepted) {
      toast({ title: 'Please accept the agreement', variant: 'destructive' });
      return;
    }

    setLoading(true);
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
            <img 
              src={gradiaLogo} 
              alt="Gradia - Your Next Step" 
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Service Agreement</h1>
          <p className="text-muted-foreground mt-2">Please review and accept our service agreement</p>
        </div>

        <ScrollArea 
          className="h-[400px] rounded-md border p-6 mb-6 bg-muted/30"
          onScroll={handleScroll}
        >
          <div className="prose prose-sm max-w-none">
            <h2 className="text-xl font-semibold mb-4">Employer Service Agreement</h2>
            
            <h3 className="text-lg font-semibold mt-6 mb-3">1. Introduction</h3>
            <p className="text-muted-foreground mb-4">
              This Service Agreement ("Agreement") is entered into between the Company (the "Employer") and our platform
              for the provision of recruitment and talent management services.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">2. Services Provided</h3>
            <p className="text-muted-foreground mb-4">
              Our platform provides comprehensive recruitment solutions including job posting, candidate management,
              application tracking, and talent pool access. Services are provided on a subscription basis as selected
              during registration.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">3. Employer Responsibilities</h3>
            <p className="text-muted-foreground mb-4">
              The Employer agrees to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>Provide accurate and current information about job postings and requirements</li>
              <li>Comply with all applicable employment laws and anti-discrimination regulations</li>
              <li>Treat all candidates with professionalism and respect</li>
              <li>Maintain confidentiality of candidate information</li>
              <li>Pay subscription fees as per the selected plan</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">4. Data Protection and Privacy</h3>
            <p className="text-muted-foreground mb-4">
              Both parties agree to comply with applicable data protection laws. Candidate data will be processed
              in accordance with our Privacy Policy and used solely for recruitment purposes.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">5. Payment Terms</h3>
            <p className="text-muted-foreground mb-4">
              Subscription fees are billed based on the selected plan (monthly or annual). Payment is due at the
              start of each billing cycle. Failure to pay may result in service suspension.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">6. Termination</h3>
            <p className="text-muted-foreground mb-4">
              Either party may terminate this Agreement with 30 days written notice. Upon termination, the Employer
              retains access to historical data but cannot create new job postings.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">7. Limitation of Liability</h3>
            <p className="text-muted-foreground mb-4">
              Our platform is not responsible for hiring decisions, candidate quality, or employment outcomes.
              The platform provides tools and services only; final hiring decisions rest with the Employer.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">8. Governing Law</h3>
            <p className="text-muted-foreground mb-4">
              This Agreement is governed by applicable laws. Any disputes shall be resolved through arbitration.
            </p>

            <p className="text-muted-foreground mt-8 italic">
              Last updated: January 2025
            </p>
          </div>
        </ScrollArea>

        {!scrolledToEnd && (
          <div className="text-sm text-amber-600 mb-4 flex items-center gap-2">
            <span>⚠️</span>
            <span>Please scroll to the end of the agreement to continue</span>
          </div>
        )}

        <div className="flex items-start gap-3 mb-6 p-4 bg-muted/50 rounded-md">
          <Checkbox
            id="accept-agreement"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked as boolean)}
            disabled={!scrolledToEnd}
          />
          <label htmlFor="accept-agreement" className="text-sm leading-relaxed cursor-pointer">
            I confirm that I have read and understood this Service Agreement, and I accept its terms on behalf of my company.
            I acknowledge that this constitutes a legally binding agreement.
          </label>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
            Go Back
          </Button>
          <Button onClick={handleContinue} disabled={!accepted || loading || !scrolledToEnd} className="flex-1">
            {loading ? 'Processing...' : 'Accept & Continue'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        </Card>
      </div>
    </div>
  );
}
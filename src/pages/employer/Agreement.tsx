import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import gradiaLogo from '@/assets/gradia-logo.png';
import OnboardingProgress from '@/components/employer/OnboardingProgress';

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
            <h1 className="text-3xl font-bold text-foreground">Agreement</h1>
            <p className="text-muted-foreground mt-2">
              Please review and accept the following agreement to continue using Gradia Connect.
            </p>
          </div>

          <ScrollArea className="h-[400px] rounded-md border p-6 mb-6 bg-muted/30">
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

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/employer/benefits')} className="flex-1">
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
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import gradiaLogo from '@/assets/gradia-logo.png';
import OnboardingProgress from '@/components/employer/OnboardingProgress';

export default function Terms() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/employer/signup");
        return;
      }
      const { data: agreement } = await supabase.from("agreements").select("id").eq("employer_id", user.id).single();
      if (!agreement) {
        toast({ title: 'Please sign the agreement first', variant: 'destructive' });
        navigate("/employer/agreement");
      }
    };
    checkAuth();
  }, [navigate, toast]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 20 && !scrolledToEnd) {
      setScrolledToEnd(true);
    }
  };

  const handleContinue = async () => {
    if (!scrolledToEnd) {
      toast({ title: 'Please scroll to the end of the terms', variant: 'destructive' });
      return;
    }
    if (!accepted) {
      toast({ title: 'Please accept the terms', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setRetryError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/employer/signup");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
      const { error } = await supabase.from("terms_acceptances").insert({
        employer_id: user.id,
        admin_name: profile?.full_name || "Unknown",
        admin_email: profile?.email || user.email || "",
      });

      if (error) throw error;
      toast({ title: 'Terms accepted', description: 'Proceeding to plan selection' });
      navigate('/employer/plans');
    } catch (error: any) {
      setRetryError('Failed to record terms acceptance. Please try again.');
      toast({ title: 'Error', description: 'Failed to record terms acceptance', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 py-12">
      <div className="w-full max-w-4xl">
        <OnboardingProgress currentStep="terms" />
        <Card className="w-full p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src={gradiaLogo} alt="Gradia" className="h-16 w-auto object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Terms & Conditions</h1>
            <p className="text-muted-foreground mt-2">Please read and accept the terms & conditions to complete your registration.</p>
          </div>

          <div ref={scrollContainerRef} className="h-[400px] rounded-md border p-6 mb-6 bg-muted/30 overflow-y-auto" onScroll={handleScroll}>
            <div className="prose prose-sm max-w-none">
              <h2 className="text-xl font-semibold mb-4">Terms and Conditions of Use</h2>
              <h3 className="text-lg font-semibold mt-6 mb-3">1. Acceptance of Terms</h3>
              <p className="text-muted-foreground mb-4">By accessing this platform, you agree to these Terms and Conditions.</p>
              <h3 className="text-lg font-semibold mt-6 mb-3">2. Account Registration</h3>
              <p className="text-muted-foreground mb-4">You must provide accurate information during registration.</p>
              <h3 className="text-lg font-semibold mt-6 mb-3">3. Use of Platform</h3>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>No false or discriminatory job listings</li>
                <li>No harassment of users or candidates</li>
                <li>No unauthorized access attempts</li>
              </ul>
              <h3 className="text-lg font-semibold mt-6 mb-3">4. Payment and Refunds</h3>
              <p className="text-muted-foreground mb-4">All fees are non-refundable unless otherwise stated.</p>
              <h3 className="text-lg font-semibold mt-6 mb-3">5. Service Availability</h3>
              <p className="text-muted-foreground mb-4">We strive to maintain platform availability but do not guarantee uninterrupted access.</p>
              <h3 className="text-lg font-semibold mt-6 mb-3">6. Limitation of Liability</h3>
              <p className="text-muted-foreground mb-4">We shall not be liable for indirect or consequential damages.</p>
              <h3 className="text-lg font-semibold mt-6 mb-3">7. Termination</h3>
              <p className="text-muted-foreground mb-4">We may terminate your account if you breach these Terms.</p>
              <p className="text-muted-foreground mt-8 italic">Last updated: January 2025</p>
            </div>
          </div>

          {!scrolledToEnd && (
            <div className="text-sm text-amber-600 mb-4 flex items-center gap-2">
              <span>⚠️</span><span>Please scroll to the end to enable the checkbox</span>
            </div>
          )}

          <div className="flex items-start gap-3 mb-6 p-4 bg-muted/50 rounded-md">
            <Checkbox id="accept-terms" checked={accepted} onCheckedChange={(checked) => setAccepted(checked as boolean)} disabled={!scrolledToEnd} />
            <label htmlFor="accept-terms" className={`text-sm cursor-pointer ${!scrolledToEnd ? 'text-muted-foreground' : ''}`}>
              I have read and accept the Terms & Conditions
            </label>
          </div>

          {retryError && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">{retryError}</div>}

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/employer/agreement')} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />Back
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
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ArrowRight } from 'lucide-react';
import { mockRecordAgreement } from '@/utils/mockApi';
import { useToast } from '@/hooks/use-toast';

export default function Agreement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!accepted) {
      toast({ title: 'Please accept the agreement', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const userId = sessionStorage.getItem('registrationUserId') || '';
      await mockRecordAgreement(userId);
      toast({ title: 'Agreement accepted', description: 'Proceeding to terms & conditions' });
      navigate('/employer/terms');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to record agreement', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-4xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Service Agreement</h1>
          <p className="text-muted-foreground mt-2">Please review and accept our service agreement</p>
        </div>

        <ScrollArea className="h-[400px] rounded-md border p-6 mb-6 bg-muted/30">
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

        <div className="flex items-start gap-3 mb-6 p-4 bg-muted/50 rounded-md">
          <Checkbox
            id="accept-agreement"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked as boolean)}
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
          <Button onClick={handleContinue} disabled={!accepted || loading} className="flex-1">
            {loading ? 'Processing...' : 'Accept & Continue'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

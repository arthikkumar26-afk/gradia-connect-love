import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight } from 'lucide-react';
import { mockRecordTerms } from '@/utils/mockApi';
import { useToast } from '@/hooks/use-toast';
import gradiaLogo from '@/assets/gradia-logo.png';

export default function Terms() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!accepted) {
      toast({ title: 'Please accept the terms', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const userId = sessionStorage.getItem('registrationUserId') || '';
      await mockRecordTerms(userId);
      toast({ title: 'Terms accepted', description: 'Proceeding to plan selection' });
      navigate('/employer/plans');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to record terms acceptance', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-4xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={gradiaLogo} 
              alt="Gradia - Your Next Step" 
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Terms & Conditions</h1>
          <p className="text-muted-foreground mt-2">Please review and accept our terms of service</p>
        </div>

        <ScrollArea className="h-[400px] rounded-md border p-6 mb-6 bg-muted/30">
          <div className="prose prose-sm max-w-none">
            <h2 className="text-xl font-semibold mb-4">Terms and Conditions of Use</h2>
            
            <h3 className="text-lg font-semibold mt-6 mb-3">1. Acceptance of Terms</h3>
            <p className="text-muted-foreground mb-4">
              By accessing and using this platform, you accept and agree to be bound by these Terms and Conditions.
              If you do not agree to these terms, you should not use this platform.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">2. Account Registration</h3>
            <p className="text-muted-foreground mb-4">
              You must provide accurate, current, and complete information during registration. You are responsible
              for maintaining the confidentiality of your account credentials and for all activities under your account.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">3. Use of Platform</h3>
            <p className="text-muted-foreground mb-4">
              You agree to use the platform only for lawful purposes and in accordance with these Terms. You must not:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>Post false, misleading, or discriminatory job listings</li>
              <li>Harass, abuse, or harm other users or candidates</li>
              <li>Attempt to gain unauthorized access to any part of the platform</li>
              <li>Use automated systems to scrape or collect data</li>
              <li>Share your account credentials with unauthorized persons</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">4. Intellectual Property</h3>
            <p className="text-muted-foreground mb-4">
              All content, features, and functionality of the platform are owned by us and are protected by
              international copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">5. User Content</h3>
            <p className="text-muted-foreground mb-4">
              You retain ownership of job postings and content you create. However, by posting content, you grant
              us a license to use, display, and distribute that content in connection with the platform services.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">6. Privacy and Data Protection</h3>
            <p className="text-muted-foreground mb-4">
              Your use of the platform is subject to our Privacy Policy. We collect, use, and protect personal data
              in accordance with applicable data protection laws. Candidate data must be handled with appropriate care.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">7. Payment and Refunds</h3>
            <p className="text-muted-foreground mb-4">
              All fees are non-refundable unless otherwise stated. You authorize us to charge your payment method
              for all fees incurred. Prices may change with 30 days notice.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">8. Service Availability</h3>
            <p className="text-muted-foreground mb-4">
              We strive to maintain platform availability but do not guarantee uninterrupted access. We may suspend
              service for maintenance or updates with reasonable notice.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">9. Disclaimer of Warranties</h3>
            <p className="text-muted-foreground mb-4">
              The platform is provided "as is" without warranties of any kind, either express or implied. We do not
              warrant that the platform will be error-free or that defects will be corrected.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">10. Limitation of Liability</h3>
            <p className="text-muted-foreground mb-4">
              We shall not be liable for any indirect, incidental, special, consequential, or punitive damages
              resulting from your use or inability to use the platform.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">11. Indemnification</h3>
            <p className="text-muted-foreground mb-4">
              You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from your
              use of the platform or violation of these Terms.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">12. Termination</h3>
            <p className="text-muted-foreground mb-4">
              We may terminate or suspend your account immediately if you breach these Terms. Upon termination,
              your right to use the platform ceases immediately.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">13. Changes to Terms</h3>
            <p className="text-muted-foreground mb-4">
              We reserve the right to modify these Terms at any time. Continued use of the platform after changes
              constitutes acceptance of the new Terms.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">14. Governing Law</h3>
            <p className="text-muted-foreground mb-4">
              These Terms are governed by applicable laws. Any disputes shall be resolved in appropriate courts
              or through binding arbitration.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">15. Contact Information</h3>
            <p className="text-muted-foreground mb-4">
              For questions about these Terms, please contact our support team through the platform.
            </p>

            <p className="text-muted-foreground mt-8 italic">
              Last updated: January 2025
            </p>
          </div>
        </ScrollArea>

        <div className="flex items-start gap-3 mb-6 p-4 bg-muted/50 rounded-md">
          <Checkbox
            id="accept-terms"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked as boolean)}
          />
          <label htmlFor="accept-terms" className="text-sm leading-relaxed cursor-pointer">
            I have read, understood, and agree to be bound by these Terms and Conditions. I acknowledge that these terms
            govern my use of the platform and constitute a legal agreement.
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

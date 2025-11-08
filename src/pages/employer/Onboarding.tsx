import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Users, Building, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    logo: null as File | null,
    companyDescription: '',
    website: '',
    linkedIn: '',
    teamEmails: '',
    defaultLocation: '',
    defaultJobType: 'Full-Time',
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, logo: file });
      toast({ title: 'Logo uploaded', description: file.name });
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    // Clear session storage
    sessionStorage.removeItem('registrationUserId');
    sessionStorage.removeItem('selectedPlan');
    sessionStorage.removeItem('subscriptionId');
    
    toast({ title: 'Setup complete!', description: 'Welcome to your dashboard' });
    navigate('/employer/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-2xl p-8 shadow-lg">
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full mx-1 ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {step === 1 && 'Company Profile'}
            {step === 2 && 'Invite Your Team'}
            {step === 3 && 'Set Defaults'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {step === 1 && 'Tell us about your company'}
            {step === 2 && 'Collaborate with your team members'}
            {step === 3 && 'Configure default settings for job postings'}
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="logo-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {formData.logo ? formData.logo.name : 'Click to upload company logo'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Company Description</Label>
              <Textarea
                id="description"
                value={formData.companyDescription}
                onChange={(e) => setFormData({ ...formData, companyDescription: e.target.value })}
                placeholder="Brief description of your company..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://yourcompany.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                type="url"
                value={formData.linkedIn}
                onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
                placeholder="https://linkedin.com/company/yourcompany"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="w-10 h-10 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-emails">Invite Team Members (Optional)</Label>
              <Textarea
                id="team-emails"
                value={formData.teamEmails}
                onChange={(e) => setFormData({ ...formData, teamEmails: e.target.value })}
                placeholder="Enter email addresses separated by commas&#10;example1@company.com, example2@company.com"
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Team members will receive an invitation email to join your workspace
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-md">
              <h4 className="font-semibold text-sm mb-2">Team roles you can assign:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Admin:</strong> Full access to all features</li>
                <li>• <strong>Recruiter:</strong> Manage jobs and candidates</li>
                <li>• <strong>Manager:</strong> Review and approve placements</li>
              </ul>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Building className="w-10 h-10 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-location">Default Job Location</Label>
              <Input
                id="default-location"
                value={formData.defaultLocation}
                onChange={(e) => setFormData({ ...formData, defaultLocation: e.target.value })}
                placeholder="e.g., Remote, New York, London"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-type">Default Employment Type</Label>
              <select
                id="default-type"
                value={formData.defaultJobType}
                onChange={(e) => setFormData({ ...formData, defaultJobType: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            <div className="bg-muted/50 p-4 rounded-md">
              <p className="text-sm text-muted-foreground">
                These defaults will be pre-filled when creating new job postings. You can always change them later.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              Go Back
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1">
            {step === 3 ? 'Complete Setup' : 'Continue'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {step < 3 && (
          <button
            onClick={() => setStep(3)}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-4"
          >
            Skip for now
          </button>
        )}
      </Card>
    </div>
  );
}

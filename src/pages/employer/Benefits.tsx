import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, Users, Sparkles, Calendar, BarChart3, HeadphonesIcon, Wallet, CheckCircle, Building2 } from 'lucide-react';
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

export default function Benefits() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 py-12">
      <div className="w-full max-w-4xl">
        <OnboardingProgress currentStep="benefits" />
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

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />Back
            </Button>
            <Button onClick={() => navigate('/employer/agreement')} className="flex-1">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
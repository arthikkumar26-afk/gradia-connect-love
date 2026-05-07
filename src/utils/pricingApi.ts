// Mock API utilities for pricing plans and demo requests
// For production: Replace localStorage with actual backend API calls

// NOTE: All employer plans are wallet-points based (₹5 = 1 pt).
// Razorpay is only used for *loading* points into the wallet, never for direct
// subscription charges. UI must show points; INR shown as a reference only.

export interface PricingPlan {
  id: 'growth' | 'professional' | 'enterprise';
  name: string;
  subtitle?: string;
  /** Wallet points cost for 1 month of this plan. */
  points: number;
  /** Reference INR equivalent (points × 5). Display-only. */
  priceInr: number;
  features: string[];
  limits: {
    jobPosts: string;
    seats: string;
  };
  popular?: boolean;
  cta: 'subscribe' | 'contact';
  badge?: string;
}

export interface DemoRequest {
  id: string;
  fullName: string;
  businessEmail: string;
  phoneNumber: string;
  companyName: string;
  jobTitle: string;
  companySize: string;
  industry: string;
  country: string;
  timezone: string;
  preferredDemoDate?: string;
  preferredDemoTime?: string;
  preferredDemoMode: string;
  numberOfSeats?: number;
  mainGoals: string;
  howDidYouHear?: string;
  status: 'new' | 'contacted' | 'scheduled' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// Pricing plans configuration
export const pricingPlans: PricingPlan[] = [
  {
    id: 'growth',
    name: 'Growth',
    subtitle: 'Scale your hiring pipeline',
    points: 1000,
    priceInr: 5000,
    popular: true,
    limits: {
      jobPosts: 'Up to 25 active job posts',
      seats: '5 user seats',
    },
    features: [
      'Up to 25 active job posts',
      'AI Resume Screening & Scoring',
      'AI-Powered Interview Scheduling',
      'Screening test management',
      'Mock Interview Pipeline (Basic)',
      'Social Media Job Posting',
      'Basic hiring analytics',
      'Email + chat support (24h)',
      'CSV / Excel exports',
    ],
    cta: 'subscribe',
  },
  {
    id: 'professional',
    name: 'Professional',
    subtitle: 'Full AI-powered recruitment',
    points: 2000,
    priceInr: 10000,
    limits: {
      jobPosts: 'Up to 100 active job posts',
      seats: '20 user seats',
    },
    features: [
      'Up to 100 active job posts',
      'AI Interview Agent (Voice + Text)',
      'AI Candidate Evaluation & Ranking',
      'Full Mock Interview Pipeline',
      'Advanced SMM Marketing Suite',
      'Offer letter automation',
      'Advanced analytics & reports',
      'Background verification tools',
      'Custom email templates',
      'Priority support (4h response)',
      'API access',
    ],
    cta: 'subscribe',
    badge: 'Best Value',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Custom solutions at scale',
    points: 4000,
    priceInr: 20000,
    limits: {
      jobPosts: 'Unlimited job posts',
      seats: 'Unlimited seats',
    },
    features: [
      'Unlimited job posts & seats',
      'All Professional features',
      'AI-Powered Viva Voce Assessment',
      'Live Interview Monitoring',
      'Multi-stage pipeline automation',
      'HR Negotiation management',
      'White-label email branding',
      'Dedicated account manager',
      'Custom onboarding & training',
      'SLA guarantee (99.9% uptime)',
      'Custom integrations & API',
      'Advanced ROI & conversion reports',
    ],
    cta: 'subscribe',
  },
];

// Feature comparison matrix
export const featureComparison = [
  { feature: 'Active job posts', starter: '3', growth: '25', professional: '100', enterprise: 'Unlimited' },
  { feature: 'Team seats', starter: '1', growth: '5', professional: '20', enterprise: 'Unlimited' },
  { feature: 'Candidate tracker', starter: 'Basic', growth: 'Advanced', professional: 'AI-powered', enterprise: 'Full automation' },
  { feature: 'AI Resume Screening', starter: false, growth: true, professional: true, enterprise: true },
  { feature: 'AI Candidate Scoring', starter: false, growth: true, professional: true, enterprise: true },
  { feature: 'AI Interview Agent', starter: false, growth: false, professional: true, enterprise: true },
  { feature: 'AI Interview Evaluation', starter: false, growth: false, professional: true, enterprise: true },
  { feature: 'Mock Interview Pipeline', starter: false, growth: 'Basic', professional: 'Full', enterprise: 'Full + Custom' },
  { feature: 'Screening tests', starter: false, growth: true, professional: true, enterprise: true },
  { feature: 'Interview scheduling', starter: false, growth: 'AI-assisted', professional: 'AI-automated', enterprise: 'AI-automated' },
  { feature: 'Social Media Marketing', starter: false, growth: 'Basic posting', professional: 'Advanced suite', enterprise: 'White-label' },
  { feature: 'Offer letter templates', starter: false, growth: false, professional: true, enterprise: true },
  { feature: 'Viva Voce Assessment', starter: false, growth: false, professional: false, enterprise: true },
  { feature: 'Live Interview Monitoring', starter: false, growth: false, professional: false, enterprise: true },
  { feature: 'Background verification', starter: false, growth: false, professional: true, enterprise: true },
  { feature: 'Custom email templates', starter: false, growth: false, professional: true, enterprise: true },
  { feature: 'Analytics', starter: false, growth: 'Basic', professional: 'Advanced', enterprise: 'Custom + ROI' },
  { feature: 'Support', starter: 'Email (48h)', growth: 'Email + Chat (24h)', professional: 'Priority (4h)', enterprise: 'Dedicated manager' },
  { feature: 'CSV / Excel export', starter: false, growth: true, professional: true, enterprise: true },
  { feature: 'API access', starter: false, growth: false, professional: true, enterprise: 'Custom' },
  { feature: 'HR Negotiation tools', starter: false, growth: false, professional: false, enterprise: true },
  { feature: 'Custom onboarding', starter: false, growth: false, professional: false, enterprise: true },
];

// Mock subscription storage (kept for legacy callers; real flow uses wallet deduction)
export const mockSubscribe = async (planId: string, userId: string) => {
  await new Promise(resolve => setTimeout(resolve, 800));

  const subscription = {
    id: `sub_${Date.now()}`,
    userId,
    planId,
    billingCycle: 'points' as const,
    status: 'active',
    startDate: new Date().toISOString(),
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  localStorage.setItem(`subscription_${userId}`, JSON.stringify(subscription));
  
  return { success: true, subscription };
};

// Demo request storage
export const submitDemoRequest = async (data: Omit<DemoRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const demoRequest: DemoRequest = {
    ...data,
    id: `demo_${Date.now()}`,
    status: 'new',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const existing = localStorage.getItem('demo_requests');
  const requests = existing ? JSON.parse(existing) : [];
  requests.push(demoRequest);
  localStorage.setItem('demo_requests', JSON.stringify(requests));
  
  console.log('Mock email sent to:', data.businessEmail, 'Demo request confirmed:', demoRequest.id);
  
  return { success: true, demoRequest };
};

// Get all demo requests (for admin view)
export const getAllDemoRequests = (): DemoRequest[] => {
  const data = localStorage.getItem('demo_requests');
  return data ? JSON.parse(data) : [];
};

// Update demo request status
export const updateDemoRequestStatus = async (id: string, status: DemoRequest['status']) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const requests = getAllDemoRequests();
  const index = requests.findIndex(r => r.id === id);
  
  if (index !== -1) {
    requests[index].status = status;
    requests[index].updatedAt = new Date().toISOString();
    localStorage.setItem('demo_requests', JSON.stringify(requests));
    return { success: true, request: requests[index] };
  }
  
  return { success: false, message: 'Request not found' };
};

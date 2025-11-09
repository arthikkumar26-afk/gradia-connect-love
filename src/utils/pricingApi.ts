// Mock API utilities for pricing plans and demo requests
// For production: Replace localStorage with actual backend API calls

export interface PricingPlan {
  id: 'basic' | 'growth' | 'scale';
  name: string;
  subtitle?: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  limits: {
    jobPosts: string;
    seats: string;
  };
  popular?: boolean;
  cta: 'free' | 'subscribe' | 'contact';
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
    id: 'basic',
    name: 'Basic',
    subtitle: 'Starter',
    monthlyPrice: 0,
    annualPrice: 0,
    limits: {
      jobPosts: 'Up to 3 active job posts',
      seats: '1 seat (1 user)',
    },
    features: [
      'Up to 3 active job posts',
      'Basic candidate tracker',
      'Email support',
      '1 seat (1 user)',
    ],
    cta: 'free',
  },
  {
    id: 'growth',
    name: 'Growth',
    subtitle: 'Standard',
    monthlyPrice: 7999,
    annualPrice: 79990,
    popular: true,
    limits: {
      jobPosts: 'Up to 15 active job posts',
      seats: '5 seats',
    },
    features: [
      'Up to 15 active job posts',
      'Screening tests',
      'Interview scheduling',
      '5 seats',
      'Basic analytics',
      'Email + chat support',
      'CSV export',
    ],
    cta: 'subscribe',
  },
  {
    id: 'scale',
    name: 'Scale',
    subtitle: 'Premium',
    monthlyPrice: 19999,
    annualPrice: 199990,
    limits: {
      jobPosts: 'Unlimited job posts',
      seats: 'Unlimited seats',
    },
    features: [
      'Unlimited job posts',
      'Full tracker & pipeline automation',
      'Offer letter templates',
      'Priority support',
      'API access',
      'Unlimited seats',
      'Advanced analytics + exports',
      'Custom onboarding',
    ],
    cta: 'contact',
  },
];

// Feature comparison matrix
export const featureComparison = [
  { feature: 'Active job posts', basic: '3', growth: '15', scale: 'Unlimited' },
  { feature: 'Candidate tracker', basic: 'Basic', growth: 'Advanced', scale: 'Full automation' },
  { feature: 'Screening tests', basic: false, growth: true, scale: true },
  { feature: 'Interview scheduling', basic: false, growth: true, scale: true },
  { feature: 'Team seats', basic: '1', growth: '5', scale: 'Unlimited' },
  { feature: 'Analytics', basic: false, growth: 'Basic', scale: 'Advanced' },
  { feature: 'Support', basic: 'Email', growth: 'Email + Chat', scale: 'Priority' },
  { feature: 'CSV export', basic: false, growth: true, scale: true },
  { feature: 'Offer letter templates', basic: false, growth: false, scale: true },
  { feature: 'API access', basic: false, growth: false, scale: true },
  { feature: 'Custom onboarding', basic: false, growth: false, scale: true },
];

// Mock subscription storage
export const mockSubscribe = async (planId: string, billingCycle: 'monthly' | 'annual', userId: string) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const subscription = {
    id: `sub_${Date.now()}`,
    userId,
    planId,
    billingCycle,
    status: 'active',
    startDate: new Date().toISOString(),
    nextBillingDate: new Date(Date.now() + (billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
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
  
  // Mock confirmation email
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

// Mock API utilities - Replace with real backend endpoints

import { Company, User, Subscription, Job, Candidate, Application, Client } from '@/contexts/EmployerContext';

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock data storage (in-memory)
let mockDb = {
  companies: [] as Company[],
  users: [] as User[],
  subscriptions: [] as Subscription[],
  jobs: [] as Job[],
  candidates: [] as Candidate[],
  applications: [] as Application[],
  clients: [] as Client[],
  agreements: [] as { userId: string; acceptedAt: string; ipAddress: string }[],
  terms: [] as { userId: string; acceptedAt: string; ipAddress: string }[],
};

// Seed initial data
export function seedMockData() {
  mockDb.jobs = [
    {
      id: '1',
      title: 'Senior Frontend Developer',
      department: 'Engineering',
      experience: '5+ years',
      skills: ['React', 'TypeScript', 'Tailwind'],
      type: 'Full-Time',
      location: 'Remote',
      status: 'Open',
      description: 'Looking for an experienced frontend developer...',
      postedDate: '2025-01-15',
    },
    {
      id: '2',
      title: 'Product Manager',
      department: 'Product',
      experience: '3-5 years',
      skills: ['Product Strategy', 'Agile', 'Analytics'],
      type: 'Full-Time',
      location: 'New York',
      status: 'Open',
      description: 'Seeking a product manager to lead our initiatives...',
      postedDate: '2025-01-10',
    },
    {
      id: '3',
      title: 'DevOps Engineer',
      department: 'Engineering',
      experience: '4+ years',
      skills: ['AWS', 'Docker', 'Kubernetes'],
      type: 'Contract',
      location: 'San Francisco',
      status: 'Under Review',
      description: 'Need a DevOps expert to manage our infrastructure...',
      postedDate: '2025-01-05',
    },
  ];

  mockDb.candidates = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      skills: ['React', 'Node.js', 'TypeScript'],
      experience: '6 years',
      status: 'Available',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      skills: ['Product Management', 'Agile', 'UX'],
      experience: '4 years',
      status: 'In Process',
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      skills: ['AWS', 'CI/CD', 'Python'],
      experience: '5 years',
      status: 'Available',
    },
    {
      id: '4',
      name: 'Sarah Williams',
      email: 'sarah@example.com',
      skills: ['Vue.js', 'JavaScript', 'CSS'],
      experience: '3 years',
      status: 'Available',
    },
  ];

  mockDb.clients = [
    {
      id: '1',
      name: 'Tech Corp',
      contactPerson: 'Alice Brown',
      email: 'alice@techcorp.com',
      phone: '+1-555-0100',
      activeJobs: 3,
      totalPlacements: 12,
    },
    {
      id: '2',
      name: 'Innovation Labs',
      contactPerson: 'Bob Green',
      email: 'bob@innovationlabs.com',
      phone: '+1-555-0101',
      activeJobs: 2,
      totalPlacements: 8,
    },
  ];

  mockDb.applications = [
    {
      id: '1',
      jobId: '1',
      candidateId: '1',
      stage: 'Panel Interview',
      appliedDate: '2025-01-20',
      timeline: [
        { stage: 'Screening Test', date: '2025-01-20', notes: 'Passed technical screening', completedBy: 'HR Team' },
        { stage: 'Panel Interview', date: '2025-01-25', notes: 'Scheduled for panel interview', completedBy: 'Hiring Manager' },
      ],
      notes: 'Strong candidate with relevant experience',
    },
    {
      id: '2',
      jobId: '2',
      candidateId: '2',
      stage: 'Feedback',
      appliedDate: '2025-01-18',
      timeline: [
        { stage: 'Screening Test', date: '2025-01-18', notes: 'Initial screening completed', completedBy: 'HR Team' },
        { stage: 'Panel Interview', date: '2025-01-22', notes: 'Interview completed', completedBy: 'Panel' },
        { stage: 'Feedback', date: '2025-01-23', notes: 'Awaiting final feedback', completedBy: 'Panel' },
      ],
      notes: 'Excellent communication skills',
    },
  ];
}

// Auth APIs
export async function mockRegister(data: {
  companyName: string;
  companyCategory: string;
  fullName: string;
  email: string;
  password: string;
  phone: string;
  country: string;
  timezone: string;
}): Promise<{ success: boolean; userId: string; message?: string }> {
  await delay(500);
  
  // Check if user already exists
  const existingUser = mockDb.users.find((u) => u.email === data.email);
  if (existingUser) {
    return { success: false, userId: '', message: 'User already exists. Please login.' };
  }

  const userId = `user_${Date.now()}`;
  const companyId = `company_${Date.now()}`;

  mockDb.companies.push({
    id: companyId,
    name: data.companyName,
    category: data.companyCategory,
    country: data.country,
    timezone: data.timezone,
  });

  mockDb.users.push({
    id: userId,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    role: 'admin',
  });

  return { success: true, userId };
}

export async function mockLogin(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; company?: Company; subscription?: Subscription; message?: string }> {
  await delay(500);

  const user = mockDb.users.find((u) => u.email === email);
  if (!user) {
    return { success: false, message: 'Invalid credentials' };
  }

  const company = mockDb.companies[0] || {
    id: 'demo_company',
    name: 'Demo Company',
    category: 'Technology',
    country: 'USA',
    timezone: 'UTC',
  };

  const subscription = mockDb.subscriptions[0] || {
    plan: 'basic',
    billingCycle: 'monthly',
    status: 'active',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
  };

  return { success: true, user, company, subscription };
}

// Agreement & Terms
export async function mockRecordAgreement(userId: string): Promise<{ success: boolean }> {
  await delay(300);
  mockDb.agreements.push({
    userId,
    acceptedAt: new Date().toISOString(),
    ipAddress: '127.0.0.1', // Mock IP
  });
  return { success: true };
}

export async function mockRecordTerms(userId: string): Promise<{ success: boolean }> {
  await delay(300);
  mockDb.terms.push({
    userId,
    acceptedAt: new Date().toISOString(),
    ipAddress: '127.0.0.1', // Mock IP
  });
  return { success: true };
}

// Plans & Payment
export async function mockProcessPayment(data: {
  userId: string;
  plan: 'basic' | 'standard' | 'premium';
  billingCycle: 'monthly' | 'annual';
}): Promise<{ success: boolean; subscriptionId?: string; message?: string }> {
  await delay(1000);

  // Simulate 95% success rate
  const success = Math.random() > 0.05;

  if (!success) {
    return { success: false, message: 'Payment failed. Please try again.' };
  }

  const subscriptionId = `sub_${Date.now()}`;
  const subscription: Subscription = {
    plan: data.plan,
    billingCycle: data.billingCycle,
    status: 'active',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  };

  mockDb.subscriptions.push(subscription);

  return { success: true, subscriptionId };
}

// Jobs
export async function mockGetJobs(): Promise<Job[]> {
  await delay(300);
  return mockDb.jobs;
}

export async function mockCreateJob(job: Omit<Job, 'id' | 'postedDate'>): Promise<Job> {
  await delay(500);
  const newJob: Job = {
    ...job,
    id: `job_${Date.now()}`,
    postedDate: new Date().toISOString().split('T')[0],
  };
  mockDb.jobs.push(newJob);
  return newJob;
}

export async function mockUpdateJob(job: Job): Promise<Job> {
  await delay(500);
  mockDb.jobs = mockDb.jobs.map((j) => (j.id === job.id ? job : j));
  return job;
}

// Candidates
export async function mockGetCandidates(): Promise<Candidate[]> {
  await delay(300);
  return mockDb.candidates;
}

export async function mockAddCandidate(candidate: Omit<Candidate, 'id'>): Promise<Candidate> {
  await delay(500);
  const newCandidate: Candidate = {
    ...candidate,
    id: `candidate_${Date.now()}`,
  };
  mockDb.candidates.push(newCandidate);
  return newCandidate;
}

// Applications
export async function mockGetApplications(): Promise<Application[]> {
  await delay(300);
  return mockDb.applications;
}

export async function mockUpdateApplicationStage(
  applicationId: string,
  stage: Application['stage'],
  notes: string
): Promise<Application> {
  await delay(500);
  const application = mockDb.applications.find((a) => a.id === applicationId);
  if (!application) throw new Error('Application not found');

  application.stage = stage;
  application.timeline.push({
    stage,
    date: new Date().toISOString().split('T')[0],
    notes,
    completedBy: 'Admin',
  });

  return application;
}

// Clients
export async function mockGetClients(): Promise<Client[]> {
  await delay(300);
  return mockDb.clients;
}

// Initialize seed data
seedMockData();

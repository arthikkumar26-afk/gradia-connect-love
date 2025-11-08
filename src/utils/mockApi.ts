// Mock API utilities - Replace with real backend endpoints

import { Company, User, Subscription, Job, Candidate, Application, Client, Placement, Meeting, BGVDocument, OfferLetter, PlacementTimelineEvent } from '@/contexts/EmployerContext';

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
  placements: [] as Placement[],
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

// Placements
export async function mockGetPlacements(): Promise<Placement[]> {
  await delay(300);
  
  // Seed some placements if none exist
  if (mockDb.placements.length === 0) {
    mockDb.placements = [
      {
        id: 'placement_1',
        jobId: '1',
        candidateId: '1',
        clientId: '1',
        stage: 'Panel Interview',
        appliedDate: '2025-01-15',
        lastUpdated: '2025-01-25',
        timeline: [
          {
            id: 'evt_1',
            stage: 'Applied',
            date: '2025-01-15',
            notes: 'Application submitted',
            completedBy: 'System',
            eventType: 'stage_change',
          },
          {
            id: 'evt_2',
            stage: 'Screening Test',
            date: '2025-01-18',
            notes: 'Passed technical screening with 85%',
            completedBy: 'HR Team',
            eventType: 'stage_change',
          },
          {
            id: 'evt_3',
            stage: 'Panel Interview',
            date: '2025-01-25',
            notes: 'Moved to panel interview stage',
            completedBy: 'Hiring Manager',
            eventType: 'stage_change',
          },
        ],
      },
      {
        id: 'placement_2',
        jobId: '2',
        candidateId: '2',
        clientId: '1',
        stage: 'BGV',
        appliedDate: '2025-01-10',
        lastUpdated: '2025-01-28',
        timeline: [
          {
            id: 'evt_4',
            stage: 'Applied',
            date: '2025-01-10',
            notes: 'Application submitted',
            completedBy: 'System',
            eventType: 'stage_change',
          },
          {
            id: 'evt_5',
            stage: 'BGV',
            date: '2025-01-28',
            notes: 'Background verification in progress',
            completedBy: 'HR Team',
            eventType: 'stage_change',
          },
        ],
        bgvDocuments: [],
      },
      {
        id: 'placement_3',
        jobId: '3',
        candidateId: '3',
        clientId: '2',
        stage: 'Hired',
        appliedDate: '2025-01-05',
        lastUpdated: '2025-01-30',
        timeline: [
          {
            id: 'evt_6',
            stage: 'Hired',
            date: '2025-01-30',
            notes: 'Candidate accepted offer and joined',
            completedBy: 'HR Team',
            eventType: 'stage_change',
          },
        ],
        offerLetter: {
          id: 'offer_1',
          salary: '$120,000/year',
          joiningDate: '2025-02-01',
          probationPeriod: '3 months',
          customNotes: 'Welcome to the team!',
          sentAt: '2025-01-28',
          sentBy: 'HR Manager',
          candidateResponse: 'accepted',
          responseDate: '2025-01-29',
        },
      },
    ];
  }
  
  return mockDb.placements;
}

export async function mockUpdatePlacementStage(
  placementId: string,
  stage: Placement['stage'],
  notes: string
): Promise<Placement> {
  await delay(500);
  const placement = mockDb.placements.find((p) => p.id === placementId);
  if (!placement) throw new Error('Placement not found');

  placement.stage = stage;
  placement.lastUpdated = new Date().toISOString().split('T')[0];
  placement.timeline.push({
    id: `evt_${Date.now()}`,
    stage,
    date: new Date().toISOString().split('T')[0],
    notes,
    completedBy: 'Admin',
    eventType: 'stage_change',
  });

  return placement;
}

export async function mockScheduleMeeting(
  placementId: string,
  meeting: Omit<Meeting, 'id' | 'scheduledAt' | 'scheduledBy'>
): Promise<Placement> {
  await delay(500);
  const placement = mockDb.placements.find((p) => p.id === placementId);
  if (!placement) throw new Error('Placement not found');

  placement.meeting = {
    ...meeting,
    id: `meeting_${Date.now()}`,
    scheduledBy: 'Admin',
    scheduledAt: new Date().toISOString(),
  };

  placement.timeline.push({
    id: `evt_${Date.now()}`,
    stage: 'Panel Interview',
    date: new Date().toISOString().split('T')[0],
    notes: `Meeting scheduled for ${meeting.date} at ${meeting.time}`,
    completedBy: 'Admin',
    eventType: 'meeting_scheduled',
  });

  placement.lastUpdated = new Date().toISOString().split('T')[0];
  return placement;
}

export async function mockUploadBGVDocument(
  placementId: string,
  document: Omit<BGVDocument, 'id' | 'uploadedAt' | 'uploadedBy' | 'status'>
): Promise<Placement> {
  await delay(500);
  const placement = mockDb.placements.find((p) => p.id === placementId);
  if (!placement) throw new Error('Placement not found');

  if (!placement.bgvDocuments) {
    placement.bgvDocuments = [];
  }

  const newDocument: BGVDocument = {
    ...document,
    id: `doc_${Date.now()}`,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Candidate',
    status: 'pending',
  };

  placement.bgvDocuments.push(newDocument);

  placement.timeline.push({
    id: `evt_${Date.now()}`,
    stage: 'BGV',
    date: new Date().toISOString().split('T')[0],
    notes: `Document uploaded: ${document.name}`,
    completedBy: 'Candidate',
    eventType: 'document_uploaded',
  });

  placement.lastUpdated = new Date().toISOString().split('T')[0];
  return placement;
}

export async function mockVerifyBGVDocument(
  placementId: string,
  documentId: string,
  status: 'verified' | 'rejected',
  comments?: string
): Promise<Placement> {
  await delay(500);
  const placement = mockDb.placements.find((p) => p.id === placementId);
  if (!placement) throw new Error('Placement not found');

  const document = placement.bgvDocuments?.find((d) => d.id === documentId);
  if (!document) throw new Error('Document not found');

  document.status = status;
  document.verifiedBy = 'Admin';
  document.verifiedAt = new Date().toISOString();
  document.comments = comments;

  placement.timeline.push({
    id: `evt_${Date.now()}`,
    stage: 'BGV',
    date: new Date().toISOString().split('T')[0],
    notes: `Document ${status}: ${document.name}${comments ? ` - ${comments}` : ''}`,
    completedBy: 'Admin',
    eventType: 'document_verified',
  });

  placement.lastUpdated = new Date().toISOString().split('T')[0];
  return placement;
}

export async function mockSendOfferLetter(
  placementId: string,
  offer: Omit<OfferLetter, 'id' | 'sentAt' | 'sentBy'>
): Promise<Placement> {
  await delay(500);
  const placement = mockDb.placements.find((p) => p.id === placementId);
  if (!placement) throw new Error('Placement not found');

  placement.offerLetter = {
    ...offer,
    id: `offer_${Date.now()}`,
    sentAt: new Date().toISOString(),
    sentBy: 'Admin',
  };

  placement.timeline.push({
    id: `evt_${Date.now()}`,
    stage: 'Offer Letter',
    date: new Date().toISOString().split('T')[0],
    notes: `Offer letter sent - Salary: ${offer.salary}, Joining: ${offer.joiningDate}`,
    completedBy: 'Admin',
    eventType: 'offer_sent',
  });

  placement.lastUpdated = new Date().toISOString().split('T')[0];
  return placement;
}

export async function mockRespondToOffer(
  placementId: string,
  response: 'accepted' | 'rejected' | 'deferred',
  deferredDate?: string
): Promise<Placement> {
  await delay(500);
  const placement = mockDb.placements.find((p) => p.id === placementId);
  if (!placement || !placement.offerLetter) throw new Error('Placement or offer not found');

  placement.offerLetter.candidateResponse = response;
  placement.offerLetter.responseDate = new Date().toISOString().split('T')[0];

  if (response === 'deferred' && deferredDate) {
    placement.offerLetter.deferredDate = deferredDate;
  }

  if (response === 'accepted') {
    placement.stage = 'Hired';
  }

  placement.timeline.push({
    id: `evt_${Date.now()}`,
    stage: placement.stage,
    date: new Date().toISOString().split('T')[0],
    notes: `Candidate ${response} the offer${deferredDate ? ` - Proposed date: ${deferredDate}` : ''}`,
    completedBy: 'Candidate',
    eventType: 'offer_response',
  });

  placement.lastUpdated = new Date().toISOString().split('T')[0];
  return placement;
}

export async function mockRejectPlacement(
  placementId: string,
  reason: string
): Promise<Placement> {
  await delay(500);
  const placement = mockDb.placements.find((p) => p.id === placementId);
  if (!placement) throw new Error('Placement not found');

  placement.stage = 'Rejected';
  placement.rejectionReason = reason;
  placement.lastUpdated = new Date().toISOString().split('T')[0];

  placement.timeline.push({
    id: `evt_${Date.now()}`,
    stage: 'Rejected',
    date: new Date().toISOString().split('T')[0],
    notes: `Placement rejected: ${reason}`,
    completedBy: 'Admin',
    eventType: 'stage_change',
  });

  return placement;
}

// Initialize seed data
seedMockData();

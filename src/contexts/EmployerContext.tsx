import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export interface Company {
  id: string;
  name: string;
  category: string;
  logo?: string;
  country: string;
  timezone: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'admin' | 'recruiter' | 'manager';
}

export interface Subscription {
  plan: 'basic' | 'standard' | 'premium';
  billingCycle: 'monthly' | 'annual';
  status: 'active' | 'trial' | 'expired';
  startDate: string;
  endDate: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  experience: string;
  skills: string[];
  type: 'Full-Time' | 'Contract' | 'Internship';
  location: string;
  status: 'Open' | 'Under Review' | 'Closed';
  description: string;
  postedDate: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  skills: string[];
  experience: string;
  status: 'Available' | 'In Process' | 'Placed';
  resumeUrl?: string;
  summary?: string;
  aiScore?: number;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  stage: 'Screening Test' | 'Panel Interview' | 'Feedback' | 'Confirmation' | 'Offer Letter';
  appliedDate: string;
  timeline: TimelineEvent[];
  notes: string;
}

export interface Placement {
  id: string;
  jobId: string;
  candidateId: string;
  clientId: string;
  stage: 'Shortlisted' | 'Screening Test' | 'Panel Interview' | 'Feedback' | 'BGV' | 'Confirmation' | 'Offer Letter' | 'Hired' | 'Rejected';
  appliedDate: string;
  lastUpdated: string;
  timeline: PlacementTimelineEvent[];
  meeting?: Meeting;
  bgvDocuments?: BGVDocument[];
  offerLetter?: OfferLetter;
  rejectionReason?: string;
  rejectionComments?: string;
  aiEvaluation?: AIEvaluation;
  comments?: PlacementComment[];
}

export interface PlacementTimelineEvent {
  id: string;
  stage: string;
  date: string;
  notes: string;
  completedBy?: string;
  eventType: 'stage_change' | 'meeting_scheduled' | 'document_uploaded' | 'document_verified' | 'offer_sent' | 'offer_response' | 'comment_added' | 'ai_evaluation' | 'rejection';
}

export interface AIEvaluation {
  id: string;
  score: number;
  rationale: string;
  evaluatedAt: string;
  questions?: ScreeningQuestion[];
  answers?: string[];
}

export interface ScreeningQuestion {
  id: string;
  question: string;
  type: 'mcq' | 'text';
  options?: string[];
  correctAnswer?: string;
}

export interface PlacementComment {
  id: string;
  text: string;
  author: string;
  authorRole: 'employer' | 'candidate';
  timestamp: string;
  stage: string;
}

export interface Meeting {
  id: string;
  date: string;
  time: string;
  timezone: string;
  participants: string[];
  scheduledBy: string;
  scheduledAt: string;
}

export interface BGVDocument {
  id: string;
  name: string;
  type: 'ID Proof' | 'Address Proof' | 'Education Certificate' | 'Experience Letter' | 'Other';
  fileName: string;
  fileSize?: number;
  uploadedAt: string;
  uploadedBy: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  comments?: string;
}

export interface OfferLetter {
  id: string;
  salary: string;
  joiningDate: string;
  probationPeriod: string;
  customNotes: string;
  sentAt: string;
  sentBy: string;
  candidateResponse?: 'accepted' | 'rejected' | 'deferred';
  responseDate?: string;
  deferredDate?: string;
  deferApproval?: 'approved' | 'rejected';
}

export interface TimelineEvent {
  stage: string;
  date: string;
  notes: string;
  completedBy?: string;
}

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  activeJobs: number;
  totalPlacements: number;
}

interface EmployerState {
  company: Company | null;
  user: User | null;
  subscription: Subscription | null;
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  placements: Placement[];
  clients: Client[];
  isAuthenticated: boolean;
  userRole?: 'employer' | 'candidate' | null;
}

type EmployerAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_COMPANY'; payload: Company }
  | { type: 'SET_SUBSCRIPTION'; payload: Subscription }
  | { type: 'SET_JOBS'; payload: Job[] }
  | { type: 'ADD_JOB'; payload: Job }
  | { type: 'UPDATE_JOB'; payload: Job }
  | { type: 'SET_CANDIDATES'; payload: Candidate[] }
  | { type: 'ADD_CANDIDATE'; payload: Candidate }
  | { type: 'SET_APPLICATIONS'; payload: Application[] }
  | { type: 'UPDATE_APPLICATION'; payload: Application }
  | { type: 'SET_PLACEMENTS'; payload: Placement[] }
  | { type: 'UPDATE_PLACEMENT'; payload: Placement }
  | { type: 'SET_CLIENTS'; payload: Client[] }
  | { type: 'SET_USER_ROLE'; payload: 'employer' | 'candidate' | null }
  | { type: 'LOGIN'; payload: { user: User; company: Company; subscription: Subscription } }
  | { type: 'LOGOUT' };

const initialState: EmployerState = {
  company: null,
  user: null,
  subscription: null,
  jobs: [],
  candidates: [],
  applications: [],
  placements: [],
  clients: [],
  isAuthenticated: false,
  userRole: null,
};

function employerReducer(state: EmployerState, action: EmployerAction): EmployerState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_COMPANY':
      return { ...state, company: action.payload };
    case 'SET_SUBSCRIPTION':
      return { ...state, subscription: action.payload };
    case 'SET_JOBS':
      return { ...state, jobs: action.payload };
    case 'ADD_JOB':
      return { ...state, jobs: [...state.jobs, action.payload] };
    case 'UPDATE_JOB':
      return {
        ...state,
        jobs: state.jobs.map((job) => (job.id === action.payload.id ? action.payload : job)),
      };
    case 'SET_CANDIDATES':
      return { ...state, candidates: action.payload };
    case 'ADD_CANDIDATE':
      return { ...state, candidates: [...state.candidates, action.payload] };
    case 'SET_APPLICATIONS':
      return { ...state, applications: action.payload };
    case 'UPDATE_APPLICATION':
      return {
        ...state,
        applications: state.applications.map((app) =>
          app.id === action.payload.id ? action.payload : app
        ),
      };
    case 'SET_PLACEMENTS':
      return { ...state, placements: action.payload };
    case 'UPDATE_PLACEMENT':
      return {
        ...state,
        placements: state.placements.map((placement) =>
          placement.id === action.payload.id ? action.payload : placement
        ),
      };
    case 'SET_CLIENTS':
      return { ...state, clients: action.payload };
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload };
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        company: action.payload.company,
        subscription: action.payload.subscription,
        isAuthenticated: true,
      };
    case 'LOGOUT':
      return initialState;
    default:
      return state;
  }
}

const EmployerContext = createContext<
  | {
      state: EmployerState;
      dispatch: React.Dispatch<EmployerAction>;
    }
  | undefined
>(undefined);

export function EmployerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(employerReducer, initialState);

  return <EmployerContext.Provider value={{ state, dispatch }}>{children}</EmployerContext.Provider>;
}

export function useEmployer() {
  const context = useContext(EmployerContext);
  if (!context) {
    throw new Error('useEmployer must be used within EmployerProvider');
  }
  return context;
}

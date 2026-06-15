import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getSampleMockInterviewStageResults } from "@/data/sampleMockInterviewData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Play,
  Loader2,
  Brain,
  GraduationCap,
  CheckCircle2,
  Clock,
  Mail,
  Code,
  Calendar,
  Monitor,
  BarChart3,
  FileText,
  ListChecks,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Target,
  Upload,
  X,
  File,
  UserPlus,
  Award,
  MapPin,
  Phone,
  MessageSquare,
  IndianRupee,
  Send,
  Video,
  BookOpen,
  ExternalLink,
  Star,
  Building2,
  RotateCcw,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import { generateMockInterviewReportPdf } from "@/utils/mockInterviewReportPdf";
import { InterviewProgressTracker } from "@/components/candidate/InterviewProgressTracker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { indiaLocationData } from "@/data/indiaLocations";
import { interviewPipelineConfig, pipelineRoleOptions, defaultRoleOptions } from "@/data/interviewPipelineConfig";

interface InterviewStage {
  name: string;
  order: number;
  description: string;
  questionCount: number;
  timePerQuestion: number;
  passingScore: number;
  stageType?: 'email_info' | 'assessment' | 'slot_booking' | 'demo' | 'feedback' | 'hr_documents' | 'review' | 'coding';
}

interface StageResult {
  id: string;
  stage_name: string;
  stage_order: number;
  ai_score: number;
  ai_feedback: string;
  passed: boolean;
  recording_url?: string;
  completed_at?: string;
  strengths?: string[];
  improvements?: string[];
  question_scores?: {
    teachingClarity?: { score: number; feedback: string };
    subjectKnowledge?: { score: number; feedback: string };
    presentationSkills?: { score: number; feedback: string };
    timeManagement?: { score: number; feedback: string };
    overallPotential?: { score: number; feedback: string };
  };
}

interface MockInterviewSession {
  id: string;
  status: string;
  current_stage_order: number;
  overall_score: number;
  overall_feedback: string;
  recording_url?: string;
  created_at: string;
  completed_at?: string;
  points_paid?: boolean | null;
  points_paid_at?: string | null;
}

export const MockInterviewTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stages, setStages] = useState<InterviewStage[]>([]);
  const [currentSession, setCurrentSession] = useState<MockInterviewSession | null>(null);
  const [stageResults, setStageResults] = useState<StageResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  const [showSlotBooking, setShowSlotBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [isBookingSlot, setIsBookingSlot] = useState(false);
  // Mock role chooser state — Interview Type → Pipeline Type → Role (matches vacancy creation)
  // Persist selections in localStorage so they survive navigation / re-renders
  const [selectedMockInterviewType, setSelectedMockInterviewType] = useState(() => localStorage.getItem('mock_interview_type') || '');
  const [selectedMockPipelineType, setSelectedMockPipelineType] = useState(() => localStorage.getItem('mock_pipeline_type') || '');
  const [selectedMockRole, setSelectedMockRole] = useState(() => localStorage.getItem('mock_role') || '');
  const [positionQuery, setPositionQuery] = useState('');
  const [positionFocused, setPositionFocused] = useState(false);

  // Flatten all positions across interview types / pipelines / roles for search
  const allPositions = useMemo(() => {
    const out: { interviewType: string; interviewLabel: string; pipelineType: string; pipelineLabel: string; role: string; roleLabel: string }[] = [];
    interviewPipelineConfig.forEach(it => {
      it.pipelineTypes.forEach(pt => {
        const key = `${it.value}.${pt.value}`;
        const roles = pipelineRoleOptions[key] || defaultRoleOptions;
        roles.forEach(r => {
          out.push({
            interviewType: it.value,
            interviewLabel: it.label,
            pipelineType: pt.value,
            pipelineLabel: pt.label,
            role: r.value,
            roleLabel: r.label,
          });
        });
      });
    });
    return out;
  }, []);

  const filteredPositions = useMemo(() => {
    const q = positionQuery.trim().toLowerCase();
    if (!q) return [];
    return allPositions
      .filter(p =>
        p.roleLabel.toLowerCase().includes(q) ||
        p.pipelineLabel.toLowerCase().includes(q) ||
        p.interviewLabel.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [positionQuery, allPositions]);

  const applyPosition = (p: { interviewType: string; pipelineType: string; role: string; roleLabel: string }) => {
    setSelectedMockInterviewType(p.interviewType);
    setSelectedMockPipelineType(p.pipelineType);
    setSelectedMockRole(p.role);
    setPositionQuery(p.roleLabel);
    setPositionFocused(false);
  };

  // Load admin pipeline config defaults (if no localStorage values exist)
  useEffect(() => {
    const loadAdminConfig = async () => {
      // Only load if user hasn't already made a selection
      if (localStorage.getItem('mock_interview_type')) return;
      try {
        const { data } = await supabase
          .from('mock_interview_pipeline_config')
          .select('interview_type, pipeline_type, role')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          if ((data as any).interview_type) setSelectedMockInterviewType((data as any).interview_type);
          if ((data as any).pipeline_type) setSelectedMockPipelineType((data as any).pipeline_type);
          if ((data as any).role) setSelectedMockRole((data as any).role);
        }
      } catch (err) {
        console.error('Error loading admin pipeline config:', err);
      }
    };
    loadAdminConfig();
  }, []);

  // Sync selections to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('mock_interview_type', selectedMockInterviewType);
    localStorage.setItem('mock_pipeline_type', selectedMockPipelineType);
    localStorage.setItem('mock_role', selectedMockRole);
  }, [selectedMockInterviewType, selectedMockPipelineType, selectedMockRole]);
  
  // Slot booking form state for Stage 2
  const [slotBookingForm, setSlotBookingForm] = useState({
    date: '',
    time: '',
    location: '',
    state: '',
    district: '',
    pincode: '',
    programme: '',
    segment: '',
    category: '',
    classLevel: '',
    designation: '',
    department: '',
    classType: '',
    subject: ''
  });
  
  // Industry-specific segment options (matching admin MockInterviewPipeline)
  const industrySegmentOptions: Record<string, string[]> = {
    'Education': ['Pre-Primary', 'Primary', 'High School', 'School'],
    'IT Corporate': ['Software Engineer', 'Cybersecurity', 'Data & Artificial Intelligence', 'Cloud & Infrastructure', 'Quality Assurance & Testing', 'Product & Project Management', 'UI/UX & Design', 'Business & IT Consulting', 'IT Support & Operations'],
    'Legal': ['Corporate Law', 'Criminal Law', 'Civil Law', 'IP Law', 'Compliance'],
    'Doctor': ['General Medicine', 'Surgery', 'Pediatrics', 'Cardiology', 'Dermatology', 'Orthopedics'],
    'Civil Service': ['Administrative', 'Police', 'Revenue', 'Education Services', 'Foreign Services'],
    'Real Estate & Infrastructure': ['Sales', 'Property Management', 'Construction', 'Architecture', 'Interior Design'],
    'Freelance / Independent Professionals': ['Design', 'Development', 'Content Writing', 'Marketing', 'Consulting'],
  };

  // Map internal industry category to display key
  const getIndustryDisplayKey = (): string => {
    if (!profile) return 'Education';
    const cat = (profile.category || '').toLowerCase();
    const role = (profile.preferred_role || '').toLowerCase();
    const seg = (profile.segment || '').toLowerCase();
    if (cat.includes('it_corporate') || cat.includes('it corporate') || role.includes('software') || role.includes('developer') || role.includes('engineer') || seg.includes('it')) return 'IT Corporate';
    if (cat.includes('non_it') || cat.includes('non-it') || cat.includes('non it corporate')) return 'IT Corporate';
    if (cat.includes('legal') || role.includes('lawyer') || role.includes('legal')) return 'Legal';
    if (cat.includes('doctor') || role.includes('doctor') || role.includes('physician')) return 'Doctor';
    if (cat.includes('civil') || role.includes('civil service')) return 'Civil Service';
    if (cat.includes('real estate') || role.includes('real estate')) return 'Real Estate & Infrastructure';
    if (cat.includes('freelance') || role.includes('freelance')) return 'Freelance / Independent Professionals';
    return 'Education';
  };

  const currentIndustryKey = getIndustryDisplayKey();
  const segmentOptions = industrySegmentOptions[currentIndustryKey] || [];

  // Education-specific category options
  const educationCategoryOptions: Record<string, string[]> = {
    'Pre-Primary': ['Teaching', 'Helping/Supporting', 'Admin'],
    'Primary': ['Teaching', 'Helping/Supporting', 'Admin', 'CLASS-1&2', 'CLASSES-3,4&5'],
    'High School': ['Board', 'Competitive'],
  };

  // Non-education industry category options
  const industryCategoryMapping: Record<string, Record<string, string[]>> = {
    'IT Corporate': {
      'Software Engineer': ['Frontend', 'Backend', 'Full Stack', 'Mobile', 'Embedded Systems', 'API', 'Platform', 'DevOps'],
      'Cybersecurity': ['Network Security', 'Application Security', 'Cloud Security', 'GRC', 'Incident Response', 'Penetration Testing'],
      'Data & Artificial Intelligence': ['Data Analytics', 'Machine Learning', 'NLP', 'Computer Vision', 'Big Data', 'MLOps'],
      'Cloud & Infrastructure': ['AWS', 'Azure', 'GCP', 'Linux', 'Windows', 'Networking'],
      'Quality Assurance & Testing': ['Manual Testing', 'Automation', 'Performance', 'Security Testing', 'API Testing', 'Mobile Testing'],
      'Product & Project Management': ['Product Management', 'Project Management', 'Agile/Scrum', 'Program Management'],
      'UI/UX & Design': ['UI Design', 'UX Design', 'Product Design', 'UX Research', 'Design Systems'],
      'Business & IT Consulting': ['Business Analysis', 'ERP', 'CRM', 'IT Consulting', 'Solution Architecture'],
      'IT Support & Operations': ['Desktop Support', 'Technical Support', 'Application Support', 'IT Operations'],
    },
    'Legal': {
      'Corporate Law': ['Mergers & Acquisitions', 'Securities', 'Banking'],
      'Criminal Law': ['Prosecution', 'Defense', 'White Collar Crime'],
      'Civil Law': ['Property', 'Family', 'Consumer'],
      'IP Law': ['Patents', 'Trademarks', 'Copyright'],
      'Compliance': ['Regulatory', 'Risk Management', 'Audit'],
    },
    'Doctor': {
      'General Medicine': ['Internal Medicine', 'Family Medicine', 'Emergency'],
      'Surgery': ['General Surgery', 'Neuro Surgery', 'Cardiac Surgery'],
      'Pediatrics': ['Neonatology', 'General Pediatrics', 'Pediatric Surgery'],
      'Cardiology': ['Interventional', 'Non-Interventional', 'Electrophysiology'],
      'Dermatology': ['Clinical', 'Cosmetic', 'Surgical'],
      'Orthopedics': ['Spine', 'Joint Replacement', 'Sports Medicine'],
    },
    'Civil Service': {
      'Administrative': ['IAS', 'State Admin', 'District Admin'],
      'Police': ['IPS', 'State Police', 'Intelligence'],
      'Revenue': ['IRS', 'Tax Administration', 'Customs'],
      'Education Services': ['IES', 'State Education', 'University Admin'],
      'Foreign Services': ['IFS', 'Diplomatic', 'Trade Services'],
    },
    'Real Estate & Infrastructure': {
      'Sales': ['Residential', 'Commercial', 'Land'],
      'Property Management': ['Residential', 'Commercial', 'Mixed Use'],
      'Construction': ['Civil', 'Structural', 'MEP'],
      'Architecture': ['Residential', 'Commercial', 'Landscape'],
      'Interior Design': ['Residential', 'Commercial', 'Hospitality'],
    },
    'Freelance / Independent Professionals': {
      'Design': ['Graphic Design', 'Web Design', 'Brand Design'],
      'Development': ['Web Development', 'App Development', 'Game Development'],
      'Content Writing': ['Technical Writing', 'Creative Writing', 'SEO Writing'],
      'Marketing': ['Digital Marketing', 'Social Media', 'Content Marketing'],
      'Consulting': ['Business Consulting', 'IT Consulting', 'Management Consulting'],
    },
  };

  // Industry-specific designation options
  const industryDesignationOptions: Record<string, Record<string, string[]>> = {
    'IT Corporate': {
      'Software Engineer': ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Mobile App Developer', 'DevOps Engineer'],
      'Cybersecurity': ['Security Analyst', 'Ethical Hacker', 'Penetration Tester', 'Cloud Security Engineer', 'GRC Analyst'],
      'Data & Artificial Intelligence': ['Data Analyst', 'Data Scientist', 'ML Engineer', 'AI Engineer', 'Data Engineer'],
      'Cloud & Infrastructure': ['Cloud Engineer', 'AWS Engineer', 'Azure Engineer', 'System Administrator', 'Network Engineer'],
      'Quality Assurance & Testing': ['QA Engineer', 'Manual Tester', 'Automation Tester', 'Performance Tester', 'QA Lead'],
      'Product & Project Management': ['Product Manager', 'Project Manager', 'Scrum Master', 'Program Manager'],
      'UI/UX & Design': ['UI Designer', 'UX Designer', 'Product Designer', 'UX Researcher'],
      'Business & IT Consulting': ['Business Analyst', 'ERP Consultant', 'IT Consultant', 'Solution Architect'],
      'IT Support & Operations': ['IT Support Engineer', 'Desktop Support Engineer', 'Technical Support Engineer'],
    },
    'Legal': { _default: ['Legal Advisor', 'Legal Officer', 'Compliance Manager', 'Paralegal', 'Senior Counsel'] },
    'Doctor': { _default: ['Junior Doctor', 'Senior Doctor', 'Specialist', 'Consultant', 'HOD'] },
    'Civil Service': { _default: ['Probationer', 'Officer', 'Senior Officer', 'Commissioner', 'Secretary'] },
    'Real Estate & Infrastructure': { _default: ['Executive', 'Manager', 'Senior Manager', 'Director', 'VP'] },
    'Freelance / Independent Professionals': { _default: ['Freelancer', 'Consultant', 'Contractor', 'Agency Owner'] },
  };

  const categoryOptions: Record<string, string[]> = educationCategoryOptions;

  const designationOptions: Record<string, Record<string, string[]>> = {
    'Pre-Primary': {
      'Teaching': ['MOTHER TEACHER'],
      'Helping/Supporting': ['ASSO.TEACHER', 'CARE TAKER'],
      'Admin': ['VICE PRINCIPAL']
    },
    'Primary': {
      'Teaching': ['PRT', 'TGT', 'ASSO.TEACHER'],
      'Helping/Supporting': ['ASSO.TEACHER'],
      'Admin': ['VICE PRINCIPAL'],
      'CLASS-1&2': ['PRT', 'TGT', 'SUBJECT TEACHER'],
      'CLASSES-3,4&5': ['1st Language', '2nd Language', '3rd Language', 'MATHS', 'GEN.SCIENCE', 'SOCIAL', 'COMPUTERS', 'PHYSICAL EDUCATION', 'CCA']
    },
    'High School': {
      'Competitive': ['TGT', 'PGT', 'SENIOR TEACHER', 'HOD']
    }
  };

  // Class level options for Education > High School
  const classLevelOptions: Record<string, string[]> = {
    'Board': ['CLASS-6,7&8', 'CLASS-9&10'],
    'Competitive': ['CLASSES-6,7&8', 'CLASSES-9&10'],
  };

  const classDesignationOptions: Record<string, string[]> = {
    'CLASS-6,7&8': ['Telugu', 'Hindi', 'English', 'Maths', 'Physics', 'Chemistry', 'Biology'],
    'CLASS-9&10': ['Telugu', 'Hindi', 'English', 'Maths', 'Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology', 'Social', 'Mental Ability', 'Counsellor', 'Academic Dean', 'Computers', 'Physical Education', 'Principal', 'Soft Skills Trainer', 'French'],
    'CLASSES-6,7&8': ['Maths', 'Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology', 'Mental Ability', 'Counsellor'],
    'CLASSES-9&10': ['Maths', 'Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology', 'Mental Ability', 'Counsellor', 'Academic Dean'],
  };

  const isEducationIndustry = currentIndustryKey === 'Education';

  // Check if we need to show class level field (for Board or Competitive)
  const showClassLevel = isEducationIndustry && slotBookingForm.segment === 'High School' && 
    (slotBookingForm.category === 'Board' || slotBookingForm.category === 'Competitive');

  const getCurrentCategories = () => {
    if (!slotBookingForm.segment) return [];
    // For education, use education-specific category options
    if (isEducationIndustry) {
      return educationCategoryOptions[slotBookingForm.segment] || [];
    }
    // For non-education industries, use industry category mapping
    return industryCategoryMapping[currentIndustryKey]?.[slotBookingForm.segment] || [];
  };

  const getCurrentClassLevels = () => {
    if (!showClassLevel) return [];
    return classLevelOptions[slotBookingForm.category] || [];
  };

  const getCurrentDesignations = () => {
    // Education-specific logic
    if (isEducationIndustry) {
      if (slotBookingForm.segment === 'High School' && slotBookingForm.category === 'Board') {
        return classDesignationOptions[slotBookingForm.classLevel] || [];
      }
      if (slotBookingForm.segment === 'High School' && slotBookingForm.category === 'Competitive') {
        if (slotBookingForm.classLevel) {
          return classDesignationOptions[slotBookingForm.classLevel] || [];
        }
        return designationOptions['High School']?.['Competitive'] || [];
      }
      if (slotBookingForm.segment && slotBookingForm.category) {
        return designationOptions[slotBookingForm.segment]?.[slotBookingForm.category] || [];
      }
      return [];
    }
    // Non-education: use industry designation options
    const indDesignations = industryDesignationOptions[currentIndustryKey];
    if (indDesignations) {
      return indDesignations[slotBookingForm.segment] || indDesignations['_default'] || [];
    }
    return [];
  };
  
  // HR Documents state
  const [hrDocuments, setHrDocuments] = useState<{
    idProof: File | null;
    educationCertificate: File | null;
    addressProof: File | null;
    experienceLetter: File | null;
  }>({
    idProof: null,
    educationCertificate: null,
    addressProof: null,
    experienceLetter: null
  });
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  
  // Final Review state
  const [isCompletingFinalReview, setIsCompletingFinalReview] = useState(false);
  const [showFinalSummary, setShowFinalSummary] = useState(false);
  
  // HR Negotiation state
  const [hrNegotiationType, setHrNegotiationType] = useState<'call' | 'form' | null>(null);
  const [existingNegotiation, setExistingNegotiation] = useState<any>(null);
  const [isSubmittingNegotiation, setIsSubmittingNegotiation] = useState(false);
  const [negotiationForm, setNegotiationForm] = useState({
    expectedSalary: '',
    currentSalary: '',
    noticePeriod: '',
    preferredJoiningDate: '',
    relocationRequired: false,
    willingToRelocate: false,
    preferredLocation: '',
    additionalRequirements: '',
    preferredCallDate: '',
    preferredCallTime: ''
  });

  // Resend mail state
  const [resendingStage, setResendingStage] = useState<number | null>(null);

  // Course suggestions state
  const [courseSuggestions, setCourseSuggestions] = useState<any[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Refresh data when tab becomes visible (user comes back from interview page)
  const loadingRef = React.useRef(false);
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !loadingRef.current) {
        loadData();
      }
    };

    const handleFocus = () => {
      if (user && !loadingRef.current) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const loadData = async () => {
    try {
      loadingRef.current = true;
      setIsLoading(true);

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      setProfile(profileData);

      // Prefer an active unpaid/in-progress session so the lock is shown for the current attempt.
      // Fall back to the latest paid in-progress session, then latest completed session.
      const { data: sessionRows } = await supabase
        .from('mock_interview_sessions')
        .select('*')
        .eq('candidate_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const sessions = (sessionRows || []) as MockInterviewSession[];
      const prioritizedSession =
        sessions.find((session) => session.status === 'in_progress' && session.points_paid !== true) ||
        sessions.find((session) => session.status === 'in_progress' && session.points_paid === true) ||
        null;

      // Resolve stages from local pipeline config if session has pipeline info
      let resolvedStages: InterviewStage[] = [];
      const sessInterviewType = (prioritizedSession as any)?.interview_type || localStorage.getItem('mock_interview_type') || '';
      const sessPipelineType = (prioritizedSession as any)?.pipeline_type || localStorage.getItem('mock_pipeline_type') || '';

      if (sessInterviewType && sessPipelineType) {
        const configStages = (interviewPipelineConfig
          .find(t => t.value === sessInterviewType)
          ?.pipelineTypes.find(pt => pt.value === sessPipelineType)
          ?.stages || []).filter(s => s.name.toLowerCase() !== 'offer stage' && !s.name.toLowerCase().includes('slot booking'));
        if (configStages.length > 0) {
          resolvedStages = configStages.map((s, idx) => ({
            name: s.name,
            order: idx + 1,
            description: s.description || '',
            questionCount: s.name.toLowerCase().includes('coding') ? 1 : s.name.toLowerCase().includes('technical interview') ? 20 : s.name.toLowerCase().includes('mcq') || s.name.toLowerCase().includes('written') || s.name.toLowerCase().includes('assessment') ? 10 : 1,
            timePerQuestion: s.name.toLowerCase().includes('coding') ? 1800 : s.name.toLowerCase().includes('technical interview') ? 120 : s.name.toLowerCase().includes('demo') ? 600 : 90,
            passingScore: 65,
            stageType: s.name.toLowerCase().includes('slot booking') ? 'slot_booking' as const
              : s.name.toLowerCase().includes('coding test') && !s.name.toLowerCase().includes('slot') ? 'coding' as const
              : s.name.toLowerCase().includes('demo') ? 'demo' as const
              : s.name.toLowerCase().includes('feedback') ? 'feedback' as const
              : s.name.toLowerCase().includes('hr') ? 'hr_documents' as const
              : (s.name.toLowerCase() === 'final review' || s.name.toLowerCase() === 'offer stage') ? 'review' as const
              : s.name.toLowerCase().includes('instruction') || s.name.toLowerCase().includes('cv') || s.name.toLowerCase().includes('resume') ? 'email_info' as const
              : 'assessment' as const,
          }));
        }
      }

      // Fallback to edge function if no local config found
      if (resolvedStages.length === 0) {
        const { data: stagesData } = await supabase.functions.invoke('process-mock-interview-stage', {
          body: { action: 'get_stages' }
        });
        if (stagesData?.stages) {
          resolvedStages = stagesData.stages;
        }
      }

      setStages(resolvedStages);

      if (prioritizedSession) {
        setCurrentSession(prioritizedSession);

        // Restore pipeline selections from session if available
        if ((prioritizedSession as any).interview_type && !selectedMockInterviewType) {
          setSelectedMockInterviewType((prioritizedSession as any).interview_type);
        }
        if ((prioritizedSession as any).pipeline_type && !selectedMockPipelineType) {
          setSelectedMockPipelineType((prioritizedSession as any).pipeline_type);
        }
        
        // Get stage results for this session
        const { data: resultsData } = await supabase
          .from('mock_interview_stage_results')
          .select('*')
          .eq('session_id', prioritizedSession.id)
          .order('stage_order', { ascending: true });
        
        if (resultsData) {
          setStageResults(resultsData as StageResult[]);
        }
        
        // Load existing HR negotiation for this session
        const { data: negotiationData } = await supabase
          .from('hr_negotiations')
          .select('*')
          .eq('session_id', prioritizedSession.id)
          .maybeSingle();
        
        if (negotiationData) {
          setExistingNegotiation(negotiationData);
          setHrNegotiationType(negotiationData.negotiation_type as 'call' | 'form');
        } else {
          setExistingNegotiation(null);
          setHrNegotiationType(null);
        }
      } else {
        setCurrentSession(null);
        setStageResults([]);
        setExistingNegotiation(null);
        setHrNegotiationType(null);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  };

  const sendInterviewInstructionsEmail = async (sessionId: string) => {
    try {
      const appUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile.email,
          candidateName: profile.full_name,
          sessionId: sessionId,
          stageOrder: 1,
          stageName: 'Interview Instructions',
          stageDescription: 'Receive detailed interview process instructions and guidelines via email.',
          appUrl: appUrl
        }
      });

      if (error) throw error;
      console.log('Interview instructions email sent:', data);
      return true;
    } catch (error) {
      console.error('Error sending interview instructions email:', error);
      return false;
    }
  };

  const sendTechnicalAssessmentEmail = async (sessionId: string) => {
    try {
      const appUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile.email,
          candidateName: profile.full_name,
          sessionId: sessionId,
          stageOrder: 3,
          stageName: 'Technical Assessment',
          stageDescription: 'Answer 8 domain-specific questions to assess your technical knowledge. Your responses will be video recorded.',
          appUrl: appUrl
        }
      });

      if (error) throw error;
      console.log('Technical Assessment email sent:', data);
      return true;
    } catch (error) {
      console.error('Error sending Technical Assessment email:', error);
      return false;
    }
  };

  const completeInstructionsStage = async (sessionId: string) => {
    try {
      // Create stage result for Interview Instructions
      await supabase
        .from('mock_interview_stage_results')
        .insert({
          session_id: sessionId,
          stage_name: 'Interview Instructions',
          stage_order: 1,
          ai_score: 100,
          ai_feedback: 'Interview instructions sent successfully via email.',
          passed: true,
          completed_at: new Date().toISOString()
        });

      // Update session to move to next stage (Technical Assessment Slot Booking)
      await supabase
        .from('mock_interview_sessions')
        .update({ current_stage_order: 2 })
        .eq('id', sessionId);

      return true;
    } catch (error) {
      console.error('Error completing instructions stage:', error);
      return false;
    }
  };

  const startMockTest = async () => {
    if (!user || !profile) {
      toast.error("Please complete your profile first");
      return;
    }

    setIsStarting(true);
    try {
      // Create new session starting at stage 1 (Interview Instructions)
      const { data: session, error } = await supabase
        .from('mock_interview_sessions')
        .insert({
          candidate_id: user.id,
          status: 'in_progress',
          current_stage_order: 1,
          started_at: new Date().toISOString(),
          interview_type: selectedMockInterviewType || null,
          pipeline_type: selectedMockPipelineType || null,
          points_paid: false,
        } as any)
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(session);
      setStageResults([]);
      toast.success("Mock interview started! Begin with Interview Instructions.");

    } catch (error) {
      console.error('Error starting session:', error);
      toast.error("Failed to start mock test");
    } finally {
      setIsStarting(false);
    }
  };

  const startNewSession = async () => {
    if (!user || !profile) {
      toast.error("Please complete your profile first");
      return;
    }

    setIsStarting(true);
    try {
      // Create new session starting at stage 1, saving pipeline selection
      const { data: session, error } = await supabase
        .from('mock_interview_sessions')
        .insert({
          candidate_id: user.id,
          status: 'in_progress',
          current_stage_order: 1,
          started_at: new Date().toISOString(),
          interview_type: selectedMockInterviewType || null,
          pipeline_type: selectedMockPipelineType || null,
          points_paid: false,
        } as any)
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(session);
      setStageResults([]);
      toast.success("New interview started! Begin with Interview Instructions.");

    } catch (error) {
      console.error('Error starting new session:', error);
      toast.error("Failed to start new session");
    } finally {
      setIsStarting(false);
    }
  };

  const goToStage = (stageOrder: number) => {
    if (!currentSession) return;
    navigate(`/candidate/mock-interview/${currentSession.id}/${stageOrder}`);
  };

  // Generate available time slots for today and next 6 days
  const generateTimeSlots = () => {
    const slots: { date: string; time: string; value: string }[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    for (let day = 0; day <= 6; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      
      // Check if today, tomorrow, or other day
      const isToday = day === 0;
      const isTomorrow = day === 1;
      let dateStr: string;
      
      if (isToday) {
        dateStr = 'Today';
      } else if (isTomorrow) {
        dateStr = 'Tomorrow';
      } else {
        dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }
      
      // All available time slots
      const allSlots = ['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
      
      allSlots.forEach(time => {
        const slotDate = new Date(date);
        const [hours, minutesPart] = time.split(':');
        const minutes = parseInt(minutesPart);
        let hour = parseInt(hours);
        if (time.includes('PM') && hour !== 12) hour += 12;
        if (time.includes('AM') && hour === 12) hour = 0;
        slotDate.setHours(hour, minutes, 0, 0);
        
        // Skip past slots for today
        if (isToday && hour <= currentHour) {
          return;
        }
        
        slots.push({
          date: dateStr,
          time,
          value: slotDate.toISOString()
        });
      });
    }
    
    return slots;
  };

  const bookSlot = async () => {
    if (!selectedSlot || !currentSession) {
      toast.error("Please select a time slot");
      return;
    }

    setIsBookingSlot(true);
    try {
      const currentStage = currentSession.current_stage_order;
      const isFirstSlotBookingStage = isFirstSlotBooking(currentStage);

      // Determine the actual slot time
      let slotTime: Date;
      let slotLabel: string;
      
      if (selectedSlot === 'immediately') {
        slotTime = new Date();
        slotLabel = 'Immediately';
      } else if (selectedSlot === 'next_10_min') {
        slotTime = new Date(Date.now() + 10 * 60 * 1000);
        slotLabel = 'In 10 minutes';
      } else {
        slotTime = new Date(selectedSlot);
        slotLabel = slotTime.toLocaleString();
      }

      // Save slot booking
      const bookingType = isFirstSlotBookingStage ? 'technical_assessment' : 'demo_interview';
      const { error: bookingError } = await supabase
        .from('slot_bookings')
        .insert({
          candidate_id: user?.id,
          booking_type: bookingType,
          booking_date: slotTime.toISOString().split('T')[0],
          booking_time: slotTime.toTimeString().slice(0, 5),
          status: 'confirmed'
        });
      
      if (bookingError) {
        console.error('Error saving booking:', bookingError);
      }

      // Use actual stage name from displayStagesList for accurate labeling
      const currentStageName = displayStagesList.find(s => s.order === currentStage)?.name || 'Slot Booking';
      const nextStageOrder = currentStage + 1;
      const nextStageInfo = displayStagesList.find(s => s.order === nextStageOrder);
      const nextStageName = nextStageInfo?.name || 'Next Stage';
      const nextStageDescription = (nextStageInfo as any)?.desc || (nextStageInfo as any)?.description || 'Proceed to the next stage of your interview.';

      // Create stage result for slot booking
      await supabase
        .from('mock_interview_stage_results')
        .insert({
          session_id: currentSession.id,
          stage_name: currentStageName,
          stage_order: currentStage,
          ai_score: 100,
          ai_feedback: `${currentStageName} booked: ${slotLabel}`,
          passed: true,
          completed_at: new Date().toISOString()
        });

      // Update session to move to next stage
      await supabase
        .from('mock_interview_sessions')
        .update({ current_stage_order: nextStageOrder })
        .eq('id', currentSession.id);

      // Send invitation email for next stage (to candidate)
      await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile?.email,
          candidateName: profile?.full_name || 'Candidate',
          sessionId: currentSession.id,
          stageOrder: nextStageOrder,
          stageName: nextStageName,
          stageDescription: nextStageDescription,
          appUrl: window.location.origin,
          bookedSlot: slotLabel
        }
      });

      // Send notification to management about slot booking
      if (!isFirstSlotBookingStage) {
        console.log('[MockInterviewTab] Sending demo slot booking notification to management');
        await supabase.functions.invoke('send-management-notification', {
          body: {
            notificationType: 'demo_slot_booked',
            candidateName: profile?.full_name || 'Candidate',
            candidateEmail: profile?.email,
            sessionId: currentSession.id,
            bookingDetails: {
              date: slotTime.toISOString().split('T')[0],
              time: slotTime.toTimeString().slice(0, 5),
              slotLabel: slotLabel
            },
            appUrl: window.location.origin
          }
        });
        console.log('[MockInterviewTab] Management notification sent for demo slot booking');
      }

      toast.success(`Slot booked: ${slotLabel}! Check email for ${nextStageName}.`);
      setShowSlotBooking(false);
      setSelectedSlot('');
      // Reset form
      setSlotBookingForm({
        date: '',
        time: '',
        location: '',
        state: '',
        district: '',
        pincode: '',
        programme: '',
        segment: '',
        category: '',
        classLevel: '',
        designation: '',
        department: '',
        classType: '',
        subject: ''
      });
      loadData(); // Refresh the data
    } catch (error) {
      console.error('Error booking slot:', error);
      toast.error("Failed to book slot");
    } finally {
      setIsBookingSlot(false);
    }
  };

  // Handle file selection for HR documents
  const handleFileSelect = (docType: keyof typeof hrDocuments, file: File | null) => {
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      // Accept all file formats - no type restriction
    }
    setHrDocuments(prev => ({ ...prev, [docType]: file }));
  };

  // Submit HR documents
  const submitHRDocuments = async () => {
    if (!currentSession || !profile) return;
    
    const uploadedDocs = Object.entries(hrDocuments).filter(([_, file]) => file !== null);
    if (uploadedDocs.length < 2) {
      toast.error('Please upload at least ID Proof and Education Certificate');
      return;
    }
    
    if (!hrDocuments.idProof || !hrDocuments.educationCertificate) {
      toast.error('ID Proof and Education Certificate are required');
      return;
    }

    setUploadingDocuments(true);
    try {
      // Upload files using edge function (bypasses RLS)
      const uploadedFiles: Record<string, string> = {};
      
      for (const [docType, file] of Object.entries(hrDocuments)) {
        if (file) {
          // Get the current session token
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;
          
          if (!accessToken) {
            throw new Error('Not authenticated');
          }
          
          // Upload via edge function
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-resume`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
              body: formData,
            }
          );
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
          }
          
          const { url } = await response.json();
          uploadedFiles[docType] = url;
        }
      }

      // Create stage result for HR Documents
      await supabase
        .from('mock_interview_stage_results')
        .insert({
          session_id: currentSession.id,
          stage_name: 'HR Documents',
          stage_order: 7,
          ai_score: 100,
          ai_feedback: `Documents submitted successfully: ${Object.keys(uploadedFiles).join(', ')}`,
          passed: true,
          completed_at: new Date().toISOString(),
          answers: uploadedFiles
        });

      // Update session to next stage
      await supabase
        .from('mock_interview_sessions')
        .update({ current_stage_order: 8 })
        .eq('id', currentSession.id);

      // Send confirmation email
      await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile?.email,
          candidateName: profile?.full_name || 'Candidate',
          sessionId: currentSession.id,
          stageOrder: 7,
          stageName: 'HR Documents Submitted',
          stageDescription: 'Your HR documents have been submitted successfully.',
          appUrl: window.location.origin,
          documentsUploaded: Object.keys(uploadedFiles)
        }
      });

      // Send next stage email (Final Review)
      await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile?.email,
          candidateName: profile?.full_name || 'Candidate',
          sessionId: currentSession.id,
          stageOrder: 8,
          stageName: 'Final Review',
          stageDescription: 'Your complete interview journey review and final decision.',
          appUrl: window.location.origin
        }
      });

      toast.success('Documents submitted successfully! Proceeding to Final Review.');
      setHrDocuments({
        idProof: null,
        educationCertificate: null,
        addressProof: null,
        experienceLetter: null
      });
      setExpandedStage(null);
      loadData();
    } catch (error) {
      console.error('Error submitting documents:', error);
      toast.error('Failed to submit documents');
    } finally {
      setUploadingDocuments(false);
    }
  };

  // Complete Final Review (Stage 7) and mark interview as completed
  const completeFinalReview = async () => {
    if (!currentSession || !profile) return;
    
    setIsCompletingFinalReview(true);
    try {
      // Calculate overall score from all stages (excluding stages without meaningful scores)
      const scoredResults = stageResults.filter(r => 
        r.ai_score !== undefined && 
        r.stage_order !== 1 && // Interview Instructions
        !isSlotBookingOrder(r.stage_order) // Slot Booking stages
      );
      const overallScore = scoredResults.length > 0 
        ? scoredResults.reduce((sum, r) => sum + (r.ai_score || 0), 0) / scoredResults.length 
        : 0;

      // Determine final decision based on overall score
      const passed = overallScore >= 60;
      const decision = passed ? 'Selected for Next Round' : 'Interview Complete - Under Review';
      
      // Collect all strengths and improvements from all stages
      const allStrengths = stageResults.flatMap(r => r.strengths || []).slice(0, 5);
      const allImprovements = stageResults.flatMap(r => r.improvements || []).slice(0, 5);

      // Create stage result for Final Review
      await supabase
        .from('mock_interview_stage_results')
        .insert({
          session_id: currentSession.id,
          stage_name: 'All Reviews',
          stage_order: 8,
          ai_score: Math.round(overallScore),
          ai_feedback: `Interview journey completed! Overall performance: ${overallScore.toFixed(1)}%. ${decision}.`,
          passed: passed,
          completed_at: new Date().toISOString(),
          strengths: allStrengths,
          improvements: allImprovements
        });

      // Update session as completed
      await supabase
        .from('mock_interview_sessions')
        .update({ 
          status: 'completed',
          overall_score: Math.round(overallScore),
          overall_feedback: decision,
          completed_at: new Date().toISOString()
        })
        .eq('id', currentSession.id);

      // Send completion email
      await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile?.email,
          candidateName: profile?.full_name || 'Candidate',
          sessionId: currentSession.id,
          stageOrder: 8,
          stageName: 'Interview Completed',
          stageDescription: `Congratulations! You have completed all interview stages. Your overall score: ${overallScore.toFixed(1)}%. Decision: ${decision}`,
          appUrl: window.location.origin,
          isCompletion: true,
          overallScore: Math.round(overallScore),
          decision: decision
        }
      });

      toast.success('Interview completed! Check your email for the final summary.');
      setShowFinalSummary(true);
      loadData();
    } catch (error) {
      console.error('Error completing final review:', error);
      toast.error('Failed to complete final review');
    } finally {
      setIsCompletingFinalReview(false);
    }
  };

  // Load demo results - auto-complete all stages with sample review data
  const loadDemoResults = async () => {
    if (!user || !profile) {
      toast.error("Please complete your profile first");
      return;
    }

    setIsStarting(true);
    try {
      // Create a new session marked as completed
      const { data: session, error: sessionError } = await supabase
        .from('mock_interview_sessions')
        .insert({
          candidate_id: user.id,
          status: 'completed',
          current_stage_order: 8,
          started_at: new Date(Date.now() - 3600000).toISOString(),
          completed_at: new Date().toISOString(),
          overall_score: 72,
          overall_feedback: 'Selected for Next Round'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Insert all sample stage results
      const sampleResults = getSampleMockInterviewStageResults(session.id);
      
      for (const result of sampleResults) {
        const { error: insertError } = await supabase
          .from('mock_interview_stage_results')
          .insert({
            session_id: result.session_id,
            stage_name: result.stage_name,
            stage_order: result.stage_order,
            ai_score: result.ai_score,
            ai_feedback: result.ai_feedback,
            passed: result.passed,
            strengths: result.strengths,
            improvements: result.improvements,
            completed_at: result.completed_at,
            time_taken_seconds: result.time_taken_seconds
          });
        
        if (insertError) {
          console.error(`Error inserting stage ${result.stage_order}:`, insertError);
        }
      }

      toast.success("Demo results loaded! All stages completed with sample reviews.");
      loadData();
    } catch (error) {
      console.error('Error loading demo results:', error);
      toast.error("Failed to load demo results");
    } finally {
      setIsStarting(false);
    }
  };

  const submitHRNegotiation = async () => {
    if (!currentSession || !profile || !user || !hrNegotiationType) return;
    
    setIsSubmittingNegotiation(true);
    try {
      const negotiationData: any = {
        session_id: currentSession.id,
        candidate_id: user.id,
        negotiation_type: hrNegotiationType,
        status: hrNegotiationType === 'call' ? 'call_requested' : 'pending'
      };

      if (hrNegotiationType === 'form') {
        negotiationData.expected_salary = negotiationForm.expectedSalary ? parseFloat(negotiationForm.expectedSalary) : null;
        negotiationData.current_salary = negotiationForm.currentSalary ? parseFloat(negotiationForm.currentSalary) : null;
        negotiationData.notice_period = negotiationForm.noticePeriod || null;
        negotiationData.preferred_joining_date = negotiationForm.preferredJoiningDate || null;
        negotiationData.relocation_required = negotiationForm.relocationRequired;
        negotiationData.willing_to_relocate = negotiationForm.willingToRelocate;
        negotiationData.preferred_location = negotiationForm.preferredLocation || null;
        negotiationData.additional_requirements = negotiationForm.additionalRequirements || null;
      } else {
        negotiationData.preferred_call_date = negotiationForm.preferredCallDate || null;
        negotiationData.preferred_call_time = negotiationForm.preferredCallTime || null;
      }

      const { data, error } = await supabase
        .from('hr_negotiations')
        .insert(negotiationData)
        .select()
        .single();

      if (error) throw error;

      // Create stage result for Final Review (HR)
      await supabase
        .from('mock_interview_stage_results')
        .insert({
          session_id: currentSession.id,
          stage_name: 'Final Review (HR)',
          stage_order: 7,
          ai_score: 100,
          ai_feedback: hrNegotiationType === 'call' 
            ? `HR call requested for ${negotiationForm.preferredCallDate} at ${negotiationForm.preferredCallTime}. Waiting for HR to schedule.`
            : `Negotiation details submitted. Expected salary: ₹${negotiationForm.expectedSalary}. Awaiting HR review.`,
          passed: true,
          completed_at: new Date().toISOString()
        });

      // Update session to next stage
      await supabase
        .from('mock_interview_sessions')
        .update({ current_stage_order: 8 })
        .eq('id', currentSession.id);

      setExistingNegotiation(data);
      toast.success(hrNegotiationType === 'call' 
        ? 'HR call request submitted! HR team will contact you shortly.'
        : 'Negotiation details submitted! HR team will review and respond.');
      loadData();
    } catch (error) {
      console.error('Error submitting HR negotiation:', error);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsSubmittingNegotiation(false);
    }
  };

  const getStageStatus = (stageOrder: number) => {
    if (!currentSession) return 'upcoming';
    const result = stageResults.find(r => r.stage_order === stageOrder);
    if (result?.completed_at) return 'completed';
    if (stageOrder === currentSession.current_stage_order) return 'current';
    if (stageOrder < currentSession.current_stage_order) return 'completed';
    return 'upcoming'; // Changed from 'locked' to 'upcoming' - no stage is locked
  };

  const getStageIcon = (stageOrder: number) => {
    // Use displayStagesList name to pick icons dynamically instead of hardcoded order
    const stageName = (displayStagesList.find(s => s.order === stageOrder)?.name || '').toLowerCase();
    if (stageName.includes('instruction') || stageName.includes('guideline')) return Mail;
    if (stageName.includes('slot booking')) return Calendar;
    if (stageName.includes('coding') || stageName.includes('mcq') || stageName.includes('technical') || stageName.includes('written') || stageName.includes('assessment') || stageName.includes('challenge')) return Code;
    if (stageName.includes('demo') && !stageName.includes('feedback')) return Monitor;
    if (stageName.includes('feedback') || stageName.includes('result')) return BarChart3;
    if (stageName.includes('hr') || stageName.includes('document')) return FileText;
    if (stageName === 'final review' || stageName === 'offer stage') return ListChecks;
    if (stageName.includes('interview') || stageName.includes('discussion') || stageName.includes('live') || stageName.includes('review')) return Video;
    if (stageName.includes('negotiation')) return MessageSquare;
    // Fallback by order
    switch (stageOrder) {
      case 1: return Mail;
      case 2: return Calendar;
      case 3: return Code;
      default: return Brain;
    }
  };

  // Generate course suggestions based on mock test performance
  const generateCourseSuggestions = () => {
    const improvements = stageResults.flatMap(r => r.improvements || []);
    // Skip stage_order 1 (instructions) and any stage whose name includes 'slot booking'
    // We cannot reference displayStagesList here (declared later), so we check stageResults names directly
    const isSlotBookingResult = (r: any) => {
      const stageName = (r.stage_name || '').toLowerCase();
      return stageName.includes('slot booking');
    };
    const scorableResults = stageResults.filter(r => r.ai_score !== undefined && r.stage_order !== 1 && !isSlotBookingResult(r));
    const overallScore = scorableResults.length > 0 
      ? scorableResults.reduce((sum, r) => sum + (r.ai_score || 0), 0) / scorableResults.length
      : 0;

    const courses: any[] = [];

    // Communication-related improvements
    if (improvements.some(i => i.toLowerCase().includes('communication') || i.toLowerCase().includes('speaking') || i.toLowerCase().includes('voice') || i.toLowerCase().includes('clarity'))) {
      courses.push({
        id: 'comm-1',
        title: 'Effective Communication for Educators',
        description: 'Master clear and impactful communication techniques for teaching.',
        duration: '6 hours',
        level: 'Beginner',
        rating: 4.7,
        category: 'Communication Skills',
        url: 'https://skillory.in'
      });
    }

    // Subject knowledge improvements
    if (improvements.some(i => i.toLowerCase().includes('knowledge') || i.toLowerCase().includes('content') || i.toLowerCase().includes('subject') || i.toLowerCase().includes('depth'))) {
      courses.push({
        id: 'subj-1',
        title: 'Deep Dive into Subject Mastery',
        description: 'Strengthen your subject knowledge with expert-led courses.',
        duration: '12 hours',
        level: 'Intermediate',
        rating: 4.8,
        category: 'Subject Expertise',
        url: 'https://skillory.in'
      });
    }

    // Teaching/presentation improvements
    if (improvements.some(i => i.toLowerCase().includes('teaching') || i.toLowerCase().includes('presentation') || i.toLowerCase().includes('demo') || i.toLowerCase().includes('engagement') || i.toLowerCase().includes('interactive'))) {
      courses.push({
        id: 'teach-1',
        title: 'Modern Teaching Techniques',
        description: 'Learn interactive teaching methods to engage students effectively.',
        duration: '8 hours',
        level: 'Intermediate',
        rating: 4.6,
        category: 'Teaching Methods',
        url: 'https://skillory.in'
      });
      courses.push({
        id: 'teach-2',
        title: 'Presentation Skills Masterclass',
        description: 'Deliver compelling presentations and demonstrations with confidence.',
        duration: '5 hours',
        level: 'Beginner',
        rating: 4.5,
        category: 'Presentation Skills',
        url: 'https://skillory.in'
      });
    }

    // Time management improvements
    if (improvements.some(i => i.toLowerCase().includes('time') || i.toLowerCase().includes('pace') || i.toLowerCase().includes('planning'))) {
      courses.push({
        id: 'time-1',
        title: 'Time Management for Teachers',
        description: 'Optimize your lesson planning and classroom time management.',
        duration: '4 hours',
        level: 'Beginner',
        rating: 4.4,
        category: 'Productivity',
        url: 'https://skillory.in'
      });
    }

    // Confidence improvements
    if (improvements.some(i => i.toLowerCase().includes('confidence') || i.toLowerCase().includes('nervous') || i.toLowerCase().includes('calm'))) {
      courses.push({
        id: 'conf-1',
        title: 'Building Confidence in the Classroom',
        description: 'Overcome nervousness and project confidence while teaching.',
        duration: '3 hours',
        level: 'Beginner',
        rating: 4.6,
        category: 'Personal Development',
        url: 'https://skillory.in'
      });
    }

    // Low score - general improvement courses
    if (overallScore < 70 && courses.length === 0) {
      courses.push({
        id: 'gen-1',
        title: 'Complete Teacher Training Program',
        description: 'Comprehensive program covering all aspects of effective teaching.',
        duration: '20 hours',
        level: 'Beginner',
        rating: 4.8,
        category: 'Teaching Foundation',
        url: 'https://skillory.in'
      });
      courses.push({
        id: 'gen-2',
        title: 'Interview Preparation for Educators',
        description: 'Practice and perfect your teaching interview skills.',
        duration: '6 hours',
        level: 'Intermediate',
        rating: 4.5,
        category: 'Career Development',
        url: 'https://skillory.in'
      });
    }

    // Add default courses if none matched
    if (courses.length === 0) {
      courses.push({
        id: 'def-1',
        title: 'Advanced Teaching Strategies',
        description: 'Take your teaching to the next level with advanced methodologies.',
        duration: '10 hours',
        level: 'Advanced',
        rating: 4.7,
        category: 'Professional Growth',
        url: 'https://skillory.in'
      });
    }

    setCourseSuggestions(courses);
  };

  // Generate course suggestions when stage results change
  useEffect(() => {
    // Generate suggestions if there are any completed stages with improvements
    const hasImprovements = stageResults.some(r => r.improvements && r.improvements.length > 0);
    if (stageResults.length > 0 && hasImprovements) {
      generateCourseSuggestions();
    }
  }, [stageResults]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Derive industry category from profile
  const getIndustryCategory = () => {
    if (!profile) return 'education';
    const cat = (profile.category || '').toLowerCase();
    const role = (profile.preferred_role || '').toLowerCase();
    const seg = (profile.segment || '').toLowerCase();
    if (cat.includes('it_corporate') || cat.includes('it corporate') || role.includes('software') || role.includes('developer') || role.includes('engineer') || seg.includes('it')) return 'it_corporate';
    if (cat.includes('non_it') || cat.includes('non-it') || cat.includes('non it corporate')) return 'non_it_corporate';
    if (cat.includes('legal') || role.includes('lawyer') || role.includes('legal')) return 'legal';
    if (cat.includes('doctor') || role.includes('doctor') || role.includes('physician')) return 'doctor';
    return 'education'; // default
  };

  // Get IT-specific pipeline stages based on skills/domain
  const getITPipelineStages = () => {
    const role = (profile?.preferred_role || '').toLowerCase();
    const skills = (profile?.primary_subject || profile?.segment || '').toLowerCase();

    // Full Stack / MERN / Frontend / Backend domains
    const isFrontend = skills.includes('frontend') || skills.includes('react') || skills.includes('angular') || skills.includes('vue');
    const isBackend = skills.includes('backend') || skills.includes('java') || skills.includes('python') || skills.includes('node');
    const isFullStack = skills.includes('full stack') || skills.includes('fullstack') || skills.includes('mern') || skills.includes('mean');
    const isDevOps = skills.includes('devops') || skills.includes('aws') || skills.includes('cloud') || skills.includes('azure');
    const isData = skills.includes('data') || skills.includes('machine learning') || skills.includes('ai') || skills.includes('ml');

    if (isDevOps) {
      return [
        { order: 1, name: 'Interview Instructions', icon: Mail, desc: 'Receive guidelines & instructions via email' },
        { order: 2, name: 'MCQ Technical Test', icon: Code, desc: 'Cloud, DevOps tools & infrastructure MCQs' },
        { order: 3, name: 'Scripting / IaC Challenge', icon: Code, desc: 'Bash, Terraform, or Ansible scenario tasks' },
        { order: 4, name: 'System Design (Infrastructure)', icon: Monitor, desc: 'Design scalable cloud architecture' },
        { order: 5, name: 'Demo Slot Booking', icon: Calendar, desc: 'Book slot for live technical demo' },
        { order: 6, name: 'Live Technical Demo', icon: Video, desc: 'Demonstrate CI/CD pipeline setup' },
        { order: 7, name: 'HR Round', icon: FileText, desc: 'Compensation & culture discussion' },
        { order: 8, name: 'Final Review', icon: ListChecks, desc: 'Overall assessment & offer decision' },
      ];
    }
    if (isData) {
      return [
        { order: 1, name: 'Interview Instructions', icon: Mail, desc: 'Receive guidelines & instructions via email' },
        { order: 2, name: 'MCQ Technical Test', icon: Code, desc: 'Statistics, ML algorithms & data concepts' },
        { order: 3, name: 'Coding / Analysis Challenge', icon: Code, desc: 'Python/SQL data analysis tasks' },
        { order: 4, name: 'Case Study Presentation', icon: Monitor, desc: 'Present a data-driven business case' },
        { order: 5, name: 'Demo Slot Booking', icon: Calendar, desc: 'Book slot for portfolio presentation' },
        { order: 6, name: 'Portfolio Demo', icon: Video, desc: 'Walk through real projects & notebooks' },
        { order: 7, name: 'HR Round', icon: FileText, desc: 'Compensation & team culture fit' },
        { order: 8, name: 'Final Review', icon: ListChecks, desc: 'Overall assessment & offer decision' },
      ];
    }
    if (isFullStack) {
      return [
        { order: 1, name: 'Interview Instructions', icon: Mail, desc: 'Receive guidelines & instructions via email' },
        { order: 2, name: 'MCQ Technical Test', icon: Code, desc: 'Full stack concepts, frameworks & DB MCQs' },
        { order: 3, name: 'Coding Challenge', icon: Code, desc: 'Build a mini feature (frontend + backend)' },
        { order: 4, name: 'System Design Round', icon: Monitor, desc: 'Design a scalable web application' },
        { order: 5, name: 'Demo Slot Booking', icon: Calendar, desc: 'Book slot for live project demo' },
        { order: 6, name: 'Live Project Demo', icon: Video, desc: 'Demonstrate your project end-to-end' },
        { order: 7, name: 'HR Round', icon: FileText, desc: 'Compensation, culture & role discussion' },
        { order: 8, name: 'Final Review', icon: ListChecks, desc: 'Overall assessment & offer decision' },
      ];
    }
    if (isFrontend) {
      return [
        { order: 1, name: 'Interview Instructions', icon: Mail, desc: 'Receive guidelines & instructions via email' },
        { order: 2, name: 'MCQ Technical Test', icon: Code, desc: 'JavaScript, CSS, React/Angular/Vue MCQs' },
        { order: 3, name: 'UI Coding Challenge', icon: Code, desc: 'Build a responsive UI component' },
        { order: 4, name: 'Code Review Round', icon: Monitor, desc: 'Review and improve given code snippets' },
        { order: 5, name: 'Demo Slot Booking', icon: Calendar, desc: 'Book slot for portfolio review' },
        { order: 6, name: 'Portfolio Demo', icon: Video, desc: 'Walk through your projects & code' },
        { order: 7, name: 'HR Round', icon: FileText, desc: 'Compensation, culture & role discussion' },
        { order: 8, name: 'Final Review', icon: ListChecks, desc: 'Overall assessment & offer decision' },
      ];
    }
    if (isBackend) {
      return [
        { order: 1, name: 'Interview Instructions', icon: Mail, desc: 'Receive guidelines & instructions via email' },
        { order: 2, name: 'MCQ Technical Test', icon: Code, desc: 'Backend concepts, APIs, DB & system design MCQs' },
        { order: 3, name: 'Coding Challenge', icon: Code, desc: 'DSA problem solving & API design task' },
        { order: 4, name: 'System Design Round', icon: Monitor, desc: 'Design a distributed backend system' },
        { order: 5, name: 'Demo Slot Booking', icon: Calendar, desc: 'Book slot for technical discussion' },
        { order: 6, name: 'Technical Discussion', icon: Video, desc: 'Deep-dive into architecture & past projects' },
        { order: 7, name: 'HR Round', icon: FileText, desc: 'Compensation, culture & role discussion' },
        { order: 8, name: 'Final Review', icon: ListChecks, desc: 'Overall assessment & offer decision' },
      ];
    }
    // Generic IT / Software Engineer
    return [
      { order: 1, name: 'Interview Instructions', icon: Mail, desc: 'Receive guidelines & instructions via email' },
      { order: 2, name: 'MCQ Technical Test', icon: Code, desc: 'Core CS concepts, algorithms & domain MCQs' },
      { order: 3, name: 'Coding Challenge', icon: Code, desc: 'Solve DSA & domain-specific coding problems' },
      { order: 4, name: 'System Design Round', icon: Monitor, desc: 'Design a real-world scalable system' },
      { order: 5, name: 'Demo Slot Booking', icon: Calendar, desc: 'Book slot for live technical interview' },
      { order: 6, name: 'Live Technical Interview', icon: Video, desc: 'Pair programming & technical discussion' },
      { order: 7, name: 'HR Round', icon: FileText, desc: 'Compensation, culture & role discussion' },
      { order: 8, name: 'Final Review', icon: ListChecks, desc: 'Overall assessment & offer decision' },
    ];
  };

  const industryCategory = getIndustryCategory();
  const isITCorporate = industryCategory === 'it_corporate';

  // Helper: detect slot booking stages by name (not hardcoded order)
  const isSlotBookingStage = (stageName: string) => stageName.toLowerCase().includes('slot booking');

  // ── Interview Type → Pipeline Type → Role (matches vacancy creation) ──

  // Derive available pipeline types for the selected interview type
  const mockPipelineTypes = selectedMockInterviewType
    ? (interviewPipelineConfig.find(t => t.value === selectedMockInterviewType)?.pipelineTypes || [])
    : [];

  // Derive available roles for the selected pipeline type
  const mockRoleKey = `${selectedMockInterviewType}.${selectedMockPipelineType}`;
  const mockRoleOptions = selectedMockPipelineType
    ? (pipelineRoleOptions[mockRoleKey] || defaultRoleOptions)
    : [];

  // Get the pipeline stages for the selected pipeline type (for preview)
  const selectedPipelineStages = selectedMockInterviewType && selectedMockPipelineType
    ? (interviewPipelineConfig
        .find(t => t.value === selectedMockInterviewType)
        ?.pipelineTypes.find(pt => pt.value === selectedMockPipelineType)
        ?.stages || [])
    : [];

  // Get the current pipeline's display stages
  const getDisplayStages = () => {
    const stripOffer = <T extends { name: string }>(arr: T[]) => arr.filter(s => s.name.toLowerCase() !== 'offer stage' && !s.name.toLowerCase().includes('slot booking'));
    // Priority 1: Use stages from the selected pipeline dropdown (most accurate)
    if (selectedPipelineStages.length > 0) {
      return stripOffer(selectedPipelineStages).map((s, idx) => ({
        name: s.name,
        order: idx + 1,
        description: (s as any).description || '',
      }));
    }
    // Priority 2: If user selected an interview type via dropdown (even without pipeline type),
    // try to derive from the selected interview type config
    if (selectedMockInterviewType && selectedMockPipelineType) {
      const configStages = interviewPipelineConfig
        .find(t => t.value === selectedMockInterviewType)
        ?.pipelineTypes.find(pt => pt.value === selectedMockPipelineType)
        ?.stages || [];
      if (configStages.length > 0) {
        return stripOffer(configStages).map((s, idx) => ({
          name: s.name,
          order: idx + 1,
          description: (s as any).description || '',
        }));
      }
    }
    // Priority 3: Derive from profile category
    if (isITCorporate) return stripOffer(getITPipelineStages());
    // Priority 4: Use mock interview type from localStorage to check if it's non-education
    if (selectedMockInterviewType && selectedMockInterviewType !== 'education') {
      const configType = interviewPipelineConfig.find(t => t.value === selectedMockInterviewType);
      if (configType?.pipelineTypes?.[0]?.stages) {
        return stripOffer(configType.pipelineTypes[0].stages).map((s, idx) => ({
          name: s.name,
          order: idx + 1,
          description: (s as any).description || '',
        }));
      }
    }
    return stripOffer(stages).map((s, idx) => ({ name: s.name, order: idx + 1, description: '' }));
  };
  const displayStagesList = getDisplayStages();
  // Find slot booking stage orders dynamically
  const slotBookingStageOrders = displayStagesList
    .filter(s => isSlotBookingStage(s.name))
    .map(s => s.order);
  const isSlotBookingOrder = (order: number) => slotBookingStageOrders.includes(order);
  // First slot booking = technical assessment slot, others = demo slot
  const firstSlotBookingOrder = slotBookingStageOrders[0] ?? -1;
  const isFirstSlotBooking = (order: number) => order === firstSlotBookingOrder;

  // Check if all 3 fields are selected
  const isMockRoleSelected = !!selectedMockInterviewType && !!selectedMockPipelineType && !!selectedMockRole;

  // Selected role label for display
  const selectedMockRoleLabel = mockRoleOptions.find(r => r.value === selectedMockRole)?.label || selectedMockRole;
  const selectedInterviewTypeLabel = interviewPipelineConfig.find(t => t.value === selectedMockInterviewType)?.label || '';
  const selectedPipelineTypeLabel = mockPipelineTypes.find(pt => pt.value === selectedMockPipelineType)?.label || '';

  // No session - Show start screen with interview type selection
  if (!currentSession) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Mock Interview Practice
          </h2>
          <p className="text-muted-foreground mt-2">
            Practice your interview skills with AI-powered mock tests
          </p>

          {/* Profile-based pipeline info */}
          {profile && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {profile.category && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Building2 className="h-3 w-3" />
                  {profile.category.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </Badge>
              )}
              {profile.preferred_role && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <UserPlus className="h-3 w-3" />
                  {profile.preferred_role}
                </Badge>
              )}
              {(profile.primary_subject || profile.segment) && (
                <Badge variant="outline" className="gap-1 text-xs text-primary border-primary/40">
                  <Code className="h-3 w-3" />
                  {profile.primary_subject || profile.segment}
                </Badge>
              )}
            </div>
          )}
          
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadDemoResults}
              disabled={isStarting}
              className="gap-2 text-xs"
            >
              {isStarting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListChecks className="h-3 w-3" />}
              Load Demo Results (All Stages)
            </Button>
          </div>
        </div>

        {/* ── Role Selector: Interview Type → Pipeline Type → Role (matches vacancy creation) ── */}
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Role Selection Card */}
          <Card className="border-primary/20">
            <CardContent className="pt-5 space-y-5">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Select Your Interview Details
              </p>

              {/* Search Position */}
              <div className="space-y-1.5 relative">
                <Label className="text-sm font-medium">Search Position</Label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={positionQuery}
                    onChange={(e) => { setPositionQuery(e.target.value); setPositionFocused(true); }}
                    onFocus={() => setPositionFocused(true)}
                    onBlur={() => setTimeout(() => setPositionFocused(false), 150)}
                    placeholder="Search e.g. React Developer, Math Teacher, UX Designer"
                    className="pl-9 h-10"
                  />
                </div>
                {positionFocused && positionQuery.trim() && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-md border bg-popover shadow-md">
                    {filteredPositions.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No matching positions</div>
                    ) : filteredPositions.map((p, i) => (
                      <button
                        key={`${p.interviewType}.${p.pipelineType}.${p.role}-${i}`}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); applyPosition(p); }}
                        className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-b-0"
                      >
                        <div className="text-sm font-medium">{p.roleLabel}</div>
                        <div className="text-xs text-muted-foreground">{p.interviewLabel} · {p.pipelineLabel}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Interview Type */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Interview Type <span className="text-destructive">*</span></Label>
                <Select
                  value={selectedMockInterviewType}
                  onValueChange={(v) => {
                    setSelectedMockInterviewType(v);
                    setSelectedMockPipelineType('');
                    setSelectedMockRole('');
                  }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select interview type" />
                  </SelectTrigger>
                  <SelectContent>
                    {interviewPipelineConfig.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pipeline Type */}
              {selectedMockInterviewType && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Pipeline Type <span className="text-destructive">*</span></Label>
                  <Select
                    value={selectedMockPipelineType}
                    onValueChange={(v) => {
                      setSelectedMockPipelineType(v);
                      setSelectedMockRole('');
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select pipeline type" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPipelineTypes.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Role */}
              {selectedMockPipelineType && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Role <span className="text-destructive">*</span></Label>
                  <Select value={selectedMockRole} onValueChange={setSelectedMockRole}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockRoleOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Selection Summary */}
              {isMockRoleSelected && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t">
                  <Badge variant="secondary" className="text-xs">{selectedInterviewTypeLabel}</Badge>
                  <Badge variant="secondary" className="text-xs">{selectedPipelineTypeLabel}</Badge>
                  <Badge className="text-xs">{selectedMockRoleLabel}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interview Stages Preview — dynamic based on selection */}
          <Card>
            <CardContent className="py-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {selectedPipelineStages.length > 0 ? `Interview Stages — ${selectedPipelineTypeLabel}` : 'Interview Stages'}
              </p>
              <div className="grid gap-1.5">
                {(selectedPipelineStages.length > 0 ? selectedPipelineStages : [
                  { order: 1, name: "Select Interview Type above to see stages" },
                ]).map((stage) => (
                  <div key={stage.order} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                      {stage.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{stage.name}</span>
                      {'description' in stage && (
                        <p className="text-xs text-muted-foreground truncate">{(stage as any).description}</p>
                      )}
                    </div>
                    {'isAutomated' in stage && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {(stage as any).isAutomated ? 'Auto' : 'Manual'}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Start Button */}
          <div className="space-y-2">
            <Button
              onClick={startMockTest}
              disabled={isStarting || !isMockRoleSelected}
              className="w-full gap-2"
              size="lg"
            >
              {isStarting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              {!isMockRoleSelected ? 'Select All Fields to Continue' : `Attend Mock Test — ${selectedMockRoleLabel}`}
            </Button>
            <div className="flex justify-center">
              <Badge variant="secondary" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                Estimated time: 45-60 minutes
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active or completed session - Show progress tracker with stages
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Mock Interview
          </h2>
          <p className="text-muted-foreground">
            {currentSession.status === 'completed' 
              ? 'Interview completed! View your results below.'
              : currentSession.status === 'failed'
                ? 'Interview ended. Start a new one to try again.'
                : 'Complete each stage to advance to the next round.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => loadData()} disabled={isLoading} variant="outline" size="icon" className="h-10 w-10" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 text-destructive hover:bg-destructive/10"
            title="Reset Interview"
            disabled={isLoading}
            onClick={async () => {
              if (!currentSession) return;
              const confirmed = window.confirm("Are you sure you want to reset? This will clear all progress and start the interview from the beginning.");
              if (!confirmed) return;
              try {
                setIsLoading(true);
                // Delete stage results
                await supabase.from("mock_interview_stage_results").delete().eq("session_id", currentSession.id);
                // Reset session to initial state
                await supabase.from("mock_interview_sessions").update({
                  current_stage_order: 1,
                  stages_completed: [],
                  overall_score: 0,
                  overall_feedback: null,
                  status: "in_progress",
                  completed_at: null,
                  started_at: new Date().toISOString(),
                }).eq("id", currentSession.id);
                setStageResults([]);
                setCurrentSession({ ...currentSession, current_stage_order: 1, overall_score: 0, overall_feedback: '', status: "in_progress", completed_at: undefined });
                toast.success("Interview reset! Starting from the beginning.");
                await loadData();
              } catch (err) {
                console.error("Reset error:", err);
                toast.error("Failed to reset interview.");
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* Search Position (inline) */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={positionQuery}
              onChange={(e) => { setPositionQuery(e.target.value); setPositionFocused(true); }}
              onFocus={() => setPositionFocused(true)}
              onBlur={() => setTimeout(() => setPositionFocused(false), 150)}
              placeholder="Search position..."
              className="pl-8 h-10 w-[220px] text-xs"
            />
            {positionFocused && positionQuery.trim() && (
              <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-md border bg-popover shadow-md min-w-[280px]">
                {filteredPositions.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No matching positions</div>
                ) : filteredPositions.map((p, i) => (
                  <button
                    key={`${p.interviewType}.${p.pipelineType}.${p.role}-${i}`}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); applyPosition(p); }}
                    className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-b-0"
                  >
                    <div className="text-sm font-medium">{p.roleLabel}</div>
                    <div className="text-xs text-muted-foreground">{p.interviewLabel} · {p.pipelineLabel}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3 inline selectors beside refresh: Interview Type → Pipeline Type → Role (matches vacancy creation) */}
          <Select
            value={selectedMockInterviewType}
            onValueChange={(v) => {
              setSelectedMockInterviewType(v);
              setSelectedMockPipelineType('');
              setSelectedMockRole('');
            }}
          >
            <SelectTrigger className="h-10 w-auto min-w-[200px] text-xs">
              <SelectValue placeholder="Interview Type" />
            </SelectTrigger>
            <SelectContent>
              {interviewPipelineConfig.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedMockInterviewType && (
            <Select
              value={selectedMockPipelineType}
              onValueChange={(v) => {
                setSelectedMockPipelineType(v);
                setSelectedMockRole('');
              }}
            >
              <SelectTrigger className="h-10 w-auto min-w-[160px] text-xs">
                <SelectValue placeholder="Pipeline Type" />
              </SelectTrigger>
              <SelectContent>
                {mockPipelineTypes.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedMockPipelineType && (
            <Select value={selectedMockRole} onValueChange={setSelectedMockRole}>
              <SelectTrigger className="h-10 w-auto min-w-[180px] text-xs">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {mockRoleOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button onClick={startNewSession} disabled={isStarting || !isMockRoleSelected} variant="default" className="gap-2">
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {!isMockRoleSelected ? 'Select All Fields' : 'Start Mock Interview'}
          </Button>
        </div>
      </div>

      <div className="relative">
        <div>
        <>

      {/* Progress Tracker */}
      <Card className="bg-muted/30">
        <CardContent className="py-6">
          <InterviewProgressTracker
            stages={
              displayStagesList.length > 0
                ? displayStagesList.map(s => ({
                    name: s.name,
                    order: s.order,
                    description: s.description || '',
                    stageType: 'assessment' as const,
                  }))
                : stages
            }
            currentStageOrder={currentSession.current_stage_order}
            stageResults={stageResults}
          />
        </CardContent>
      </Card>

      {/* Stage Cards — driven by displayStagesList (resolved from pipeline config) */}
      <div className="grid gap-4">
        {(displayStagesList.length > 0
          ? displayStagesList.map(s => ({
              name: s.name,
              order: s.order,
              description: s.description || '',
              questionCount: 0,
              timePerQuestion: 0,
              passingScore: 0,
              stageType: 'assessment' as InterviewStage['stageType'],
            }))
          : stages
        ).map((stage) => {
          const status = getStageStatus(stage.order);
          const Icon = getStageIcon(stage.order);
          const result = stageResults.find(r => r.stage_order === stage.order);
          const isExpanded = expandedStage === stage.order;
          const hasResults = result?.completed_at && stage.order !== 1;

          return (
            <Card 
              key={stage.order}
              className={`transition-all ${
                status === 'current' ? 'border-primary shadow-md' :
                status === 'completed' ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' :
                'border-muted'
              }`}
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    status === 'completed' ? 'bg-green-500 text-white' :
                    status === 'current' ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{stage.name}</h3>
                      {/* Only show score for stages other than Interview Instructions (1) and Slot Booking stages (2, 4) */}
                      {result?.ai_score !== undefined && stage.order !== 1 && !isSlotBookingOrder(stage.order) && (
                        <Badge variant="default" className="bg-green-500">
                          {result.ai_score.toFixed(0)}%
                        </Badge>
                      )}
                      {/* Show "Slot Booked" badge for completed slot booking stages */}
                      {status === 'completed' && isSlotBookingOrder(stage.order) && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Slot Booked
                        </Badge>
                      )}
                      {status === 'current' && (
                        <Badge variant="outline" className="animate-pulse border-primary text-primary">
                          <Clock className="h-3 w-3 mr-1" />
                          In Progress
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{stage.description}</p>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {/* For stage 1 (Interview Instructions) current - show Send & Proceed button */}
                    {status === 'current' && stage.order === 1 && currentSession && (
                      <Button 
                        variant="default" 
                        size="sm"
                        disabled={isStarting}
                        onClick={async () => {
                          setIsStarting(true);
                          try {
                            // Send instructions email
                            const sent = await sendInterviewInstructionsEmail(currentSession.id);
                            if (sent) {
                              // Complete stage 1 and move to stage 2
                              await completeInstructionsStage(currentSession.id);
                              await loadData();
                              toast.success("Instructions sent! Proceed to next stage.");
                            } else {
                              toast.error("Failed to send instructions email.");
                            }
                          } catch (err) {
                            console.error("Error completing instructions stage:", err);
                            toast.error("Failed to complete stage.");
                          } finally {
                            setIsStarting(false);
                          }
                        }}
                        className="gap-1"
                      >
                        {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        {isStarting ? 'Sending...' : 'Send Instructions & Proceed'}
                      </Button>
                    )}
                    {/* For stage 1 (Interview Instructions) completed - show email sent indicator */}
                    {status === 'completed' && stage.order === 1 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Mail className="h-3 w-3 mr-1" />
                        Email Sent
                      </Badge>
                    )}
                    {/* For Technical Assessment Slot Booking (stage 2) in progress, show Book Slot button */}
                    {status === 'current' && isFirstSlotBooking(stage.order) && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => setExpandedStage(isExpanded ? null : stage.order)}
                        className="gap-1"
                      >
                        <Calendar className="h-4 w-4" />
                        {isExpanded ? 'Hide Booking' : 'Book Slot'}
                      </Button>
                    )}
                    {/* For current (in-progress) stages without a dedicated action, show Start button */}
                    {status === 'current' && currentSession && stage.order !== 1 && stage.order !== 7 && stage.order !== 8 && !isSlotBookingOrder(stage.order) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToStage(stage.order);
                        }}
                        className="gap-1"
                      >
                        <Play className="h-4 w-4" />
                        Start
                      </Button>
                    )}
                    {/* For Demo Slot Booking (stage 4) in progress, show Book Slot button */}
                    {status === 'current' && isSlotBookingOrder(stage.order) && !isFirstSlotBooking(stage.order) && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => setExpandedStage(isExpanded ? null : stage.order)}
                        className="gap-1"
                      >
                        <Calendar className="h-4 w-4" />
                        {isExpanded ? 'Hide Booking' : 'Book Slot'}
                      </Button>
                    )}
                    {/* For Demo Feedback (stage 6) - show View Results like other completed stages */}
                    {/* For HR Documents (stage 7) in progress, show Upload Documents button */}
                    {status === 'current' && stage.order === 7 && currentSession && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => setExpandedStage(isExpanded ? null : stage.order)}
                        className="gap-1"
                      >
                        <Video className="h-4 w-4" />
                        {isExpanded ? 'Hide Options' : 'Schedule Call'}
                      </Button>
                    )}
                    {/* For Final Review (stage 8) in progress, show View Final Summary button */}
                    {status === 'current' && stage.order === 8 && currentSession && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => setExpandedStage(isExpanded ? null : stage.order)}
                        className="gap-1"
                      >
                        <ListChecks className="h-4 w-4" />
                        {isExpanded ? 'Hide Summary' : 'View Final Summary'}
                      </Button>
                    )}
                    {/* Resend Mail removed - mock test runs entirely in-app, no emails */}
                    {hasResults && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setExpandedStage(isExpanded ? null : stage.order)}
                        className="gap-1"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {isExpanded ? 'Hide Results' : 'View Results'}
                      </Button>
                    )}
                    {status === 'upcoming' && (
                      <Badge variant="secondary" className="text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        Upcoming
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Expanded Results Section */}
                {isExpanded && hasResults && result && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* For Slot Booking stages (2 and 4), show simplified confirmation */}
                    {isSlotBookingOrder(stage.order) ? (
                      <div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-500/30">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-green-700 dark:text-green-400">
                              {stage.name} — Slot Booked
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {result.ai_feedback || 'Your slot has been confirmed. Check your email for details.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* AI Feedback */}
                        {result.ai_feedback && (
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-sm text-foreground">{result.ai_feedback}</p>
                          </div>
                        )}

                        {/* Criteria Breakdown for Demo Round (stage 5) */}
                        {result.question_scores && Object.keys(result.question_scores).length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-muted-foreground">Criteria Breakdown</h4>
                            {Object.entries(result.question_scores).map(([key, value]) => {
                              const labels: Record<string, string> = {
                                teachingClarity: 'Teaching Clarity',
                                subjectKnowledge: 'Subject Knowledge',
                                presentationSkills: 'Presentation Skills',
                                timeManagement: 'Time Management',
                                overallPotential: 'Overall Potential'
                              };
                              const scoreColor = value.score >= 80 ? 'text-green-600' : value.score >= 65 ? 'text-amber-600' : 'text-red-600';
                              const progressColor = value.score >= 80 ? 'bg-green-500' : value.score >= 65 ? 'bg-amber-500' : 'bg-red-500';
                              
                              return (
                                <div key={key} className="p-3 rounded-lg border bg-card">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">{labels[key] || key}</span>
                                    <span className={`text-sm font-bold ${scoreColor}`}>{value.score}%</span>
                                  </div>
                                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                                    <div className={`h-full ${progressColor}`} style={{ width: `${value.score}%` }} />
                                  </div>
                                  <p className="text-xs text-muted-foreground">{value.feedback}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Strengths & Improvements Grid */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Positive Points (Strengths) */}
                          {result.strengths && result.strengths.length > 0 && (
                            <div className="p-3 rounded-lg border border-green-500/30 bg-green-50/50 dark:bg-green-900/10">
                              <h4 className="text-sm font-semibold flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                                <TrendingUp className="h-4 w-4" />
                                Positive Points
                              </h4>
                              <ul className="space-y-2">
                                {result.strengths.map((strength, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-foreground">{strength}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Negative Points (Areas to Improve) */}
                          {result.improvements && result.improvements.length > 0 && (
                            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10">
                              <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                                <TrendingDown className="h-4 w-4" />
                                Areas to Improve
                              </h4>
                              <ul className="space-y-2">
                                {result.improvements.map((improvement, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm">
                                    <Target className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-foreground">{improvement}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Action Button - Full details */}
                        <div className="flex justify-center pt-2">
                          <Button variant="outline" size="sm" onClick={() => goToStage(stage.order)}>
                            View Full Details
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Slot Booking Stage (2 or 4) - Show compact calendar/time picker inline */}
                {isExpanded && status === 'current' && isSlotBookingOrder(stage.order) && !hasResults && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {isFirstSlotBooking(stage.order) ? (
                      <>
                        {/* Written Test Slot Booking - same style as Demo Slot Booking */}
                        {/* Quick Options */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">Quick:</span>
                          <Button
                            variant={selectedSlot === 'immediately' ? 'default' : 'outline'}
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setSelectedSlot('immediately')}
                          >
                            <Play className="h-3.5 w-3.5" />
                            Start Now
                          </Button>
                          <Button
                            variant={selectedSlot === 'next_10_min' ? 'default' : 'outline'}
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setSelectedSlot('next_10_min')}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            In 10 Min
                          </Button>
                        </div>

                        {/* Date & Time Slots */}
                        <div className="space-y-2">
                          <span className="text-sm font-medium text-muted-foreground">Or schedule for:</span>
                          <ScrollArea className="max-h-[200px]">
                            <RadioGroup value={selectedSlot} onValueChange={setSelectedSlot} className="space-y-2">
                              {Object.entries(
                                generateTimeSlots().reduce((groups: { [key: string]: { date: string; time: string; value: string }[] }, slot) => {
                                  if (!groups[slot.date]) groups[slot.date] = [];
                                  groups[slot.date].push(slot);
                                  return groups;
                                }, {} as { [key: string]: { date: string; time: string; value: string }[] })
                              ).map(([date, slots]) => {
                                const firstSlot = (slots as { date: string; time: string; value: string }[])[0];
                                const slotDate = new Date(firstSlot.value);
                                const dayName = slotDate.toLocaleDateString('en-US', { weekday: 'short' });
                                
                                return (
                                  <div key={date} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                                    <div className="flex items-center gap-1.5 min-w-[90px] pt-0.5">
                                      <Calendar className="h-3.5 w-3.5 text-primary" />
                                      <span className="text-xs font-medium">{date}</span>
                                      <span className="text-xs text-muted-foreground">({dayName})</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 flex-1">
                                      {(slots as { date: string; time: string; value: string }[]).map((slot) => (
                                        <div key={slot.value}>
                                          <RadioGroupItem value={slot.value} id={`first-${slot.value}`} className="peer sr-only" />
                                          <Label
                                            htmlFor={`first-${slot.value}`}
                                            className="inline-block px-2 py-1 rounded text-xs font-medium border cursor-pointer transition-all
                                              peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground
                                              hover:border-primary/50 hover:bg-primary/5"
                                          >
                                            {slot.time}
                                          </Label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </RadioGroup>
                          </ScrollArea>
                        </div>

                        {/* Selected Slot & Confirm */}
                        <div className="flex items-center justify-between gap-3 pt-2 border-t">
                          <div className="flex items-center gap-2 text-sm">
                            {selectedSlot ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                <span className="text-muted-foreground">
                                  {selectedSlot === 'immediately' 
                                    ? 'Start Now' 
                                    : selectedSlot === 'next_10_min'
                                      ? 'In 10 Minutes'
                                      : (() => {
                                          const slotDate = new Date(selectedSlot);
                                          return `${slotDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${slotDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                                        })()
                                  }
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">Select a time slot</span>
                            )}
                          </div>
                          <Button 
                            onClick={bookSlot}
                            disabled={!selectedSlot || isBookingSlot}
                            size="sm"
                            className="gap-1.5"
                          >
                            {isBookingSlot ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            {isBookingSlot ? 'Booking...' : 'Confirm'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Stage 4: Demo Slot Booking - Original compact UI */}
                        {/* Quick Options - Compact */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">Quick:</span>
                          <Button
                            variant={selectedSlot === 'immediately' ? 'default' : 'outline'}
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setSelectedSlot('immediately')}
                          >
                            <Play className="h-3.5 w-3.5" />
                            Start Now
                          </Button>
                          <Button
                            variant={selectedSlot === 'next_10_min' ? 'default' : 'outline'}
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setSelectedSlot('next_10_min')}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            In 10 Min
                          </Button>
                        </div>

                        {/* Date & Time Slots - Compact */}
                        <div className="space-y-2">
                          <span className="text-sm font-medium text-muted-foreground">Or schedule for:</span>
                          <ScrollArea className="max-h-[200px]">
                            <RadioGroup value={selectedSlot} onValueChange={setSelectedSlot} className="space-y-2">
                              {Object.entries(
                                generateTimeSlots().reduce((groups: { [key: string]: { date: string; time: string; value: string }[] }, slot) => {
                                  if (!groups[slot.date]) groups[slot.date] = [];
                                  groups[slot.date].push(slot);
                                  return groups;
                                }, {} as { [key: string]: { date: string; time: string; value: string }[] })
                              ).map(([date, slots]) => {
                                const firstSlot = (slots as { date: string; time: string; value: string }[])[0];
                                const slotDate = new Date(firstSlot.value);
                                const dayName = slotDate.toLocaleDateString('en-US', { weekday: 'short' });
                                
                                return (
                                  <div key={date} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                                    <div className="flex items-center gap-1.5 min-w-[90px] pt-0.5">
                                      <Calendar className="h-3.5 w-3.5 text-primary" />
                                      <span className="text-xs font-medium">{date}</span>
                                      <span className="text-xs text-muted-foreground">({dayName})</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 flex-1">
                                      {(slots as { date: string; time: string; value: string }[]).map((slot) => (
                                        <div key={slot.value}>
                                          <RadioGroupItem value={slot.value} id={slot.value} className="peer sr-only" />
                                          <Label
                                            htmlFor={slot.value}
                                            className="inline-block px-2 py-1 rounded text-xs font-medium border cursor-pointer transition-all
                                              peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground
                                              hover:border-primary/50 hover:bg-primary/5"
                                          >
                                            {slot.time}
                                          </Label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </RadioGroup>
                          </ScrollArea>
                        </div>

                        {/* Selected Slot & Confirm - Compact inline */}
                        <div className="flex items-center justify-between gap-3 pt-2 border-t">
                          <div className="flex items-center gap-2 text-sm">
                            {selectedSlot ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                <span className="text-muted-foreground">
                                  {selectedSlot === 'immediately' 
                                    ? 'Start Now' 
                                    : selectedSlot === 'next_10_min'
                                      ? 'In 10 Minutes'
                                      : (() => {
                                          const slotDate = new Date(selectedSlot);
                                          return `${slotDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${slotDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                                        })()
                                  }
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">Select a time slot</span>
                            )}
                          </div>
                          <Button 
                            onClick={bookSlot}
                            disabled={!selectedSlot || isBookingSlot}
                            size="sm"
                            className="gap-1.5"
                          >
                            {isBookingSlot ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            {isBookingSlot ? 'Booking...' : 'Confirm'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}


                {/* HR Negotiation Stage (7) - Show call scheduling or negotiation form */}
                {isExpanded && status === 'current' && stage.order === 7 && !hasResults && (
                  <div className="mt-4 pt-4 border-t space-y-6">
                    {/* Show existing negotiation status if submitted */}
                    {existingNegotiation ? (
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                          </div>
                          <h4 className="text-lg font-semibold">Negotiation Submitted</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Your {existingNegotiation.negotiation_type === 'call' ? 'HR call request' : 'negotiation details'} have been submitted.
                          </p>
                        </div>
                        <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge variant={existingNegotiation.status === 'approved' ? 'default' : 'secondary'}>
                              {existingNegotiation.status === 'call_requested' ? 'Call Requested' :
                               existingNegotiation.status === 'call_scheduled' ? 'Call Scheduled' :
                               existingNegotiation.status === 'approved' ? 'Approved' :
                               existingNegotiation.status === 'counter_offer' ? 'Counter Offer' :
                               'Under Review'}
                            </Badge>
                          </div>
                          {existingNegotiation.negotiation_type === 'call' && existingNegotiation.call_meeting_link && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Meeting Link</span>
                              <a href={existingNegotiation.call_meeting_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                                Join Call
                              </a>
                            </div>
                          )}
                          {existingNegotiation.admin_response && (
                            <div className="pt-2 border-t">
                              <span className="text-sm font-medium">HR Response:</span>
                              <p className="text-sm text-muted-foreground mt-1">{existingNegotiation.admin_response}</p>
                            </div>
                          )}
                          {existingNegotiation.offered_salary && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Offered Salary</span>
                              <span className="text-sm font-medium">₹{existingNegotiation.offered_salary.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : !hrNegotiationType ? (
                      // Option Selection
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                            <MessageSquare className="h-8 w-8 text-primary" />
                          </div>
                          <h4 className="text-lg font-semibold">Final Review (HR)</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Choose how you'd like to proceed with the HR discussion
                          </p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Option 1: Schedule Online Meeting */}
                          <Card 
                            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 border-2"
                            onClick={() => setHrNegotiationType('call')}
                          >
                            <CardContent className="pt-6 text-center">
                              <div className="h-14 w-14 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Video className="h-7 w-7 text-blue-500" />
                              </div>
                              <h5 className="font-semibold mb-2">Schedule Online Meeting</h5>
                              <p className="text-sm text-muted-foreground">
                                Request a video meeting with HR to discuss salary, joining date, and other details
                              </p>
                            </CardContent>
                          </Card>

                          {/* Option 2: Fill Negotiation Form */}
                          <Card 
                            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 border-2"
                            onClick={() => setHrNegotiationType('form')}
                          >
                            <CardContent className="pt-6 text-center">
                              <div className="h-14 w-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                <FileText className="h-7 w-7 text-green-500" />
                              </div>
                              <h5 className="font-semibold mb-2">Submit Negotiation Details</h5>
                              <p className="text-sm text-muted-foreground">
                                Fill in your salary expectations and preferences for HR review
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    ) : hrNegotiationType === 'call' ? (
                      // Online Meeting Scheduling Form
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Button variant="ghost" size="sm" onClick={() => setHrNegotiationType(null)}>
                            ← Back
                          </Button>
                          <h4 className="font-semibold">Schedule Online Meeting</h4>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Preferred Date <span className="text-destructive">*</span></Label>
                            <Input
                              type="date"
                              value={negotiationForm.preferredCallDate}
                              onChange={(e) => setNegotiationForm(prev => ({ ...prev, preferredCallDate: e.target.value }))}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Preferred Time <span className="text-destructive">*</span></Label>
                            <Select
                              value={negotiationForm.preferredCallTime}
                              onValueChange={(value) => setNegotiationForm(prev => ({ ...prev, preferredCallTime: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="09:00 AM">09:00 AM</SelectItem>
                                <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                                <SelectItem value="11:00 AM">11:00 AM</SelectItem>
                                <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                                <SelectItem value="02:00 PM">02:00 PM</SelectItem>
                                <SelectItem value="03:00 PM">03:00 PM</SelectItem>
                                <SelectItem value="04:00 PM">04:00 PM</SelectItem>
                                <SelectItem value="05:00 PM">05:00 PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10">
                          <p className="text-sm text-blue-700 dark:text-blue-400">
                            💡 HR team will review your request and send you a video meeting link for the scheduled time.
                          </p>
                        </div>

                        <div className="flex justify-center pt-2">
                          <Button 
                            onClick={submitHRNegotiation}
                            disabled={isSubmittingNegotiation || !negotiationForm.preferredCallDate || !negotiationForm.preferredCallTime}
                            className="gap-2"
                            size="lg"
                          >
                            {isSubmittingNegotiation ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Video className="h-4 w-4" />
                            )}
                            {isSubmittingNegotiation ? 'Submitting...' : 'Request Online Meeting'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Negotiation Form
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Button variant="ghost" size="sm" onClick={() => setHrNegotiationType(null)}>
                            ← Back
                          </Button>
                          <h4 className="font-semibold">Negotiation Details</h4>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <IndianRupee className="h-4 w-4" />
                              Current Salary (per annum)
                            </Label>
                            <Input
                              type="number"
                              placeholder="e.g., 500000"
                              value={negotiationForm.currentSalary}
                              onChange={(e) => setNegotiationForm(prev => ({ ...prev, currentSalary: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <IndianRupee className="h-4 w-4" />
                              Expected Salary (per annum) <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              type="number"
                              placeholder="e.g., 700000"
                              value={negotiationForm.expectedSalary}
                              onChange={(e) => setNegotiationForm(prev => ({ ...prev, expectedSalary: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Notice Period</Label>
                            <Select
                              value={negotiationForm.noticePeriod}
                              onValueChange={(value) => setNegotiationForm(prev => ({ ...prev, noticePeriod: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select notice period" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="immediate">Immediate</SelectItem>
                                <SelectItem value="15_days">15 Days</SelectItem>
                                <SelectItem value="30_days">30 Days</SelectItem>
                                <SelectItem value="60_days">60 Days</SelectItem>
                                <SelectItem value="90_days">90 Days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Preferred Joining Date</Label>
                            <Input
                              type="date"
                              value={negotiationForm.preferredJoiningDate}
                              onChange={(e) => setNegotiationForm(prev => ({ ...prev, preferredJoiningDate: e.target.value }))}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Relocation Required?</Label>
                            <div className="flex items-center gap-4 pt-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  checked={negotiationForm.relocationRequired}
                                  onChange={() => setNegotiationForm(prev => ({ ...prev, relocationRequired: true }))}
                                  className="w-4 h-4"
                                />
                                <span>Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  checked={!negotiationForm.relocationRequired}
                                  onChange={() => setNegotiationForm(prev => ({ ...prev, relocationRequired: false }))}
                                  className="w-4 h-4"
                                />
                                <span>No</span>
                              </label>
                            </div>
                          </div>
                          {negotiationForm.relocationRequired && (
                            <div className="space-y-2">
                              <Label>Willing to Relocate?</Label>
                              <div className="flex items-center gap-4 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    checked={negotiationForm.willingToRelocate}
                                    onChange={() => setNegotiationForm(prev => ({ ...prev, willingToRelocate: true }))}
                                    className="w-4 h-4"
                                  />
                                  <span>Yes</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    checked={!negotiationForm.willingToRelocate}
                                    onChange={() => setNegotiationForm(prev => ({ ...prev, willingToRelocate: false }))}
                                    className="w-4 h-4"
                                  />
                                  <span>No</span>
                                </label>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Preferred Location (if applicable)</Label>
                          <Input
                            placeholder="e.g., Hyderabad, Bangalore"
                            value={negotiationForm.preferredLocation}
                            onChange={(e) => setNegotiationForm(prev => ({ ...prev, preferredLocation: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Additional Requirements or Questions</Label>
                          <textarea
                            className="w-full min-h-[100px] p-3 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Any other requirements, questions, or things you'd like to discuss..."
                            value={negotiationForm.additionalRequirements}
                            onChange={(e) => setNegotiationForm(prev => ({ ...prev, additionalRequirements: e.target.value }))}
                          />
                        </div>

                        <div className="flex justify-center pt-2">
                          <Button 
                            onClick={submitHRNegotiation}
                            disabled={isSubmittingNegotiation || !negotiationForm.expectedSalary}
                            className="gap-2"
                            size="lg"
                          >
                            {isSubmittingNegotiation ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            {isSubmittingNegotiation ? 'Submitting...' : 'Submit Negotiation Details'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Final Review Stage (8) - Show complete summary inline */}
                {isExpanded && status === 'current' && stage.order === 8 && !hasResults && (
                  <div className="mt-4 pt-4 border-t space-y-6">
                    {/* Header */}
                    <div className="text-center">
                      <div className="h-16 w-16 bg-gradient-to-br from-primary/20 to-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ListChecks className="h-8 w-8 text-primary" />
                      </div>
                      <h4 className="text-lg font-semibold">Interview Journey Summary</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Review your complete interview performance across all stages
                      </p>
                    </div>

                    {/* Stages Summary Grid */}
                    <div className="space-y-3">
                      <h5 className="text-sm font-semibold text-muted-foreground">Stage Performance</h5>
                      <div className="grid gap-3">
                        {stages.filter(s => s.order !== 8).map((s) => {
                          const stageResult = stageResults.find(r => r.stage_order === s.order);
                          const StageIcon = getStageIcon(s.order);
                          const isCompleted = stageResult?.completed_at;
                          const score = stageResult?.ai_score;
                          const showScore = score !== undefined && s.order !== 1 && s.order !== 3;
                          
                          return (
                            <div 
                              key={s.order} 
                              className={`p-3 rounded-lg border flex items-center justify-between ${
                                isCompleted ? 'bg-green-50/50 dark:bg-green-900/10 border-green-500/30' : 'bg-muted/30'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                  isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                                }`}>
                                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <StageIcon className="h-4 w-4" />}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{s.name}</p>
                                  {stageResult?.ai_feedback && (
                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                      {stageResult.ai_feedback.substring(0, 50)}...
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {showScore && (
                                  <Badge 
                                    variant="default" 
                                    className={`${
                                      score >= 80 ? 'bg-green-500' : 
                                      score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                  >
                                    {score.toFixed(0)}%
                                  </Badge>
                                )}
                                {isCompleted && !showScore && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                                    Completed
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Overall Score Preview */}
                    {(() => {
                      const scoredResults = stageResults.filter(r => 
                        r.ai_score !== undefined && 
                        r.stage_order !== 1 && 
                        r.stage_order !== 3
                      );
                      const overallScore = scoredResults.length > 0 
                        ? scoredResults.reduce((sum, r) => sum + (r.ai_score || 0), 0) / scoredResults.length 
                        : 0;
                      const passed = overallScore >= 60;
                      
                      return (
                        <div className={`p-4 rounded-lg border-2 ${
                          passed ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' : 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-semibold">Overall Performance</h5>
                            <Badge 
                              variant="default" 
                              className={`text-lg px-3 py-1 ${
                                overallScore >= 80 ? 'bg-green-500' : 
                                overallScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                            >
                              {overallScore.toFixed(1)}%
                            </Badge>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
                            <div 
                              className={`h-full transition-all ${
                                overallScore >= 80 ? 'bg-green-500' : 
                                overallScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`} 
                              style={{ width: `${overallScore}%` }} 
                            />
                          </div>
                          <p className={`text-sm font-medium ${passed ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                            {passed ? '🎉 Congratulations! You are eligible for the next round.' : '📝 Your interview is under review.'}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Strengths & Improvements Summary */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* All Strengths */}
                      {stageResults.some(r => r.strengths && r.strengths.length > 0) && (
                        <div className="p-3 rounded-lg border border-green-500/30 bg-green-50/50 dark:bg-green-900/10">
                          <h4 className="text-sm font-semibold flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                            <TrendingUp className="h-4 w-4" />
                            Key Strengths
                          </h4>
                          <ul className="space-y-2">
                            {stageResults
                              .flatMap(r => r.strengths || [])
                              .slice(0, 4)
                              .map((strength, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                  <span className="text-foreground">{strength}</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}

                      {/* All Improvements */}
                      {stageResults.some(r => r.improvements && r.improvements.length > 0) && (
                        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10">
                          <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                            <TrendingDown className="h-4 w-4" />
                            Areas for Improvement
                          </h4>
                          <ul className="space-y-2">
                            {stageResults
                              .flatMap(r => r.improvements || [])
                              .slice(0, 4)
                              .map((improvement, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <Target className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                  <span className="text-foreground">{improvement}</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Complete Interview Button */}
                    <div className="flex justify-center gap-3 pt-2 flex-wrap">
                      <Button
                        variant="outline"
                        onClick={() => generateMockInterviewReportPdf({
                          candidateName: profile?.full_name || 'Candidate',
                          interviewType: (currentSession as any)?.interview_type,
                          pipelineType: (currentSession as any)?.pipeline_type,
                          sessionStartedAt: (currentSession as any)?.started_at,
                          stageResults: stageResults as any,
                        })}
                        className="gap-2"
                        size="lg"
                      >
                        <Download className="h-4 w-4" />
                        Download Report (PDF)
                      </Button>
                      <Button 
                        onClick={completeFinalReview}
                        disabled={isCompletingFinalReview}
                        className="gap-2"
                        size="lg"
                      >
                        {isCompletingFinalReview ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {isCompletingFinalReview ? 'Completing...' : 'Complete Interview & Get Final Results'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Banner */}
      {currentSession.status === 'in_progress' && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-400">Tips for Success</h4>
                <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                  <li>• Ensure stable internet connection and quiet environment</li>
                  <li>• Keep your camera and microphone ready for recording</li>
                  <li>• Take your time to answer thoughtfully</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Courses Based on Mock Test Score */}
      {currentSession && stageResults.length > 0 && courseSuggestions.length > 0 && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recommended Courses</CardTitle>
                  <CardDescription>Based on your mock interview performance</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <GraduationCap className="h-3 w-3 mr-1" />
                {courseSuggestions.length} Courses
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courseSuggestions.map((course) => (
                <a
                  key={course.id}
                  href={course.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-lg border bg-background hover:shadow-md hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {course.category}
                    </Badge>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-2">
                    {course.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-amber-500">
                        <Star className="h-3 w-3 fill-current" />
                        {course.rating}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{course.duration}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs px-2 py-0">
                      {course.level}
                    </Badge>
                  </div>
                </a>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Improve your skills and ace your next interview!
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://skillory.in', '_blank')}
                className="gap-2"
              >
                <GraduationCap className="h-4 w-4" />
                Explore All Courses
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slot Booking Modal */}
      <Dialog open={showSlotBooking} onOpenChange={setShowSlotBooking}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {currentSession?.current_stage_order !== undefined && isFirstSlotBooking(currentSession.current_stage_order) ? 'Book Technical Assessment Slot' : 'Book Demo Interview Slot'}
            </DialogTitle>
            <DialogDescription>
              {currentSession?.current_stage_order !== undefined && isFirstSlotBooking(currentSession.current_stage_order)
                ? 'Select a convenient time slot for your Technical Assessment.'
                : 'Select a convenient time slot for your demo teaching session.'}
            </DialogDescription>
          </DialogHeader>
          
          {/* Quick Options */}
          <div className="space-y-2 pb-2 border-b">
            <h4 className="font-medium text-sm text-muted-foreground">Quick Options</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedSlot === 'immediately' ? 'default' : 'outline'}
                className="w-full"
                onClick={() => setSelectedSlot('immediately')}
              >
                <Play className="h-4 w-4 mr-2" />
                Immediately
              </Button>
              <Button
                variant={selectedSlot === 'next_10_min' ? 'default' : 'outline'}
                className="w-full"
                onClick={() => setSelectedSlot('next_10_min')}
              >
                <Clock className="h-4 w-4 mr-2" />
                In 10 Minutes
              </Button>
            </div>
          </div>
          
          <ScrollArea className="max-h-[300px] pr-4">
            <RadioGroup value={selectedSlot} onValueChange={setSelectedSlot} className="space-y-2">
              {generateTimeSlots().reduce((groups: { [key: string]: { date: string; time: string; value: string }[] }, slot) => {
                if (!groups[slot.date]) groups[slot.date] = [];
                groups[slot.date].push(slot);
                return groups;
              }, {} as { [key: string]: { date: string; time: string; value: string }[] }) &&
              Object.entries(
                generateTimeSlots().reduce((groups: { [key: string]: { date: string; time: string; value: string }[] }, slot) => {
                  if (!groups[slot.date]) groups[slot.date] = [];
                  groups[slot.date].push(slot);
                  return groups;
                }, {} as { [key: string]: { date: string; time: string; value: string }[] })
              ).map(([date, slots]) => (
                <div key={date} className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground pt-2">{date}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(slots as { date: string; time: string; value: string }[]).map((slot) => (
                      <div key={slot.value} className="flex items-center">
                        <RadioGroupItem value={slot.value} id={slot.value} className="peer sr-only" />
                        <Label
                          htmlFor={slot.value}
                          className="flex-1 text-center py-2 px-3 rounded-lg border cursor-pointer transition-all
                            peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 
                            peer-data-[state=checked]:text-primary hover:border-primary/50 text-sm"
                        >
                          {slot.time}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </RadioGroup>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowSlotBooking(false)}>
              Cancel
            </Button>
            <Button 
              onClick={bookSlot} 
              disabled={!selectedSlot || isBookingSlot}
              className="gap-2"
            >
              {isBookingSlot ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </>
        </div>
      </div>
    </div>
  );
};

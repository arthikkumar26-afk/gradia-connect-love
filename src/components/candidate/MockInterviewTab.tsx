import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
  Video
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { InterviewProgressTracker } from "@/components/candidate/InterviewProgressTracker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { indiaLocationData } from "@/data/indiaLocations";

interface InterviewStage {
  name: string;
  order: number;
  description: string;
  questionCount: number;
  timePerQuestion: number;
  passingScore: number;
  stageType?: 'email_info' | 'assessment' | 'slot_booking' | 'demo' | 'feedback' | 'hr_documents' | 'review';
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
  const [selectedInterviewType, setSelectedInterviewType] = useState<'new_employee' | 'promotions' | null>(null);
  
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
  
  // Role-based options matching admin MockInterviewPipeline
  const segmentOptions = ['Pre-Primary', 'Primary', 'High School'];

  const categoryOptions: Record<string, string[]> = {
    'Pre-Primary': ['Teaching', 'Helping/Supporting', 'Admin'],
    'Primary': ['Teaching', 'Helping/Supporting', 'Admin', 'CLASS-1&2', 'CLASSES-3,4&5'],
    'High School': ['Board', 'Compititive'],
  };

  // Class options for High School > Board/Competitive
  const classLevelOptions: Record<string, string[]> = {
    'Board': ['CLASS-6,7&8', 'CLASS-9&10'],
    'Compititive': ['CLASSES-6,7&8', 'CLASSES-9&10'],
  };

  // Subject designations based on class level
  const classDesignationOptions: Record<string, string[]> = {
    'CLASS-6,7&8': ['Telugu', 'Hindi', 'English', 'Maths', 'Physics', 'Chemistry', 'Biology'],
    'CLASS-9&10': [
      'Telugu', 'Hindi', 'English', 'Maths', 'Physics', 'Chemistry', 
      'Biology', 'Botany', 'Zoology', 'Social', 'Mental Ability', 'Counsellor', 
      'Academic Dean', 'Computers', 'Physical Education', 'Principal', 
      'Soft Skills Trainer', 'French'
    ],
    'CLASSES-6,7&8': [
      'Maths', 'Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology', 
      'Mental Ability', 'Counsellor'
    ],
    'CLASSES-9&10': [
      'Maths', 'Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology', 
      'Mental Ability', 'Counsellor', 'Academic Dean'
    ],
  };

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
      'Compititive': ['TGT', 'PGT', 'SENIOR TEACHER', 'HOD']
    }
  };

  // Check if we need to show class level field (for Board or Compititive)
  const showClassLevel = slotBookingForm.segment === 'High School' && 
    (slotBookingForm.category === 'Board' || slotBookingForm.category === 'Compititive');

  const getCurrentCategories = () => {
    return slotBookingForm.segment ? categoryOptions[slotBookingForm.segment] || [] : [];
  };

  const getCurrentClassLevels = () => {
    if (!showClassLevel) return [];
    return classLevelOptions[slotBookingForm.category] || [];
  };

  const getCurrentDesignations = () => {
    // For High School Board, designations come from classLevel
    if (slotBookingForm.segment === 'High School' && slotBookingForm.category === 'Board') {
      return classDesignationOptions[slotBookingForm.classLevel] || [];
    }
    // For High School Compititive, designations come from classLevel first, then category
    if (slotBookingForm.segment === 'High School' && slotBookingForm.category === 'Compititive') {
      if (slotBookingForm.classLevel) {
        return classDesignationOptions[slotBookingForm.classLevel] || [];
      }
      return designationOptions['High School']?.['Compititive'] || [];
    }
    // For other segments, use category-based designations
    if (slotBookingForm.segment && slotBookingForm.category) {
      return designationOptions[slotBookingForm.segment]?.[slotBookingForm.category] || [];
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

  // Load data on mount and when user changes
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Refresh data when tab becomes visible (user comes back from interview page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        loadData();
      }
    };

    const handleFocus = () => {
      if (user) {
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
      setIsLoading(true);

      // Get stages
      const { data: stagesData } = await supabase.functions.invoke('process-mock-interview-stage', {
        body: { action: 'get_stages' }
      });
      if (stagesData?.stages) {
        setStages(stagesData.stages);
      }

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      setProfile(profileData);

      // Get the most recent session
      const { data: recentSession } = await supabase
        .from('mock_interview_sessions')
        .select('*')
        .eq('candidate_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentSession) {
        setCurrentSession(recentSession);
        
        // Get stage results for this session
        const { data: resultsData } = await supabase
          .from('mock_interview_stage_results')
          .select('*')
          .eq('session_id', recentSession.id)
          .order('stage_order', { ascending: true });
        
        if (resultsData) {
          setStageResults(resultsData as StageResult[]);
        }
        
        // Load existing HR negotiation for this session
        const { data: negotiationData } = await supabase
          .from('hr_negotiations')
          .select('*')
          .eq('session_id', recentSession.id)
          .maybeSingle();
        
        if (negotiationData) {
          setExistingNegotiation(negotiationData);
          setHrNegotiationType(negotiationData.negotiation_type as 'call' | 'form');
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
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
      // Create new session
      const { data: session, error } = await supabase
        .from('mock_interview_sessions')
        .insert({
          candidate_id: user.id,
          status: 'in_progress',
          current_stage_order: 1,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Send interview instructions email
      const instructionsEmailSent = await sendInterviewInstructionsEmail(session.id);
      
      if (instructionsEmailSent) {
        // Complete stage 1 and move to stage 2 (Technical Assessment Slot Booking)
        await completeInstructionsStage(session.id);
        
        // Reload session data
        const { data: updatedSession } = await supabase
          .from('mock_interview_sessions')
          .select('*')
          .eq('id', session.id)
          .single();
        
        const { data: resultsData } = await supabase
          .from('mock_interview_stage_results')
          .select('*')
          .eq('session_id', session.id)
          .order('stage_order', { ascending: true });

        setCurrentSession(updatedSession);
        setStageResults(resultsData as StageResult[] || []);
        toast.success("Instructions sent! Book your Technical Assessment slot.");
      } else {
        setCurrentSession(session);
        setStageResults([]);
        toast.warning("Mock test started, but email sending failed. Please check your email settings.");
      }

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
      // Create new session (reset)
      const { data: session, error } = await supabase
        .from('mock_interview_sessions')
        .insert({
          candidate_id: user.id,
          status: 'in_progress',
          current_stage_order: 1,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Send interview instructions email
      const instructionsEmailSent = await sendInterviewInstructionsEmail(session.id);
      
      if (instructionsEmailSent) {
        // Complete stage 1 and move to stage 2
        await completeInstructionsStage(session.id);
        
        // Automatically send Technical Assessment email
        await sendTechnicalAssessmentEmail(session.id);
        
        // Reload session data
        const { data: updatedSession } = await supabase
          .from('mock_interview_sessions')
          .select('*')
          .eq('id', session.id)
          .single();
        
        const { data: resultsData } = await supabase
          .from('mock_interview_stage_results')
          .select('*')
          .eq('session_id', session.id)
          .order('stage_order', { ascending: true });

        setCurrentSession(updatedSession);
        setStageResults(resultsData as StageResult[] || []);
        toast.success("New interview started! Emails sent.");
      } else {
        setCurrentSession(session);
        setStageResults([]);
        toast.warning("New session started, but email sending failed.");
      }

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
    const currentStage = currentSession?.current_stage_order;
    const isStage2 = currentStage === 2;
    
    // For Stage 2, use slotBookingForm; for Stage 4, use selectedSlot
    if (isStage2) {
      if (!slotBookingForm.date || !slotBookingForm.time || !currentSession) {
        toast.error("Please fill all required fields");
        return;
      }
    } else {
      if (!selectedSlot || !currentSession) {
        toast.error("Please select a time slot");
        return;
      }
    }

    setIsBookingSlot(true);
    try {
      // Determine the actual slot time
      let slotTime: Date;
      let slotLabel: string;
      
      if (isStage2) {
        // For Stage 2, use the form date and time
        slotTime = new Date(`${slotBookingForm.date}T${slotBookingForm.time}`);
        slotLabel = `${new Date(slotBookingForm.date).toLocaleDateString('en-IN', { 
          weekday: 'short', month: 'short', day: 'numeric' 
        })} at ${slotBookingForm.time}`;
        
        // Save to slot_bookings table
        const { error: bookingError } = await supabase
          .from('slot_bookings')
          .insert({
            candidate_id: user?.id,
            booking_type: 'technical_assessment',
            booking_date: slotBookingForm.date,
            booking_time: slotBookingForm.time,
            location: slotBookingForm.location || null,
            state: slotBookingForm.state,
            district: slotBookingForm.district,
            pincode: slotBookingForm.pincode || null,
            segment: slotBookingForm.segment,
            category: slotBookingForm.category || null,
            designation: slotBookingForm.designation,
            class_level: slotBookingForm.classLevel || null,
            status: 'confirmed'
          });
        if (bookingError) {
          console.error('Error saving booking:', bookingError);
          throw bookingError;
        }

        // Send notification to management team
        await supabase.functions.invoke('send-management-notification', {
          body: {
            notificationType: 'slot_booking',
            candidateName: profile?.full_name || 'Candidate',
            candidateEmail: profile?.email,
            bookingDetails: {
              date: slotBookingForm.date,
              time: slotBookingForm.time,
              segment: slotBookingForm.segment,
              category: slotBookingForm.category,
              designation: slotBookingForm.designation,
              state: slotBookingForm.state,
              district: slotBookingForm.district
            },
            appUrl: window.location.origin
          }
        });
      } else {
        // For Stage 4, use selectedSlot
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
        
        // Save demo slot booking
        const { error: bookingError } = await supabase
          .from('slot_bookings')
          .insert({
            candidate_id: user?.id,
            booking_type: 'demo_interview',
            booking_date: slotTime.toISOString().split('T')[0],
            booking_time: slotTime.toTimeString().slice(0, 5),
            status: 'confirmed'
          });
        
        if (bookingError) {
          console.error('Error saving demo booking:', bookingError);
          // Don't throw, continue with the flow
        }
      }

      const isForTechnicalAssessment = currentStage === 2;
      const stageName = isForTechnicalAssessment ? 'Technical Assessment Slot Booking' : 'Demo Slot Booking';
      const nextStageOrder = isForTechnicalAssessment ? 3 : 5;
      const nextStageName = isForTechnicalAssessment ? 'Technical Assessment' : 'Demo Round';
      const nextStageDescription = isForTechnicalAssessment 
        ? 'Answer 8 domain-specific questions to assess your technical knowledge. Your responses will be video recorded.'
        : 'Conduct your live teaching demonstration. Your session will be recorded and evaluated by AI.';

      // Create stage result for slot booking
      await supabase
        .from('mock_interview_stage_results')
        .insert({
          session_id: currentSession.id,
          stage_name: stageName,
          stage_order: currentStage,
          ai_score: 100,
          ai_feedback: `${isForTechnicalAssessment ? 'Technical Assessment' : 'Demo'} slot booked: ${slotLabel}`,
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

      // Send notification to management about demo slot booking
      if (!isForTechnicalAssessment) {
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
        r.stage_order !== 2 && // Technical Assessment Slot Booking
        r.stage_order !== 4    // Demo Slot Booking
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

  // Submit HR Negotiation
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
    switch (stageOrder) {
      case 1: return Mail;
      case 2: return Calendar; // Technical Assessment Slot Booking
      case 3: return Code;     // Technical Assessment
      case 4: return Calendar; // Demo Slot Booking
      case 5: return Monitor;  // Demo Round
      case 6: return BarChart3; // Demo Feedback
      case 7: return MessageSquare;  // HR Negotiation
      case 8: return ListChecks; // All Reviews
      default: return Brain;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
        </div>

        {/* Interview Type Selection */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* New Employee Card */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedInterviewType === 'new_employee' 
                ? 'border-2 border-primary ring-2 ring-primary/20' 
                : 'border hover:border-primary/50'
            }`}
            onClick={() => setSelectedInterviewType('new_employee')}
          >
            <CardHeader className="text-center pb-4">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                selectedInterviewType === 'new_employee' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-primary/10'
              }`}>
                <UserPlus className={`h-8 w-8 ${selectedInterviewType === 'new_employee' ? 'text-primary-foreground' : 'text-primary'}`} />
              </div>
              <CardTitle className="text-lg">New Employee</CardTitle>
              <CardDescription>
                For new candidates joining the organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Interview Focus:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Basic technical assessment
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Teaching demonstration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    HR document verification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Entry-level evaluation
                  </li>
                </ul>
              </div>
              {selectedInterviewType === 'new_employee' && (
                <Badge className="w-full justify-center bg-primary">Selected</Badge>
              )}
            </CardContent>
          </Card>

          {/* Promotions Card */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedInterviewType === 'promotions' 
                ? 'border-2 border-primary ring-2 ring-primary/20' 
                : 'border hover:border-primary/50'
            }`}
            onClick={() => setSelectedInterviewType('promotions')}
          >
            <CardHeader className="text-center pb-4">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                selectedInterviewType === 'promotions' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                <Award className={`h-8 w-8 ${selectedInterviewType === 'promotions' ? 'text-primary-foreground' : 'text-amber-600 dark:text-amber-400'}`} />
              </div>
              <CardTitle className="text-lg">Promotions</CardTitle>
              <CardDescription>
                For existing employees seeking promotion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Interview Focus:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-amber-500" />
                    Advanced technical assessment
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-amber-500" />
                    Leadership demonstration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-amber-500" />
                    Performance review
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-amber-500" />
                    Senior-level evaluation
                  </li>
                </ul>
              </div>
              {selectedInterviewType === 'promotions' && (
                <Badge className="w-full justify-center bg-primary">Selected</Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Interview Stages Preview - Show when type is selected */}
        {selectedInterviewType && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center pb-4">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                {selectedInterviewType === 'new_employee' ? (
                  <UserPlus className="h-6 w-6 text-primary" />
                ) : (
                  <Award className="h-6 w-6 text-primary" />
                )}
              </div>
              <CardTitle className="text-lg">
                {selectedInterviewType === 'new_employee' ? 'New Employee' : 'Promotions'} Interview
              </CardTitle>
              <CardDescription>
                Complete a comprehensive 8-stage interview simulation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 8 Stages Preview */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Interview Stages:</h4>
                <div className="grid gap-2">
                  {[
                    { order: 1, name: "Interview Instructions", icon: Mail },
                    { order: 2, name: "Technical Assessment Slot Booking", icon: Calendar },
                    { order: 3, name: "Technical Assessment", icon: Code },
                    { order: 4, name: "Demo Slot Booking", icon: Calendar },
                    { order: 5, name: "Demo Round", icon: Monitor },
                    { order: 6, name: "Demo Feedback", icon: BarChart3 },
                    { order: 7, name: "Final Review (HR)", icon: FileText },
                    { order: 8, name: "All Reviews", icon: ListChecks },
                  ].map((stage) => (
                    <div key={stage.order} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <stage.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{stage.order}. {stage.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <Button 
                  onClick={startMockTest} 
                  disabled={isStarting} 
                  className="w-full gap-2" 
                  size="lg"
                >
                  {isStarting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                  Attend Mock Test
                </Button>
              </div>

              <div className="flex justify-center">
                <Badge variant="secondary" className="text-xs">
                  Estimated time: 45-60 minutes
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prompt to select if nothing selected */}
        {!selectedInterviewType && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Please select an interview type above to continue
            </p>
          </div>
        )}
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
        <div className="flex items-center gap-2">
          <Button onClick={() => loadData()} disabled={isLoading} variant="outline" size="icon" className="h-10 w-10">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={startNewSession} disabled={isStarting} variant="default" className="gap-2">
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start Mock Interview
          </Button>
        </div>
      </div>

      {/* Progress Tracker */}
      <Card className="bg-muted/30">
        <CardContent className="py-6">
          <InterviewProgressTracker
            stages={stages}
            currentStageOrder={currentSession.current_stage_order}
            stageResults={stageResults}
          />
        </CardContent>
      </Card>

      {/* Stage Cards */}
      <div className="grid gap-4">
        {stages.map((stage) => {
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
                      {result?.ai_score !== undefined && stage.order !== 1 && stage.order !== 2 && stage.order !== 4 && (
                        <Badge variant="default" className="bg-green-500">
                          {result.ai_score.toFixed(0)}%
                        </Badge>
                      )}
                      {/* Show "Slot Booked" badge for completed slot booking stages */}
                      {status === 'completed' && (stage.order === 2 || stage.order === 4) && (
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
                    {/* For stage 1 (Interview Instructions), don't show View Results - just show email sent indicator */}
                    {status === 'completed' && stage.order === 1 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Mail className="h-3 w-3 mr-1" />
                        Email Sent
                      </Badge>
                    )}
                    {/* For Technical Assessment Slot Booking (stage 2) in progress, show Book Slot button */}
                    {status === 'current' && stage.order === 2 && (
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
                    {/* For Technical Assessment (stage 3) in progress, show email sent indicator */}
                    {status === 'current' && stage.order === 3 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Mail className="h-3 w-3 mr-1" />
                        Check Email to Start
                      </Badge>
                    )}
                    {/* For Demo Slot Booking (stage 4) in progress, show Book Slot button */}
                    {status === 'current' && stage.order === 4 && (
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
                    {/* For completed stages with results, show expand/collapse button */}
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
                    {(stage.order === 2 || stage.order === 4) ? (
                      <div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-500/30">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-green-700 dark:text-green-400">
                              {stage.order === 2 ? 'Technical Assessment Slot Booked' : 'Demo Interview Slot Booked'}
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
                {isExpanded && status === 'current' && (stage.order === 2 || stage.order === 4) && !hasResults && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {stage.order === 2 ? (
                      <>
                        {/* Stage 2: Technical Assessment Slot Booking with additional fields */}
                        <ScrollArea className="max-h-[500px]">
                          <div className="space-y-4 pr-2">
                            {/* Date and Time Row */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs font-medium">Date *</Label>
                                <Input
                                  type="date"
                                  value={slotBookingForm.date}
                                  onChange={(e) => setSlotBookingForm(prev => ({ ...prev, date: e.target.value }))}
                                  min={new Date().toISOString().split('T')[0]}
                                  className="h-9 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-medium">Time *</Label>
                                <Select 
                                  value={slotBookingForm.time} 
                                  onValueChange={(value) => setSlotBookingForm(prev => ({ ...prev, time: value }))}
                                >
                                  <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="Select time" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border z-50 max-h-60">
                                    {['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', 
                                      '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', 
                                      '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
                                      '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
                                      '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM', '12:00 AM'].map(time => (
                                      <SelectItem key={time} value={time}>{time}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Location Row */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                Location Details
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium">Location</Label>
                                  <Input
                                    placeholder="Enter location"
                                    value={slotBookingForm.location}
                                    onChange={(e) => setSlotBookingForm(prev => ({ ...prev, location: e.target.value }))}
                                    className="h-9 text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium">Pincode</Label>
                                  <Input
                                    placeholder="Enter pincode"
                                    value={slotBookingForm.pincode}
                                    onChange={(e) => setSlotBookingForm(prev => ({ ...prev, pincode: e.target.value }))}
                                    maxLength={6}
                                    className="h-9 text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium">State *</Label>
                                  <Select 
                                    value={slotBookingForm.state} 
                                    onValueChange={(value) => setSlotBookingForm(prev => ({ ...prev, state: value, district: '' }))}
                                  >
                                    <SelectTrigger className="h-9 text-sm">
                                      <SelectValue placeholder="Select state" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border z-50 max-h-48">
                                      {Object.keys(indiaLocationData).map(state => (
                                        <SelectItem key={state} value={state}>{state}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium">District *</Label>
                                  <Select 
                                    value={slotBookingForm.district} 
                                    onValueChange={(value) => setSlotBookingForm(prev => ({ ...prev, district: value }))}
                                    disabled={!slotBookingForm.state}
                                  >
                                    <SelectTrigger className="h-9 text-sm">
                                      <SelectValue placeholder="Select district" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border z-50 max-h-48">
                                      {slotBookingForm.state && Object.keys(indiaLocationData[slotBookingForm.state] || {}).map(district => (
                                        <SelectItem key={district} value={district}>{district}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            {/* Segment, Category, Designation Row - matching admin algorithm */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs font-medium">Segment *</Label>
                                <Select 
                                  value={slotBookingForm.segment} 
                                  onValueChange={(value) => setSlotBookingForm(prev => ({ 
                                    ...prev, 
                                    segment: value, 
                                    category: '', 
                                    classLevel: '', 
                                    designation: '' 
                                  }))}
                                >
                                  <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="Select segment" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border z-50">
                                    {segmentOptions.map(option => (
                                      <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-medium">Category *</Label>
                                <Select 
                                  value={slotBookingForm.category} 
                                  onValueChange={(value) => setSlotBookingForm(prev => ({ 
                                    ...prev, 
                                    category: value, 
                                    classLevel: '', 
                                    designation: '' 
                                  }))}
                                  disabled={!slotBookingForm.segment}
                                >
                                  <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border z-50">
                                    {getCurrentCategories().map(option => (
                                      <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-medium">Designation *</Label>
                                <Select 
                                  value={slotBookingForm.designation} 
                                  onValueChange={(value) => setSlotBookingForm(prev => ({ ...prev, designation: value }))}
                                  disabled={showClassLevel ? !slotBookingForm.classLevel : !slotBookingForm.category}
                                >
                                  <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="Select designation" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border z-50">
                                    {getCurrentDesignations().map(option => (
                                      <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Class Level Row - only shows for High School Board/Compititive */}
                            {showClassLevel && (
                              <div className="space-y-1">
                                <Label className="text-xs font-medium">Class Level *</Label>
                                <Select 
                                  value={slotBookingForm.classLevel} 
                                  onValueChange={(value) => setSlotBookingForm(prev => ({ 
                                    ...prev, 
                                    classLevel: value, 
                                    designation: '' 
                                  }))}
                                >
                                  <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="Select class level" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border z-50">
                                    {getCurrentClassLevels().map(option => (
                                      <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </ScrollArea>

                        {/* Summary for Stage 2 */}
                        {slotBookingForm.date && slotBookingForm.time && (
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="font-medium">
                                {new Date(slotBookingForm.date).toLocaleDateString('en-IN', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })} at {slotBookingForm.time}
                                {slotBookingForm.state && ` • ${slotBookingForm.district}, ${slotBookingForm.state}`}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Confirm Button for Stage 2 */}
                        <div className="flex justify-end pt-2 border-t">
                          <Button 
                            onClick={bookSlot}
                            disabled={
                              !slotBookingForm.date || !slotBookingForm.time || !slotBookingForm.state || 
                              !slotBookingForm.district || !slotBookingForm.segment || !slotBookingForm.category ||
                              !slotBookingForm.designation || (showClassLevel && !slotBookingForm.classLevel) ||
                              isBookingSlot
                            }
                            size="sm"
                            className="gap-1.5"
                          >
                            {isBookingSlot ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            {isBookingSlot ? 'Booking...' : 'Confirm Booking'}
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
                    <div className="flex justify-center pt-2">
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

      {/* Slot Booking Modal */}
      <Dialog open={showSlotBooking} onOpenChange={setShowSlotBooking}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {currentSession?.current_stage_order === 2 ? 'Book Technical Assessment Slot' : 'Book Demo Interview Slot'}
            </DialogTitle>
            <DialogDescription>
              {currentSession?.current_stage_order === 2 
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
    </div>
  );
};

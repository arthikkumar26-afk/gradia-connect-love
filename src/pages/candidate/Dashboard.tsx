import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { 
  LayoutDashboard,
  Briefcase, 
  MapPin, 
  Calendar, 
  LogOut, 
  User, 
  FileText, 
  ClipboardList, 
  TrendingUp,
  Menu,
  X,
  Settings,
  BookOpen,
  GraduationCap,
  Award,
  Sparkles,
  CheckCircle,
  Upload,
  RefreshCw,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Target,
  Lightbulb,
  ExternalLink
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { JobApplicationModal } from "@/components/candidate/JobApplicationModal";
import { ApplicationsTab } from "@/components/candidate/ApplicationsTab";
import { InterviewPipelineTab } from "@/components/candidate/InterviewPipelineTab";
import { EducationModal, EducationRecord } from "@/components/candidate/EducationModal";
import ExperienceModal from "@/components/candidate/ExperienceModal";
import FamilyModal from "@/components/candidate/FamilyModal";
import AddressModal, { AddressData } from "@/components/candidate/AddressModal";
import { Briefcase as BriefcaseIcon, Users, MapPin as MapPinIcon } from "lucide-react";

interface FamilyRecord {
  id?: string;
  blood_relation: string;
  name_as_per_aadhar: string;
  date_of_birth: string;
  is_dependent: boolean;
  age: number | null;
}

interface ExperienceRecord {
  id?: string;
  organization: string;
  department: string;
  designation: string;
  from_date: string;
  to_date: string;
  salary_per_month: number | null;
  place: string;
  reference_name: string;
  reference_mobile: string;
  worked_with_narayana: boolean;
  narayana_emp_id: string;
}

interface ResumeAnalysis {
  overall_score: number;
  strengths: string[];
  improvements: string[];
  experience_summary: string;
  skill_highlights: string[];
  career_level: string;
}

interface Job {
  id: string;
  job_title: string;
  department: string;
  description: string;
  experience_required: string;
  job_type: string;
  location: string;
  salary_range: string;
  posted_date: string;
  employer_id: string;
}

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { profile, isAuthenticated, logout, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  
  // Education state
  const [educationRecords, setEducationRecords] = useState<EducationRecord[]>([]);
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [editingEducation, setEditingEducation] = useState<EducationRecord | null>(null);
  const [isEducationLoading, setIsEducationLoading] = useState(false);

  // Experience state
  const [experienceRecords, setExperienceRecords] = useState<ExperienceRecord[]>([]);
  const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<ExperienceRecord | null>(null);
  const [isExperienceLoading, setIsExperienceLoading] = useState(false);

  // Family state
  const [familyRecords, setFamilyRecords] = useState<FamilyRecord[]>([]);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<FamilyRecord | null>(null);
  const [isFamilyLoading, setIsFamilyLoading] = useState(false);

  // Address state
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Load resume analysis from database and migrate localStorage data if needed
  useEffect(() => {
    const fetchResumeAnalysis = async () => {
      if (!profile?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('resume_analyses')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching resume analysis:', error);
          // Fallback to localStorage if database fetch fails
          const storedAnalysis = localStorage.getItem('resumeAnalysis');
          if (storedAnalysis) {
            setResumeAnalysis(JSON.parse(storedAnalysis));
          }
          return;
        }
        
        if (data) {
          setResumeAnalysis({
            overall_score: data.overall_score || 0,
            career_level: data.career_level || '',
            experience_summary: data.experience_summary || '',
            strengths: data.strengths || [],
            improvements: data.improvements || [],
            skill_highlights: data.skill_highlights || []
          });
        } else {
          // Check localStorage for users who registered before database storage
          const storedAnalysis = localStorage.getItem('resumeAnalysis');
          if (storedAnalysis) {
            const parsedAnalysis = JSON.parse(storedAnalysis);
            setResumeAnalysis(parsedAnalysis);
            
            // Migrate localStorage data to database
            try {
              const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-resume-analysis`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    user_id: profile.id,
                    analysis: parsedAnalysis
                  })
                }
              );
              
              if (response.ok) {
                console.log('Successfully migrated resume analysis to database');
                // Clear localStorage after successful migration
                localStorage.removeItem('resumeAnalysis');
              }
            } catch (migrationError) {
              console.error('Error migrating resume analysis:', migrationError);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching resume analysis:', e);
      }
    };
    
    fetchResumeAnalysis();
  }, [profile?.id]);

  // Fetch educational qualifications
  useEffect(() => {
    const fetchEducation = async () => {
      if (!profile?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('educational_qualifications')
          .select('*')
          .eq('user_id', profile.id)
          .order('display_order', { ascending: true });
        
        if (error) {
          console.error('Error fetching education:', error);
          return;
        }
        
        setEducationRecords(data || []);
      } catch (e) {
        console.error('Error fetching education:', e);
      }
    };
    
    fetchEducation();
  }, [profile?.id]);

  // Handle save education
  const handleSaveEducation = async (data: EducationRecord) => {
    if (!profile?.id) return;
    
    setIsEducationLoading(true);
    try {
      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('educational_qualifications')
          .update({
            education_level: data.education_level,
            school_college_name: data.school_college_name,
            specialization: data.specialization,
            board_university: data.board_university,
            year_of_passing: data.year_of_passing,
            percentage_marks: data.percentage_marks,
          })
          .eq('id', data.id);
        
        if (error) throw error;
        
        setEducationRecords(prev => 
          prev.map(rec => rec.id === data.id ? { ...rec, ...data } : rec)
        );
        toast({ title: "Success", description: "Education updated successfully" });
      } else {
        // Insert new
        const { data: newRecord, error } = await supabase
          .from('educational_qualifications')
          .insert({
            user_id: profile.id,
            education_level: data.education_level,
            school_college_name: data.school_college_name,
            specialization: data.specialization,
            board_university: data.board_university,
            year_of_passing: data.year_of_passing,
            percentage_marks: data.percentage_marks,
            display_order: educationRecords.length,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setEducationRecords(prev => [...prev, newRecord]);
        toast({ title: "Success", description: "Education added successfully" });
      }
      
      setIsEducationModalOpen(false);
      setEditingEducation(null);
    } catch (error: any) {
      console.error('Error saving education:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save education",
        variant: "destructive" 
      });
    } finally {
      setIsEducationLoading(false);
    }
  };

  // Handle delete education
  const handleDeleteEducation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('educational_qualifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setEducationRecords(prev => prev.filter(rec => rec.id !== id));
      toast({ title: "Success", description: "Education deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting education:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete education",
        variant: "destructive" 
      });
    }
  };

  // Fetch work experience
  useEffect(() => {
    const fetchExperience = async () => {
      if (!profile?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('work_experience')
          .select('*')
          .eq('user_id', profile.id)
          .order('display_order', { ascending: true });
        
        if (error) {
          console.error('Error fetching experience:', error);
          return;
        }
        
        setExperienceRecords(data || []);
      } catch (e) {
        console.error('Error fetching experience:', e);
      }
    };
    
    fetchExperience();
  }, [profile?.id]);

  // Handle save experience
  const handleSaveExperience = async (data: ExperienceRecord) => {
    if (!profile?.id) return;
    
    setIsExperienceLoading(true);
    try {
      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('work_experience')
          .update({
            organization: data.organization,
            department: data.department,
            designation: data.designation,
            from_date: data.from_date || null,
            to_date: data.to_date || null,
            salary_per_month: data.salary_per_month,
            place: data.place,
            reference_name: data.reference_name,
            reference_mobile: data.reference_mobile,
            worked_with_narayana: data.worked_with_narayana,
            narayana_emp_id: data.narayana_emp_id,
          })
          .eq('id', data.id);
        
        if (error) throw error;
        
        setExperienceRecords(prev => 
          prev.map(rec => rec.id === data.id ? { ...rec, ...data } : rec)
        );
        toast({ title: "Success", description: "Experience updated successfully" });
      } else {
        // Insert new
        const { data: newRecord, error } = await supabase
          .from('work_experience')
          .insert({
            user_id: profile.id,
            organization: data.organization,
            department: data.department,
            designation: data.designation,
            from_date: data.from_date || null,
            to_date: data.to_date || null,
            salary_per_month: data.salary_per_month,
            place: data.place,
            reference_name: data.reference_name,
            reference_mobile: data.reference_mobile,
            worked_with_narayana: data.worked_with_narayana,
            narayana_emp_id: data.narayana_emp_id,
            display_order: experienceRecords.length,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setExperienceRecords(prev => [...prev, newRecord]);
        toast({ title: "Success", description: "Experience added successfully" });
      }
      
      setIsExperienceModalOpen(false);
      setEditingExperience(null);
    } catch (error: any) {
      console.error('Error saving experience:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save experience",
        variant: "destructive" 
      });
    } finally {
      setIsExperienceLoading(false);
    }
  };

  // Handle delete experience
  const handleDeleteExperience = async (id: string) => {
    try {
      const { error } = await supabase
        .from('work_experience')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setExperienceRecords(prev => prev.filter(rec => rec.id !== id));
      toast({ title: "Success", description: "Experience deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting experience:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete experience",
        variant: "destructive" 
      });
    }
  };

  // Fetch family details
  useEffect(() => {
    const fetchFamily = async () => {
      if (!profile?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('family_details')
          .select('*')
          .eq('user_id', profile.id)
          .order('display_order', { ascending: true });
        
        if (error) {
          console.error('Error fetching family:', error);
          return;
        }
        
        setFamilyRecords(data || []);
      } catch (e) {
        console.error('Error fetching family:', e);
      }
    };
    
    fetchFamily();
  }, [profile?.id]);

  // Handle save family
  const handleSaveFamily = async (data: FamilyRecord) => {
    if (!profile?.id) return;
    
    setIsFamilyLoading(true);
    try {
      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('family_details')
          .update({
            blood_relation: data.blood_relation,
            name_as_per_aadhar: data.name_as_per_aadhar,
            date_of_birth: data.date_of_birth || null,
            is_dependent: data.is_dependent,
            age: data.age,
          })
          .eq('id', data.id);
        
        if (error) throw error;
        
        setFamilyRecords(prev => 
          prev.map(rec => rec.id === data.id ? { ...rec, ...data } : rec)
        );
        toast({ title: "Success", description: "Family member updated successfully" });
      } else {
        // Insert new
        const { data: newRecord, error } = await supabase
          .from('family_details')
          .insert({
            user_id: profile.id,
            blood_relation: data.blood_relation,
            name_as_per_aadhar: data.name_as_per_aadhar,
            date_of_birth: data.date_of_birth || null,
            is_dependent: data.is_dependent,
            age: data.age,
            display_order: familyRecords.length,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setFamilyRecords(prev => [...prev, newRecord]);
        toast({ title: "Success", description: "Family member added successfully" });
      }
      
      setIsFamilyModalOpen(false);
      setEditingFamily(null);
    } catch (error: any) {
      console.error('Error saving family:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save family member",
        variant: "destructive" 
      });
    } finally {
      setIsFamilyLoading(false);
    }
  };

  // Handle delete family
  const handleDeleteFamily = async (id: string) => {
    try {
      const { error } = await supabase
        .from('family_details')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setFamilyRecords(prev => prev.filter(rec => rec.id !== id));
      toast({ title: "Success", description: "Family member deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting family:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete family member",
        variant: "destructive" 
      });
    }
  };

  // Fetch address details
  useEffect(() => {
    const fetchAddress = async () => {
      if (!profile?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('address_details')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching address:', error);
          return;
        }
        
        if (data) {
          setAddressData(data);
        }
      } catch (e) {
        console.error('Error fetching address:', e);
      }
    };
    
    fetchAddress();
  }, [profile?.id]);

  // Handle save address
  const handleSaveAddress = async (data: AddressData) => {
    if (!profile?.id) return;
    
    try {
      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('address_details')
          .update({
            present_door_flat_no: data.present_door_flat_no,
            present_street: data.present_street,
            present_village_area: data.present_village_area,
            present_mandal: data.present_mandal,
            present_district: data.present_district,
            present_state: data.present_state,
            present_pin_code: data.present_pin_code,
            permanent_door_flat_no: data.permanent_door_flat_no,
            permanent_street: data.permanent_street,
            permanent_village_area: data.permanent_village_area,
            permanent_mandal: data.permanent_mandal,
            permanent_district: data.permanent_district,
            permanent_state: data.permanent_state,
            permanent_pin_code: data.permanent_pin_code,
            same_as_present: data.same_as_present,
          })
          .eq('id', data.id);
        
        if (error) throw error;
        
        setAddressData({ ...data });
        toast({ title: "Success", description: "Address updated successfully" });
      } else {
        // Insert new
        const { data: newRecord, error } = await supabase
          .from('address_details')
          .insert({
            user_id: profile.id,
            present_door_flat_no: data.present_door_flat_no,
            present_street: data.present_street,
            present_village_area: data.present_village_area,
            present_mandal: data.present_mandal,
            present_district: data.present_district,
            present_state: data.present_state,
            present_pin_code: data.present_pin_code,
            permanent_door_flat_no: data.permanent_door_flat_no,
            permanent_street: data.permanent_street,
            permanent_village_area: data.permanent_village_area,
            permanent_mandal: data.permanent_mandal,
            permanent_district: data.permanent_district,
            permanent_state: data.permanent_state,
            permanent_pin_code: data.permanent_pin_code,
            same_as_present: data.same_as_present,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setAddressData(newRecord);
        toast({ title: "Success", description: "Address saved successfully" });
      }
      
      setIsAddressModalOpen(false);
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save address",
        variant: "destructive" 
      });
    }
  };

  const handleReanalyzeResume = async () => {
    if (!profile?.resume_url || !profile?.id) {
      toast({
        title: "No Resume Found",
        description: "Please upload a resume first to analyze it.",
        variant: "destructive",
      });
      return;
    }

    setIsReanalyzing(true);
    
    try {
      // Fetch the resume file from the URL
      const response = await fetch(profile.resume_url);
      if (!response.ok) {
        throw new Error("Failed to fetch resume file");
      }
      
      const blob = await response.blob();
      const fileName = profile.resume_url.split('/').pop() || 'resume.pdf';
      const file = new File([blob], fileName, { type: blob.type || 'application/pdf' });
      
      // Create form data and send to parse-resume function
      const formData = new FormData();
      formData.append('file', file);
      
      const parseResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-resume`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      if (!parseResponse.ok) {
        const errorData = await parseResponse.json();
        throw new Error(errorData.error || "Failed to analyze resume");
      }
      
      const analysisData = await parseResponse.json();
      
      // Save the new analysis to the database
      const saveResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-resume-analysis`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: profile.id,
            analysis: analysisData
          })
        }
      );
      
      if (!saveResponse.ok) {
        console.error('Failed to save analysis to database');
      }
      
      // Update local state
      setResumeAnalysis({
        overall_score: analysisData.overall_score || 0,
        career_level: analysisData.career_level || '',
        experience_summary: analysisData.experience_summary || '',
        strengths: analysisData.strengths || [],
        improvements: analysisData.improvements || [],
        skill_highlights: analysisData.skill_highlights || []
      });
      
      toast({
        title: "Resume Re-analyzed!",
        description: `Your new AI score is ${analysisData.overall_score}/100`,
      });
      
    } catch (error: any) {
      console.error('Error re-analyzing resume:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not re-analyze your resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReanalyzing(false);
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "applications", label: "My Applications", icon: ClipboardList },
    { id: "pipeline", label: "Interview Pipeline", icon: TrendingUp },
    { id: "jobs", label: "Suitable Jobs", icon: Briefcase },
    { id: "resume", label: "Resume Builder", icon: FileText },
    { id: "learning", label: "Learning", icon: BookOpen },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const dashboardCards = [
    {
      title: "Available Jobs",
      value: jobs.length.toString(),
      subtitle: "Open positions",
      icon: Briefcase,
      gradient: "from-primary/20 to-primary/5",
    },
    {
      title: "Applications",
      value: applicationCount.toString(),
      subtitle: "Submitted",
      icon: FileText,
      gradient: "from-accent/20 to-accent/5",
    },
    {
      title: "Active Interviews",
      value: interviewCount.toString(),
      subtitle: "In progress",
      icon: TrendingUp,
      gradient: "from-success/20 to-success/5",
    },
    {
      title: "Experience Level",
      value: profile?.experience_level || "N/A",
      subtitle: "Your profile",
      icon: Award,
      gradient: "from-secondary/20 to-secondary/5",
    },
  ];

  const fetchApplicationCount = async () => {
    if (!profile?.id) return;
    const { count } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', profile.id);
    setApplicationCount(count || 0);
  };

  const fetchInterviewCount = async () => {
    if (!profile?.id) return;
    const { count } = await supabase
      .from('interview_candidates')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', profile.id)
      .eq('status', 'active');
    setInterviewCount(count || 0);
  };

  useEffect(() => {
    // Wait for auth loading to complete
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigate("/candidate/login");
      return;
    }

    // If authenticated but no profile exists, redirect to create profile
    if (!profile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile to continue.",
      });
      navigate("/candidate/create-profile");
      return;
    }

    if (profile.role !== "candidate") {
      // Non-candidates should not access this page
      toast({
        title: "Access Denied",
        description: "This dashboard is for candidates only.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    fetchJobs();
    fetchApplicationCount();
    fetchInterviewCount();

    // Subscribe to real-time job updates
    const channel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          console.log('Real-time job update:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new.status === 'active') {
            // Add new active job to the list
            setJobs(prev => [payload.new as Job, ...prev].slice(0, 10));
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.status === 'active') {
              // Update existing job or add if newly activated
              setJobs(prev => {
                const exists = prev.some(job => job.id === payload.new.id);
                if (exists) {
                  return prev.map(job => job.id === payload.new.id ? payload.new as Job : job);
                } else {
                  return [payload.new as Job, ...prev].slice(0, 10);
                }
              });
            } else {
              // Remove job if no longer active
              setJobs(prev => prev.filter(job => job.id !== payload.new.id));
            }
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted job
            setJobs(prev => prev.filter(job => job.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, profile, navigate]);

  const handleApply = (job: Job) => {
    setSelectedJob(job);
    setIsApplicationModalOpen(true);
  };

  const handleApplicationSubmitted = () => {
    fetchApplicationCount();
    fetchInterviewCount();
  };

  const handleViewPipeline = (applicationId: string) => {
    setActiveMenu("pipeline");
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "active")
        .order("posted_date", { ascending: false });

      if (error) throw error;
      
      // Filter jobs based on candidate's profile preferences
      let suitableJobs = data || [];
      
      if (profile) {
        suitableJobs = suitableJobs.filter((job) => {
          let matches = false;
          
          // Match by preferred role (job title contains preferred role)
          if (profile.preferred_role && job.job_title) {
            const preferredRoleLower = profile.preferred_role.toLowerCase();
            const jobTitleLower = job.job_title.toLowerCase();
            const jobDeptLower = job.department?.toLowerCase() || '';
            if (jobTitleLower.includes(preferredRoleLower) || preferredRoleLower.includes(jobTitleLower) || jobDeptLower.includes(preferredRoleLower)) {
              matches = true;
            }
          }
          
          // Match by location (preferred district/state)
          if (job.location) {
            const jobLocationLower = job.location.toLowerCase();
            if (profile.preferred_district && jobLocationLower.includes(profile.preferred_district.toLowerCase())) {
              matches = true;
            }
            if (profile.preferred_state && jobLocationLower.includes(profile.preferred_state.toLowerCase())) {
              matches = true;
            }
            if (profile.preferred_district_2 && jobLocationLower.includes(profile.preferred_district_2.toLowerCase())) {
              matches = true;
            }
            if (profile.preferred_state_2 && jobLocationLower.includes(profile.preferred_state_2.toLowerCase())) {
              matches = true;
            }
            if (profile.current_district && jobLocationLower.includes(profile.current_district.toLowerCase())) {
              matches = true;
            }
            if (profile.current_state && jobLocationLower.includes(profile.current_state.toLowerCase())) {
              matches = true;
            }
          }
          
          // Match by primary subject for education jobs
          if (profile.primary_subject && job.job_title) {
            const subjectLower = profile.primary_subject.toLowerCase();
            const jobTitleLower = job.job_title.toLowerCase();
            const descLower = job.description?.toLowerCase() || '';
            if (jobTitleLower.includes(subjectLower) || descLower.includes(subjectLower)) {
              matches = true;
            }
          }
          
          return matches;
        });
      }
      
      // Limit to 10 suitable jobs
      setJobs(suitableJobs.slice(0, 10));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPageTitle = () => {
    switch (activeMenu) {
      case "dashboard": return `Welcome, ${profile?.full_name || 'User'}`;
      case "applications": return "My Applications";
      case "pipeline": return "Interview Pipeline";
      case "jobs": return "Suitable Jobs";
      case "resume": return "Resume Builder";
      case "learning": return "Learning";
      case "settings": return "Settings";
      default: return `Welcome, ${profile?.full_name || 'User'}`;
    }
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-subtle">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or no profile after loading, the useEffect will handle redirect
  if (!profile) {
    return null;
  }

  return (
    <div className="bg-subtle flex min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-card border-r border-border transition-all duration-300 overflow-hidden flex flex-col fixed top-[64px] left-0 h-[calc(100vh-64px)] z-40`}
      >
        {/* User Info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.full_name}
              </p>
              <p className="text-xs text-muted-foreground">Candidate</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-accent/10 text-accent font-medium border-l-4 border-accent -ml-1 pl-5"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm whitespace-nowrap">{item.label}</span>
                {item.id === "applications" && applicationCount > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs flex-shrink-0">
                    {applicationCount}
                  </Badge>
                )}
                {item.id === "pipeline" && interviewCount > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs flex-shrink-0">
                    {interviewCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        {/* Top Header */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/profile/edit")}>
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </header>


        {/* Dashboard Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {/* Dashboard View */}
            {activeMenu === "dashboard" && (
              <>
                {/* Registration Number Banner */}
                {profile?.registration_number && (
                  <Card className="mb-6 overflow-hidden border-accent/30 bg-gradient-to-r from-accent/10 via-primary/5 to-accent/10">
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-accent/20 rounded-lg">
                            <Award className="h-6 w-6 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Your Registration Number</p>
                            <p className="text-2xl font-bold text-accent tracking-wider">{profile.registration_number}</p>
                          </div>
                        </div>
                        <div className="text-center sm:text-right">
                          <p className="text-xs text-muted-foreground">Share this with employers</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              navigator.clipboard.writeText(profile.registration_number || '');
                              toast({ title: "Copied!", description: "Registration number copied to clipboard" });
                            }}
                            className="mt-1"
                          >
                            Copy Number
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Resume Analysis Section */}
                <Card className="mb-6 overflow-hidden border-border">
                  <CardHeader className="bg-gradient-to-r from-accent/10 via-primary/5 to-accent/10 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-accent/20 rounded-lg">
                        <Sparkles className="h-5 w-5 text-accent" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-foreground">
                        AI Detected Profile Details
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Profile Picture & Resume Score */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-4">
                        {/* Profile Picture */}
                        <div className="flex-shrink-0">
                          {profile?.profile_picture ? (
                            <div className="w-28 h-28 rounded-full border-4 border-accent/30 overflow-hidden shadow-lg">
                              <img 
                                src={profile.profile_picture} 
                                alt={profile?.full_name || 'Profile'} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-28 h-28 rounded-full border-4 border-dashed border-border bg-muted flex items-center justify-center">
                              <User className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Resume Score */}
                        <div className="flex flex-col items-center">
                          <div className="relative w-20 h-20">
                            <svg className="w-20 h-20 transform -rotate-90">
                              <circle
                                cx="40"
                                cy="40"
                                r="32"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="transparent"
                                className="text-muted"
                              />
                              <circle
                                cx="40"
                                cy="40"
                                r="32"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="transparent"
                                strokeDasharray={201}
                                strokeDashoffset={201 * (1 - (profile?.resume_url ? 0.78 : 0))}
                                className="text-accent transition-all duration-1000"
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xl font-bold text-foreground">
                                {profile?.resume_url ? '78' : '0'}%
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground mt-1">Resume Score</span>
                        </div>
                      </div>

                      {/* Detected Profile Details - Table Format */}
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-foreground mb-3">AI Detected Details</h4>
                        <div className="border border-border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <tbody>
                              {/* Row 0: Registration Number */}
                              <tr className="border-b border-border bg-accent/5">
                                <td className="px-3 py-2 bg-accent/10 font-medium text-accent w-1/4">REG. NUMBER</td>
                                <td className="px-3 py-2 text-accent font-bold tracking-wider" colSpan={4}>{profile?.registration_number || '-'}</td>
                              </tr>
                              {/* Row 1: Name and Date */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground w-1/4">NAME</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.full_name || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground w-1/6">Date</td>
                                <td className="px-3 py-2 text-foreground">{profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-IN') : '-'}</td>
                              </tr>
                              {/* Row 2: Current State and Current District */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">CURRENT STATE</td>
                                <td className="px-3 py-2 text-foreground">{profile?.current_state || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">CURRENT DISTRICT</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.current_district || '-'}</td>
                              </tr>
                              {/* Row 3: DOB and Gender */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">DOB</td>
                                <td className="px-3 py-2 text-foreground">{profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">GENDER</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.gender || '-'}</td>
                              </tr>
                              {/* Row 4: Qualification and Office Type */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">QUALIFICATION</td>
                                <td className="px-3 py-2 text-foreground">{profile?.highest_qualification || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">OFFICE TYPE</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.office_type || '-'}</td>
                              </tr>
                              {/* Row 5: Segment and Category */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">SEGMENT</td>
                                <td className="px-3 py-2 text-foreground">{profile?.segment || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">CATEGORY</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{(profile as any)?.category || '-'}</td>
                              </tr>
                              {/* Row 5b: Current Salary and Expected Salary */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">CURRENT SALARY</td>
                                <td className="px-3 py-2 text-foreground">{(profile as any)?.current_salary ? `₹${Number((profile as any).current_salary).toLocaleString('en-IN')}` : '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">EXPECTED SALARY</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{(profile as any)?.expected_salary ? `₹${Number((profile as any).expected_salary).toLocaleString('en-IN')}` : '-'}</td>
                              </tr>
                              {/* Row 5c: Available From and Program */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">AVAILABLE FROM</td>
                                <td className="px-3 py-2 text-foreground">{(profile as any)?.available_from ? new Date((profile as any).available_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">PROGRAM</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.program || '-'}</td>
                              </tr>
                              {/* Row 6: Classes Handled and Languages Known */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">CLASSES HANDLED</td>
                                <td className="px-3 py-2 text-foreground">{profile?.classes_handled || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">LANGUAGES KNOWN</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.languages?.length ? profile.languages.join(', ') : '-'}</td>
                              </tr>
                              {/* Row 7: Primary Subject and Batch */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">PRIMARY SUBJECT</td>
                                <td className="px-3 py-2 text-foreground">{profile?.primary_subject || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">BATCH</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.batch || '-'}</td>
                              </tr>
                              {/* Row 8: Preferred State 1 and District 1 */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">PREFERRED STATE</td>
                                <td className="px-3 py-2 text-foreground">{profile?.preferred_state || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">PREFERRED DISTRICT</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.preferred_district || '-'}</td>
                              </tr>
                              {/* Row 9: Preferred State 2 and District 2 */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">PREFERRED STATE 2</td>
                                <td className="px-3 py-2 text-foreground">{profile?.preferred_state_2 || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">PREFERRED DISTRICT 2</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.preferred_district_2 || '-'}</td>
                              </tr>
                              {/* Row 10: Mobile 1 and Mobile 2 */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">MOBILE-1</td>
                                <td className="px-3 py-2 text-foreground">{profile?.mobile || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">MOBILE-2</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.alternate_number || '-'}</td>
                              </tr>
                              {/* Row 11: Email */}
                              <tr>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">e-Mail</td>
                                <td className="px-3 py-2 text-foreground" colSpan={4}>{profile?.email || '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setActiveMenu("resume")}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {profile?.resume_url ? 'Update Resume' : 'Upload Resume'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate("/profile/edit")}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Edit Profile
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Resume Analysis - Separate Card (Always Visible) */}
                <Card className="mb-6 overflow-hidden border-green-200 dark:border-green-800">
                  <CardHeader className="bg-gradient-to-r from-green-100 via-emerald-50 to-green-100 dark:from-green-950 dark:via-emerald-950 dark:to-green-950 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <Sparkles className="h-5 w-5 text-green-600" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-foreground">
                          AI Resume Analysis
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-3xl font-bold text-green-600">
                            {resumeAnalysis?.overall_score ?? '-'}<span className="text-sm text-muted-foreground">/100</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Overall Score</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="border border-green-200 dark:border-green-800 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody>
                          {/* Score Progress */}
                          <tr className="border-b border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                            <td className="px-4 py-3 font-medium text-green-700 dark:text-green-400 w-1/4">SCORE</td>
                            <td className="px-4 py-3" colSpan={3}>
                              <div className="flex items-center gap-3">
                                <Progress value={resumeAnalysis?.overall_score ?? 0} className="flex-1 h-3" />
                                <span className="text-sm font-semibold text-green-600 min-w-[50px] text-right">
                                  {resumeAnalysis?.overall_score ?? 0}%
                                </span>
                              </div>
                            </td>
                          </tr>
                          {/* Career Level */}
                          <tr className="border-b border-green-200 dark:border-green-800">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground">CAREER LEVEL</td>
                            <td className="px-4 py-3 text-foreground" colSpan={3}>
                              {resumeAnalysis?.career_level ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                  {resumeAnalysis.career_level}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground italic">Not analyzed yet</span>
                              )}
                            </td>
                          </tr>
                          {/* Experience Summary */}
                          <tr className="border-b border-green-200 dark:border-green-800">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground align-top">EXPERIENCE SUMMARY</td>
                            <td className="px-4 py-3 text-foreground" colSpan={3}>
                              {resumeAnalysis?.experience_summary || <span className="text-muted-foreground italic">Not analyzed yet</span>}
                            </td>
                          </tr>
                          {/* Strengths */}
                          <tr className="border-b border-green-200 dark:border-green-800">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground align-top">STRENGTHS</td>
                            <td className="px-4 py-3" colSpan={3}>
                              {resumeAnalysis?.strengths && resumeAnalysis.strengths.length > 0 ? (
                                <ul className="space-y-1.5">
                                  {resumeAnalysis.strengths.map((strength, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                      <span className="text-foreground">{strength}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-muted-foreground italic">Not analyzed yet</span>
                              )}
                            </td>
                          </tr>
                          {/* Areas for Improvement */}
                          <tr className="border-b border-green-200 dark:border-green-800">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground align-top">AREAS TO IMPROVE</td>
                            <td className="px-4 py-3" colSpan={3}>
                              {resumeAnalysis?.improvements && resumeAnalysis.improvements.length > 0 ? (
                                <ul className="space-y-1.5">
                                  {resumeAnalysis.improvements.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <TrendingUp className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                      <span className="text-foreground">{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-muted-foreground italic">Not analyzed yet</span>
                              )}
                            </td>
                          </tr>
                          {/* Skill Highlights */}
                          <tr>
                            <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground align-top">KEY SKILLS</td>
                            <td className="px-4 py-3" colSpan={3}>
                              {resumeAnalysis?.skill_highlights && resumeAnalysis.skill_highlights.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {resumeAnalysis.skill_highlights.map((skill, idx) => (
                                    <Badge key={idx} variant="outline" className="bg-primary/5 text-primary border-primary/30">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">Not analyzed yet</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Educational Qualification Table */}
                <Card className="overflow-hidden border-border shadow-soft">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                          <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-foreground">Educational Qualification</CardTitle>
                          <p className="text-sm text-muted-foreground">Your academic background</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingEducation(null);
                          setIsEducationModalOpen(true);
                        }}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 overflow-x-auto">
                    <div className="border border-border rounded-lg overflow-hidden min-w-[700px]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">EDUCATION</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">SCHOOL/COLLEGE NAME</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">SPECIALIZATION</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">BOARD/UNIVERSITY</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">YEAR</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">% MARKS</th>
                            <th className="px-4 py-3 text-center font-semibold text-foreground border-b border-border">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {educationRecords.length > 0 ? (
                            educationRecords.map((record) => (
                              <tr key={record.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-foreground font-medium">
                                  {record.education_level}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {record.school_college_name || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {record.specialization || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {record.board_university || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {record.year_of_passing || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {record.percentage_marks !== null ? `${record.percentage_marks}%` : <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setEditingEducation(record);
                                        setIsEducationModalOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => record.id && handleDeleteEducation(record.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p>No education records added yet.</p>
                                <Button
                                  variant="link"
                                  onClick={() => {
                                    setEditingEducation(null);
                                    setIsEducationModalOpen(true);
                                  }}
                                  className="mt-1"
                                >
                                  Add your first qualification
                                </Button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Previous Experience Table */}
                <Card className="overflow-hidden border-border shadow-soft">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-b border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                          <BriefcaseIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-foreground">Previous Experience</CardTitle>
                          <p className="text-sm text-muted-foreground">Your work history</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingExperience(null);
                          setIsExperienceModalOpen(true);
                        }}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 overflow-x-auto">
                    <div className="border border-border rounded-lg overflow-hidden min-w-[900px]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-3 py-3 text-left font-semibold text-foreground border-b border-border">ORGANIZATION</th>
                            <th className="px-3 py-3 text-left font-semibold text-foreground border-b border-border">DEPT & DESIGNATION</th>
                            <th className="px-3 py-3 text-left font-semibold text-foreground border-b border-border">FROM DATE</th>
                            <th className="px-3 py-3 text-left font-semibold text-foreground border-b border-border">TO DATE</th>
                            <th className="px-3 py-3 text-left font-semibold text-foreground border-b border-border">SALARY (PM)</th>
                            <th className="px-3 py-3 text-left font-semibold text-foreground border-b border-border">PLACE</th>
                            <th className="px-3 py-3 text-left font-semibold text-foreground border-b border-border">REF. NAME & MOBILE</th>
                            <th className="px-3 py-3 text-center font-semibold text-foreground border-b border-border">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {experienceRecords.length > 0 ? (
                            experienceRecords.map((record) => (
                              <tr key={record.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                                <td className="px-3 py-3 text-foreground font-medium">
                                  <div>{record.organization}</div>
                                  {record.worked_with_narayana && (
                                    <Badge variant="outline" className="text-xs mt-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                                      Narayana {record.narayana_emp_id && `(${record.narayana_emp_id})`}
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-foreground">
                                  {record.department || record.designation ? (
                                    <div>
                                      {record.department && <div className="text-muted-foreground text-xs">{record.department}</div>}
                                      {record.designation && <div>{record.designation}</div>}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground italic">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-foreground">
                                  {record.from_date || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-3 py-3 text-foreground">
                                  {record.to_date || <span className="text-muted-foreground italic">Present</span>}
                                </td>
                                <td className="px-3 py-3 text-foreground">
                                  {record.salary_per_month !== null ? `₹${record.salary_per_month.toLocaleString()}` : <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-3 py-3 text-foreground">
                                  {record.place || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-3 py-3 text-foreground">
                                  {record.reference_name || record.reference_mobile ? (
                                    <div>
                                      {record.reference_name && <div>{record.reference_name}</div>}
                                      {record.reference_mobile && <div className="text-muted-foreground text-xs">{record.reference_mobile}</div>}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground italic">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setEditingExperience(record);
                                        setIsExperienceModalOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => record.id && handleDeleteExperience(record.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                <BriefcaseIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p>No experience records added yet.</p>
                                <Button
                                  variant="link"
                                  onClick={() => {
                                    setEditingExperience(null);
                                    setIsExperienceModalOpen(true);
                                  }}
                                  className="mt-1"
                                >
                                  Add your first work experience
                                </Button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Family Details Table */}
                <Card className="overflow-hidden border-border shadow-soft">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-b border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                          <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-foreground">Family Details</CardTitle>
                          <p className="text-sm text-muted-foreground">Your family members information</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingFamily(null);
                          setIsFamilyModalOpen(true);
                        }}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 overflow-x-auto">
                    <div className="border border-border rounded-lg overflow-hidden min-w-[600px]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">BLOOD RELATION</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">NAME AS PER AADHAR</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">DOB</th>
                            <th className="px-4 py-3 text-center font-semibold text-foreground border-b border-border">IS DEPENDENT</th>
                            <th className="px-4 py-3 text-center font-semibold text-foreground border-b border-border">AGE</th>
                            <th className="px-4 py-3 text-center font-semibold text-foreground border-b border-border">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {familyRecords.length > 0 ? (
                            familyRecords.map((record) => (
                              <tr key={record.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-foreground font-medium">
                                  {record.blood_relation}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {record.name_as_per_aadhar || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {record.date_of_birth || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge variant={record.is_dependent ? "default" : "outline"} className={record.is_dependent ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}>
                                    {record.is_dependent ? "Yes" : "No"}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-center text-foreground">
                                  {record.age !== null ? record.age : <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setEditingFamily(record);
                                        setIsFamilyModalOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => record.id && handleDeleteFamily(record.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p>No family members added yet.</p>
                                <Button
                                  variant="link"
                                  onClick={() => {
                                    setEditingFamily(null);
                                    setIsFamilyModalOpen(true);
                                  }}
                                  className="mt-1"
                                >
                                  Add your first family member
                                </Button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Address Details Table */}
                <Card className="overflow-hidden border-border shadow-soft">
                  <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 border-b border-teal-200 dark:border-teal-800">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-lg">
                          <MapPinIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-foreground">Address Details</CardTitle>
                          <p className="text-sm text-muted-foreground">Your present and permanent address</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsAddressModalOpen(true)}
                        className="gap-1"
                      >
                        <Pencil className="h-4 w-4" />
                        {addressData ? "Edit" : "Add"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 overflow-x-auto">
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border w-1/4"></th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">PRESENT ADDRESS</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">PERMANENT ADDRESS</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-primary">D.No. / Flat No.</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.present_door_flat_no || <span className="text-muted-foreground italic">-</span>}</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.permanent_door_flat_no || <span className="text-muted-foreground italic">-</span>}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-primary">Street</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.present_street || <span className="text-muted-foreground italic">-</span>}</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.permanent_street || <span className="text-muted-foreground italic">-</span>}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-primary">Village / Area</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.present_village_area || <span className="text-muted-foreground italic">-</span>}</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.permanent_village_area || <span className="text-muted-foreground italic">-</span>}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-primary">Mandal</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.present_mandal || <span className="text-muted-foreground italic">-</span>}</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.permanent_mandal || <span className="text-muted-foreground italic">-</span>}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-primary">District</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.present_district || <span className="text-muted-foreground italic">-</span>}</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.permanent_district || <span className="text-muted-foreground italic">-</span>}</td>
                          </tr>
                          <tr className="border-b-0">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-primary">State & Pin Code</td>
                            <td className="px-4 py-3 text-foreground">
                              {addressData?.present_state || addressData?.present_pin_code ? (
                                <>{addressData.present_state}{addressData.present_state && addressData.present_pin_code ? " - " : ""}{addressData.present_pin_code}</>
                              ) : (
                                <span className="text-muted-foreground italic">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {addressData?.permanent_state || addressData?.permanent_pin_code ? (
                                <>{addressData.permanent_state}{addressData.permanent_state && addressData.permanent_pin_code ? " - " : ""}{addressData.permanent_pin_code}</>
                              ) : (
                                <span className="text-muted-foreground italic">-</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {dashboardCards.map((card, index) => {
                    const Icon = card.icon;
                    
                    return (
                      <Card 
                        key={index}
                        className="overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in border-border"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <CardHeader className={`bg-gradient-to-br ${card.gradient} pb-2`}>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-sm font-semibold text-foreground">
                              {card.title}
                            </CardTitle>
                            <div className="p-1.5 bg-background/50 rounded-lg">
                              <Icon className="h-4 w-4 text-accent" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-3 pb-3">
                          <div className="text-3xl font-bold text-foreground mb-0.5">
                            {card.value}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {card.subtitle}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Quick Actions Section */}
                <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto py-4" 
                      onClick={() => setActiveMenu("jobs")}
                    >
                      <Briefcase className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Suitable Jobs</div>
                        <div className="text-xs text-muted-foreground">Jobs matching your profile</div>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto py-4"
                      onClick={() => setActiveMenu("applications")}
                    >
                      <ClipboardList className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">View Applications</div>
                        <div className="text-xs text-muted-foreground">Track your progress</div>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto py-4"
                      onClick={() => setActiveMenu("pipeline")}
                    >
                      <TrendingUp className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Interview Pipeline</div>
                        <div className="text-xs text-muted-foreground">See interview stages</div>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Recent Jobs Preview */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Recent Job Openings</h3>
                    <Button variant="link" onClick={() => setActiveMenu("jobs")}>
                      View All
                    </Button>
                  </div>
                  <div className="grid gap-4">
                    {jobs.slice(0, 3).map((job) => (
                      <Card key={job.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-foreground">{job.job_title}</h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {job.department}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {job.location}
                              </span>
                            </div>
                          </div>
                          <Button variant="cta" size="sm" onClick={() => handleApply(job)}>
                            Apply
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Applications View */}
            {activeMenu === "applications" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">My Applications</h2>
                    <p className="text-sm text-muted-foreground">Track your job applications</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveMenu("jobs")}>
                    Find More Jobs
                  </Button>
                </div>
                {profile?.id && (
                  <ApplicationsTab 
                    candidateId={profile.id} 
                    onViewPipeline={handleViewPipeline}
                  />
                )}
              </div>
            )}

            {/* Interview Pipeline View */}
            {activeMenu === "pipeline" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Interview Pipeline</h2>
                  <p className="text-sm text-muted-foreground">Track your interview progress</p>
                </div>
                {profile?.id && (
                  <InterviewPipelineTab candidateId={profile.id} />
                )}
              </div>
            )}

            {/* Suitable Jobs View */}
            {activeMenu === "jobs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Suitable Jobs</h2>
                    <p className="text-sm text-muted-foreground">Jobs matching your profile preferences</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/jobs-results')}>
                    View All Jobs
                  </Button>
                </div>

                {isLoading ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading jobs...</p>
                  </div>
                ) : jobs.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Suitable Jobs Found
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      No jobs matching your profile preferences right now. Complete your profile or browse all jobs.
                    </p>
                    <Button variant="outline" onClick={() => navigate('/jobs-results')}>
                      Browse All Jobs
                    </Button>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {jobs.map((job) => (
                      <Card key={job.id} className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                              {job.job_title}
                            </h3>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Briefcase className="h-4 w-4" />
                                {job.department}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Posted {formatDate(job.posted_date)}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary">{job.job_type}</Badge>
                        </div>

                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {job.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            {job.experience_required && (
                              <Badge variant="outline">{job.experience_required}</Badge>
                            )}
                            {job.salary_range && (
                              <Badge variant="outline">{job.salary_range}</Badge>
                            )}
                          </div>
                          <Button variant="cta" onClick={() => handleApply(job)}>Apply Now</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Mock Test & Upskill Sections - Side by Side */}
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Attend Mock Test */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Attend Mock Test</h3>
                    </div>
                    <Card className="p-6 h-full">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                          <Target className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">Ready to Test Your Skills?</h4>
                          <p className="text-sm text-muted-foreground">
                            Take a mock interview to practice and get feedback before the real interview.
                          </p>
                        </div>
                        <Button 
                          variant="cta" 
                          onClick={() => navigate('/candidate/interview-prep')}
                          className="gap-2 mt-2"
                        >
                          <Target className="h-4 w-4" />
                          Start Mock Interview
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {/* Upskill Yourself */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      <h3 className="text-lg font-semibold text-foreground">Upskill Yourself</h3>
                    </div>
                    <Card className="p-6 h-full">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                          <GraduationCap className="h-8 w-8 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">Improve Your Weak Points</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Recommended platforms to enhance your skills
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            <a 
                              href="https://www.coursera.org" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
                            >
                              Coursera <ExternalLink className="h-3 w-3" />
                            </a>
                            <a 
                              href="https://www.udemy.com" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
                            >
                              Udemy <ExternalLink className="h-3 w-3" />
                            </a>
                            <a 
                              href="https://www.linkedin.com/learning" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
                            >
                              LinkedIn Learning <ExternalLink className="h-3 w-3" />
                            </a>
                            <a 
                              href="https://www.edx.org" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
                            >
                              edX <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => navigate('/learning')}
                          className="gap-2 mt-2"
                        >
                          Explore Courses
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* Resume Builder Placeholder */}
            {activeMenu === "resume" && (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Resume Builder</h2>
                <p className="text-muted-foreground mb-4">Coming soon - Build and manage your resumes</p>
                <Button variant="outline" asChild>
                  <Link to="/candidate/resume-builder">Go to Resume Builder</Link>
                </Button>
              </div>
            )}

            {/* Learning Placeholder */}
            {activeMenu === "learning" && (
              <div className="text-center py-12">
                <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Learning Platform</h2>
                <p className="text-muted-foreground mb-4">Enhance your skills with our courses</p>
                <Button variant="outline" asChild>
                  <Link to="/learning">Explore Courses</Link>
                </Button>
              </div>
            )}

            {/* Settings Placeholder */}
            {activeMenu === "settings" && (
              <div className="text-center py-12">
                <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Settings</h2>
                <p className="text-muted-foreground mb-4">Manage your account preferences</p>
                <Button variant="outline" onClick={() => navigate("/profile/edit")}>
                  Edit Profile
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Application Modal */}
      <JobApplicationModal
        job={selectedJob}
        open={isApplicationModalOpen}
        onOpenChange={setIsApplicationModalOpen}
        candidateId={profile?.id || ''}
        candidateProfile={profile}
        onApplicationSubmitted={handleApplicationSubmitted}
      />

      {/* Education Modal */}
      <EducationModal
        isOpen={isEducationModalOpen}
        onClose={() => {
          setIsEducationModalOpen(false);
          setEditingEducation(null);
        }}
        onSave={handleSaveEducation}
        editingRecord={editingEducation}
        isLoading={isEducationLoading}
      />

      {/* Experience Modal */}
      <ExperienceModal
        isOpen={isExperienceModalOpen}
        onClose={() => {
          setIsExperienceModalOpen(false);
          setEditingExperience(null);
        }}
        onSave={handleSaveExperience}
        editingRecord={editingExperience}
      />

      {/* Family Modal */}
      <FamilyModal
        isOpen={isFamilyModalOpen}
        onClose={() => {
          setIsFamilyModalOpen(false);
          setEditingFamily(null);
        }}
        onSave={handleSaveFamily}
        editingRecord={editingFamily}
      />

      {/* Address Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleSaveAddress}
        existingData={addressData}
      />
    </div>
  );
};

export default CandidateDashboard;

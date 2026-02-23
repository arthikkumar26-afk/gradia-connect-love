import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface MentorshipEnrollment {
  id: string;
  candidate_id: string;
  mentor_id: string;
  topic: string;
  status: string;
  sessions_completed: number;
  next_session: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  mentor_profile?: { full_name: string; email: string; mobile: string | null; location: string | null; profile_picture: string | null; highest_qualification: string | null; experience_level: string | null; };
  candidate_profile?: { full_name: string; email: string; mobile: string | null; location: string | null; gender: string | null; date_of_birth: string | null; highest_qualification: string | null; experience_level: string | null; };
  homework?: MentorshipHomework[];
  documents?: MentorshipDocument[];
  courses?: MentorshipCourse[];
}

export interface MentorshipHomework {
  id: string;
  enrollment_id: string;
  mentor_id: string;
  candidate_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  score: number | null;
  feedback: string | null;
  created_at: string;
}

export interface MentorshipDocument {
  id: string;
  enrollment_id: string;
  homework_id: string | null;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  review_status: string;
  score: number | null;
  created_at: string;
}

export interface MentorshipCourse {
  id: string;
  enrollment_id: string;
  title: string;
  total_modules: number;
  completed_modules: number;
  status: string;
}

export function useMentorship(role: "candidate" | "mentor") {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<MentorshipEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnrollments = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const filterCol = role === "candidate" ? "candidate_id" : "mentor_id";
      const joinCol = role === "candidate" ? "mentor_id" : "candidate_id";

      // Fetch enrollments
      const { data: enrollData, error: enrollError } = await supabase
        .from("mentorship_enrollments")
        .select("*")
        .eq(filterCol, profile.id);

      if (enrollError) throw enrollError;
      if (!enrollData || enrollData.length === 0) {
        setEnrollments([]);
        setLoading(false);
        return;
      }

      // Fetch related profiles
      const relatedIds = enrollData.map(e => role === "candidate" ? e.mentor_id : e.candidate_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, mobile, location, gender, date_of_birth, highest_qualification, experience_level, profile_picture")
        .in("id", relatedIds);

      // Fetch homework for all enrollments
      const enrollIds = enrollData.map(e => e.id);
      const { data: hwData } = await supabase
        .from("mentorship_homework")
        .select("*")
        .in("enrollment_id", enrollIds)
        .order("created_at", { ascending: false });

      // Fetch documents
      const { data: docData } = await supabase
        .from("mentorship_documents")
        .select("*")
        .in("enrollment_id", enrollIds)
        .order("created_at", { ascending: false });

      // Fetch courses
      const { data: courseData } = await supabase
        .from("mentorship_courses")
        .select("*")
        .in("enrollment_id", enrollIds);

      const enriched: MentorshipEnrollment[] = enrollData.map(e => {
        const relatedProfile = profiles?.find(p => p.id === (role === "candidate" ? e.mentor_id : e.candidate_id));
        return {
          ...e,
          ...(role === "candidate"
            ? { mentor_profile: relatedProfile as any }
            : { candidate_profile: relatedProfile as any }),
          homework: (hwData || []).filter(h => h.enrollment_id === e.id),
          documents: (docData || []).filter(d => d.enrollment_id === e.id),
          courses: (courseData || []).filter(c => c.enrollment_id === e.id),
        };
      });

      setEnrollments(enriched);
    } catch (err: any) {
      console.error("Error fetching mentorships:", err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, role]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const assignHomework = async (enrollmentId: string, candidateId: string, title: string, description: string, dueDate: string) => {
    if (!profile?.id) return;
    const { error } = await supabase.from("mentorship_homework").insert({
      enrollment_id: enrollmentId,
      mentor_id: profile.id,
      candidate_id: candidateId,
      title,
      description,
      due_date: dueDate || null,
      status: "pending",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Homework Assigned!", description: `"${title}" has been assigned.` });
      fetchEnrollments();
    }
  };

  const updateHomeworkStatus = async (homeworkId: string, status: string, score?: number, feedback?: string) => {
    const updates: any = { status };
    if (score !== undefined) updates.score = score;
    if (feedback) updates.feedback = feedback;
    const { error } = await supabase.from("mentorship_homework").update(updates).eq("id", homeworkId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `Homework ${status}.` });
      fetchEnrollments();
    }
  };

  const uploadDocument = async (enrollmentId: string, homeworkId: string | null, file: File) => {
    if (!profile?.id) return;
    const filePath = `${profile.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("mentorship-docs").upload(filePath, file);
    if (uploadError) {
      toast({ title: "Upload Failed", description: uploadError.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("mentorship-docs").getPublicUrl(filePath);
    const { error: dbError } = await supabase.from("mentorship_documents").insert({
      enrollment_id: enrollmentId,
      homework_id: homeworkId,
      uploaded_by: profile.id,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_type: file.type,
      file_size: file.size,
    });
    if (dbError) {
      toast({ title: "Error", description: dbError.message, variant: "destructive" });
    } else {
      toast({ title: "Document Uploaded", description: file.name });
      fetchEnrollments();
    }
  };

  const reviewDocument = async (docId: string, score: number) => {
    const { error } = await supabase.from("mentorship_documents").update({ review_status: "reviewed", score }).eq("id", docId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Document Reviewed", description: `Score: ${score}%` });
      fetchEnrollments();
    }
  };

  return {
    enrollments,
    loading,
    refetch: fetchEnrollments,
    assignHomework,
    updateHomeworkStatus,
    uploadDocument,
    reviewDocument,
  };
}

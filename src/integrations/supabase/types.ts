export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      address_details: {
        Row: {
          created_at: string
          id: string
          permanent_district: string | null
          permanent_door_flat_no: string | null
          permanent_mandal: string | null
          permanent_pin_code: string | null
          permanent_state: string | null
          permanent_street: string | null
          permanent_village_area: string | null
          present_district: string | null
          present_door_flat_no: string | null
          present_mandal: string | null
          present_pin_code: string | null
          present_state: string | null
          present_street: string | null
          present_village_area: string | null
          same_as_present: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permanent_district?: string | null
          permanent_door_flat_no?: string | null
          permanent_mandal?: string | null
          permanent_pin_code?: string | null
          permanent_state?: string | null
          permanent_street?: string | null
          permanent_village_area?: string | null
          present_district?: string | null
          present_door_flat_no?: string | null
          present_mandal?: string | null
          present_pin_code?: string | null
          present_state?: string | null
          present_street?: string | null
          present_village_area?: string | null
          same_as_present?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permanent_district?: string | null
          permanent_door_flat_no?: string | null
          permanent_mandal?: string | null
          permanent_pin_code?: string | null
          permanent_state?: string | null
          permanent_street?: string | null
          permanent_village_area?: string | null
          present_district?: string | null
          present_door_flat_no?: string | null
          present_mandal?: string | null
          present_pin_code?: string | null
          present_state?: string | null
          present_street?: string | null
          present_village_area?: string | null
          same_as_present?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agreements: {
        Row: {
          admin_email: string
          admin_name: string
          company_name: string | null
          created_at: string | null
          employer_id: string
          id: string
          ip_address: string | null
          signed_at: string
        }
        Insert: {
          admin_email: string
          admin_name: string
          company_name?: string | null
          created_at?: string | null
          employer_id: string
          id?: string
          ip_address?: string | null
          signed_at?: string
        }
        Update: {
          admin_email?: string
          admin_name?: string
          company_name?: string | null
          created_at?: string | null
          employer_id?: string
          id?: string
          ip_address?: string | null
          signed_at?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          applied_date: string | null
          candidate_id: string
          cover_letter: string | null
          id: string
          job_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          applied_date?: string | null
          candidate_id: string
          cover_letter?: string | null
          id?: string
          job_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          applied_date?: string | null
          candidate_id?: string
          cover_letter?: string | null
          id?: string
          job_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_resources: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_public: boolean | null
          sponsor_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          is_public?: boolean | null
          sponsor_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_public?: boolean | null
          sponsor_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branding_resources_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_resumes: {
        Row: {
          created_at: string
          education: Json | null
          email: string | null
          experience: Json | null
          full_name: string | null
          id: string
          location: string | null
          phone: string | null
          selected_template: string | null
          skills: string[] | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          education?: Json | null
          email?: string | null
          experience?: Json | null
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          selected_template?: string | null
          skills?: string[] | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          education?: Json | null
          email?: string | null
          experience?: Json | null
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          selected_template?: string | null
          skills?: string[] | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      educational_qualifications: {
        Row: {
          board_university: string | null
          created_at: string
          display_order: number | null
          education_level: string
          id: string
          percentage_marks: number | null
          school_college_name: string | null
          specialization: string | null
          updated_at: string
          user_id: string
          year_of_passing: number | null
        }
        Insert: {
          board_university?: string | null
          created_at?: string
          display_order?: number | null
          education_level: string
          id?: string
          percentage_marks?: number | null
          school_college_name?: string | null
          specialization?: string | null
          updated_at?: string
          user_id: string
          year_of_passing?: number | null
        }
        Update: {
          board_university?: string | null
          created_at?: string
          display_order?: number | null
          education_level?: string
          id?: string
          percentage_marks?: number | null
          school_college_name?: string | null
          specialization?: string | null
          updated_at?: string
          user_id?: string
          year_of_passing?: number | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_text: string
          created_at: string
          employer_id: string
          footer_text: string | null
          header_text: string | null
          id: string
          is_active: boolean | null
          primary_color: string | null
          stage_name: string
          subject: string
          template_type: string
          updated_at: string
        }
        Insert: {
          body_text: string
          created_at?: string
          employer_id: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_active?: boolean | null
          primary_color?: string | null
          stage_name: string
          subject: string
          template_type?: string
          updated_at?: string
        }
        Update: {
          body_text?: string
          created_at?: string
          employer_id?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_active?: boolean | null
          primary_color?: string | null
          stage_name?: string
          subject?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      employer_registrations: {
        Row: {
          benefits: string | null
          company_description: string | null
          company_email: string | null
          company_name: string
          company_phone: string | null
          company_website: string | null
          created_at: string
          district: string
          employer_id: string
          id: string
          pin_code: string | null
          registration_status: string | null
          state: string
          tc_accepted: boolean
          tc_accepted_at: string | null
          town_city: string | null
          updated_at: string
        }
        Insert: {
          benefits?: string | null
          company_description?: string | null
          company_email?: string | null
          company_name: string
          company_phone?: string | null
          company_website?: string | null
          created_at?: string
          district: string
          employer_id: string
          id?: string
          pin_code?: string | null
          registration_status?: string | null
          state: string
          tc_accepted?: boolean
          tc_accepted_at?: string | null
          town_city?: string | null
          updated_at?: string
        }
        Update: {
          benefits?: string | null
          company_description?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          company_website?: string | null
          created_at?: string
          district?: string
          employer_id?: string
          id?: string
          pin_code?: string | null
          registration_status?: string | null
          state?: string
          tc_accepted?: boolean
          tc_accepted_at?: string | null
          town_city?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      family_details: {
        Row: {
          age: number | null
          blood_relation: string
          created_at: string
          date_of_birth: string | null
          display_order: number | null
          id: string
          is_dependent: boolean | null
          name_as_per_aadhar: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          blood_relation: string
          created_at?: string
          date_of_birth?: string | null
          display_order?: number | null
          id?: string
          is_dependent?: boolean | null
          name_as_per_aadhar?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          blood_relation?: string
          created_at?: string
          date_of_birth?: string | null
          display_order?: number | null
          id?: string
          is_dependent?: boolean | null
          name_as_per_aadhar?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hr_negotiations: {
        Row: {
          additional_requirements: string | null
          admin_notes: string | null
          admin_response: string | null
          call_meeting_link: string | null
          call_notes: string | null
          call_scheduled_at: string | null
          candidate_id: string
          created_at: string
          current_salary: number | null
          expected_salary: number | null
          id: string
          negotiation_type: string
          notice_period: string | null
          offered_joining_date: string | null
          offered_salary: number | null
          preferred_call_date: string | null
          preferred_call_time: string | null
          preferred_joining_date: string | null
          preferred_location: string | null
          relocation_required: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string
          status: string
          updated_at: string
          willing_to_relocate: boolean | null
        }
        Insert: {
          additional_requirements?: string | null
          admin_notes?: string | null
          admin_response?: string | null
          call_meeting_link?: string | null
          call_notes?: string | null
          call_scheduled_at?: string | null
          candidate_id: string
          created_at?: string
          current_salary?: number | null
          expected_salary?: number | null
          id?: string
          negotiation_type?: string
          notice_period?: string | null
          offered_joining_date?: string | null
          offered_salary?: number | null
          preferred_call_date?: string | null
          preferred_call_time?: string | null
          preferred_joining_date?: string | null
          preferred_location?: string | null
          relocation_required?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id: string
          status?: string
          updated_at?: string
          willing_to_relocate?: boolean | null
        }
        Update: {
          additional_requirements?: string | null
          admin_notes?: string | null
          admin_response?: string | null
          call_meeting_link?: string | null
          call_notes?: string | null
          call_scheduled_at?: string | null
          candidate_id?: string
          created_at?: string
          current_salary?: number | null
          expected_salary?: number | null
          id?: string
          negotiation_type?: string
          notice_period?: string | null
          offered_joining_date?: string | null
          offered_salary?: number | null
          preferred_call_date?: string | null
          preferred_call_time?: string | null
          preferred_joining_date?: string | null
          preferred_location?: string | null
          relocation_required?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string
          status?: string
          updated_at?: string
          willing_to_relocate?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_negotiations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_negotiations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mock_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_answer_keys: {
        Row: {
          answer_text: string
          created_at: string
          id: string
          is_case_sensitive: boolean
          keywords: string[]
          min_keyword_match_percent: number
          question_id: string
          updated_at: string
        }
        Insert: {
          answer_text: string
          created_at?: string
          id?: string
          is_case_sensitive?: boolean
          keywords?: string[]
          min_keyword_match_percent?: number
          question_id: string
          updated_at?: string
        }
        Update: {
          answer_text?: string
          created_at?: string
          id?: string
          is_case_sensitive?: boolean
          keywords?: string[]
          min_keyword_match_percent?: number
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_answer_keys_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_candidates: {
        Row: {
          ai_analysis: Json | null
          ai_score: number | null
          applied_at: string | null
          candidate_id: string
          current_stage_id: string | null
          id: string
          job_id: string
          resume_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          ai_score?: number | null
          applied_at?: string | null
          candidate_id: string
          current_stage_id?: string | null
          id?: string
          job_id: string
          resume_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          ai_score?: number | null
          applied_at?: string | null
          candidate_id?: string
          current_stage_id?: string | null
          id?: string
          job_id?: string
          resume_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_candidates_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "interview_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_events: {
        Row: {
          ai_feedback: Json | null
          ai_score: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          interview_candidate_id: string
          notes: string | null
          scheduled_at: string | null
          stage_id: string
          status: string | null
        }
        Insert: {
          ai_feedback?: Json | null
          ai_score?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          interview_candidate_id: string
          notes?: string | null
          scheduled_at?: string | null
          stage_id: string
          status?: string | null
        }
        Update: {
          ai_feedback?: Json | null
          ai_score?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          interview_candidate_id?: string
          notes?: string | null
          scheduled_at?: string | null
          stage_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_events_interview_candidate_id_fkey"
            columns: ["interview_candidate_id"]
            isOneToOne: false
            referencedRelation: "interview_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_events_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "interview_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_invitations: {
        Row: {
          created_at: string | null
          email_sent_at: string | null
          email_status: string | null
          expires_at: string | null
          id: string
          interview_event_id: string
          invitation_token: string | null
          meeting_link: string | null
        }
        Insert: {
          created_at?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          expires_at?: string | null
          id?: string
          interview_event_id: string
          invitation_token?: string | null
          meeting_link?: string | null
        }
        Update: {
          created_at?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          expires_at?: string | null
          id?: string
          interview_event_id?: string
          invitation_token?: string | null
          meeting_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_invitations_interview_event_id_fkey"
            columns: ["interview_event_id"]
            isOneToOne: false
            referencedRelation: "interview_events"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_question_papers: {
        Row: {
          category: string | null
          class_level: string | null
          created_at: string
          created_by: string | null
          description: string | null
          designation: string | null
          id: string
          is_active: boolean
          pdf_url: string
          segment: string | null
          stage_type: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          class_level?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          designation?: string | null
          id?: string
          is_active?: boolean
          pdf_url: string
          segment?: string | null
          stage_type: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          class_level?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          designation?: string | null
          id?: string
          is_active?: boolean
          pdf_url?: string
          segment?: string | null
          stage_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_question_papers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          created_at: string
          display_order: number
          id: string
          marks: number | null
          options: Json | null
          paper_id: string
          question_number: number
          question_text: string
          question_type: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          marks?: number | null
          options?: Json | null
          paper_id: string
          question_number: number
          question_text: string
          question_type?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          marks?: number | null
          options?: Json | null
          paper_id?: string
          question_number?: number
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "interview_question_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_responses: {
        Row: {
          answers: Json
          completed_at: string | null
          correct_answers: number | null
          created_at: string
          demo_video_url: string | null
          id: string
          interview_event_id: string
          questions: Json
          recording_url: string | null
          score: number | null
          time_taken_seconds: number | null
          total_questions: number
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          demo_video_url?: string | null
          id?: string
          interview_event_id: string
          questions?: Json
          recording_url?: string | null
          score?: number | null
          time_taken_seconds?: number | null
          total_questions?: number
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          demo_video_url?: string | null
          id?: string
          interview_event_id?: string
          questions?: Json
          recording_url?: string | null
          score?: number | null
          time_taken_seconds?: number | null
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "interview_responses_interview_event_id_fkey"
            columns: ["interview_event_id"]
            isOneToOne: false
            referencedRelation: "interview_events"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_solutions: {
        Row: {
          created_at: string
          explanation: string | null
          id: string
          question_id: string
          solution_text: string
          step_by_step: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          id?: string
          question_id: string
          solution_text: string
          step_by_step?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          explanation?: string | null
          id?: string
          question_id?: string
          solution_text?: string
          step_by_step?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_solutions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_stages: {
        Row: {
          created_at: string | null
          id: string
          is_ai_automated: boolean | null
          name: string
          stage_order: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_ai_automated?: boolean | null
          name: string
          stage_order: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_ai_automated?: boolean | null
          name?: string
          stage_order?: number
        }
        Relationships: []
      }
      jobs: {
        Row: {
          closing_date: string | null
          created_at: string | null
          department: string | null
          description: string | null
          employer_id: string
          experience_required: string | null
          id: string
          interview_type: string | null
          is_featured: boolean | null
          job_title: string
          job_type: string | null
          location: string | null
          moderation_status: string | null
          posted_date: string | null
          requirements: string | null
          salary_range: string | null
          skills: string[] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          closing_date?: string | null
          created_at?: string | null
          department?: string | null
          description?: string | null
          employer_id: string
          experience_required?: string | null
          id?: string
          interview_type?: string | null
          is_featured?: boolean | null
          job_title: string
          job_type?: string | null
          location?: string | null
          moderation_status?: string | null
          posted_date?: string | null
          requirements?: string | null
          salary_range?: string | null
          skills?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          closing_date?: string | null
          created_at?: string | null
          department?: string | null
          description?: string | null
          employer_id?: string
          experience_required?: string | null
          id?: string
          interview_type?: string | null
          is_featured?: boolean | null
          job_title?: string
          job_type?: string | null
          location?: string | null
          moderation_status?: string | null
          posted_date?: string | null
          requirements?: string | null
          salary_range?: string | null
          skills?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      management_reviews: {
        Row: {
          areas_for_improvement: string[] | null
          communication_rating: number | null
          created_at: string
          feedback_text: string | null
          feedback_token: string | null
          feedback_token_expires_at: string | null
          id: string
          overall_rating: number | null
          recommendation: string | null
          reviewer_email: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          sent_at: string | null
          session_id: string
          status: string | null
          strengths: string[] | null
          subject_knowledge_rating: number | null
          submitted_at: string | null
          teaching_skills_rating: number | null
          updated_at: string
        }
        Insert: {
          areas_for_improvement?: string[] | null
          communication_rating?: number | null
          created_at?: string
          feedback_text?: string | null
          feedback_token?: string | null
          feedback_token_expires_at?: string | null
          id?: string
          overall_rating?: number | null
          recommendation?: string | null
          reviewer_email?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          sent_at?: string | null
          session_id: string
          status?: string | null
          strengths?: string[] | null
          subject_knowledge_rating?: number | null
          submitted_at?: string | null
          teaching_skills_rating?: number | null
          updated_at?: string
        }
        Update: {
          areas_for_improvement?: string[] | null
          communication_rating?: number | null
          created_at?: string
          feedback_text?: string | null
          feedback_token?: string | null
          feedback_token_expires_at?: string | null
          id?: string
          overall_rating?: number | null
          recommendation?: string | null
          reviewer_email?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          sent_at?: string | null
          session_id?: string
          status?: string | null
          strengths?: string[] | null
          subject_knowledge_rating?: number | null
          submitted_at?: string | null
          teaching_skills_rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "management_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "management_team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mock_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      management_team: {
        Row: {
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          receives_demo_notifications: boolean | null
          receives_slot_notifications: boolean | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          receives_demo_notifications?: boolean | null
          receives_slot_notifications?: boolean | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          receives_demo_notifications?: boolean | null
          receives_slot_notifications?: boolean | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mock_interview_sessions: {
        Row: {
          candidate_id: string
          completed_at: string | null
          created_at: string
          current_stage_order: number
          id: string
          live_stream_started_at: string | null
          live_view_active: boolean | null
          live_view_token: string | null
          overall_feedback: string | null
          overall_score: number | null
          recording_url: string | null
          stages_completed: Json | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          completed_at?: string | null
          created_at?: string
          current_stage_order?: number
          id?: string
          live_stream_started_at?: string | null
          live_view_active?: boolean | null
          live_view_token?: string | null
          overall_feedback?: string | null
          overall_score?: number | null
          recording_url?: string | null
          stages_completed?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          completed_at?: string | null
          created_at?: string
          current_stage_order?: number
          id?: string
          live_stream_started_at?: string | null
          live_view_active?: boolean | null
          live_view_token?: string | null
          overall_feedback?: string | null
          overall_score?: number | null
          recording_url?: string | null
          stages_completed?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_interview_sessions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_interview_stage_results: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          answers: Json | null
          completed_at: string | null
          created_at: string
          id: string
          improvements: string[] | null
          passed: boolean | null
          question_scores: Json | null
          questions: Json | null
          recording_url: string | null
          session_id: string
          stage_name: string
          stage_order: number
          strengths: string[] | null
          time_taken_seconds: number | null
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          id?: string
          improvements?: string[] | null
          passed?: boolean | null
          question_scores?: Json | null
          questions?: Json | null
          recording_url?: string | null
          session_id: string
          stage_name: string
          stage_order: number
          strengths?: string[] | null
          time_taken_seconds?: number | null
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          id?: string
          improvements?: string[] | null
          passed?: boolean | null
          question_scores?: Json | null
          questions?: Json | null
          recording_url?: string | null
          session_id?: string
          stage_name?: string
          stage_order?: number
          strengths?: string[] | null
          time_taken_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_interview_stage_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mock_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_test_sessions: {
        Row: {
          answers: Json | null
          candidate_id: string
          completed_at: string | null
          correct_answers: number | null
          created_at: string
          id: string
          invitation_sent_at: string | null
          questions: Json | null
          recording_url: string | null
          score: number | null
          started_at: string | null
          status: string
          time_taken_seconds: number | null
          total_questions: number
          updated_at: string
        }
        Insert: {
          answers?: Json | null
          candidate_id: string
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          invitation_sent_at?: string | null
          questions?: Json | null
          recording_url?: string | null
          score?: number | null
          started_at?: string | null
          status?: string
          time_taken_seconds?: number | null
          total_questions?: number
          updated_at?: string
        }
        Update: {
          answers?: Json | null
          candidate_id?: string
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          invitation_sent_at?: string | null
          questions?: Json | null
          recording_url?: string | null
          score?: number | null
          started_at?: string | null
          status?: string
          time_taken_seconds?: number | null
          total_questions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_sessions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_letters: {
        Row: {
          created_at: string | null
          currency: string | null
          generated_by_ai: boolean | null
          id: string
          interview_candidate_id: string
          offer_content: string | null
          position_title: string
          responded_at: string | null
          salary_offered: number | null
          sent_at: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          generated_by_ai?: boolean | null
          id?: string
          interview_candidate_id: string
          offer_content?: string | null
          position_title: string
          responded_at?: string | null
          salary_offered?: number | null
          sent_at?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          generated_by_ai?: boolean | null
          id?: string
          interview_candidate_id?: string
          offer_content?: string | null
          position_title?: string
          responded_at?: string | null
          salary_offered?: number | null
          sent_at?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_letters_interview_candidate_id_fkey"
            columns: ["interview_candidate_id"]
            isOneToOne: false
            referencedRelation: "interview_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          alternate_number: string | null
          available_from: string | null
          batch: string | null
          category: string | null
          classes_handled: string | null
          company_description: string | null
          company_name: string | null
          created_at: string | null
          current_district: string | null
          current_salary: number | null
          current_state: string | null
          date_of_birth: string | null
          email: string
          expected_salary: number | null
          experience_level: string | null
          full_name: string
          gender: string | null
          highest_qualification: string | null
          id: string
          languages: string[] | null
          linkedin: string | null
          location: string | null
          mobile: string | null
          office_type: string | null
          preferred_district: string | null
          preferred_district_2: string | null
          preferred_role: string | null
          preferred_state: string | null
          preferred_state_2: string | null
          primary_subject: string | null
          profile_picture: string | null
          program: string | null
          registration_number: string | null
          resume_url: string | null
          role: string
          segment: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          alternate_number?: string | null
          available_from?: string | null
          batch?: string | null
          category?: string | null
          classes_handled?: string | null
          company_description?: string | null
          company_name?: string | null
          created_at?: string | null
          current_district?: string | null
          current_salary?: number | null
          current_state?: string | null
          date_of_birth?: string | null
          email: string
          expected_salary?: number | null
          experience_level?: string | null
          full_name: string
          gender?: string | null
          highest_qualification?: string | null
          id: string
          languages?: string[] | null
          linkedin?: string | null
          location?: string | null
          mobile?: string | null
          office_type?: string | null
          preferred_district?: string | null
          preferred_district_2?: string | null
          preferred_role?: string | null
          preferred_state?: string | null
          preferred_state_2?: string | null
          primary_subject?: string | null
          profile_picture?: string | null
          program?: string | null
          registration_number?: string | null
          resume_url?: string | null
          role: string
          segment?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          alternate_number?: string | null
          available_from?: string | null
          batch?: string | null
          category?: string | null
          classes_handled?: string | null
          company_description?: string | null
          company_name?: string | null
          created_at?: string | null
          current_district?: string | null
          current_salary?: number | null
          current_state?: string | null
          date_of_birth?: string | null
          email?: string
          expected_salary?: number | null
          experience_level?: string | null
          full_name?: string
          gender?: string | null
          highest_qualification?: string | null
          id?: string
          languages?: string[] | null
          linkedin?: string | null
          location?: string | null
          mobile?: string | null
          office_type?: string | null
          preferred_district?: string | null
          preferred_district_2?: string | null
          preferred_role?: string | null
          preferred_state?: string | null
          preferred_state_2?: string | null
          primary_subject?: string | null
          profile_picture?: string | null
          program?: string | null
          registration_number?: string | null
          resume_url?: string | null
          role?: string
          segment?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      resume_analyses: {
        Row: {
          analyzed_at: string
          career_level: string | null
          created_at: string
          experience_summary: string | null
          id: string
          improvements: string[] | null
          overall_score: number | null
          skill_highlights: string[] | null
          strengths: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analyzed_at?: string
          career_level?: string | null
          created_at?: string
          experience_summary?: string | null
          id?: string
          improvements?: string[] | null
          overall_score?: number | null
          skill_highlights?: string[] | null
          strengths?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analyzed_at?: string
          career_level?: string | null
          created_at?: string
          experience_summary?: string | null
          id?: string
          improvements?: string[] | null
          overall_score?: number | null
          skill_highlights?: string[] | null
          strengths?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      slot_bookings: {
        Row: {
          booking_date: string
          booking_time: string
          booking_type: string
          candidate_id: string
          category: string | null
          class_level: string | null
          class_type: string | null
          created_at: string
          department: string | null
          designation: string | null
          district: string | null
          id: string
          location: string | null
          pincode: string | null
          programme: string | null
          segment: string | null
          state: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          booking_date: string
          booking_time: string
          booking_type?: string
          candidate_id: string
          category?: string | null
          class_level?: string | null
          class_type?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          district?: string | null
          id?: string
          location?: string | null
          pincode?: string | null
          programme?: string | null
          segment?: string | null
          state?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          booking_date?: string
          booking_time?: string
          booking_type?: string
          candidate_id?: string
          category?: string | null
          class_level?: string | null
          class_type?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          district?: string | null
          id?: string
          location?: string | null
          pincode?: string | null
          programme?: string | null
          segment?: string | null
          state?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_bookings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_analytics: {
        Row: {
          created_at: string | null
          date: string
          id: string
          leads_generated: number | null
          link_clicks: number | null
          logo_impressions: number | null
          page_views: number | null
          profile_visits: number | null
          sponsor_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          leads_generated?: number | null
          link_clicks?: number | null
          logo_impressions?: number | null
          page_views?: number | null
          profile_visits?: number | null
          sponsor_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          leads_generated?: number | null
          link_clicks?: number | null
          logo_impressions?: number | null
          page_views?: number | null
          profile_visits?: number | null
          sponsor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_analytics_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          company_description: string | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_end_date: string | null
          created_at: string | null
          id: string
          joined_date: string | null
          logo_url: string | null
          status: string
          tier: string
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          company_description?: string | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          created_at?: string | null
          id?: string
          joined_date?: string | null
          logo_url?: string | null
          status?: string
          tier?: string
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          company_description?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          created_at?: string | null
          id?: string
          joined_date?: string | null
          logo_url?: string | null
          status?: string
          tier?: string
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      sponsorships: {
        Row: {
          amount: number | null
          benefits: string[] | null
          created_at: string | null
          currency: string | null
          description: string | null
          end_date: string
          id: string
          sponsor_id: string
          start_date: string
          status: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          benefits?: string[] | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          end_date: string
          id?: string
          sponsor_id: string
          start_date: string
          status?: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          benefits?: string[] | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string
          id?: string
          sponsor_id?: string
          start_date?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsorships_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean | null
          billing_cycle: string
          created_at: string | null
          currency: string
          employer_id: string
          ends_at: string | null
          id: string
          payment_method: string | null
          plan_id: string
          plan_name: string
          started_at: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          auto_renew?: boolean | null
          billing_cycle?: string
          created_at?: string | null
          currency?: string
          employer_id: string
          ends_at?: string | null
          id?: string
          payment_method?: string | null
          plan_id: string
          plan_name: string
          started_at?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          auto_renew?: boolean | null
          billing_cycle?: string
          created_at?: string | null
          currency?: string
          employer_id?: string
          ends_at?: string | null
          id?: string
          payment_method?: string | null
          plan_id?: string
          plan_name?: string
          started_at?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string | null
          department: string | null
          email: string
          employer_id: string
          full_name: string
          id: string
          joined_date: string | null
          position: string | null
          profile_picture: string | null
          updated_at: string | null
          work_status: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email: string
          employer_id: string
          full_name: string
          id?: string
          joined_date?: string | null
          position?: string | null
          profile_picture?: string | null
          updated_at?: string | null
          work_status?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string
          employer_id?: string
          full_name?: string
          id?: string
          joined_date?: string | null
          position?: string | null
          profile_picture?: string | null
          updated_at?: string | null
          work_status?: string | null
        }
        Relationships: []
      }
      team_posts: {
        Row: {
          content: string | null
          created_at: string | null
          employer_id: string
          file_url: string | null
          id: string
          post_type: string
          team_member_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          employer_id: string
          file_url?: string | null
          id?: string
          post_type: string
          team_member_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          employer_id?: string
          file_url?: string | null
          id?: string
          post_type?: string
          team_member_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_posts_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          admin_email: string
          admin_name: string
          created_at: string | null
          employer_id: string
          id: string
        }
        Insert: {
          accepted_at?: string
          admin_email: string
          admin_name: string
          created_at?: string | null
          employer_id: string
          id?: string
        }
        Update: {
          accepted_at?: string
          admin_email?: string
          admin_name?: string
          created_at?: string | null
          employer_id?: string
          id?: string
        }
        Relationships: []
      }
      trending_jobs: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          job_title: string
          search_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          job_title: string
          search_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          job_title?: string
          search_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      viva_criteria: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          employer_id: string
          id: string
          is_active: boolean | null
          max_score: number
          name: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          employer_id: string
          id?: string
          is_active?: boolean | null
          max_score?: number
          name: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          employer_id?: string
          id?: string
          is_active?: boolean | null
          max_score?: number
          name?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      viva_evaluations: {
        Row: {
          created_at: string | null
          criteria_id: string
          evaluated_at: string | null
          evaluator_name: string | null
          id: string
          interview_candidate_id: string
          notes: string | null
          score: number
        }
        Insert: {
          created_at?: string | null
          criteria_id: string
          evaluated_at?: string | null
          evaluator_name?: string | null
          id?: string
          interview_candidate_id: string
          notes?: string | null
          score: number
        }
        Update: {
          created_at?: string | null
          criteria_id?: string
          evaluated_at?: string | null
          evaluator_name?: string | null
          id?: string
          interview_candidate_id?: string
          notes?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "viva_evaluations_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "viva_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viva_evaluations_interview_candidate_id_fkey"
            columns: ["interview_candidate_id"]
            isOneToOne: false
            referencedRelation: "interview_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      viva_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          evaluator_name: string | null
          id: string
          interview_candidate_id: string
          overall_feedback: string | null
          overall_score: number | null
          recommendation: string | null
          scheduled_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          evaluator_name?: string | null
          id?: string
          interview_candidate_id: string
          overall_feedback?: string | null
          overall_score?: number | null
          recommendation?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          evaluator_name?: string | null
          id?: string
          interview_candidate_id?: string
          overall_feedback?: string | null
          overall_score?: number | null
          recommendation?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viva_sessions_interview_candidate_id_fkey"
            columns: ["interview_candidate_id"]
            isOneToOne: false
            referencedRelation: "interview_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      work_experience: {
        Row: {
          created_at: string
          department: string | null
          designation: string | null
          display_order: number | null
          from_date: string | null
          id: string
          narayana_emp_id: string | null
          organization: string
          place: string | null
          reference_mobile: string | null
          reference_name: string | null
          salary_per_month: number | null
          to_date: string | null
          updated_at: string
          user_id: string
          worked_with_narayana: boolean | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          designation?: string | null
          display_order?: number | null
          from_date?: string | null
          id?: string
          narayana_emp_id?: string | null
          organization: string
          place?: string | null
          reference_mobile?: string | null
          reference_name?: string | null
          salary_per_month?: number | null
          to_date?: string | null
          updated_at?: string
          user_id: string
          worked_with_narayana?: boolean | null
        }
        Update: {
          created_at?: string
          department?: string | null
          designation?: string | null
          display_order?: number | null
          from_date?: string | null
          id?: string
          narayana_emp_id?: string | null
          organization?: string
          place?: string | null
          reference_mobile?: string | null
          reference_name?: string | null
          salary_per_month?: number | null
          to_date?: string | null
          updated_at?: string
          user_id?: string
          worked_with_narayana?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_employer: { Args: { u_id: string }; Returns: boolean }
      is_employer_by_role: { Args: { _user_id: string }; Returns: boolean }
      is_employer_profile: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "employer" | "candidate" | "sponsor" | "admin" | "owner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["employer", "candidate", "sponsor", "admin", "owner"],
    },
  },
} as const

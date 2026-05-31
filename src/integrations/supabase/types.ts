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
      ai_interview_sessions: {
        Row: {
          ai_evaluations: Json | null
          answers: Json | null
          completed_at: string | null
          created_at: string | null
          id: string
          interview_candidate_id: string
          job_id: string
          overall_feedback: string | null
          overall_score: number | null
          questions: Json | null
          recordings: Json | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          ai_evaluations?: Json | null
          answers?: Json | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          interview_candidate_id: string
          job_id: string
          overall_feedback?: string | null
          overall_score?: number | null
          questions?: Json | null
          recordings?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_evaluations?: Json | null
          answers?: Json | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          interview_candidate_id?: string
          job_id?: string
          overall_feedback?: string | null
          overall_score?: number | null
          questions?: Json | null
          recordings?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_interview_sessions_interview_candidate_id_fkey"
            columns: ["interview_candidate_id"]
            isOneToOne: false
            referencedRelation: "interview_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_interview_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "employer_public_profiles"
            referencedColumns: ["id"]
          },
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
      campaign_emails: {
        Row: {
          attachments: Json | null
          campaign_name: string
          created_at: string | null
          html_body: string | null
          id: string
          recipient_email: string
          sender_name: string | null
          sent_at: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          campaign_name: string
          created_at?: string | null
          html_body?: string | null
          id?: string
          recipient_email: string
          sender_name?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          campaign_name?: string
          created_at?: string | null
          html_body?: string | null
          id?: string
          recipient_email?: string
          sender_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      candidate_feature_unlocks: {
        Row: {
          amount_paid: number
          candidate_id: string
          created_at: string
          expires_at: string
          feature: string
          id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          unlocked_at: string
        }
        Insert: {
          amount_paid: number
          candidate_id: string
          created_at?: string
          expires_at?: string
          feature: string
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          unlocked_at?: string
        }
        Update: {
          amount_paid?: number
          candidate_id?: string
          created_at?: string
          expires_at?: string
          feature?: string
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          unlocked_at?: string
        }
        Relationships: []
      }
      candidate_feature_usage: {
        Row: {
          candidate_id: string
          created_at: string
          feature: string
          id: string
          period_start: string
          updated_at: string
          used_count: number
        }
        Insert: {
          candidate_id: string
          created_at?: string
          feature: string
          id?: string
          period_start?: string
          updated_at?: string
          used_count?: number
        }
        Update: {
          candidate_id?: string
          created_at?: string
          feature?: string
          id?: string
          period_start?: string
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      candidate_notifications: {
        Row: {
          candidate_id: string
          created_at: string
          employer_name: string | null
          id: string
          is_read: boolean
          job_id: string | null
          job_title: string | null
          link: string | null
          message: string
          title: string
          type: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          employer_name?: string | null
          id?: string
          is_read?: boolean
          job_id?: string | null
          job_title?: string | null
          link?: string | null
          message: string
          title: string
          type?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          employer_name?: string | null
          id?: string
          is_read?: boolean
          job_id?: string | null
          job_title?: string | null
          link?: string | null
          message?: string
          title?: string
          type?: string
        }
        Relationships: []
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
      candidate_subscriptions: {
        Row: {
          candidate_id: string
          created_at: string
          ends_at: string | null
          id: string
          plan: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          ends_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      chapter_wise_papers: {
        Row: {
          chapters: Json | null
          created_at: string
          employer_id: string
          generated_questions: Json | null
          id: string
          is_active: boolean | null
          job_id: string
          pdf_url: string | null
          sections_config: Json | null
          status: string
          title: string
          total_marks: number | null
          total_questions: number | null
          updated_at: string
        }
        Insert: {
          chapters?: Json | null
          created_at?: string
          employer_id: string
          generated_questions?: Json | null
          id?: string
          is_active?: boolean | null
          job_id: string
          pdf_url?: string | null
          sections_config?: Json | null
          status?: string
          title: string
          total_marks?: number | null
          total_questions?: number | null
          updated_at?: string
        }
        Update: {
          chapters?: Json | null
          created_at?: string
          employer_id?: string
          generated_questions?: Json | null
          id?: string
          is_active?: boolean | null
          job_id?: string
          pdf_url?: string | null
          sections_config?: Json | null
          status?: string
          title?: string
          total_marks?: number | null
          total_questions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_wise_papers_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usages: {
        Row: {
          coupon_id: string
          discount_applied: number
          final_amount: number
          id: string
          original_amount: number
          plan_name: string | null
          used_at: string
          user_id: string
          user_role: string
        }
        Insert: {
          coupon_id: string
          discount_applied: number
          final_amount: number
          id?: string
          original_amount: number
          plan_name?: string | null
          used_at?: string
          user_id: string
          user_role: string
        }
        Update: {
          coupon_id?: string
          discount_applied?: number
          final_amount?: number
          id?: string
          original_amount?: number
          plan_name?: string | null
          used_at?: string
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_unlocks: {
        Row: {
          application_id: string | null
          candidate_id: string
          created_at: string
          employer_id: string
          id: string
          job_id: string | null
          points_spent: number
        }
        Insert: {
          application_id?: string | null
          candidate_id: string
          created_at?: string
          employer_id: string
          id?: string
          job_id?: string | null
          points_spent?: number
        }
        Update: {
          application_id?: string | null
          candidate_id?: string
          created_at?: string
          employer_id?: string
          id?: string
          job_id?: string | null
          points_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "cv_unlocks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupons: {
        Row: {
          applicable_to: string
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          max_total_uses: number | null
          max_uses_per_user: number | null
          min_order_amount: number | null
          total_used: number
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_to?: string
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_total_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          total_used?: number
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_to?: string
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_total_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          total_used?: number
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      education_salary_bands: {
        Row: {
          created_at: string
          display_order: number
          group_code: string
          group_name: string
          id: string
          is_active: boolean
          qualifications: string | null
          role_title: string
          salary_max: number
          salary_min: number
          segment: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          group_code: string
          group_name: string
          id?: string
          is_active?: boolean
          qualifications?: string | null
          role_title: string
          salary_max: number
          salary_min: number
          segment: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          group_code?: string
          group_name?: string
          id?: string
          is_active?: boolean
          qualifications?: string | null
          role_title?: string
          salary_max?: number
          salary_min?: number
          segment?: string
          updated_at?: string
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
      employer_hr_sheet_columns: {
        Row: {
          columns: Json
          created_at: string
          employer_user_id: string
          id: string
          updated_at: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          employer_user_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          columns?: Json
          created_at?: string
          employer_user_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      employer_notifications: {
        Row: {
          booking_type: string | null
          candidate_name: string | null
          created_at: string
          employer_id: string
          id: string
          is_read: boolean
          job_title: string | null
          message: string
          recipient_email: string | null
          title: string
          type: string
        }
        Insert: {
          booking_type?: string | null
          candidate_name?: string | null
          created_at?: string
          employer_id: string
          id?: string
          is_read?: boolean
          job_title?: string | null
          message: string
          recipient_email?: string | null
          title: string
          type?: string
        }
        Update: {
          booking_type?: string | null
          candidate_name?: string | null
          created_at?: string
          employer_id?: string
          id?: string
          is_read?: boolean
          job_title?: string | null
          message?: string
          recipient_email?: string | null
          title?: string
          type?: string
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
          industry_category: string | null
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
          industry_category?: string | null
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
          industry_category?: string | null
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
      external_jobs: {
        Row: {
          apply_url: string
          company_logo_url: string | null
          company_name: string
          created_at: string
          created_by: string | null
          description: string | null
          experience_required: string | null
          hr_contact: string | null
          hr_email: string | null
          hr_name: string | null
          id: string
          is_active: boolean
          job_title: string
          job_type: string | null
          location: string | null
          salary_range: string | null
          skills: string[] | null
          updated_at: string
        }
        Insert: {
          apply_url: string
          company_logo_url?: string | null
          company_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          experience_required?: string | null
          hr_contact?: string | null
          hr_email?: string | null
          hr_name?: string | null
          id?: string
          is_active?: boolean
          job_title: string
          job_type?: string | null
          location?: string | null
          salary_range?: string | null
          skills?: string[] | null
          updated_at?: string
        }
        Update: {
          apply_url?: string
          company_logo_url?: string | null
          company_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          experience_required?: string | null
          hr_contact?: string | null
          hr_email?: string | null
          hr_name?: string | null
          id?: string
          is_active?: boolean
          job_title?: string
          job_type?: string | null
          location?: string | null
          salary_range?: string | null
          skills?: string[] | null
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
      feedback_form_templates: {
        Row: {
          created_at: string
          employer_id: string
          id: string
          is_default: boolean | null
          rating_scale: number
          stage_type: string
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employer_id: string
          id?: string
          is_default?: boolean | null
          rating_scale?: number
          stage_type?: string
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employer_id?: string
          id?: string
          is_default?: boolean | null
          rating_scale?: number
          stage_type?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback_template_fields: {
        Row: {
          created_at: string
          display_order: number
          field_label: string
          field_options: Json | null
          field_type: string
          id: string
          is_required: boolean | null
          template_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_label: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_required?: boolean | null
          template_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          field_label?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_required?: boolean | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "feedback_form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_plan_coupons: {
        Row: {
          amount_paid: number | null
          candidate_id: string
          code: string
          created_at: string
          expires_at: string
          freelancer_plan_id: string
          id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          redeemed_at: string | null
          redeemed_by_user_id: string | null
          status: string
        }
        Insert: {
          amount_paid?: number | null
          candidate_id: string
          code: string
          created_at?: string
          expires_at?: string
          freelancer_plan_id: string
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          status?: string
        }
        Update: {
          amount_paid?: number | null
          candidate_id?: string
          code?: string
          created_at?: string
          expires_at?: string
          freelancer_plan_id?: string
          id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          status?: string
        }
        Relationships: []
      }
      freelancer_portfolio_projects: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          end_date: string | null
          id: string
          image_url: string | null
          media_urls: string[] | null
          portfolio_id: string
          project_url: string | null
          start_date: string | null
          tech_stack: string[] | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          media_urls?: string[] | null
          portfolio_id: string
          project_url?: string | null
          start_date?: string | null
          tech_stack?: string[] | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          media_urls?: string[] | null
          portfolio_id?: string
          project_url?: string | null
          start_date?: string | null
          tech_stack?: string[] | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_portfolio_projects_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "freelancer_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_portfolios: {
        Row: {
          bio: string | null
          created_at: string
          github: string | null
          id: string
          is_public: boolean | null
          linkedin: string | null
          skills: string[] | null
          tagline: string | null
          twitter: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          github?: string | null
          id?: string
          is_public?: boolean | null
          linkedin?: string | null
          skills?: string[] | null
          tagline?: string | null
          twitter?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          github?: string | null
          id?: string
          is_public?: boolean | null
          linkedin?: string | null
          skills?: string[] | null
          tagline?: string | null
          twitter?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      freelancer_subscriptions: {
        Row: {
          created_at: string
          ends_at: string
          freelancer_id: string
          id: string
          plan: string
          source_coupon_id: string | null
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          freelancer_id: string
          id?: string
          plan: string
          source_coupon_id?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          freelancer_id?: string
          id?: string
          plan?: string
          source_coupon_id?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_subscriptions_source_coupon_id_fkey"
            columns: ["source_coupon_id"]
            isOneToOne: false
            referencedRelation: "freelancer_plan_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_candidate_sheets: {
        Row: {
          created_at: string
          employer_user_id: string
          hr_user_id: string
          id: string
          rows: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          employer_user_id: string
          hr_user_id: string
          id?: string
          rows?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          employer_user_id?: string
          hr_user_id?: string
          id?: string
          rows?: Json
          updated_at?: string
        }
        Relationships: []
      }
      hr_candidate_transfers: {
        Row: {
          candidate_id: string
          created_at: string
          employer_id: string
          hr_user_id: string
          id: string
          note: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          employer_id: string
          hr_user_id: string
          id?: string
          note?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          employer_id?: string
          hr_user_id?: string
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      hr_chat_messages: {
        Row: {
          candidate_id: string
          content: string
          created_at: string
          hr_id: string | null
          id: string
          read_at: string | null
          sender_role: string
        }
        Insert: {
          candidate_id: string
          content: string
          created_at?: string
          hr_id?: string | null
          id?: string
          read_at?: string | null
          sender_role: string
        }
        Update: {
          candidate_id?: string
          content?: string
          created_at?: string
          hr_id?: string | null
          id?: string
          read_at?: string | null
          sender_role?: string
        }
        Relationships: []
      }
      hr_employer_links: {
        Row: {
          created_at: string
          created_by: string | null
          employer_user_id: string
          hr_user_id: string
          id: string
          is_active: boolean
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employer_user_id: string
          hr_user_id: string
          id?: string
          is_active?: boolean
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employer_user_id?: string
          hr_user_id?: string
          id?: string
          is_active?: boolean
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      hr_employer_transfers: {
        Row: {
          candidate_id: string
          created_at: string
          employer_id: string
          hr_user_id: string
          id: string
          job_id: string | null
          note: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          employer_id: string
          hr_user_id: string
          id?: string
          job_id?: string | null
          note?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          employer_id?: string
          hr_user_id?: string
          id?: string
          job_id?: string | null
          note?: string | null
        }
        Relationships: []
      }
      hr_mail_templates: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
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
            referencedRelation: "employer_public_profiles"
            referencedColumns: ["id"]
          },
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
      hr_recommended_candidates: {
        Row: {
          candidate_id: string
          created_at: string
          employer_id: string
          hr_id: string
          id: string
          job_id: string | null
          note: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          employer_id: string
          hr_id: string
          id?: string
          job_id?: string | null
          note?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          employer_id?: string
          hr_id?: string
          id?: string
          job_id?: string | null
          note?: string | null
        }
        Relationships: []
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
            referencedRelation: "employer_public_profiles"
            referencedColumns: ["id"]
          },
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
          division: string | null
          id: string
          is_active: boolean
          job_id: string | null
          part: string | null
          pdf_url: string | null
          segment: string | null
          set_number: number | null
          stage_type: string
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          class_level?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          designation?: string | null
          division?: string | null
          id?: string
          is_active?: boolean
          job_id?: string | null
          part?: string | null
          pdf_url?: string | null
          segment?: string | null
          set_number?: number | null
          stage_type: string
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          class_level?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          designation?: string | null
          division?: string | null
          id?: string
          is_active?: boolean
          job_id?: string | null
          part?: string | null
          pdf_url?: string | null
          segment?: string | null
          set_number?: number | null
          stage_type?: string
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_question_papers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employer_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_question_papers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_question_papers_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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
          section: string
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
          section?: string
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
          section?: string
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
      interview_unlocks: {
        Row: {
          candidate_id: string
          created_at: string
          employer_id: string
          id: string
          interview_candidate_id: string | null
          points_spent: number
        }
        Insert: {
          candidate_id: string
          created_at?: string
          employer_id: string
          id?: string
          interview_candidate_id?: string | null
          points_spent?: number
        }
        Update: {
          candidate_id?: string
          created_at?: string
          employer_id?: string
          id?: string
          interview_candidate_id?: string | null
          points_spent?: number
        }
        Relationships: []
      }
      job_melas: {
        Row: {
          city: string
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_time: string
          expected_attendees: number | null
          id: string
          is_active: boolean
          location: string
          spots_available: number | null
          state: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_time: string
          expected_attendees?: number | null
          id?: string
          is_active?: boolean
          location: string
          spots_available?: number | null
          state: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_time?: string
          expected_attendees?: number | null
          id?: string
          is_active?: boolean
          location?: string
          spots_available?: number | null
          state?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          board: string | null
          category: string | null
          classes: string | null
          closing_date: string | null
          created_at: string | null
          department: string | null
          description: string | null
          designation: string | null
          employer_id: string
          experience_required: string | null
          function_type: string | null
          id: string
          interview_type: string | null
          is_featured: boolean | null
          job_title: string
          job_type: string | null
          location: string | null
          moderation_status: string | null
          organisation: string | null
          pipeline_stages: Json | null
          posted_date: string | null
          program: string | null
          requirements: string | null
          salary_range: string | null
          sector_division: string | null
          segment: string | null
          skills: string[] | null
          status: string | null
          subjects: string | null
          updated_at: string | null
          use_ai_questions: boolean
        }
        Insert: {
          board?: string | null
          category?: string | null
          classes?: string | null
          closing_date?: string | null
          created_at?: string | null
          department?: string | null
          description?: string | null
          designation?: string | null
          employer_id: string
          experience_required?: string | null
          function_type?: string | null
          id?: string
          interview_type?: string | null
          is_featured?: boolean | null
          job_title: string
          job_type?: string | null
          location?: string | null
          moderation_status?: string | null
          organisation?: string | null
          pipeline_stages?: Json | null
          posted_date?: string | null
          program?: string | null
          requirements?: string | null
          salary_range?: string | null
          sector_division?: string | null
          segment?: string | null
          skills?: string[] | null
          status?: string | null
          subjects?: string | null
          updated_at?: string | null
          use_ai_questions?: boolean
        }
        Update: {
          board?: string | null
          category?: string | null
          classes?: string | null
          closing_date?: string | null
          created_at?: string | null
          department?: string | null
          description?: string | null
          designation?: string | null
          employer_id?: string
          experience_required?: string | null
          function_type?: string | null
          id?: string
          interview_type?: string | null
          is_featured?: boolean | null
          job_title?: string
          job_type?: string | null
          location?: string | null
          moderation_status?: string | null
          organisation?: string | null
          pipeline_stages?: Json | null
          posted_date?: string | null
          program?: string | null
          requirements?: string | null
          salary_range?: string | null
          sector_division?: string | null
          segment?: string | null
          skills?: string[] | null
          status?: string | null
          subjects?: string | null
          updated_at?: string | null
          use_ai_questions?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "jobs_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_round_recordings: {
        Row: {
          candidate_id: string | null
          created_at: string
          duration_seconds: number | null
          employer_id: string | null
          ended_at: string | null
          id: string
          interview_candidate_id: string
          recording_url: string
          stage_id: string | null
          stage_name: string
          started_at: string | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          employer_id?: string | null
          ended_at?: string | null
          id?: string
          interview_candidate_id: string
          recording_url: string
          stage_id?: string | null
          stage_name: string
          started_at?: string | null
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          employer_id?: string | null
          ended_at?: string | null
          id?: string
          interview_candidate_id?: string
          recording_url?: string
          stage_id?: string | null
          stage_name?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_round_recordings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "employer_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_round_recordings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_round_recordings_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_round_recordings_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_round_recordings_interview_candidate_id_fkey"
            columns: ["interview_candidate_id"]
            isOneToOne: false
            referencedRelation: "interview_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_round_recordings_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "interview_stages"
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
          feedback_type: string | null
          id: string
          interview_candidate_id: string | null
          overall_rating: number | null
          recommendation: string | null
          reviewer_email: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          sent_at: string | null
          session_id: string | null
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
          feedback_type?: string | null
          id?: string
          interview_candidate_id?: string | null
          overall_rating?: number | null
          recommendation?: string | null
          reviewer_email?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          sent_at?: string | null
          session_id?: string | null
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
          feedback_type?: string | null
          id?: string
          interview_candidate_id?: string | null
          overall_rating?: number | null
          recommendation?: string | null
          reviewer_email?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          sent_at?: string | null
          session_id?: string | null
          status?: string | null
          strengths?: string[] | null
          subject_knowledge_rating?: number | null
          submitted_at?: string | null
          teaching_skills_rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "management_reviews_interview_candidate_id_fkey"
            columns: ["interview_candidate_id"]
            isOneToOne: false
            referencedRelation: "interview_candidates"
            referencedColumns: ["id"]
          },
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
      mentorship_courses: {
        Row: {
          completed_modules: number
          created_at: string
          enrollment_id: string
          id: string
          status: string
          title: string
          total_modules: number
          updated_at: string
        }
        Insert: {
          completed_modules?: number
          created_at?: string
          enrollment_id: string
          id?: string
          status?: string
          title: string
          total_modules?: number
          updated_at?: string
        }
        Update: {
          completed_modules?: number
          created_at?: string
          enrollment_id?: string
          id?: string
          status?: string
          title?: string
          total_modules?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_courses_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "mentorship_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_documents: {
        Row: {
          created_at: string
          enrollment_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          homework_id: string | null
          id: string
          review_status: string
          score: number | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          homework_id?: string | null
          id?: string
          review_status?: string
          score?: number | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          homework_id?: string | null
          id?: string
          review_status?: string
          score?: number | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_documents_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "mentorship_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_documents_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "mentorship_homework"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_enrollments: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          mentor_id: string
          next_session: string | null
          sessions_completed: number
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          mentor_id: string
          next_session?: string | null
          sessions_completed?: number
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          mentor_id?: string
          next_session?: string | null
          sessions_completed?: number
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      mentorship_homework: {
        Row: {
          candidate_id: string
          created_at: string
          description: string | null
          due_date: string | null
          enrollment_id: string
          feedback: string | null
          id: string
          mentor_id: string
          score: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          enrollment_id: string
          feedback?: string | null
          id?: string
          mentor_id: string
          score?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          enrollment_id?: string
          feedback?: string | null
          id?: string
          mentor_id?: string
          score?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_homework_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "mentorship_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_requests: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          mentor_id: string
          mentor_reply: string | null
          message: string | null
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          mentor_id: string
          mentor_reply?: string | null
          message?: string | null
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          mentor_id?: string
          mentor_reply?: string | null
          message?: string | null
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      mock_interview_pipeline_config: {
        Row: {
          ai_questions_enabled: boolean
          category: string | null
          class_level: string | null
          core_subject: string | null
          created_at: string
          designation: string | null
          id: string
          industry_category: string
          interview_type: string | null
          pipeline_type: string | null
          question_count: number
          role: string | null
          segment: string | null
          stage_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_questions_enabled?: boolean
          category?: string | null
          class_level?: string | null
          core_subject?: string | null
          created_at?: string
          designation?: string | null
          id?: string
          industry_category: string
          interview_type?: string | null
          pipeline_type?: string | null
          question_count?: number
          role?: string | null
          segment?: string | null
          stage_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_questions_enabled?: boolean
          category?: string | null
          class_level?: string | null
          core_subject?: string | null
          created_at?: string
          designation?: string | null
          id?: string
          industry_category?: string
          interview_type?: string | null
          pipeline_type?: string | null
          question_count?: number
          role?: string | null
          segment?: string | null
          stage_type?: string
          updated_at?: string
          updated_by?: string | null
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
          interview_type: string | null
          live_stream_started_at: string | null
          live_view_active: boolean | null
          live_view_token: string | null
          overall_feedback: string | null
          overall_score: number | null
          pipeline_type: string | null
          points_paid: boolean
          points_paid_at: string | null
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
          interview_type?: string | null
          live_stream_started_at?: string | null
          live_view_active?: boolean | null
          live_view_token?: string | null
          overall_feedback?: string | null
          overall_score?: number | null
          pipeline_type?: string | null
          points_paid?: boolean
          points_paid_at?: string | null
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
          interview_type?: string | null
          live_stream_started_at?: string | null
          live_view_active?: boolean | null
          live_view_token?: string | null
          overall_feedback?: string | null
          overall_score?: number | null
          pipeline_type?: string | null
          points_paid?: boolean
          points_paid_at?: string | null
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
            referencedRelation: "employer_public_profiles"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "employer_public_profiles"
            referencedColumns: ["id"]
          },
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
      outsource_projects: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          deliverables: string[] | null
          description: string | null
          duration: string | null
          employer_id: string
          id: string
          skills: string[] | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          deliverables?: string[] | null
          description?: string | null
          duration?: string | null
          employer_id: string
          id?: string
          skills?: string[] | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          deliverables?: string[] | null
          description?: string | null
          duration?: string | null
          employer_id?: string
          id?: string
          skills?: string[] | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          action_key: string
          amount_inr: number
          created_at: string
          id: string
          metadata: Json | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          related_entity_id: string | null
          related_user_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_key: string
          amount_inr: number
          created_at?: string
          id?: string
          metadata?: Json | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          related_entity_id?: string | null
          related_user_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_key?: string
          amount_inr?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          related_entity_id?: string | null
          related_user_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pipeline_email_log: {
        Row: {
          created_at: string
          email_sent: boolean
          email_type: string
          error_message: string | null
          id: string
          interview_candidate_id: string
          resend_event_id: string | null
          sent_at: string | null
          stage_locked: boolean
          stage_name: string
          stage_order: number
          trigger_source: string | null
        }
        Insert: {
          created_at?: string
          email_sent?: boolean
          email_type: string
          error_message?: string | null
          id?: string
          interview_candidate_id: string
          resend_event_id?: string | null
          sent_at?: string | null
          stage_locked?: boolean
          stage_name: string
          stage_order: number
          trigger_source?: string | null
        }
        Update: {
          created_at?: string
          email_sent?: boolean
          email_type?: string
          error_message?: string | null
          id?: string
          interview_candidate_id?: string
          resend_event_id?: string | null
          sent_at?: string | null
          stage_locked?: boolean
          stage_name?: string
          stage_order?: number
          trigger_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_email_log_interview_candidate_id_fkey"
            columns: ["interview_candidate_id"]
            isOneToOne: false
            referencedRelation: "interview_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_ads: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          link_label: string | null
          link_url: string | null
          show_email_input: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          show_email_input?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          show_email_input?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_config: {
        Row: {
          action_key: string
          amount_inr: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          action_key: string
          amount_inr: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          action_key?: string
          amount_inr?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
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
          govt_id_number: string | null
          govt_id_submitted_at: string | null
          govt_id_type: string | null
          govt_id_url: string | null
          govt_id_verified: boolean
          govt_id_verified_at: string | null
          highest_qualification: string | null
          id: string
          languages: string[] | null
          linkedin: string | null
          location: string | null
          mentor_session_points: number | null
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
          referral_bonus_given: boolean | null
          referral_code: string | null
          referred_by: string | null
          registration_number: string | null
          resume_url: string | null
          role: string
          segment: string | null
          status: string
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
          govt_id_number?: string | null
          govt_id_submitted_at?: string | null
          govt_id_type?: string | null
          govt_id_url?: string | null
          govt_id_verified?: boolean
          govt_id_verified_at?: string | null
          highest_qualification?: string | null
          id: string
          languages?: string[] | null
          linkedin?: string | null
          location?: string | null
          mentor_session_points?: number | null
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
          referral_bonus_given?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          registration_number?: string | null
          resume_url?: string | null
          role: string
          segment?: string | null
          status?: string
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
          govt_id_number?: string | null
          govt_id_submitted_at?: string | null
          govt_id_type?: string | null
          govt_id_url?: string | null
          govt_id_verified?: boolean
          govt_id_verified_at?: string | null
          highest_qualification?: string | null
          id?: string
          languages?: string[] | null
          linkedin?: string | null
          location?: string | null
          mentor_session_points?: number | null
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
          referral_bonus_given?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          registration_number?: string | null
          resume_url?: string | null
          role?: string
          segment?: string | null
          status?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      project_proposals: {
        Row: {
          cover_letter: string | null
          created_at: string
          freelancer_id: string
          id: string
          project_id: string
          proposed_budget: number | null
          proposed_duration: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          freelancer_id: string
          id?: string
          project_id: string
          proposed_budget?: number | null
          proposed_duration?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          freelancer_id?: string
          id?: string
          project_id?: string
          proposed_budget?: number | null
          proposed_duration?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "outsource_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      razorpay_webhook_logs: {
        Row: {
          amount_paise: number | null
          created_at: string
          currency: string | null
          error_message: string | null
          event_type: string | null
          http_status: number | null
          id: string
          metadata: Json | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          related_id: string | null
          related_table: string | null
          request_body: Json | null
          request_headers: Json | null
          response_body: Json | null
          signature_valid: boolean | null
          source: string
          status: string
          user_id: string | null
          webhook_event_id: string | null
        }
        Insert: {
          amount_paise?: number | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          event_type?: string | null
          http_status?: number | null
          id?: string
          metadata?: Json | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          related_id?: string | null
          related_table?: string | null
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: Json | null
          signature_valid?: boolean | null
          source: string
          status?: string
          user_id?: string | null
          webhook_event_id?: string | null
        }
        Update: {
          amount_paise?: number | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          event_type?: string | null
          http_status?: number | null
          id?: string
          metadata?: Json | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          related_id?: string | null
          related_table?: string | null
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: Json | null
          signature_valid?: boolean | null
          source?: string
          status?: string
          user_id?: string | null
          webhook_event_id?: string | null
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
      resume_analysis_audit_logs: {
        Row: {
          application_state: string
          candidate_email: string | null
          candidate_id: string | null
          created_at: string
          error_message: string | null
          fallback_reason: string
          http_status: number | null
          id: string
          job_id: string | null
          job_title: string | null
          overall_score: number | null
          used_fallback: boolean
        }
        Insert: {
          application_state?: string
          candidate_email?: string | null
          candidate_id?: string | null
          created_at?: string
          error_message?: string | null
          fallback_reason?: string
          http_status?: number | null
          id?: string
          job_id?: string | null
          job_title?: string | null
          overall_score?: number | null
          used_fallback?: boolean
        }
        Update: {
          application_state?: string
          candidate_email?: string | null
          candidate_id?: string | null
          created_at?: string
          error_message?: string | null
          fallback_reason?: string
          http_status?: number | null
          id?: string
          job_id?: string | null
          job_title?: string | null
          overall_score?: number | null
          used_fallback?: boolean
        }
        Relationships: []
      }
      resume_invites: {
        Row: {
          accepted_at: string | null
          candidate_name: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          resend_message_id: string | null
          sender_name: string | null
          sender_user_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          candidate_name?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          resend_message_id?: string | null
          sender_name?: string | null
          sender_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          candidate_name?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          resend_message_id?: string | null
          sender_name?: string | null
          sender_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      skillory_vouchers: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          points_value: number
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          redeemed_at: string | null
          status: string
          updated_at: string
          user_id: string
          voucher_code: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          id?: string
          points_value?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          redeemed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          voucher_code: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          points_value?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          redeemed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          voucher_code?: string
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
          demo_meet_link: string | null
          demo_meet_type: string | null
          department: string | null
          designation: string | null
          district: string | null
          id: string
          location: string | null
          observer_email: string | null
          pincode: string | null
          preferred_slots: Json | null
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
          demo_meet_link?: string | null
          demo_meet_type?: string | null
          department?: string | null
          designation?: string | null
          district?: string | null
          id?: string
          location?: string | null
          observer_email?: string | null
          pincode?: string | null
          preferred_slots?: Json | null
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
          demo_meet_link?: string | null
          demo_meet_type?: string | null
          department?: string | null
          designation?: string | null
          district?: string | null
          id?: string
          location?: string | null
          observer_email?: string | null
          pincode?: string | null
          preferred_slots?: Json | null
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
            referencedRelation: "employer_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_bookings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          access_token: string
          created_at: string
          employer_id: string
          id: string
          is_active: boolean
          platform: string
          platform_display_name: string | null
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          employer_id: string
          id?: string
          is_active?: boolean
          platform: string
          platform_display_name?: string | null
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          employer_id?: string
          id?: string
          is_active?: boolean
          platform?: string
          platform_display_name?: string | null
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
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
      subscription_activation_logs: {
        Row: {
          activation_result: string
          amount_paise: number | null
          candidate_id: string | null
          created_at: string
          currency: string | null
          error_message: string | null
          id: string
          order_id: string | null
          payload_summary: Json | null
          payment_id: string | null
          plan: string | null
          source: string
          subscription_id: string | null
          webhook_event_id: string | null
        }
        Insert: {
          activation_result?: string
          amount_paise?: number | null
          candidate_id?: string | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          payload_summary?: Json | null
          payment_id?: string | null
          plan?: string | null
          source?: string
          subscription_id?: string | null
          webhook_event_id?: string | null
        }
        Update: {
          activation_result?: string
          amount_paise?: number | null
          candidate_id?: string | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          payload_summary?: Json | null
          payment_id?: string | null
          plan?: string | null
          source?: string
          subscription_id?: string | null
          webhook_event_id?: string | null
        }
        Relationships: []
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
      test_paper_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          job_id: string
          paper_id: string
          section_config: Json | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          job_id: string
          paper_id: string
          section_config?: Json | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          job_id?: string
          paper_id?: string
          section_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "test_paper_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_paper_assignments_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "interview_question_papers"
            referencedColumns: ["id"]
          },
        ]
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
      user_credentials: {
        Row: {
          created_at: string
          id: string
          initial_password: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          initial_password: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          initial_password?: string
          user_id?: string
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
      wallet_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          points: number
          reference_id: string | null
          rewards: number
          transaction_type: string
          wallet_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          rewards?: number
          transaction_type?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          rewards?: number
          transaction_type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          cash_balance: number
          created_at: string
          id: string
          points_balance: number
          rewards_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cash_balance?: number
          created_at?: string
          id?: string
          points_balance?: number
          rewards_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cash_balance?: number
          created_at?: string
          id?: string
          points_balance?: number
          rewards_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      employer_public_profiles: {
        Row: {
          company_description: string | null
          company_name: string | null
          full_name: string | null
          id: string | null
          location: string | null
          profile_picture: string | null
        }
        Insert: {
          company_description?: string | null
          company_name?: string | null
          full_name?: string | null
          id?: string | null
          location?: string | null
          profile_picture?: string | null
        }
        Update: {
          company_description?: string | null
          company_name?: string | null
          full_name?: string | null
          id?: string | null
          location?: string | null
          profile_picture?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_demo_candidate_profile: {
        Args: { p_session_token: string }
        Returns: {
          experience_level: string
          full_name: string
          id: string
          preferred_role: string
          primary_subject: string
          profile_picture: string
        }[]
      }
      get_hr_parent_employer: { Args: { _hr_user_id: string }; Returns: string }
      get_session_by_live_token: {
        Args: { p_token: string }
        Returns: {
          candidate_id: string
          current_stage_order: number
          id: string
          live_stream_started_at: string
          live_view_active: boolean
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_usage: {
        Args: { coupon_id_input: string }
        Returns: undefined
      }
      is_admin_or_owner: { Args: { _user_id: string }; Returns: boolean }
      is_candidate_review: {
        Args: { _interview_candidate_id: string; _user_id: string }
        Returns: boolean
      }
      is_edutech_profile: { Args: { _user_id: string }; Returns: boolean }
      is_employer: { Args: { u_id: string }; Returns: boolean }
      is_employer_by_role: { Args: { _user_id: string }; Returns: boolean }
      is_employer_profile: { Args: { _user_id: string }; Returns: boolean }
      is_freelancer_profile: { Args: { _user_id: string }; Returns: boolean }
      is_hr_manager: { Args: { _user_id: string }; Returns: boolean }
      is_hr_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "employer"
        | "candidate"
        | "sponsor"
        | "admin"
        | "owner"
        | "freelancer"
        | "individual"
        | "edutech"
        | "hr"
        | "hr_manager"
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
      app_role: [
        "employer",
        "candidate",
        "sponsor",
        "admin",
        "owner",
        "freelancer",
        "individual",
        "edutech",
        "hr",
        "hr_manager",
      ],
    },
  },
} as const

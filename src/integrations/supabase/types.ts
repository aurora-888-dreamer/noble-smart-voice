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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      school_access: {
        Row: {
          class_id: string | null
          created_at: string
          created_by: string | null
          division: string | null
          full_name: string
          id: string
          is_active: boolean
          linked_guardian_id: string | null
          linked_staff_id: string | null
          linked_student_id: string | null
          pin_hash: string
          pin_is_default: boolean
          role: string
          school_id: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          division?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          linked_guardian_id?: string | null
          linked_staff_id?: string | null
          linked_student_id?: string | null
          pin_hash: string
          pin_is_default?: boolean
          role: string
          school_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          division?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          linked_guardian_id?: string | null
          linked_staff_id?: string | null
          linked_student_id?: string | null
          pin_hash?: string
          pin_is_default?: boolean
          role?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_access_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_access_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "school_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_access_linked_guardian_id_fkey"
            columns: ["linked_guardian_id"]
            isOneToOne: false
            referencedRelation: "school_guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_access_linked_staff_id_fkey"
            columns: ["linked_staff_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_access_linked_student_id_fkey"
            columns: ["linked_student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_access_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_activities: {
        Row: {
          activity_date: string
          author_name: string | null
          body: string | null
          class_id: string | null
          created_at: string
          id: string
          school_id: string
          title: string
          updated_at: string
        }
        Insert: {
          activity_date?: string
          author_name?: string | null
          body?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          school_id: string
          title: string
          updated_at?: string
        }
        Update: {
          activity_date?: string
          author_name?: string | null
          body?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          school_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_activities_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      school_announcements: {
        Row: {
          author_name: string | null
          body: string | null
          class_id: string | null
          created_at: string
          division: string | null
          id: string
          school_id: string
          scope: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          body?: string | null
          class_id?: string | null
          created_at?: string
          division?: string | null
          id?: string
          school_id: string
          scope: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          body?: string | null
          class_id?: string | null
          created_at?: string
          division?: string | null
          id?: string
          school_id?: string
          scope?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_announcements_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      school_assessment_forms: {
        Row: {
          achieved: boolean
          assessment_id: string
          competency: string
          created_at: string
          id: string
          position: number
          rating: number
          updated_at: string
        }
        Insert: {
          achieved?: boolean
          assessment_id: string
          competency: string
          created_at?: string
          id?: string
          position?: number
          rating?: number
          updated_at?: string
        }
        Update: {
          achieved?: boolean
          assessment_id?: string
          competency?: string
          created_at?: string
          id?: string
          position?: number
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_assessment_forms_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "school_subject_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      school_assessment_notes: {
        Row: {
          assessment_id: string
          created_at: string
          draft_note: string | null
          final_note: string | null
          id: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          draft_note?: string | null
          final_note?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          draft_note?: string | null
          final_note?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_assessment_notes_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "school_subject_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      school_attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          recorded_by: string | null
          school_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          school_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          school_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_calendar_events: {
        Row: {
          class_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_type: string
          id: string
          school_id: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_type?: string
          id?: string
          school_id: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          school_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_calendar_events_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_classes: {
        Row: {
          created_at: string
          division: string
          id: string
          level: string | null
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          division: string
          id?: string
          level?: string | null
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          division?: string
          id?: string
          level?: string | null
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_guardians: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          invite_code: string
          invite_used_at: string | null
          is_active: boolean
          pin: string | null
          pin_is_default: boolean
          relation: string
          student_id: string
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          invite_code: string
          invite_used_at?: string | null
          is_active?: boolean
          pin?: string | null
          pin_is_default?: boolean
          relation: string
          student_id: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          invite_code?: string
          invite_used_at?: string | null
          is_active?: boolean
          pin?: string | null
          pin_is_default?: boolean
          relation?: string
          student_id?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_lesson_plans: {
        Row: {
          class_id: string
          created_at: string
          id: string
          materials: string | null
          objectives: string | null
          school_id: string
          subject: string
          teacher_id: string | null
          topic: string
          updated_at: string
          week_of: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          materials?: string | null
          objectives?: string | null
          school_id: string
          subject: string
          teacher_id?: string | null
          topic: string
          updated_at?: string
          week_of: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          materials?: string | null
          objectives?: string | null
          school_id?: string
          subject?: string
          teacher_id?: string | null
          topic?: string
          updated_at?: string
          week_of?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_lesson_plans_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_lesson_plans_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_messages: {
        Row: {
          author_name: string | null
          body: string
          closed_by_parent: boolean
          closed_by_teacher: boolean
          created_at: string
          from_side: string
          id: string
          school_id: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          body: string
          closed_by_parent?: boolean
          closed_by_teacher?: boolean
          created_at?: string
          from_side: string
          id?: string
          school_id?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          body?: string
          closed_by_parent?: boolean
          closed_by_teacher?: boolean
          created_at?: string
          from_side?: string
          id?: string
          school_id?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_pin_resets: {
        Row: {
          access_id: string
          expires_at: string
          id: string
          requested_at: string
          reset_token: string
          used_at: string | null
        }
        Insert: {
          access_id: string
          expires_at: string
          id?: string
          requested_at?: string
          reset_token: string
          used_at?: string | null
        }
        Update: {
          access_id?: string
          expires_at?: string
          id?: string
          requested_at?: string
          reset_token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_pin_resets_access_id_fkey"
            columns: ["access_id"]
            isOneToOne: false
            referencedRelation: "school_access"
            referencedColumns: ["id"]
          },
        ]
      }
      school_project_reviews: {
        Row: {
          decision: string
          id: string
          notes: string | null
          project_id: string
          reviewed_at: string
          reviewer_id: string | null
          reviewer_name: string | null
          reviewer_role: string
        }
        Insert: {
          decision: string
          id?: string
          notes?: string | null
          project_id: string
          reviewed_at?: string
          reviewer_id?: string | null
          reviewer_name?: string | null
          reviewer_role: string
        }
        Update: {
          decision?: string
          id?: string
          notes?: string | null
          project_id?: string
          reviewed_at?: string
          reviewer_id?: string | null
          reviewer_name?: string | null
          reviewer_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_project_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "school_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_project_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_projects: {
        Row: {
          class_id: string
          created_at: string
          description: string | null
          id: string
          last_review_notes: string | null
          school_id: string
          status: string
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          description?: string | null
          id?: string
          last_review_notes?: string | null
          school_id: string
          status?: string
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          description?: string | null
          id?: string
          last_review_notes?: string | null
          school_id?: string
          status?: string
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_projects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_projects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_schools: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      school_staff: {
        Row: {
          bio: string | null
          class_id: string | null
          created_at: string
          division: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          photo_url: string | null
          pin: string | null
          pin_is_default: boolean
          pin_updated_at: string | null
          role: string
          school_id: string
          subjects: string[]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          class_id?: string | null
          created_at?: string
          division: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          photo_url?: string | null
          pin?: string | null
          pin_is_default?: boolean
          pin_updated_at?: string | null
          role: string
          school_id: string
          subjects?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          class_id?: string | null
          created_at?: string
          division?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          photo_url?: string | null
          pin?: string | null
          pin_is_default?: boolean
          pin_updated_at?: string | null
          role?: string
          school_id?: string
          subjects?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_staff_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      school_staff_pin_resets: {
        Row: {
          expires_at: string
          id: string
          requested_at: string
          reset_token: string
          staff_id: string
          used_at: string | null
        }
        Insert: {
          expires_at: string
          id?: string
          requested_at?: string
          reset_token: string
          staff_id: string
          used_at?: string | null
        }
        Update: {
          expires_at?: string
          id?: string
          requested_at?: string
          reset_token?: string
          staff_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_staff_pin_resets_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_students: {
        Row: {
          address: string | null
          allergies: string | null
          blood_type: string | null
          certificates: string[]
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          dob: string | null
          emergency_contact: string | null
          external_student_code: string | null
          extracurriculars: string[]
          full_name: string
          gender: string | null
          id: string
          joined_at: string | null
          nickname: string | null
          notes: string | null
          photo_url: string | null
          pob: string | null
          religion: string | null
          school_id: string
          status: string
          student_number: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          blood_type?: string | null
          certificates?: string[]
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          dob?: string | null
          emergency_contact?: string | null
          external_student_code?: string | null
          extracurriculars?: string[]
          full_name: string
          gender?: string | null
          id?: string
          joined_at?: string | null
          nickname?: string | null
          notes?: string | null
          photo_url?: string | null
          pob?: string | null
          religion?: string | null
          school_id: string
          status?: string
          student_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
          blood_type?: string | null
          certificates?: string[]
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          dob?: string | null
          emergency_contact?: string | null
          external_student_code?: string | null
          extracurriculars?: string[]
          full_name?: string
          gender?: string | null
          id?: string
          joined_at?: string | null
          nickname?: string | null
          notes?: string | null
          photo_url?: string | null
          pob?: string | null
          religion?: string | null
          school_id?: string
          status?: string
          student_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      school_subject_assessments: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          period: string
          period_start: string
          school_id: string
          student_id: string
          subject: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          period?: string
          period_start?: string
          school_id: string
          student_id: string
          subject: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          period?: string
          period_start?: string
          school_id?: string
          student_id?: string
          subject?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_subject_assessments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subject_assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subject_assessments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_timetable: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          school_id: string
          start_time: string
          subject: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          school_id: string
          start_time: string
          subject: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          school_id?: string
          start_time?: string
          subject?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_timetable_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_timetable_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_year_assignments: {
        Row: {
          academic_year: string
          class_id: string | null
          created_at: string
          id: string
          role_in_class: string | null
          school_id: string
          staff_id: string | null
          student_id: string | null
        }
        Insert: {
          academic_year: string
          class_id?: string | null
          created_at?: string
          id?: string
          role_in_class?: string | null
          school_id: string
          staff_id?: string | null
          student_id?: string | null
        }
        Update: {
          academic_year?: string
          class_id?: string | null
          created_at?: string
          id?: string
          role_in_class?: string | null
          school_id?: string
          staff_id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_year_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_year_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_year_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_year_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      store_admin_auth: {
        Row: {
          id: number
          password_hash: string
          updated_at: string
        }
        Insert: {
          id?: number
          password_hash: string
          updated_at?: string
        }
        Update: {
          id?: number
          password_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_admin_resets: {
        Row: {
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used_at?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

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
      noble_vouchers: {
        Row: {
          bound_contact: string
          code: string
          created_at: string
          duration_days: number | null
          id: string
          note: string | null
          plugin_id: string | null
          status: string
          tier: string
          used_at: string | null
          used_by_contact: string | null
        }
        Insert: {
          bound_contact: string
          code: string
          created_at?: string
          duration_days?: number | null
          id?: string
          note?: string | null
          plugin_id?: string | null
          status?: string
          tier: string
          used_at?: string | null
          used_by_contact?: string | null
        }
        Update: {
          bound_contact?: string
          code?: string
          created_at?: string
          duration_days?: number | null
          id?: string
          note?: string | null
          plugin_id?: string | null
          status?: string
          tier?: string
          used_at?: string | null
          used_by_contact?: string | null
        }
        Relationships: []
      }
      nsv_relay_messages: {
        Row: {
          body: string
          created_at: string
          direction: string
          id: string
          imported: boolean
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          direction: string
          id?: string
          imported?: boolean
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          direction?: string
          id?: string
          imported?: boolean
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nsv_relay_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "nsv_relay_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      nsv_relay_threads: {
        Row: {
          created_at: string
          id: string
          recipient_name: string | null
          recipient_phone: string
          sender_context: string
          sender_name: string | null
          sender_staff_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_name?: string | null
          recipient_phone: string
          sender_context?: string
          sender_name?: string | null
          sender_staff_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          recipient_name?: string | null
          recipient_phone?: string
          sender_context?: string
          sender_name?: string | null
          sender_staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nsv_relay_threads_sender_staff_id_fkey"
            columns: ["sender_staff_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      pmd_contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          owner_user_id: string
          role: string | null
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          owner_user_id: string
          role?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          role?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      pmd_files: {
        Row: {
          created_at: string
          data_url: string
          id: string
          mime_type: string
          name: string
          note: string | null
          project_id: string
          size: number
        }
        Insert: {
          created_at?: string
          data_url: string
          id?: string
          mime_type: string
          name: string
          note?: string | null
          project_id: string
          size: number
        }
        Update: {
          created_at?: string
          data_url?: string
          id?: string
          mime_type?: string
          name?: string
          note?: string | null
          project_id?: string
          size?: number
        }
        Relationships: [
          {
            foreignKeyName: "pmd_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pmd_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pmd_pin_resets: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          pmd_user_id: string
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          pmd_user_id: string
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          pmd_user_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pmd_pin_resets_pmd_user_id_fkey"
            columns: ["pmd_user_id"]
            isOneToOne: false
            referencedRelation: "pmd_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pmd_projects: {
        Row: {
          budget: Json
          code: string
          created_at: string
          id: string
          location: string | null
          manager_id: string | null
          manager_name: string | null
          name: string
          owner_user_id: string
          participant_ids: string[]
          properties: Json
          start_at: string | null
          status: string
          summary: string | null
          target_at: string | null
          updated_at: string
        }
        Insert: {
          budget?: Json
          code: string
          created_at?: string
          id?: string
          location?: string | null
          manager_id?: string | null
          manager_name?: string | null
          name: string
          owner_user_id: string
          participant_ids?: string[]
          properties?: Json
          start_at?: string | null
          status?: string
          summary?: string | null
          target_at?: string | null
          updated_at?: string
        }
        Update: {
          budget?: Json
          code?: string
          created_at?: string
          id?: string
          location?: string | null
          manager_id?: string | null
          manager_name?: string | null
          name?: string
          owner_user_id?: string
          participant_ids?: string[]
          properties?: Json
          start_at?: string | null
          status?: string
          summary?: string | null
          target_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pmd_timeline: {
        Row: {
          author: string
          body: string | null
          created_at: string
          id: string
          kind: string
          parent_id: string | null
          project_id: string
          recipients: string[]
          state: string
          subject: string
        }
        Insert: {
          author: string
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          parent_id?: string | null
          project_id: string
          recipients?: string[]
          state?: string
          subject: string
        }
        Update: {
          author?: string
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          parent_id?: string | null
          project_id?: string
          recipients?: string[]
          state?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "pmd_timeline_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "pmd_timeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pmd_timeline_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pmd_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pmd_users: {
        Row: {
          company: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          pin: string
          position: string | null
          updated_at: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          pin: string
          position?: string | null
          updated_at?: string
          user_id: string
          whatsapp: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          pin?: string
          position?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      pmd_vendors: {
        Row: {
          company: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          project_id: string
          status: string
          supply_type: string | null
          whatsapp: string | null
        }
        Insert: {
          company: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          project_id: string
          status?: string
          supply_type?: string | null
          whatsapp?: string | null
        }
        Update: {
          company?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          project_id?: string
          status?: string
          supply_type?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pmd_vendors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pmd_projects"
            referencedColumns: ["id"]
          },
        ]
      }
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
      school_agenda_classes: {
        Row: {
          agenda_id: string
          class_id: string
          created_at: string
          id: string
        }
        Insert: {
          agenda_id: string
          class_id: string
          created_at?: string
          id?: string
        }
        Update: {
          agenda_id?: string
          class_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_agenda_classes_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "school_agendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_agenda_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      school_agenda_pic: {
        Row: {
          agenda_id: string
          created_at: string
          external_contact: string | null
          external_name: string | null
          id: string
          is_external: boolean
          staff_id: string | null
        }
        Insert: {
          agenda_id: string
          created_at?: string
          external_contact?: string | null
          external_name?: string | null
          id?: string
          is_external?: boolean
          staff_id?: string | null
        }
        Update: {
          agenda_id?: string
          created_at?: string
          external_contact?: string | null
          external_name?: string | null
          id?: string
          is_external?: boolean
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_agenda_pic_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "school_agendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_agenda_pic_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_agenda_timeline: {
        Row: {
          agenda_id: string
          author_name: string | null
          author_role: string | null
          body: string | null
          created_at: string
          entry_type: string
          id: string
        }
        Insert: {
          agenda_id: string
          author_name?: string | null
          author_role?: string | null
          body?: string | null
          created_at?: string
          entry_type?: string
          id?: string
        }
        Update: {
          agenda_id?: string
          author_name?: string | null
          author_role?: string | null
          body?: string | null
          created_at?: string
          entry_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_agenda_timeline_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "school_agendas"
            referencedColumns: ["id"]
          },
        ]
      }
      school_agendas: {
        Row: {
          approval_status: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          creator_role: string | null
          division: string | null
          end_date: string | null
          execution_status: string
          final_report: string | null
          forwarded_to_hos: boolean
          id: string
          last_review_notes: string | null
          purpose: string | null
          school_id: string
          scope_level: string
          start_date: string | null
          status: string
          theme: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          creator_role?: string | null
          division?: string | null
          end_date?: string | null
          execution_status?: string
          final_report?: string | null
          forwarded_to_hos?: boolean
          id?: string
          last_review_notes?: string | null
          purpose?: string | null
          school_id: string
          scope_level?: string
          start_date?: string | null
          status?: string
          theme?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          creator_role?: string | null
          division?: string | null
          end_date?: string | null
          execution_status?: string
          final_report?: string | null
          forwarded_to_hos?: boolean
          id?: string
          last_review_notes?: string | null
          purpose?: string | null
          school_id?: string
          scope_level?: string
          start_date?: string | null
          status?: string
          theme?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_agendas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_announcements: {
        Row: {
          audience: string
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
          audience?: string
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
          audience?: string
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
      school_assessment_character_records: {
        Row: {
          assessed_at: string
          character_id: string
          id: string
          narration: string | null
          narration_mode: string
          period_label: string
          period_type: string
          school_id: string
          score: number | null
          student_id: string
          teacher_id: string | null
        }
        Insert: {
          assessed_at?: string
          character_id: string
          id?: string
          narration?: string | null
          narration_mode?: string
          period_label: string
          period_type?: string
          school_id: string
          score?: number | null
          student_id: string
          teacher_id?: string | null
        }
        Update: {
          assessed_at?: string
          character_id?: string
          id?: string
          narration?: string | null
          narration_mode?: string
          period_label?: string
          period_type?: string
          school_id?: string
          score?: number | null
          student_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_assessment_character_records_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "school_assessment_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_character_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_character_records_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_assessment_characters: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          school_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          school_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          school_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_assessment_characters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_assessment_daily_domain: {
        Row: {
          activity_note: string | null
          assessed_date: string
          class_id: string | null
          created_at: string
          division: string
          domain_code: string
          evidence_note: string | null
          id: string
          position: number
          school_id: string
          student_id: string
          teacher_id: string | null
        }
        Insert: {
          activity_note?: string | null
          assessed_date: string
          class_id?: string | null
          created_at?: string
          division: string
          domain_code: string
          evidence_note?: string | null
          id?: string
          position: number
          school_id: string
          student_id: string
          teacher_id?: string | null
        }
        Update: {
          activity_note?: string | null
          assessed_date?: string
          class_id?: string | null
          created_at?: string
          division?: string
          domain_code?: string
          evidence_note?: string | null
          id?: string
          position?: number
          school_id?: string
          student_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_assessment_daily_domain_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_daily_domain_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_daily_domain_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_assessment_domains: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          division: string
          id: string
          name: string
          school_id: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          division: string
          id?: string
          name: string
          school_id: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          division?: string
          id?: string
          name?: string
          school_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_assessment_domains_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "school_staff"
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
      school_assessment_indicators: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          division: string
          domain_code: string
          evidence_example: string | null
          id: string
          indicator_code: string
          level: string
          related_activity: string | null
          school_id: string
          sort_order: number
          subject: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          division: string
          domain_code: string
          evidence_example?: string | null
          id?: string
          indicator_code: string
          level: string
          related_activity?: string | null
          school_id: string
          sort_order?: number
          subject?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          division?: string
          domain_code?: string
          evidence_example?: string | null
          id?: string
          indicator_code?: string
          level?: string
          related_activity?: string | null
          school_id?: string
          sort_order?: number
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_assessment_indicators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "school_staff"
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
      school_assessment_records: {
        Row: {
          assessed_at: string
          class_id: string | null
          evidence_note: string | null
          evidence_url: string | null
          id: string
          indicator_id: string
          period_label: string
          period_type: string
          rubric: string
          school_id: string
          student_id: string
          teacher_comment: string | null
          teacher_id: string | null
        }
        Insert: {
          assessed_at?: string
          class_id?: string | null
          evidence_note?: string | null
          evidence_url?: string | null
          id?: string
          indicator_id: string
          period_label: string
          period_type?: string
          rubric: string
          school_id: string
          student_id: string
          teacher_comment?: string | null
          teacher_id?: string | null
        }
        Update: {
          assessed_at?: string
          class_id?: string | null
          evidence_note?: string | null
          evidence_url?: string | null
          id?: string
          indicator_id?: string
          period_label?: string
          period_type?: string
          rubric?: string
          school_id?: string
          student_id?: string
          teacher_comment?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_assessment_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_records_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "school_assessment_indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_records_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_assessment_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          division: string
          generated_by: string | null
          id: string
          next_target: string | null
          period_label: string
          period_type: string
          principal_notes: string | null
          published_at: string | null
          recommendations: string | null
          school_id: string
          status: string
          student_id: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          division: string
          generated_by?: string | null
          id?: string
          next_target?: string | null
          period_label: string
          period_type: string
          principal_notes?: string | null
          published_at?: string | null
          recommendations?: string | null
          school_id: string
          status?: string
          student_id: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          division?: string
          generated_by?: string | null
          id?: string
          next_target?: string | null
          period_label?: string
          period_type?: string
          principal_notes?: string | null
          published_at?: string | null
          recommendations?: string | null
          school_id?: string
          status?: string
          student_id?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_assessment_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_assessment_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
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
      school_attendance_day_flags: {
        Row: {
          attendance_date: string
          class_id: string
          created_at: string
          id: string
          is_mandatory: boolean
          note: string | null
          set_by: string | null
          updated_at: string
        }
        Insert: {
          attendance_date: string
          class_id: string
          created_at?: string
          id?: string
          is_mandatory?: boolean
          note?: string | null
          set_by?: string | null
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          class_id?: string
          created_at?: string
          id?: string
          is_mandatory?: boolean
          note?: string | null
          set_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_attendance_day_flags_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_attendance_day_flags_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "school_staff"
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
          division: string | null
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
          division?: string | null
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
          division?: string | null
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
      school_case_participants: {
        Row: {
          case_id: string
          created_at: string
          external_contact: string | null
          external_name: string | null
          guardian_id: string | null
          id: string
          invited_by: string | null
          participant_type: string
          staff_id: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          external_contact?: string | null
          external_name?: string | null
          guardian_id?: string | null
          id?: string
          invited_by?: string | null
          participant_type: string
          staff_id?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          external_contact?: string | null
          external_name?: string | null
          guardian_id?: string | null
          id?: string
          invited_by?: string | null
          participant_type?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_case_participants_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "school_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_case_participants_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "school_guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_case_participants_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_case_participants_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_case_timeline: {
        Row: {
          author_name: string
          author_role: string | null
          body: string
          case_id: string
          created_at: string
          entry_type: string
          id: string
        }
        Insert: {
          author_name: string
          author_role?: string | null
          body: string
          case_id: string
          created_at?: string
          entry_type?: string
          id?: string
        }
        Update: {
          author_name?: string
          author_role?: string | null
          body?: string
          case_id?: string
          created_at?: string
          entry_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_case_timeline_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "school_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      school_cases: {
        Row: {
          class_id: string | null
          closed_at: string | null
          created_at: string
          description: string | null
          division: string | null
          id: string
          reported_by_guardian_id: string | null
          reported_by_staff_id: string | null
          reported_by_type: string
          school_id: string
          status: string
          student_id: string | null
          title: string
          updated_at: string
          was_escalated: boolean
        }
        Insert: {
          class_id?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          division?: string | null
          id?: string
          reported_by_guardian_id?: string | null
          reported_by_staff_id?: string | null
          reported_by_type: string
          school_id: string
          status?: string
          student_id?: string | null
          title: string
          updated_at?: string
          was_escalated?: boolean
        }
        Update: {
          class_id?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          division?: string | null
          id?: string
          reported_by_guardian_id?: string | null
          reported_by_staff_id?: string | null
          reported_by_type?: string
          school_id?: string
          status?: string
          student_id?: string | null
          title?: string
          updated_at?: string
          was_escalated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "school_cases_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_cases_reported_by_guardian_id_fkey"
            columns: ["reported_by_guardian_id"]
            isOneToOne: false
            referencedRelation: "school_guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_cases_reported_by_staff_id_fkey"
            columns: ["reported_by_staff_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_cases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
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
      school_competencies: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          school_id: string
          sort_order: number
          subject: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          school_id: string
          sort_order?: number
          subject?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          school_id?: string
          sort_order?: number
          subject?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_competencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_evaluations: {
        Row: {
          content: string | null
          created_at: string
          division: string | null
          id: string
          period: string | null
          school_id: string
          status: string
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          division?: string | null
          id?: string
          period?: string | null
          school_id: string
          status?: string
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          division?: string | null
          id?: string
          period?: string | null
          school_id?: string
          status?: string
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_evaluations_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_external_links: {
        Row: {
          contact_info: string | null
          created_at: string
          created_by: string | null
          department: string | null
          id: string
          name: string
          note: string | null
          school_id: string
        }
        Insert: {
          contact_info?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          name: string
          note?: string | null
          school_id: string
        }
        Update: {
          contact_info?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          name?: string
          note?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_incidental_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      school_gallery_files: {
        Row: {
          created_at: string
          data_url: string
          file_name: string
          file_type: string
          id: string
          owner_id: string
          owner_type: string
          school_id: string
          source: string
        }
        Insert: {
          created_at?: string
          data_url: string
          file_name: string
          file_type: string
          id?: string
          owner_id: string
          owner_type: string
          school_id: string
          source?: string
        }
        Update: {
          created_at?: string
          data_url?: string
          file_name?: string
          file_type?: string
          id?: string
          owner_id?: string
          owner_type?: string
          school_id?: string
          source?: string
        }
        Relationships: []
      }
      school_guardians: {
        Row: {
          announcements_last_seen_at: string | null
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
          announcements_last_seen_at?: string | null
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
          announcements_last_seen_at?: string | null
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
          requires_hos: boolean
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
          requires_hos?: boolean
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
          requires_hos?: boolean
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
          admin_note: string | null
          allergies: string | null
          bio: string | null
          birth_date: string | null
          birthplace: string | null
          class_id: string | null
          created_at: string
          division: string
          email: string | null
          full_name: string
          gender: string | null
          health_notes: string | null
          home_address: string | null
          id: string
          id_card_address: string | null
          is_active: boolean
          is_profile_complete: boolean
          last_seen_at: string | null
          nickname: string | null
          phone: string | null
          photo_url: string | null
          pin: string | null
          pin_is_default: boolean
          pin_updated_at: string | null
          religion: string | null
          role: string
          school_id: string
          status: string
          subjects: string[]
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          admin_note?: string | null
          allergies?: string | null
          bio?: string | null
          birth_date?: string | null
          birthplace?: string | null
          class_id?: string | null
          created_at?: string
          division: string
          email?: string | null
          full_name: string
          gender?: string | null
          health_notes?: string | null
          home_address?: string | null
          id?: string
          id_card_address?: string | null
          is_active?: boolean
          is_profile_complete?: boolean
          last_seen_at?: string | null
          nickname?: string | null
          phone?: string | null
          photo_url?: string | null
          pin?: string | null
          pin_is_default?: boolean
          pin_updated_at?: string | null
          religion?: string | null
          role: string
          school_id: string
          status?: string
          subjects?: string[]
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          admin_note?: string | null
          allergies?: string | null
          bio?: string | null
          birth_date?: string | null
          birthplace?: string | null
          class_id?: string | null
          created_at?: string
          division?: string
          email?: string | null
          full_name?: string
          gender?: string | null
          health_notes?: string | null
          home_address?: string | null
          id?: string
          id_card_address?: string | null
          is_active?: boolean
          is_profile_complete?: boolean
          last_seen_at?: string | null
          nickname?: string | null
          phone?: string | null
          photo_url?: string | null
          pin?: string | null
          pin_is_default?: boolean
          pin_updated_at?: string | null
          religion?: string | null
          role?: string
          school_id?: string
          status?: string
          subjects?: string[]
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
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
      school_staff_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          school_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          school_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          school_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_staff_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_staff_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "school_staff"
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
          admin_note: string | null
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
          id_card_address: string | null
          is_profile_complete: boolean
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
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          admin_note?: string | null
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
          id_card_address?: string | null
          is_profile_complete?: boolean
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
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          admin_note?: string | null
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
          id_card_address?: string | null
          is_profile_complete?: boolean
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
          whatsapp?: string | null
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
      site_features: {
        Row: {
          enabled: boolean
          key: string
        }
        Insert: {
          enabled?: boolean
          key: string
        }
        Update: {
          enabled?: boolean
          key?: string
        }
        Relationships: []
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
      store_discounts: {
        Row: {
          active: boolean
          created_at: string
          group_ids: string[] | null
          id: string
          kind: string
          name: string
          plan_ids: string[] | null
          upgrade_group_id: string | null
          valid_from: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          group_ids?: string[] | null
          id?: string
          kind: string
          name: string
          plan_ids?: string[] | null
          upgrade_group_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
          value: number
        }
        Update: {
          active?: boolean
          created_at?: string
          group_ids?: string[] | null
          id?: string
          kind?: string
          name?: string
          plan_ids?: string[] | null
          upgrade_group_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_discounts_upgrade_group_id_fkey"
            columns: ["upgrade_group_id"]
            isOneToOne: false
            referencedRelation: "store_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      store_groups: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          note: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          note?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          note?: string | null
        }
        Relationships: []
      }
      store_orders: {
        Row: {
          buyer_email: string | null
          buyer_name: string
          buyer_note: string | null
          buyer_whatsapp: string
          created_at: string
          delivered_at: string | null
          discount_id: string | null
          discount_label: string | null
          duration_days: number | null
          group_id: string | null
          id: string
          invoice_no: string | null
          komerce_callback_key: string | null
          komerce_channel_code: string | null
          komerce_merchant_ref: string | null
          komerce_raw_response: Json | null
          komerce_status: string | null
          original_price_idr: number | null
          paid_at: string | null
          payment_ref: string | null
          plan_id: string
          plugins: string[] | null
          price_idr: number
          product_type: string
          serial: string
          status: string
          tier: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_name: string
          buyer_note?: string | null
          buyer_whatsapp: string
          created_at?: string
          delivered_at?: string | null
          discount_id?: string | null
          discount_label?: string | null
          duration_days?: number | null
          group_id?: string | null
          id?: string
          invoice_no?: string | null
          komerce_callback_key?: string | null
          komerce_channel_code?: string | null
          komerce_merchant_ref?: string | null
          komerce_raw_response?: Json | null
          komerce_status?: string | null
          original_price_idr?: number | null
          paid_at?: string | null
          payment_ref?: string | null
          plan_id: string
          plugins?: string[] | null
          price_idr: number
          product_type?: string
          serial: string
          status?: string
          tier: string
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string
          buyer_note?: string | null
          buyer_whatsapp?: string
          created_at?: string
          delivered_at?: string | null
          discount_id?: string | null
          discount_label?: string | null
          duration_days?: number | null
          group_id?: string | null
          id?: string
          invoice_no?: string | null
          komerce_callback_key?: string | null
          komerce_channel_code?: string | null
          komerce_merchant_ref?: string | null
          komerce_raw_response?: Json | null
          komerce_status?: string | null
          original_price_idr?: number | null
          paid_at?: string | null
          payment_ref?: string | null
          plan_id?: string
          plugins?: string[] | null
          price_idr?: number
          product_type?: string
          serial?: string
          status?: string
          tier?: string
        }
        Relationships: []
      }
      store_plugin_prices: {
        Row: {
          plugin_id: string
          price_idr: number
          updated_at: string
        }
        Insert: {
          plugin_id: string
          price_idr: number
          updated_at?: string
        }
        Update: {
          plugin_id?: string
          price_idr?: number
          updated_at?: string
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

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
      ai_prompts: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_audit_cycles: {
        Row: {
          auditor_department_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          factory_id: string
          id: string
          month: string
          status: string
          target_department_id: string
        }
        Insert: {
          auditor_department_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          factory_id: string
          id?: string
          month: string
          status?: string
          target_department_id: string
        }
        Update: {
          auditor_department_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          factory_id?: string
          id?: string
          month?: string
          status?: string
          target_department_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_audit_cycles_auditor_department_id_fkey"
            columns: ["auditor_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_audit_cycles_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_audit_cycles_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_audit_cycles_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_audit_findings: {
        Row: {
          comment: string | null
          created_at: string
          document_id: string
          id: string
          instance_id: string
          item: string
          ncr_id: string | null
          question_index: number
          resolved: boolean
          severity: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          document_id: string
          id?: string
          instance_id: string
          item: string
          ncr_id?: string | null
          question_index: number
          resolved?: boolean
          severity?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          document_id?: string
          id?: string
          instance_id?: string
          item?: string
          ncr_id?: string | null
          question_index?: number
          resolved?: boolean
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_audit_findings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_audit_findings_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "cross_audit_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_audit_findings_ncr_id_fkey"
            columns: ["ncr_id"]
            isOneToOne: false
            referencedRelation: "ncrs"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_audit_instances: {
        Row: {
          auditor_id: string
          created_at: string
          cycle_id: string
          factory_id: string
          id: string
          month: string
          questions: Json
          responses: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          target_department_id: string
          updated_at: string
        }
        Insert: {
          auditor_id: string
          created_at?: string
          cycle_id: string
          factory_id: string
          id?: string
          month: string
          questions?: Json
          responses?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          target_department_id: string
          updated_at?: string
        }
        Update: {
          auditor_id?: string
          created_at?: string
          cycle_id?: string
          factory_id?: string
          id?: string
          month?: string
          questions?: Json
          responses?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          target_department_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_audit_instances_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_audit_instances_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cross_audit_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_audit_instances_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_audit_instances_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_audit_instances_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_audit_process_scope: {
        Row: {
          added_by: string | null
          created_at: string
          department_id: string
          document_id: string
          factory_id: string
          id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          department_id: string
          document_id: string
          factory_id: string
          id?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          department_id?: string
          document_id?: string
          factory_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_audit_process_scope_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_audit_process_scope_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_audit_process_scope_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_audit_process_scope_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string | null
          exclude_from_cross_audit: boolean | null
          factory_id: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          exclude_from_cross_audit?: boolean | null
          factory_id?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          exclude_from_cross_audit?: boolean | null
          factory_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      document_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          department_id: string | null
          document_id: string | null
          factory_id: string | null
          id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          department_id?: string | null
          document_id?: string | null
          factory_id?: string | null
          id?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          department_id?: string | null
          document_id?: string | null
          factory_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_assignments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_assignments_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      document_learning_assets: {
        Row: {
          audit_checklist: Json
          created_at: string | null
          cross_audit_frequency: string
          document_id: string
          generated_by: string | null
          manager_confirmation: Json
          quiz: Json
          summary_card: Json
          updated_at: string | null
          worker_verification: Json
        }
        Insert: {
          audit_checklist?: Json
          created_at?: string | null
          cross_audit_frequency?: string
          document_id: string
          generated_by?: string | null
          manager_confirmation?: Json
          quiz?: Json
          summary_card?: Json
          updated_at?: string | null
          worker_verification?: Json
        }
        Update: {
          audit_checklist?: Json
          created_at?: string | null
          cross_audit_frequency?: string
          document_id?: string
          generated_by?: string | null
          manager_confirmation?: Json
          quiz?: Json
          summary_card?: Json
          updated_at?: string | null
          worker_verification?: Json
        }
        Relationships: [
          {
            foreignKeyName: "document_learning_assets_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_learning_assets_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_read_confirmations: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          document_id: string | null
          id: string
          passed: boolean
          quiz_answers: Json
          score: number
          total: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          passed?: boolean
          quiz_answers?: Json
          score?: number
          total?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          passed?: boolean
          quiz_answers?: Json
          score?: number
          total?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_read_confirmations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_read_confirmations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_resource_links: {
        Row: {
          document_id: string
          linked_at: string | null
          linked_by: string | null
          resource_id: string
        }
        Insert: {
          document_id: string
          linked_at?: string | null
          linked_by?: string | null
          resource_id: string
        }
        Update: {
          document_id?: string
          linked_at?: string | null
          linked_by?: string | null
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_resource_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_resource_links_linked_by_fkey"
            columns: ["linked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_resource_links_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "document_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      document_resources: {
        Row: {
          created_at: string | null
          department_id: string | null
          description: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          resource_code: string
          resource_type: string
          retention_period: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          description: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          resource_code: string
          resource_type?: string
          retention_period?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          description?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          resource_code?: string
          resource_type?: string
          retention_period?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_resources_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          doc_type: string
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          doc_type: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          doc_type?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content: string
          created_at: string | null
          department_id: string | null
          doc_code: string
          doc_type: string
          factory_id: string | null
          flowchart_image_mime: string | null
          flowchart_image_path: string | null
          id: string
          is_addendum: boolean | null
          mermaid_code: string | null
          owner_id: string | null
          parent_doc_id: string | null
          previous_version_id: string | null
          process_importance: string
          process_importance_level: number
          review_date: string | null
          revision_summary: string | null
          revision_type: string | null
          source_file_url: string | null
          status: string
          title: string
          updated_at: string | null
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content: string
          created_at?: string | null
          department_id?: string | null
          doc_code: string
          doc_type: string
          factory_id?: string | null
          flowchart_image_mime?: string | null
          flowchart_image_path?: string | null
          id?: string
          is_addendum?: boolean | null
          mermaid_code?: string | null
          owner_id?: string | null
          parent_doc_id?: string | null
          previous_version_id?: string | null
          process_importance?: string
          process_importance_level?: number
          review_date?: string | null
          revision_summary?: string | null
          revision_type?: string | null
          source_file_url?: string | null
          status?: string
          title: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content?: string
          created_at?: string | null
          department_id?: string | null
          doc_code?: string
          doc_type?: string
          factory_id?: string | null
          flowchart_image_mime?: string | null
          flowchart_image_path?: string | null
          id?: string
          is_addendum?: boolean | null
          mermaid_code?: string | null
          owner_id?: string | null
          parent_doc_id?: string | null
          previous_version_id?: string | null
          process_importance?: string
          process_importance_level?: number
          review_date?: string | null
          revision_summary?: string | null
          revision_type?: string | null
          source_file_url?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_doc_id_fkey"
            columns: ["parent_doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      factories: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      iso_checklist_instances: {
        Row: {
          checklist_date: string
          checklist_type: string
          created_at: string
          department_id: string | null
          factory_id: string | null
          id: string
          job_position_id: string | null
          late_reason: string | null
          questions: Json
          responses: Json
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist_date: string
          checklist_type: string
          created_at?: string
          department_id?: string | null
          factory_id?: string | null
          id?: string
          job_position_id?: string | null
          late_reason?: string | null
          questions?: Json
          responses?: Json
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist_date?: string
          checklist_type?: string
          created_at?: string
          department_id?: string | null
          factory_id?: string | null
          id?: string
          job_position_id?: string | null
          late_reason?: string | null
          questions?: Json
          responses?: Json
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iso_checklist_instances_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iso_checklist_instances_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iso_checklist_instances_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iso_checklist_instances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_monthly_checklist_plans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          generated_at: string | null
          id: string
          job_position_id: string
          month: string
          plan: Json
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          generated_at?: string | null
          id?: string
          job_position_id: string
          month: string
          plan?: Json
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          generated_at?: string | null
          id?: string
          job_position_id?: string
          month?: string
          plan?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_monthly_checklist_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_monthly_checklist_plans_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_position_processes: {
        Row: {
          assigned_at: string | null
          document_id: string
          included: boolean
          job_position_id: string
        }
        Insert: {
          assigned_at?: string | null
          document_id: string
          included?: boolean
          job_position_id: string
        }
        Update: {
          assigned_at?: string | null
          document_id?: string
          included?: boolean
          job_position_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_position_processes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_position_processes_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_positions: {
        Row: {
          created_at: string | null
          department_id: string
          id: string
          role_type: string
          title: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          id?: string
          role_type?: string
          title: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          id?: string
          role_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      ncr_activity: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ncr_id: string | null
          notes: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ncr_id?: string | null
          notes?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ncr_id?: string | null
          notes?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ncr_activity_ncr_id_fkey"
            columns: ["ncr_id"]
            isOneToOne: false
            referencedRelation: "ncrs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncr_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ncrs: {
        Row: {
          assigned_to: string | null
          capa_approved_at: string | null
          capa_approved_by: string | null
          capa_rejection_notes: string | null
          closed_at: string | null
          closure_approved_at: string | null
          closure_approved_by: string | null
          closure_report: string | null
          department_id: string | null
          description: string
          due_date: string | null
          factory_id: string | null
          id: string
          implementation_evidence_urls: string[] | null
          implementation_notes: string | null
          iso_clause: string | null
          linked_document_id: string | null
          ncr_code: string
          photo_urls: string[] | null
          process_change_required: boolean | null
          proposed_capa: string | null
          raised_at: string | null
          raised_by: string | null
          reporter_name: string | null
          root_cause_analysis: string | null
          severity: string
          status: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          capa_approved_at?: string | null
          capa_approved_by?: string | null
          capa_rejection_notes?: string | null
          closed_at?: string | null
          closure_approved_at?: string | null
          closure_approved_by?: string | null
          closure_report?: string | null
          department_id?: string | null
          description: string
          due_date?: string | null
          factory_id?: string | null
          id?: string
          implementation_evidence_urls?: string[] | null
          implementation_notes?: string | null
          iso_clause?: string | null
          linked_document_id?: string | null
          ncr_code: string
          photo_urls?: string[] | null
          process_change_required?: boolean | null
          proposed_capa?: string | null
          raised_at?: string | null
          raised_by?: string | null
          reporter_name?: string | null
          root_cause_analysis?: string | null
          severity: string
          status?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          capa_approved_at?: string | null
          capa_approved_by?: string | null
          capa_rejection_notes?: string | null
          closed_at?: string | null
          closure_approved_at?: string | null
          closure_approved_by?: string | null
          closure_report?: string | null
          department_id?: string | null
          description?: string
          due_date?: string | null
          factory_id?: string | null
          id?: string
          implementation_evidence_urls?: string[] | null
          implementation_notes?: string | null
          iso_clause?: string | null
          linked_document_id?: string | null
          ncr_code?: string
          photo_urls?: string[] | null
          process_change_required?: boolean | null
          proposed_capa?: string | null
          raised_at?: string | null
          raised_by?: string | null
          reporter_name?: string | null
          root_cause_analysis?: string | null
          severity?: string
          status?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ncrs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncrs_capa_approved_by_fkey"
            columns: ["capa_approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncrs_closure_approved_by_fkey"
            columns: ["closure_approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncrs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncrs_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncrs_linked_document_id_fkey"
            columns: ["linked_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncrs_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncrs_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          link: string | null
          read: boolean | null
          title: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          department_id: string | null
          email: string
          factory_id: string | null
          full_name: string
          id: string
          job_position_id: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          email: string
          factory_id?: string | null
          full_name: string
          id: string
          job_position_id?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          email?: string
          factory_id?: string | null
          full_name?: string
          id?: string
          job_position_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_quality_record: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_qa_manager: { Args: never; Returns: boolean }
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

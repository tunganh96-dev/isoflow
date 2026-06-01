export type UserRole = 'qa_employee' | 'qa_manager' | 'staff'

export type DocType =
  | 'sop'
  | 'work_instruction'
  | 'quality_policy'
  | 'audit_checklist'
  | 'ncr_report'
  | 'capa_report'
  | 'risk_register'

export type DocStatus =
  | 'draft'
  | 'pending_approval'
  | 'published'
  | 'under_review'
  | 'archived'

export type NcrStatus =
  | 'open'
  | 'analysing'
  | 'pending_capa_approval'
  | 'implementing'
  | 'pending_verification'
  | 'pending_doc_update'
  | 'completed'

export type NcrSeverity = 'minor' | 'major' | 'critical'

export interface Factory {
  id: string
  name: string
  code: 'QVO' | 'LA' | 'TT' | 'HQ'
  created_at: string
}

export interface Department {
  id: string
  factory_id: string
  name: string
  code: string
  exclude_from_cross_audit: boolean
  created_at: string
}

export interface AppUser {
  id: string
  full_name: string
  email: string
  role: UserRole
  factory_id: string | null
  department_id: string | null
  created_at: string
}

export interface Document {
  id: string
  doc_code: string
  title: string
  doc_type: DocType
  content: string
  mermaid_code: string | null
  version: number
  status: DocStatus
  factory_id: string | null
  parent_doc_id: string | null
  is_addendum: boolean
  owner_id: string
  approved_by: string | null
  approved_at: string | null
  revision_type: 'minor' | 'major' | null
  review_date: string | null
  source_file_url: string | null
  created_at: string
  updated_at: string
}

export interface Ncr {
  id: string
  ncr_code: string
  description: string
  reporter_name: string | null
  iso_clause: string | null
  severity: NcrSeverity
  factory_id: string
  department_id: string
  raised_by: string
  assigned_to: string | null
  due_date: string | null
  status: NcrStatus
  root_cause_analysis: string | null
  proposed_capa: string | null
  capa_approved_by: string | null
  capa_approved_at: string | null
  capa_rejection_notes: string | null
  implementation_notes: string | null
  implementation_evidence_urls: string[] | null
  verification_notes: string | null
  verified_by: string | null
  verified_at: string | null
  process_change_required: boolean
  linked_document_id: string | null
  closure_report: string | null
  closure_approved_by: string | null
  closure_approved_at: string | null
  photo_urls: string[] | null
  raised_at: string
  closed_at: string | null
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  link: string | null
  read: boolean
  created_at: string
}

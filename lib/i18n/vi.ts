export const vi = {
  // App
  app_name: 'ISOFlow',
  loading: 'Đang tải...',
  save: 'Lưu',
  cancel: 'Hủy',
  delete: 'Xóa',
  edit: 'Chỉnh sửa',
  submit: 'Gửi',
  approve: 'Phê duyệt',
  reject: 'Từ chối',
  close: 'Đóng',
  back: 'Quay lại',
  search: 'Tìm kiếm',
  filter: 'Lọc',
  all: 'Tất cả',
  confirm: 'Xác nhận',
  yes: 'Có',
  no: 'Không',

  // Auth
  login: 'Đăng nhập',
  logout: 'Đăng xuất',
  email: 'Email',
  password: 'Mật khẩu',
  login_error: 'Email hoặc mật khẩu không đúng',

  // Nav
  nav_dashboard: 'Bảng điều khiển',
  nav_documents: 'Tài liệu',
  nav_ncr: 'NCR & CAPA',
  nav_notifications: 'Thông báo',

  // Roles
  role_qa_employee: 'Nhân viên QA',
  role_qa_manager: 'Quản lý QA',
  role_staff: 'Nhân viên',

  // Factories
  factory_qvo: 'Quế Võ',
  factory_la: 'Long An',
  factory_tt: 'Thường Tín',
  factory_hq: 'Trụ sở',

  // Documents
  doc_create: 'Tạo tài liệu mới',
  doc_generate_ai: 'Tạo bằng AI',
  doc_generating: 'Đang tạo nội dung...',
  doc_title: 'Tiêu đề tài liệu',
  doc_type: 'Loại tài liệu',
  doc_description: 'Mô tả ngắn (1–2 câu)',
  doc_factory_scope: 'Phạm vi nhà máy',
  doc_submit_approval: 'Gửi phê duyệt',
  doc_approve: 'Phê duyệt tài liệu',
  doc_reject: 'Từ chối',
  doc_version: 'Phiên bản',
  doc_status_draft: 'Bản nháp',
  doc_status_pending: 'Chờ phê duyệt',
  doc_status_published: 'Đã xuất bản',
  doc_status_under_review: 'Đang xem xét',
  doc_status_archived: 'Đã lưu trữ',
  doc_revision_minor: 'Thay đổi nhỏ',
  doc_revision_major: 'Thay đổi lớn',
  doc_master: 'Tài liệu gốc',
  doc_addendum: 'Phụ lục nhà máy',
  doc_factory_note: 'Áp dụng riêng cho',
  doc_no_addendum: 'Theo tài liệu gốc — không có sửa đổi địa phương',
  doc_import: 'Nhập tài liệu (Word/PDF)',
  doc_flowchart: 'Sơ đồ quy trình',
  doc_regenerate_flowchart: 'Tạo lại sơ đồ',

  // Document types
  doc_type_sop: 'Quy trình',
  doc_type_work_instruction: 'Hướng dẫn công việc',
  doc_type_quality_policy: 'Chính sách chất lượng',
  doc_type_audit_checklist: 'Bảng kiểm tra',
  doc_type_ncr_report: 'Phiếu không phù hợp',
  doc_type_capa_report: 'Hành động khắc phục',
  doc_type_risk_register: 'Sổ rủi ro',

  // NCR
  ncr_create: 'Tạo NCR mới',
  ncr_description: 'Mô tả sự không phù hợp',
  ncr_department: 'Bộ phận xảy ra',
  ncr_iso_clause: 'Điều khoản ISO liên quan',
  ncr_severity: 'Mức độ nghiêm trọng',
  ncr_severity_minor: 'Nhỏ',
  ncr_severity_major: 'Lớn',
  ncr_severity_critical: 'Nghiêm trọng',
  ncr_reporter: 'Người phát hiện',
  ncr_assign: 'Phân công xử lý',
  ncr_assigned_to: 'Người chịu trách nhiệm',
  ncr_due_date: 'Hạn xử lý',
  ncr_root_cause: 'Phân tích nguyên nhân gốc rễ (5-Why)',
  ncr_proposed_capa: 'Đề xuất hành động khắc phục',
  ncr_implementation_notes: 'Ghi chú thực hiện',
  ncr_upload_evidence: 'Tải lên bằng chứng',
  ncr_verify_effective: 'Hành động khắc phục có giải quyết được nguyên nhân gốc rễ không?',
  ncr_closure_report: 'Báo cáo đóng NCR',
  ncr_approve_closure: 'Phê duyệt báo cáo đóng',
  ncr_photo_required: 'Ảnh bằng chứng là bắt buộc với NCR mức độ lớn và nghiêm trọng',

  // NCR Kanban columns
  ncr_col_open: 'Mới mở',
  ncr_col_analysing: 'Phân tích & CAPA',
  ncr_col_pending_capa: 'Chờ duyệt CAPA',
  ncr_col_implementing: 'Đang thực hiện',
  ncr_col_pending_verification: 'Chờ xác nhận',
  ncr_col_completed: 'Hoàn thành',

  // Dashboard
  dashboard_title: 'Bảng điều khiển',
  dashboard_health_score: 'Điểm sức khỏe tuân thủ',
  dashboard_ncr_overdue: 'NCR quá hạn',
  dashboard_docs_expiring: 'Tài liệu sắp hết hạn',
  dashboard_pending_approval: 'Chờ phê duyệt',
  dashboard_upcoming_actions: 'Hành động sắp tới',
  dashboard_no_alerts: 'Không có cảnh báo — hệ thống đang hoạt động tốt',

  // Notifications
  notif_doc_pending: 'Tài liệu chờ phê duyệt',
  notif_ncr_assigned: 'Bạn được phân công xử lý NCR',
  notif_capa_rejected: 'CAPA bị từ chối',
  notif_ncr_overdue: 'NCR quá hạn',
  notif_ncr_closed: 'NCR đã được đóng',
  notif_mark_read: 'Đánh dấu đã đọc',
  notif_mark_all_read: 'Đánh dấu tất cả đã đọc',

  // Errors
  error_required: 'Trường này là bắt buộc',
  error_generic: 'Đã xảy ra lỗi. Vui lòng thử lại.',
  error_unauthorized: 'Bạn không có quyền thực hiện thao tác này.',
  error_not_found: 'Không tìm thấy dữ liệu.',
} as const

export type ViKey = keyof typeof vi

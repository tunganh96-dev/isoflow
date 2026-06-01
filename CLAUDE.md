# CLAUDE.md — ISO Compliance App (ISOFlow)

## ⚠️ BUILD INSTRUCTION FOR CLAUDE CODE

**Start with Phase 1 features only.** Do not build Phase 2 or Phase 3 features until explicitly instructed. Every feature in this document is labeled [PHASE 1], [PHASE 2], or [PHASE 3].

**When starting any new session:**
1. Read this entire CLAUDE.md first
2. Ask: "Which phase are we building and which feature are we starting with?"
3. Wait for confirmation before writing any code
4. Build one feature at a time — test before moving to next

**Phase 1 scope (build in this order):**
1. Auth + user roles
2. Document Control (create, AI generate, version, approve, flowchart, acknowledge)
3. NCR Kanban (raise, assign, flow, closure report)
4. Dashboard (health score, alerts, upcoming actions)

---

## Project Overview

**App name:** ISOFlow
**Purpose:** Standalone internal ISO 9001 compliance management system for a Vietnamese manufacturing company with 3 factories.
**Stack:** Next.js 14 (App Router) · Supabase (PostgreSQL + RLS + Auth) · Claude API (claude-sonnet-4-20250514) · Vercel · Resend (email alerts) · Mermaid (flowchart rendering)
**Repo:** `github.com/tunganh96-dev/isoflow`
**Separate from OKRFlow:** Different Supabase project, different Vercel deployment, different URL. No API connection between the two apps.

---

## Business Context

**Company:** Vietnamese manufacturing company
**Factories:**
- Quế Võ (QVO) — pilot factory, build and test here first
- Long An (LA) — Phase 3 rollout
- Thường Tín (TT) — Phase 3 rollout
- HQ — central quality team

**Target certification:** ISO 9001:2015 (Quality Management System)
**No external audit date set yet** — build at sustainable pace

**Core problems this app solves:**
- Documents scattered across Google Drive, paper, WhatsApp
- No audit trail for who read what and when
- NCRs tracked informally, CAPAs forgotten
- Document writing is slow and inconsistent
- No visibility on compliance health before auditor visits

---

## Departments (same structure across all factories)

| # | Department (Vietnamese) | Code | Notes |
|---|---|---|---|
| 1 | Sản xuất Converting | SC | |
| 2 | Sản xuất Paper Machine | SP | |
| 3 | Kho & Logistics | KL | |
| 4 | Kỹ thuật và Bảo Trì | KT | |
| 5 | HR | HR | |
| 6 | Kế Toán | KT2 | |
| 7 | Kế Hoạch | KH | |
| 8 | ISO | ISO | exclude_from_cross_audit = true |
| 9 | QC | QC | |
| 10 | R&D | RD | Quế Võ only |

Seed these departments for all factories on initial setup. R&D only seeded for Quế Võ.

---

## Users & Roles

| Role | Vietnamese | Access |
|---|---|---|
| `qa_employee` | Nhân viên QA | Creates drafts, submits for approval, scoped to own factory |
| `qa_manager` | Quản lý QA | Full access all modules all factories |
| `staff` | Nhân viên | Training queue only — own factory + department [PHASE 2] |

**Rules:**
- `qa_manager` — full access, no factory restriction
- `qa_employee` — scoped to own `factory_id` via RLS
- `staff` — sees only training queue for their `factory_id` + `department_id` [PHASE 2]
- `staff` accounts = department heads and supervisors only — not all operators
- RLS enforced at database level — not just UI

**Approval authority:**
| Document Type | Created by | Approved by |
|---|---|---|
| All document types | qa_employee | qa_manager |
| COO-level policies | qa_employee | qa_manager (COO sign-off recorded as text field) |

---

## Language

- **UI:** Vietnamese only with full diacritics
- **AI-generated content:** Vietnamese only with full diacritics
- **Database field names:** English
- **Code comments:** English
- **All Claude prompts must include:** *"Trả lời bằng tiếng Việt có đầy đủ dấu."*

---

## Module 1: Document Control (`/documents`) [PHASE 1]

### Document types
| Type | Vietnamese | Code |
|---|---|---|
| `sop` | Quy trình | QT |
| `work_instruction` | Hướng dẫn công việc | HD |
| `quality_policy` | Chính sách chất lượng | CS |
| `audit_checklist` | Bảng kiểm tra | BKT |
| `ncr_report` | Phiếu không phù hợp | NCR |
| `capa_report` | Hành động khắc phục | CAPA |
| `risk_register` | Sổ rủi ro | RR |

### Document code format
`{TYPE_CODE}-{FACTORY_CODE}-{SEQUENCE}` — e.g. `QT-QVO-001`
Master docs (no factory): `QT-001`, `HD-001`
Addendums: `QT-QVO-001-ADD`
Sequence: 3-digit zero-padded, auto-incremented per factory per doc type

### Document lifecycle
```
draft → pending_approval → published → under_review → archived
```
- `draft` — created by qa_employee, editable
- `pending_approval` — submitted, locked for editing
- `published` — approved and live
- `under_review` — master had major update, factory addendum needs review
- `archived` — replaced by newer version, read-only, never deleted

### Master + Factory Addendum system [PHASE 1]

**Master documents:**
- `factory_id = NULL` — applies to all factories by default
- Owned and managed by qa_manager at HQ level

**Factory addendums:**
- `factory_id = specific factory`
- `parent_doc_id` references the master
- **Optional** — if no addendum exists, factory follows master 100%
- Created by qa_employee, approved by qa_manager

**What staff sees:**
- No addendum → master document only
- Addendum exists → master + addendum merged as one clean document
- Factory-specific steps highlighted: *"Áp dụng riêng cho [factory name]"*
- Staff never sees "master" and "addendum" separately

**Audit evidence text:**
- No addendum: *"Theo tài liệu gốc [doc_code] — không có sửa đổi địa phương"*

**When master has major update:**
- All addendums for that master → `under_review`
- qa_manager email: "[N] tài liệu địa phương cần xem xét lại"

### Document creation & AI generation [PHASE 1]

AI is embedded inside the creation form — not a separate page.

**New document flow:**
1. qa_employee clicks "Tạo tài liệu mới"
2. Fills: title, document type, factory scope, description (1–2 sentences)
3. Clicks "Tạo bằng AI" → Claude generates full Vietnamese content
4. Content loads into rich text editor — fully editable
5. Claude simultaneously generates Mermaid flowchart from the steps
6. qa_employee reviews text + flowchart, edits if needed
7. Submits → status: `pending_approval`

**Legacy Word/PDF import flow:**
1. qa_employee uploads existing Word or PDF file
2. Claude reads and converts to structured Vietnamese text
3. Flow diagram images → Claude reads and regenerates as Mermaid code
4. qa_employee reviews converted content
5. Original file stored in Supabase Storage as reference
6. Proceeds through normal approval flow

**Rules:**
- All Claude calls via `/api/documents/generate` — server-side only
- `ANTHROPIC_API_KEY` never in browser or client code
- All AI output saved as `draft` — never auto-published
- Rich text editor: `@uiw/react-md-editor`

### Mermaid flowchart auto-generation [PHASE 1]

- Every SOP and Work Instruction gets an auto-generated flowchart
- Claude outputs Mermaid diagram code from document steps
- Rendered using `mermaid` npm package
- Displayed below written steps in document view
- Regenerates automatically when document updates to new version
- **Output only** — change written steps to change diagram
- Other document types do not need flowcharts

### Version control [PHASE 1]

- Every edit to a published document creates a new version (integer, starts at 1)
- qa_manager selects at approval:
  - **Thay đổi nhỏ** — minor: no re-training triggered [PHASE 2 when training exists]
  - **Thay đổi lớn** — major: re-training auto-assigned [PHASE 2 when training exists]
- Previous version → `archived`, permanently viewable read-only
- Document list filtered by: factory + document type + status

### Document assignment [PHASE 1]

When publishing, qa_manager selects:
- **Nhà máy:** Quế Võ / Long An / Thường Tín / Tất cả
- **Bộ phận:** specific department / Tất cả bộ phận

Assignment stored in `document_assignments` table.
Used in Phase 2 for training queue population.

### Read acknowledgement [PHASE 2]

- Published document → appears in assigned staff training queue
- Staff clicks "Đã đọc và hiểu tài liệu này"
- Logged: `user_id`, `document_id`, `version`, `acknowledged_at`

### Quiz system [PHASE 2]

- Claude generates 5 multiple choice questions at draft creation time
- Same 5 questions for all assigned staff
- Pass = 4/5 correct
- qa_manager can edit questions before approving document
- Score recorded per user per version
- Fail → retry after 24 hours
- 3 fails → qa_manager notified

### Critical steps [PHASE 3]

- qa_employee marks critical steps while writing
- Claude suggests additional critical steps with reasoning
- qa_manager makes final confirmation
- Used as mandatory audit checklist items
- At least 1 quiz question per critical step guaranteed

### Knowledge points [PHASE 3]

- Claude extracts 3–6 key facts per document
- Used for training gap analysis
- Stored as `knowledge_points` JSONB array

---

## Module 2: Audit Management (`/audits`) [PHASE 2]

### Audit types
- `internal` — ISO department audits other departments monthly
- `external` — certification body [PHASE 3 — separate module]
- `supplier` — supplier audits [PHASE 3]

### Department audit rules
- ISO department conducts all internal audits (Phase 2)
- ISO department excluded from being cross-audited (`exclude_from_cross_audit = true`)
- QC and ISO remain separate departments
- Phase 3: true cross-department rotation activated by qa_manager

### Audit lifecycle
```
planned → in_progress → completed → closed
```

### Features [PHASE 2]
- Schedule audit: factory, department being audited, date, lead auditor
- AI generates checklist from department's published SOPs
- Auditor notified via in-app notification + email
- During audit: each checklist item marked `pass` / `minor_nc` / `major_nc` / `observation`
- Photo evidence attachable per finding
- Claude generates audit report after completion
- Major NC finding → NCR auto-created as draft in Module 3
- Audit record immutable once closed

### Monthly schedule
- One department audited per audit per factory
- qa_manager schedules manually in Phase 2
- Phase 3: system manages rotation automatically

---

## Module 3: NCR & CAPA Management (`/ncr`) [PHASE 1]

### NCR Kanban — 6 columns
```
Mới mở → Phân tích & CAPA → Chờ duyệt CAPA → Đang thực hiện → Chờ xác nhận → Hoàn thành
```

Plus one conditional column:
```
Chờ cập nhật tài liệu (only appears when process change required) [PHASE 2]
```

### Who can do what
| Action | Who |
|---|---|
| Raise NCR | qa_employee, qa_manager |
| Assign to person + due date | qa_manager |
| Fill 5-Why + propose CAPA | Assigned person (needs staff account) |
| Approve or reject CAPA | qa_manager |
| Mark fix implemented + upload evidence | Assigned person |
| Verify fix effectiveness | qa_manager |
| Decide if process change needed | qa_manager [PHASE 2] |
| Generate closure report | System (Claude) — automatic |
| Approve closure report | qa_manager |

**Reporter:** "Người phát hiện" is a text field only — no user account needed for reporters

### NCR creation form
- Description of problem (free text)
- Department where it occurred (dropdown)
- ISO clause affected (dropdown of ISO 9001 clauses)
- Severity: `minor` / `major` / `critical`
- Photo evidence (optional for minor, mandatory for major + critical)
- "Người phát hiện" — reporter name (text field)

### NCR code format
`NCR-{FACTORY_CODE}-{YEAR}-{SEQUENCE}` — e.g. `NCR-QVO-2025-001`

### Severity rules
| Severity | Photo | Root cause | Verification |
|---|---|---|---|
| Minor | Optional | Simple description enough | Evidence review |
| Major | Mandatory | Full 5-Why required | Evidence review |
| Critical | Mandatory | Full 5-Why required | Physical verification by qa_manager |

### Column rules

**Mới mở:**
- NCR raised by qa_employee or qa_manager
- qa_manager assigns responsible person + due date
- Moves to Phân tích & CAPA when assigned

**Phân tích & CAPA:**
- Assigned person fills 5-Why root cause analysis
- Assigned person proposes corrective action
- No Claude review — person does their own analysis
- Submits when ready → moves to Chờ duyệt CAPA

**Chờ duyệt CAPA:**
- qa_manager reviews root cause + proposed CAPA
- **Approve** → moves to Đang thực hiện
- **Reject** → bounces back to Phân tích & CAPA with red "Bị từ chối" badge + rejection notes
- No maximum rejections

**Đang thực hiện:**
- Responsible person implements the fix
- Updates progress notes on card
- Due date turns red if approaching
- Marks complete + uploads evidence → moves to Chờ xác nhận

**Chờ xác nhận:**
- qa_manager reviews evidence
- Answers: *"Hành động khắc phục có giải quyết được nguyên nhân gốc rễ không?"*
- **Có — effective:**
  - [PHASE 2] Ask: process change needed? Yes → Chờ cập nhật tài liệu / No → Hoàn thành
  - [PHASE 1] → Hoàn thành directly
- **Không — not effective** → bounces back to Phân tích & CAPA to rethink root cause
- Critical severity: qa_manager must physically verify and confirm in app

**Chờ cập nhật tài liệu [PHASE 2]:**
- qa_manager selects which document needs updating
- Describes what needs to change
- Document moves to `under_review` in Module 1
- qa_employee assigned to create new version
- NCR cannot close until linked document is published
- qa_manager can override with written reason

**Hoàn thành:**
- Claude auto-generates closure report from all card data
- Report includes: NCR description, 5-Why analysis, fix implemented, evidence summary, Claude conclusion paragraph
- qa_manager reviews + approves closure report
- NCR closed → immutable
- [PHASE 2] Cross-factory question: *"Hành động này có cần áp dụng cho nhà máy khác không?"*
- PDF export available on demand [PHASE 2]

### Claude system prompt — Closure report
```
Bạn là chuyên gia hệ thống quản lý chất lượng ISO 9001.
Dựa trên thông tin NCR đã hoàn thành dưới đây, hãy viết phần KẾT LUẬN 
cho báo cáo đóng NCR (2-3 câu tiếng Việt):
- Tóm tắt ngắn gọn vấn đề đã xảy ra
- Hành động khắc phục đã thực hiện
- Kết quả đạt được

Chỉ viết phần kết luận. Trả lời bằng tiếng Việt có đầy đủ dấu.
```

### Notifications (all via email + in-app bell)
| Event | Recipients |
|---|---|
| NCR assigned | Responsible person |
| CAPA rejected | Responsible person + rejection notes |
| Root cause submitted | qa_manager |
| Fix submitted for review | qa_manager |
| Fix rejected | Responsible person |
| NCR closed | All involved parties |
| Overdue 3 days | qa_manager |
| Overdue 7 days | qa_manager + factory manager |

### Phases
| Phase | Features |
|---|---|
| Phase 1 | Kanban 6 columns, raise NCR, assign, severity rules, CAPA flow, closure report by Claude, email + in-app notifications |
| Phase 2 | Process change link to document, cross-factory flag, PDF export, auto-create from audit findings |
| Phase 3 | NCR analytics — trends by department, clause, factory |

---

## Module 4: Training Records (`/training`) [PHASE 2]

### Staff homepage — three sections only
```
📄 Cần đọc        — assigned documents not yet read
📝 Cần làm bài    — read but quiz not completed
✅ Đã hoàn thành  — fully completed
```
No other navigation for staff role.

### Training completion flow
```
Document published + assigned to factory + department
→ All staff in matching factory + department → Cần đọc queue
→ Staff reads full document + Mermaid flowchart
→ Clicks "Đã đọc và hiểu tài liệu này"
→ 5 quiz questions appear (same for everyone)
→ Pass 4/5 → Hoàn thành
→ Fail → retry after 24 hours
→ 3 fails → qa_manager notified
```

### Rules
- Staff can re-read any completed document anytime
- Major document update → re-training automatically assigned
- Minor document update → no re-training
- No monthly micro-tests — internal audit covers real-world verification
- New staff account created → auto-assigned all documents for their factory + department

### Training matrix [PHASE 2]
- qa_manager view: rows = staff, columns = documents, cells = status
- Completion % per department per factory

### Supervisor bulk-confirm [PHASE 3]
- Supervisor marks their team as briefed for operators without individual accounts

---

## Module 5: ISO Compliance Review (`/review`) [PHASE 2]

### Mode A — Document review [PHASE 2]
- "Kiểm tra ISO" button on every document page
- Claude reads document + evaluates against ISO 9001 requirements
- Returns findings: severity + ISO clause + what's wrong + suggested fix
- Findings become a task list — qa_manager assigns each to qa_employee
- Overall compliance score 0–100 per document
- Every review saved — score history over time
- Auto-triggered when document is published or updated

### Mode B — System gap analysis [PHASE 2]
- "Phân tích toàn hệ thống" on dashboard
- Claude checks all published docs against ISO 9001 clauses 4–10
- Returns: missing clauses (red) / weak coverage (yellow) / well covered (green)
- Overall factory readiness score with Vietnamese verdict:
  - 90–100%: "Sẵn sàng kiểm toán"
  - 70–89%: "Cần bổ sung trước kiểm toán"
  - Below 70%: "Chưa sẵn sàng — cần hành động ngay"
- Findings → task list assigned to qa_employee
- Unresolved items from previous run carry forward to next run

### Auto-run schedule
| Trigger | When |
|---|---|
| Quarterly auto-run | 1st of Jan, Apr, Jul, Oct |
| Pre-audit | 60 days before scheduled external audit |
| Document update | Immediate, that document only |
| Manual | Anytime qa_manager clicks |

### Phases
| Phase | Features |
|---|---|
| Phase 2 | Document review, system gap analysis, quarterly auto-run, task list |
| Phase 3 | Cross-factory comparison, score trend charts, 60-day pre-audit trigger |

---

## Module 6: Compliance Dashboard (`/dashboard`) [PHASE 1]

### Layout — three sections

**Top — action alerts (show only if count > 0):**
```
🔴 NCR quá hạn: [N]
🟡 Tài liệu sắp hết hạn: [N]
🟠 Chờ phê duyệt: [N]
```

**Middle — factory health scores:**
```
Quế Võ     ████████░░  82%  🟡
Long An    ██████████  94%  🟢
Thường Tín ██████░░░░  61%  🔴
```

**Bottom — upcoming actions:**
```
📋 Kiểm toán nội bộ: [factory / department] — [N] ngày nữa
📄 Kiểm tra ISO quý tới: [N] ngày nữa
⚠️ [N] NCR chờ xác nhận từ qa_manager
```

### Health score calculation (0–100)
| Module | Weight | What's measured |
|---|---|---|
| Documents | 30% | Published docs, no expired, pending approvals cleared |
| Training | 25% | Completion % across assigned staff [PHASE 2] |
| NCR | 25% | No overdue CAPAs, NCRs moving through kanban |
| Audits | 20% | Audits on schedule, findings actioned [PHASE 2] |

Phase 1: score calculated from Documents (50%) + NCR (50%) until other modules are live.

### Rules
- Exceptions only — nothing shown if everything is fine
- No charts or graphs in Phase 1 — numbers only
- Score breakdown visible on hover [PHASE 2]
- Score history trend [PHASE 3]

---

## Database Schema

### Core tables (Phase 1)

```sql
-- Factories
create table factories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,  -- 'QVO', 'LA', 'TT', 'HQ'
  created_at timestamptz default now()
);

-- Departments
create table departments (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid references factories(id),
  name text not null,
  code text not null,
  exclude_from_cross_audit boolean default false,
  created_at timestamptz default now()
);

-- Users
create table users (
  id uuid primary key references auth.users(id),
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('qa_employee','qa_manager','staff')),
  factory_id uuid references factories(id),
  department_id uuid references departments(id),
  created_at timestamptz default now()
);

-- Documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  doc_code text not null unique,
  title text not null,
  doc_type text not null check (doc_type in (
    'sop','work_instruction','quality_policy',
    'audit_checklist','ncr_report','capa_report','risk_register'
  )),
  content text not null,            -- markdown
  mermaid_code text,                -- auto-generated flowchart code
  version integer not null default 1,
  status text not null default 'draft' check (status in (
    'draft','pending_approval','published','under_review','archived'
  )),
  factory_id uuid references factories(id),  -- null for master docs
  parent_doc_id uuid references documents(id), -- for addendums
  is_addendum boolean default false,
  owner_id uuid references users(id),
  approved_by uuid references users(id),
  approved_at timestamptz,
  revision_type text check (revision_type in ('minor','major')),
  review_date date,
  source_file_url text,             -- original uploaded Word/PDF
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Document assignments
create table document_assignments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  factory_id uuid references factories(id),   -- null = all factories
  department_id uuid references departments(id), -- null = all departments
  assigned_by uuid references users(id),
  assigned_at timestamptz default now()
);

-- NCRs
create table ncrs (
  id uuid primary key default gen_random_uuid(),
  ncr_code text not null unique,
  description text not null,
  reporter_name text,               -- text field only, no user account needed
  iso_clause text,
  severity text not null check (severity in ('minor','major','critical')),
  factory_id uuid references factories(id),
  department_id uuid references departments(id),
  raised_by uuid references users(id),
  assigned_to uuid references users(id),
  due_date date,
  status text not null default 'open' check (status in (
    'open','analysing','pending_capa_approval',
    'implementing','pending_verification',
    'pending_doc_update','completed'
  )),
  root_cause_analysis text,         -- 5-Why filled by responsible person
  proposed_capa text,
  capa_approved_by uuid references users(id),
  capa_approved_at timestamptz,
  capa_rejection_notes text,
  implementation_notes text,
  implementation_evidence_urls text[],
  verification_notes text,
  verified_by uuid references users(id),
  verified_at timestamptz,
  process_change_required boolean default false,
  linked_document_id uuid references documents(id),
  closure_report text,              -- Claude-generated at completion
  closure_approved_by uuid references users(id),
  closure_approved_at timestamptz,
  photo_urls text[],
  audit_id uuid,                    -- reference to audit if auto-created [PHASE 2]
  raised_at timestamptz default now(),
  closed_at timestamptz
);

-- NCR activity log
create table ncr_activity (
  id uuid primary key default gen_random_uuid(),
  ncr_id uuid references ncrs(id),
  user_id uuid references users(id),
  action text not null,             -- 'assigned', 'rejected', 'approved', etc.
  notes text,
  created_at timestamptz default now()
);

-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  title text not null,
  body text not null,
  link text,                        -- deep link to relevant page
  read boolean default false,
  created_at timestamptz default now()
);
```

### Phase 2 additions
```sql
-- Document acknowledgements
create table document_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  user_id uuid references users(id),
  version integer not null,
  acknowledged_at timestamptz default now(),
  quiz_score integer,
  quiz_passed boolean,
  unique(document_id, user_id, version)
);

-- Audits
create table audits (
  id uuid primary key default gen_random_uuid(),
  audit_type text not null check (audit_type in ('internal','external','supplier')),
  status text not null default 'planned',
  factory_id uuid references factories(id),
  department_audited_id uuid references departments(id),
  lead_auditor_id uuid references users(id),
  scheduled_date date not null,
  checklist jsonb,
  findings jsonb,
  report_content text,
  closed_at timestamptz,
  created_at timestamptz default now()
);

-- Compliance reviews
create table compliance_reviews (
  id uuid primary key default gen_random_uuid(),
  review_type text not null check (review_type in ('document','system')),
  factory_id uuid references factories(id),
  document_id uuid references documents(id),
  triggered_by uuid references users(id),
  trigger_type text check (trigger_type in ('manual','quarterly','pre_audit','on_publish')),
  findings jsonb not null,
  overall_score integer,
  created_at timestamptz default now()
);
```

### RLS policies (Phase 1)
```sql
-- qa_manager sees everything
-- qa_employee scoped to own factory
-- Apply to: documents, ncrs, notifications

create policy "scoped_access" on documents
  for all using (
    auth.uid() in (select id from users where role = 'qa_manager')
    or
    factory_id is null  -- master docs visible to all
    or
    factory_id = (select factory_id from users where id = auth.uid())
  );

-- Repeat same pattern for ncrs table
```

---

## Claude AI Integration

### Rules
- All Claude calls server-side only via `/app/api/` route handlers
- Model: `claude-sonnet-4-20250514`
- Max tokens: 2000 for documents, 500 for closure reports
- `ANTHROPIC_API_KEY` never in client code or browser
- All outputs in Vietnamese with full diacritics
- All AI output saved as `draft` — never auto-published

### API routes
```
POST /api/documents/generate        — generate document from description
POST /api/documents/import          — convert uploaded Word/PDF to app format
POST /api/documents/flowchart       — generate Mermaid code from document steps
POST /api/ncr/closure-report        — generate NCR closure report paragraph
POST /api/review/document           — ISO compliance check on single doc [PHASE 2]
POST /api/review/system             — full factory gap analysis [PHASE 2]
POST /api/audits/checklist          — generate audit checklist from scope [PHASE 2]
```

### Claude prompts

**Document generator (SOP):**
```
Bạn là chuyên gia hệ thống quản lý chất lượng ISO 9001 cho nhà máy sản xuất tại Việt Nam.
Hãy tạo một Quy trình (SOP) chuẩn ISO 9001:2015 với cấu trúc:
1. Mục đích
2. Phạm vi áp dụng
3. Tài liệu tham chiếu
4. Định nghĩa và viết tắt
5. Trách nhiệm
6. Nội dung quy trình (các bước chi tiết có đánh số)
7. Hồ sơ liên quan
Ngôn ngữ chuyên nghiệp, rõ ràng. Chỉ trả về nội dung tài liệu.
Trả lời bằng tiếng Việt có đầy đủ dấu.
```

**Mermaid flowchart generator:**
```
Bạn là chuyên gia ISO 9001. Từ các bước quy trình dưới đây,
hãy tạo Mermaid flowchart diagram code.
Sử dụng: flowchart TD
Nodes: tiếng Việt ngắn gọn (tối đa 5 từ mỗi node)
Bao gồm: decision diamonds cho các bước có điều kiện Yes/No
Chỉ trả về Mermaid code, không có text khác.
Trả lời bằng tiếng Việt có đầy đủ dấu.
```

**NCR closure report:**
```
Bạn là chuyên gia ISO 9001. Dựa trên thông tin NCR đã hoàn thành,
hãy viết phần KẾT LUẬN cho báo cáo đóng NCR (2-3 câu):
- Tóm tắt ngắn gọn vấn đề
- Hành động đã thực hiện
- Kết quả đạt được
Chỉ viết phần kết luận. Trả lời bằng tiếng Việt có đầy đủ dấu.
```

---

## Document Code Generation

```typescript
// Auto-generate doc_code on creation
async function generateDocCode(
  docType: string,
  factoryCode: string | null,
  isAddendum: boolean
): Promise<string> {
  const typeCode = DOC_TYPE_CODES[docType]
  if (!factoryCode) {
    // Master doc: QT-001
    const seq = await getNextSequence(docType, null)
    return `${typeCode}-${seq.toString().padStart(3, '0')}`
  }
  if (isAddendum) {
    // Addendum: QT-QVO-001-ADD
    const masterSeq = await getMasterSequence(docType)
    return `${typeCode}-${factoryCode}-${masterSeq}-ADD`
  }
  // Factory doc: QT-QVO-001
  const seq = await getNextSequence(docType, factoryCode)
  return `${typeCode}-${factoryCode}-${seq.toString().padStart(3, '0')}`
}
```

---

## File Storage (Supabase Storage)

| Bucket | Contents |
|---|---|
| `source-documents` | Uploaded Word/PDF originals |
| `ncr-photos` | NCR and audit finding photos |
| `ncr-evidence` | CAPA implementation evidence |

RLS: users can only read files belonging to their factory.

---

## Email Alerts (Resend)

| Event | Recipients |
|---|---|
| Document pending approval | qa_manager |
| Document review_date within 30 days | Document owner + qa_manager |
| NCR assigned | Responsible person |
| CAPA rejected | Responsible person |
| NCR overdue 3 days | qa_manager |
| NCR overdue 7 days | qa_manager + factory manager |
| NCR closed | All involved parties |
| 3 quiz fails [PHASE 2] | qa_manager |
| Quarterly compliance review ready [PHASE 2] | qa_manager |

---

## Coding Standards

- All API routes in `/app/api/` (Next.js App Router)
- Claude calls only in server-side API routes
- Use `createServerClient` (Supabase) in API routes
- Use `createBrowserClient` (Supabase) in client components
- All database mutations through API routes — never direct from client
- Vietnamese UI strings in `/lib/i18n/vi.ts`
- Error handling: all API routes return `{ error: string }` with correct HTTP status
- Skeleton loading on all data-fetching pages
- Optimistic UI for status updates (Kanban card moves)
- Mobile-first — qa_manager and staff will use on phones

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## Key Business Rules (Never Violate)

1. Documents **never deleted** — only archived
2. Published documents **immutable** — create new version to edit
3. NCRs **immutable once closed** — no editing after `completed` status
4. All AI-generated content saved as **draft** — requires human approval
5. Factory Manager/qa_employee **cannot see other factories' data** — RLS enforced
6. CAPA **cannot be marked effective** without qa_manager verification
7. NCR with process change **cannot close** until linked document is published [PHASE 2]
8. Audit findings **immutable after audit closed** [PHASE 2]
9. Quiz questions **same for everyone** per document version [PHASE 2]
10. `ANTHROPIC_API_KEY` **never in browser or client code** — ever

---

## Build Phases Summary

### Phase 1 — Quế Võ pilot (build now)
1. Auth (Supabase Auth, 3 roles — but only qa_employee + qa_manager active)
2. Database schema — Phase 1 tables + RLS + seed data
3. Document Control — create, AI generate, Mermaid flowchart, version, approve, archive
4. Document list — filtered by factory + doc type + status
5. Legacy import — Word/PDF → Claude converts
6. NCR Kanban — 6 columns, raise, assign, CAPA flow, closure report
7. In-app notification bell
8. Email alerts via Resend
9. Compliance Dashboard — health score, alerts, upcoming actions

### Phase 2 — After 4–6 weeks real usage at Quế Võ
10. Training Records — staff accounts, read acknowledgement, quiz, retry limit
11. Internal Audit module — schedule, checklist, findings, auto-create NCR
12. NCR additions — process change link, cross-factory flag, PDF export
13. Document compliance review (Mode A — single document)
14. System gap analysis (Mode B — full factory)
15. Quarterly auto-run + task list for findings

### Phase 3 — Full rollout
16. Expand to Long An + Thường Tín
17. Critical steps flagging
18. Knowledge points extraction
19. External audit module (separate)
20. Supplier audit module
21. Cross-factory compliance comparison
22. NCR analytics + training gap report
23. Score trend charts
24. Cross-department audit rotation

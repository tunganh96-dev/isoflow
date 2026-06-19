# User Adoption Review — ISOFlow
# Run this before onboarding real users (QA Manager, QA Employees, Staff)

Read CLAUDE.md carefully before starting.

Review the entire ISOFlow application from the perspective of real users at a Vietnamese manufacturing factory. These users are not technical — they need the app to be simple, clear, and fast.

## 1. QA Manager Experience
Walk through the complete QA Manager journey:
- Login → lands on correct dashboard
- Dashboard shows health score, alerts, upcoming actions clearly
- Can create a new document and generate content with AI in under 3 minutes
- Can approve a pending document in under 1 minute
- Can raise an NCR and assign it in under 2 minutes
- Can move an NCR card through the Kanban in 1-2 clicks
- Can see all factories' status at a glance

For each flow, identify:
- Any step that requires more than 3 clicks unnecessarily
- Any Vietnamese text that is unclear, wrong, or missing diacritics
- Any loading state that has no spinner or feedback
- Any action with no confirmation or success message

## 2. QA Employee Experience
Walk through the QA Employee journey:
- Login → lands on correct page for their role
- Can create a document draft with AI assistance
- Clearly understands what happens after they submit for approval
- Can raise an NCR with description and photo
- Cannot accidentally access pages they shouldn't see

## 3. Staff Experience [PHASE 2 — skip if not built yet]
Walk through the Staff journey:
- Login → sees only their training queue, nothing else
- Can read a document and complete acknowledgement
- Quiz questions are clear and in correct Vietnamese
- Pass/fail feedback is clear
- Completed items are clearly marked

## 4. Mobile Experience
- Open each page on a mobile viewport (375px width)
- Check Kanban board is usable on mobile
- Check document creation form works on mobile keyboard
- Check all buttons are large enough to tap (minimum 44px)
- Check text is readable without zooming

## 5. Vietnamese Language Check
- Review all UI strings in `/lib/i18n/vi.ts`
- Check all Vietnamese text has correct diacritics
- Check all AI-generated content previews show Vietnamese correctly
- Check all error messages are in Vietnamese
- Check all email notification content is in Vietnamese

## 6. Empty States
- What does the document list look like with zero documents?
- What does the NCR Kanban look like with no NCRs?
- What does the dashboard look like before any data exists?
- Each empty state should have a clear call to action in Vietnamese

## 7. Error Handling
- What happens if Claude API is slow or fails?
- What happens if Supabase connection drops?
- What happens if file upload fails?
- Each error should show a friendly Vietnamese message — not a raw error code

## Output format
List findings as:
- 🔴 BLOCKER — user cannot complete a task, must fix before onboarding
- 🟡 FRICTION — makes task harder than necessary, fix soon
- 🟢 SUGGESTION — nice to have improvement

Group by user role. List all BLOCKERs at the top.
Estimate fix time for each BLOCKER (quick fix / half day / full day).

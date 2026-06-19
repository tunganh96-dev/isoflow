# Security Audit — ISOFlow
# Run this before any production deployment or new user onboarding

Read CLAUDE.md carefully before starting.

Perform a full security audit on the ISOFlow codebase. This app handles sensitive ISO compliance data across multiple factories — security must be airtight.

## 1. API Key Exposure
- Search entire codebase for `ANTHROPIC_API_KEY` — must only appear in server-side files
- Search for `SUPABASE_SERVICE_ROLE_KEY` — must only appear in server-side files
- Search for `RESEND_API_KEY` — must only appear in server-side files
- Confirm zero API keys are hardcoded anywhere (search for `sk-`, `eyJ`, `re_`)
- Check no sensitive keys are logged with `console.log`

## 2. Row Level Security (RLS)
- Confirm RLS is ENABLED on every table: factories, departments, users, documents, document_assignments, ncrs, ncr_activity, notifications
- Test qa_employee cannot read documents from other factories
- Test qa_employee cannot read NCRs from other factories
- Test staff role cannot access NCR or document management routes
- Confirm qa_manager can read all factories without restriction
- Check no table has RLS disabled that should have it enabled

## 3. Authentication & Authorization
- Verify every API route checks `auth.getUser()` before processing
- Confirm role checks are server-side — never trust role from client request body
- Check middleware covers all protected routes under `/dashboard`
- Verify no API route allows unauthenticated access except `/api/auth/`
- Confirm password reset and email verification flows are handled by Supabase Auth correctly

## 4. Input Validation
- Check all form inputs are validated server-side before database insert
- Verify file uploads check file type and size before storing
- Confirm NCR description and document content are sanitized before Claude API calls
- Check no SQL injection possible through dynamic queries (use parameterized queries only)

## 5. File Storage Security
- Confirm Supabase Storage buckets are not public
- Verify signed URLs are used for file access — not public permanent URLs
- Check file upload size limits are set
- Confirm only allowed file types can be uploaded (PDF, DOCX, JPG, PNG)

## 6. Data Exposure
- Check API responses never return `SUPABASE_SERVICE_ROLE_KEY` or other secrets
- Verify user passwords are never returned in any API response
- Confirm Claude API responses are not logged in full to console in production
- Check error messages don't expose internal system details to client

## 7. Environment
- Verify `.env.local` is in `.gitignore`
- Check no `.env` files are committed to GitHub
- Confirm `NEXT_PUBLIC_APP_URL` is set correctly for production

## Output format
For each section:
- ✅ SECURE — confirmed safe
- ⚠️ RISK — potential issue, should fix before production
- ❌ CRITICAL — must fix immediately, do not deploy

List all CRITICAL and RISK items at the bottom with exact fixes required.
Do not proceed with deployment if any CRITICAL items exist.

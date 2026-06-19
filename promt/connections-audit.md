# Connections Audit — ISOFlow
# Run this after every 2-3 features built

Read CLAUDE.md carefully before starting.

Perform a full connections audit on the ISOFlow codebase. Check every integration point and confirm it is working correctly.

## 1. Supabase Connections
- Verify `createServerClient` is used in all API routes and server components
- Verify `createBrowserClient` is used in all client components
- Confirm no direct Supabase calls from client components that should go through API routes
- Check all tables referenced in code actually exist in the database schema
- Check all foreign key references are correct
- Verify RLS policies are applied on all tables: documents, ncrs, notifications, document_assignments
- Confirm `factory_admin` is scoped to its own `factory_id`
- Confirm `department_head` is scoped to its own factory and department
- Confirm `super_admin` and `coo` have unrestricted access across all factories

## 2. Claude API Connections
- Verify `ANTHROPIC_API_KEY` is only referenced in server-side API routes
- Confirm no Claude calls exist in any client component or browser-side code
- Check all Claude API routes are in `/app/api/` only
- Verify model is set to `claude-sonnet-4-20250514` in all calls
- Confirm all prompts instruct Vietnamese output with full diacritics

## 3. API Routes
- List all API routes currently built
- For each route confirm: correct HTTP method, auth check present, error handling returns `{ error: string }`, correct HTTP status codes
- Verify no API route exposes sensitive keys in responses

## 4. Environment Variables
- Confirm all required env vars are referenced correctly
- Check `.env.local` values are not hardcoded anywhere in code
- Verify `NEXT_PUBLIC_` prefix only on variables safe for browser exposure
- `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` must never have `NEXT_PUBLIC_` prefix

## 5. Authentication Flow
- Verify middleware protects all `/dashboard` routes
- Confirm employee login redirects to `/checklists`; management roles redirect to `/dashboard`
- Check session handling works on both server and client components
- Verify unauthorized access to protected routes redirects to `/login`

## 6. Data Flow
- Trace one complete document creation flow: form → API route → Claude → Supabase → response
- Trace one complete NCR creation flow: form → API route → Supabase → notification
- Confirm no data mutations happen directly from client — all go through API routes

## 7. File Storage
- Verify Supabase Storage buckets exist: `source-documents`, `ncr-photos`, `ncr-evidence`
- Confirm file upload routes use service role key server-side only
- Check RLS on storage buckets scopes access by factory

## Output format
For each section above, report:
- ✅ PASS — what was checked and confirmed correct
- ⚠️ WARNING — works but should be improved
- ❌ FAIL — broken or missing, with exact file and line number

List all failures at the bottom with suggested fixes in priority order.

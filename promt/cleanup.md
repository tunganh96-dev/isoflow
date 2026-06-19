# Weekly Cleanup — ISOFlow
# Run this every week or after a sprint of feature building

Read CLAUDE.md carefully before starting.

Perform a full codebase cleanup on ISOFlow. Goal: keep the code simple, consistent, and maintainable for a mid-level developer.

## 1. Dead Code
- Find and remove any unused imports in all files
- Find and remove any commented-out code blocks
- Find and remove any unused functions, variables, or components
- Find and remove any TODO comments that have been completed
- Check for any duplicate utility functions that can be consolidated

## 2. Console Logs
- Remove all `console.log` statements from production code
- Remove all `console.error` that expose sensitive data
- Keep only intentional error logging with proper context

## 3. Vietnamese UI Strings
- Find any hardcoded Vietnamese strings in components that should be in `/lib/i18n/vi.ts`
- Move them to the i18n file and replace with the constant reference
- Check for any duplicate string definitions

## 4. API Route Consistency
- Verify every API route follows the same pattern:
  - Auth check first
  - Input validation second
  - Business logic third
  - Consistent error response format: `{ error: string }`
  - Correct HTTP status codes
- Standardize any routes that deviate from this pattern

## 5. Component Cleanup
- Find any component over 200 lines — suggest splitting into smaller components
- Check for prop drilling more than 2 levels deep — suggest moving to context or state
- Verify all loading states use the same skeleton component pattern
- Check all forms have consistent validation and error display patterns

## 6. Database Query Cleanup
- Find any N+1 query patterns — queries inside loops
- Check all Supabase queries select only needed columns — no `select('*')` in production
- Verify all queries that filter by factory_id are using RLS correctly
- Check for any missing indexes on frequently queried columns

## 7. Type Safety
- Find any `any` types in TypeScript — replace with proper types
- Check all Supabase query results are properly typed
- Verify all API route request/response bodies have TypeScript interfaces
- Check all Claude API response parsing has proper error handling

## 8. File & Folder Structure
- Verify folder structure matches CLAUDE.md specification
- Check no files are in wrong locations
- Confirm all API routes are under `/app/api/`
- Confirm all reusable utilities are in `/lib/`

## 9. Package.json
- Check for unused dependencies — list any that can be removed
- Check all dependencies are using stable versions (no alpha/beta in production)
- Verify `mermaid` and `@uiw/react-md-editor` are correctly installed

## Output format
For each section, list:
- Files changed and what was cleaned
- Any patterns found that should be avoided going forward
- Estimated technical debt remaining (low / medium / high)

End with a summary:
- Total files touched
- Biggest improvement made
- One recommendation for next week

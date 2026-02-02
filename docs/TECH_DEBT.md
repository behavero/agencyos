# Technical Debt Tracker

This document tracks known issues that need to be addressed in future sprints.

---

## 🔴 Critical (Blocking CI)

### TypeScript Errors

**Status:** ~60 errors (CI set to `continue-on-error: true`)

**Root Causes:**

1. **Zod v4 Breaking Changes**
   - Files: Multiple API routes
   - Issue: `.errors` property no longer exists on `ZodError`
   - Fix: Use `.format()` or `.flatten()` instead

   ```typescript
   // Before (Zod v3)
   error.errors

   // After (Zod v4)
   error.format()
   // or
   error.flatten().fieldErrors
   ```

2. **Vercel AI SDK Breaking Changes**
   - Files: `src/app/api/chat/route.ts`, `src/lib/ai/tools.ts`
   - Issues:
     - `maxSteps` no longer valid in `streamText`
     - `toDataStreamResponse()` renamed
     - Tool parameter types need explicit typing
   - Fix: Update to match latest AI SDK API

3. **Missing Type Annotations**
   - Files: `src/lib/ai/tools.ts`, `src/components/alfred/floating-chat.tsx`
   - Issue: Implicit `any` types
   - Fix: Add explicit type annotations

4. **Database Type Mismatch**
   - Files: `src/app/dashboard/team/team-client.tsx`
   - Issue: `base_salary`, `commission_rate`, `payment_method` not in generated types
   - Fix: Regenerate database types after migration

---

## 🟡 Medium Priority

### Unused Imports

- Multiple files have unused imports flagged by ESLint
- **Action:** Run `npm run lint:fix` to auto-remove

### Deprecated APIs

- `src/app/api/alfred/chat/route.ts` - file deleted but still referenced in `.next/types`
- **Action:** Delete `.next` folder and rebuild

---

## 🟢 Low Priority (Warnings)

### ESLint Warnings

- ~50 warnings for `@typescript-eslint/no-explicit-any`
- ~10 warnings for unused variables
- **Action:** Gradual cleanup during feature work

### React Hooks Dependencies

- `useEffect` missing dependencies in some components
- **Action:** Review and fix hook dependencies

---

## Sprint Cleanup Plan

### Phase 1: Enable Strict CI

1. [ ] Fix Zod v4 errors (30 min)
2. [ ] Update Vercel AI SDK usage (1 hr)
3. [ ] Add missing type annotations (30 min)
4. [ ] Regenerate database types (5 min)
5. [ ] Remove `continue-on-error: true` from CI

### Phase 2: Clean Warnings

1. [ ] Run `npm run lint:fix`
2. [ ] Review and fix remaining warnings
3. [ ] Add stricter ESLint rules

---

## Commands

```bash
# Full lint with auto-fix
npm run lint:fix

# Type check (see all errors)
npm run type-check

# Format code
npm run format

# Regenerate DB types (if using Supabase CLI)
supabase gen types typescript --local > src/types/database.types.ts
```

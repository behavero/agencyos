# OnyxOS Engineering Guide

## 1. Getting Started

- Run `npm install` to setup.
- Run `npm run dev` to start the local server.

## 2. Architecture

- `src/app`: App Router pages.
- `src/components`: UI Components (Shadcn UI).
- `src/lib`: Core logic, services, and utils.
- `scripts`: Maintenance scripts.

## 3. Workflow

- Create a feature branch: `git checkout -b feature/my-cool-feature`
- Commit often. Husky will auto-format your code.
- Push to GitHub and create a Pull Request.
- **CI must pass** before merging.

## 4. Deployment

- Merging to `main` automatically triggers a Vercel deployment.

## 5. Available Scripts

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `npm run dev`        | Start development server     |
| `npm run build`      | Build for production         |
| `npm run lint`       | Run ESLint                   |
| `npm run lint:fix`   | Run ESLint with auto-fix     |
| `npm run type-check` | Run TypeScript type checking |
| `npm run format`     | Format code with Prettier    |

## 6. Environment Variables

Copy `.env.example` to `.env.local` and fill in the values.

**Required:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`

## 7. Database

Migrations are in `supabase/migrations/`. Apply with:

```bash
supabase db push
```

# Contributing to OnyxOS

Welcome to the OnyxOS development team! This guide will help you set up your environment and understand our development workflow.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Git**: Latest version
- **Supabase Account**: For database access

### Local Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/behavero/agencyos.git
   cd agencyos
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

   > This will also set up Husky pre-commit hooks automatically.

3. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

   Fill in the required values (ask the team lead for credentials).

4. **Run development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
agencyos/
├── .github/workflows/    # CI/CD pipelines
├── .husky/               # Git hooks
├── docs/                 # Architecture documentation
├── public/               # Static assets
├── scripts/              # Maintenance & utility scripts
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Core logic & services
│   └── types/            # TypeScript definitions
├── supabase/
│   └── migrations/       # Database migrations
└── package.json
```

---

## 🔀 Branching Strategy

We use a **Feature Branch Workflow**:

```
main                     # Production-ready code
├── feature/xyz          # New features
├── fix/bug-name         # Bug fixes
└── refactor/area        # Code improvements
```

### Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
   - Write clean, typed code
   - Follow the existing patterns
   - Add comments for complex logic

3. **Commit with a descriptive message**

   ```bash
   git commit -m "feat: add payroll PDF export"
   ```

   > Husky will run linting automatically. If it fails, fix the issues.

4. **Push and open a Pull Request**

   ```bash
   git push origin feature/my-feature
   ```

   Go to GitHub and open a PR against `main`.

5. **Wait for CI to pass**
   - Lint & Type Check ✅
   - Build ✅
   - Security Audit ✅

6. **Request review** (if applicable)

7. **Merge** after approval

---

## 🛠 Available Scripts

| Command                | Description                  |
| ---------------------- | ---------------------------- |
| `npm run dev`          | Start development server     |
| `npm run build`        | Build for production         |
| `npm run start`        | Start production server      |
| `npm run lint`         | Run ESLint                   |
| `npm run lint:fix`     | Run ESLint with auto-fix     |
| `npm run type-check`   | Run TypeScript type checking |
| `npm run format`       | Format code with Prettier    |
| `npm run format:check` | Check if code is formatted   |

---

## 💾 Database Setup

### Supabase Local (Development)

1. Install Supabase CLI: `brew install supabase/tap/supabase`
2. Start local instance: `supabase start`
3. Run migrations: `supabase db push`

### Supabase Production

Migrations are applied via the Supabase Dashboard or CLI:

```bash
supabase db push --linked
```

### Adding Migrations

1. Create a new migration file:

   ```bash
   touch supabase/migrations/$(date +%Y%m%d)_description.sql
   ```

2. Write your SQL changes

3. Test locally, then push

---

## 🚢 Deployment

### Automatic (Recommended)

Push to `main` → Vercel auto-deploys

### Manual

```bash
vercel --prod
```

### Environment Variables

Managed in [Vercel Dashboard](https://vercel.com) → Settings → Environment Variables

**Required:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`

**Optional:**

- `TELEGRAM_BOT_TOKEN`
- `FIRECRAWL_API_KEY`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `META_CLIENT_ID` / `META_CLIENT_SECRET`

---

## 📝 Code Standards

### TypeScript

- Use explicit types, avoid `any` where possible
- Define interfaces for API responses
- Use Zod for runtime validation

### React

- Use Server Components by default
- Add `'use client'` only when needed
- Follow the Shadcn UI patterns

### Styling

- Use Tailwind CSS classes
- Follow the Zinc color scheme
- Keep components responsive

### Naming

- **Files**: `kebab-case.tsx`
- **Components**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`

---

## 🐛 Troubleshooting

### "Cannot find module" errors

```bash
rm -rf node_modules .next
npm install
```

### TypeScript errors after changes

```bash
npm run type-check
```

### Lint errors blocking commit

```bash
npm run lint:fix
```

---

## 📞 Getting Help

- **Slack**: #onyxos-dev
- **Issues**: GitHub Issues
- **Docs**: `/docs` folder

---

**Happy coding! 🚀**

# Job Tracker

A job application tracker built with Next.js and Supabase. Sign in to manage your applications and the tasks associated with them.

## Features

- Create, view, edit, and delete applications with company, position, status, application date, and notes.
- Open an application detail page and manage tasks linked to it.
- View, edit, complete, and delete tasks. Each task has a title and optional due date.
- Import applications from CSV. Files are validated before saving; the limit is 1 MB and 1,000 rows. Reimporting a file adds duplicate rows.
- Supabase Row Level Security (RLS) restricts records to their owner. Tasks can only reference an application owned by the same user.

## Tech stack

- Next.js App Router, React 19, and TypeScript
- Supabase Auth, PostgreSQL, and RLS
- `@supabase/ssr` and `@supabase/supabase-js`
- Tailwind CSS

## Prerequisites

Install Node.js (LTS recommended) and npm, and create a Supabase project.

## Setup from a fresh clone

1. Clone the repository and enter the project folder:

   ```bash
   git clone https://github.com/brenomarques1105/job-tracker.git
   cd job-tracker
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Copy the environment example to `.env.local`:

   **PowerShell:**
   ```powershell
   Copy-Item .env.example .env.local
   ```

   **macOS/Linux:**
   ```bash
   cp .env.example .env.local
   ```

4. In the Supabase dashboard, open your project's API settings (Project Settings → API Keys; the project URL is also available under Data API). Add your own values to `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

   These are placeholders; replace them with your project's URL and publishable key. Do not use a database password, `service_role` key, or secret API key here or in client-side code. `.env.local` is ignored by Git.

5. Create the database schema. In the Supabase dashboard, open **SQL Editor**, create a query, paste the full contents of [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql), and run it once. It creates the applications and tasks tables, their relationship, indexes, and RLS policies. It is for a fresh schema; do not rerun it after the tables and policies have been created.

6. Start the development server:

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000). If port 3000 is in use, run `npm run dev -- --port 3003` and visit [http://localhost:3003](http://localhost:3003).

7. Sign up or sign in with a Supabase account. Email confirmation may be required depending on the Supabase Auth settings. Use **Applications** to manage or import applications and **Tasks** to manage tasks.

## CSV import format

The file must have exactly these columns in its first row, in any order:

```csv
company,position,status,application_date,notes
Google,Software Engineer,Applied,2026-09-01,Referred by a colleague
```

Dates must use `YYYY-MM-DD`. Company and position are required; notes may be empty. Status must be `Applied`, `Interview`, `Offer`, `Rejected`, or `Withdrawn`. Quote fields containing commas, double quotes, or line breaks using standard CSV quoting. The importer validates every row before saving; an invalid row rejects the entire import and reports its line.

## Useful commands

```bash
npm run lint
npm run build
npm start
```

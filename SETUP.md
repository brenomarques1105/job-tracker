# Job Tracker — local setup

1. In your Supabase project, open SQL Editor and create a new query.
2. Paste the contents of `supabase/migrations/001_initial_schema.sql` and run it once. The script is transactional and creates both tables and the access policies. Do not run it in a project where these tables already exist.
3. Keep the existing `.env.local` credentials. No service role key is required.
4. Run `npm run dev -- --port 3003` and open http://localhost:3003/applications.
5. Sign in with your existing account.

## Verify the flow

- Add an application; refresh and verify it persists.
- Edit it from the list and from its detail page.
- Add a task from the detail page; find it on Tasks.
- Edit its title and due date, mark it done, refresh, then delete it.
- Add another task and delete the application; its tasks should disappear too.
- Sign out, use a different account, and verify the first account's applications and tasks are absent. A direct link to the first account's application should say it was not found.
- With two authenticated users, attempts to insert or update another user's `user_id` must fail. A task with your user_id and another user's application_id must also fail (the composite foreign key enforces ownership).

The migration is provided for manual execution; the application does not run database setup. Existing sign-up, login, and logout code is reused.

## CSV import

On Applications, choose a UTF-8 CSV in Import applications from CSV and click Import CSV. The file must contain company, position, status, application_date and notes headers (in any order). Dates use YYYY-MM-DD; notes can be empty. Supported statuses are Applied, Interview, Offer, Rejected and Withdrawn. Commas, double quotes and line breaks inside values must use standard CSV quoting.

The importer accepts up to 1 MB and 1,000 applications. It validates the entire file before sending one insert, assigns the signed-in user's ID, and relies on the existing RLS policies. Invalid rows reject the import with a line number; database insert failure does not partially import the file. Re-importing adds duplicates. No new migration is needed.

Parser checks: `node --test tests/applications-csv.test.mjs`.

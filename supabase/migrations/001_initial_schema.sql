begin;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company text not null check (length(trim(company)) between 1 and 200),
  position text not null check (length(trim(position)) between 1 and 200),
  status text not null default 'Applied' check (status in ('Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn')),
  application_date date not null default current_date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  application_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 300),
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (application_id, user_id) references public.applications(id, user_id) on delete cascade
);

create index applications_user_id_idx on public.applications(user_id);
create index tasks_user_id_due_date_idx on public.tasks(user_id, due_date);
create index tasks_application_id_user_id_idx on public.tasks(application_id, user_id);

alter table public.applications enable row level security;
alter table public.tasks enable row level security;
alter table public.applications force row level security;
alter table public.tasks force row level security;

revoke all on public.applications, public.tasks from anon, authenticated;
grant select, insert, update, delete on public.applications, public.tasks to authenticated;

create policy applications_select on public.applications for select to authenticated using ((select auth.uid()) = user_id);
create policy applications_insert on public.applications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy applications_update on public.applications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy applications_delete on public.applications for delete to authenticated using ((select auth.uid()) = user_id);

create policy tasks_select on public.tasks for select to authenticated using ((select auth.uid()) = user_id);
create policy tasks_insert on public.tasks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tasks_update on public.tasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tasks_delete on public.tasks for delete to authenticated using ((select auth.uid()) = user_id);

commit;

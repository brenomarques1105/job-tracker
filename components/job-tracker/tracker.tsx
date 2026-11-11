"use client";

import Link from "next/link";
import { CsvImport } from "./csv-import";
import { applicationStatuses, type ImportedApplication } from "@/lib/applications-csv";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoutButton } from "@/components/logout-button";

type Application = { id: string; company: string; position: string; status: string; application_date: string; notes: string };
type Task = { id: string; application_id: string; title: string; due_date: string | null; done: boolean };
const statuses = applicationStatuses;
const control = "w-full rounded-md border bg-background px-3 py-2 text-sm";
function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dateLabel(value: string | null) {
  if (!value) return "No due date";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
function errorMessage(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Unexpected error. Please try again.";
  if (/schema cache|does not exist|PGRST205/i.test(message)) return "Database setup is missing. Run supabase/migrations/001_initial_schema.sql in the Supabase SQL Editor, then retry.";
  return message;
}

export function Tracker({ view, applicationId }: { view: "applications" | "detail" | "tasks"; applicationId?: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [applications, setApplications] = useState<Application[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [applicationFormKey, setApplicationFormKey] = useState(0);
  const [taskFormKey, setTaskFormKey] = useState(0);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) {
        router.replace("/auth/login");
        return;
      }
      setUserId(auth.user.id);
      const [appsResult, tasksResult] = await Promise.all([
        supabase.from("applications").select("id,company,position,status,application_date,notes").eq("user_id", auth.user.id).order("application_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("tasks").select("id,application_id,title,due_date,done").eq("user_id", auth.user.id).order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
      ]);
      if (appsResult.error) throw appsResult.error;
      if (tasksResult.error) throw tasksResult.error;
      setApplications(appsResult.data ?? []);
      setTasks(tasksResult.data ?? []);
      return true;
    } catch (error) {
      setLoadError(errorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => { void load(); }, [load]);

  async function mutate(operation: () => Promise<void>, success: string) {
    if (busy || !userId) return false;
    setBusy(true);
    setFeedback(null);
    try {
      await operation();
      setFeedback({ error: false, text: success });
      await load();
      return true;
    } catch (error) {
      setFeedback({ error: true, text: errorMessage(error) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function importApplications(rows: ImportedApplication[]) {
    return mutate(async () => {
      const { error } = await supabase.from("applications").insert(rows.map((row) => ({ ...row, user_id: userId! })));
      if (error) throw error;
    }, `${rows.length} application${rows.length === 1 ? "" : "s"} imported successfully.`);
  }
  async function saveApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      company: String(form.get("company") ?? "").trim(),
      position: String(form.get("position") ?? "").trim(),
      status: String(form.get("status") ?? "Applied"),
      application_date: String(form.get("application_date") ?? ""),
      notes: String(form.get("notes") ?? "").trim(),
    };
    await mutate(async () => {
      if (!values.company || !values.position || !values.application_date) throw new Error("Company, position and application date are required.");
      const target = editingApplication ?? (view === "detail" ? applications.find((app) => app.id === applicationId) : null);
      const result = target
        ? await supabase.from("applications").update(values).eq("id", target.id).eq("user_id", userId!).select("id").single()
        : await supabase.from("applications").insert({ ...values, user_id: userId! }).select("id").single();
      if (result.error) throw result.error;
      setEditingApplication(null);
      setApplicationFormKey((key) => key + 1);
    }, "Application saved.");
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = { application_id: String(form.get("application_id") ?? ""), title: String(form.get("title") ?? "").trim(), due_date: String(form.get("due_date") ?? "") || null, done: form.get("done") === "on" };
    await mutate(async () => {
      if (!values.title || !applications.some((app) => app.id === values.application_id)) throw new Error("Enter a title and select one of your applications.");
      const result = editingTask
        ? await supabase.from("tasks").update(values).eq("id", editingTask.id).eq("user_id", userId!).select("id").single()
        : await supabase.from("tasks").insert({ ...values, user_id: userId! }).select("id").single();
      if (result.error) throw result.error;
      setEditingTask(null);
      setTaskFormKey((key) => key + 1);
    }, "Task saved.");
  }

  async function deleteApplication(app: Application) {
    if (!window.confirm(`Delete ${app.company} — ${app.position} and all its tasks?`)) return;
    await mutate(async () => {
      const { error } = await supabase.from("applications").delete().eq("id", app.id).eq("user_id", userId!).select("id").single();
      if (error) throw error;
      if (editingApplication?.id === app.id) setEditingApplication(null);
      if (view === "detail") router.push("/applications");
    }, "Application and its tasks deleted.");
  }

  const selected = applications.find((app) => app.id === applicationId);
  const visibleTasks = view === "detail" ? tasks.filter((task) => task.application_id === applicationId) : tasks;
  const shownApplication = editingApplication ?? (view === "detail" ? selected : undefined);

  return <div className="min-h-screen">

    <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm text-muted-foreground">Your job search</p><h1 className="text-3xl font-bold">{view === "tasks" ? "Tasks" : view === "detail" ? "Application details" : "Applications"}</h1></div>
        {userId && <LogoutButton />}
      </div>
      {feedback && <p role={feedback.error ? "alert" : "status"} className={`rounded-md border p-4 ${feedback.error ? "text-red-600" : "text-green-700 dark:text-green-400"}`}>{feedback.text}</p>}
      {loadError && <div role="alert" className="rounded-md border border-red-400 p-4"><p>{loadError}</p><Button className="mt-3" variant="outline" disabled={busy} onClick={() => void load()}>Retry</Button></div>}
      {loading ? <p role="status">Loading…</p> : !loadError && userId && <>
        {view === "detail" && !selected ? <p>Application not found. <Link className="underline" href="/applications">Back to applications</Link></p> : <>
          {view === "applications" && <CsvImport busy={busy} onImport={importApplications} />}
          {view !== "tasks" && <>
            {view === "detail" && selected && <section className="space-y-3 rounded-lg border p-5"><Link href="/applications" className="text-sm underline">Back to applications</Link><h2 className="text-xl font-semibold">{selected.position} · {selected.company}</h2><p>{selected.status} · {dateLabel(selected.application_date)}</p><p className="whitespace-pre-wrap break-words text-muted-foreground">{selected.notes || "No notes yet."}</p><Button variant="destructive" disabled={busy} onClick={() => void deleteApplication(selected)}>Delete application</Button></section>}
            <section className="rounded-lg border p-5 space-y-4"><h2 className="text-xl font-semibold">{shownApplication ? "Edit application" : "New application"}</h2>
              <form key={`${shownApplication?.id ?? "new"}-${applicationFormKey}`} onSubmit={saveApplication} className="grid gap-4 sm:grid-cols-2">
                <fieldset disabled={busy} className="contents">
                  <label className="space-y-2">Company<Input name="company" required maxLength={200} defaultValue={shownApplication?.company} /></label>
                  <label className="space-y-2">Position<Input name="position" required maxLength={200} defaultValue={shownApplication?.position} /></label>
                  <label className="space-y-2">Status<select name="status" className={control} defaultValue={shownApplication?.status ?? "Applied"}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                  <label className="space-y-2">Application date<Input name="application_date" type="date" required defaultValue={shownApplication?.application_date ?? today()} /></label>
                  <label className="space-y-2 sm:col-span-2">Notes<textarea name="notes" rows={4} className={control} defaultValue={shownApplication?.notes} /></label>
                  <div className="flex gap-3 sm:col-span-2"><Button type="submit">{busy ? "Saving…" : "Save application"}</Button>{editingApplication && view !== "detail" && <Button type="button" variant="outline" onClick={() => setEditingApplication(null)}>Cancel</Button>}</div>
                </fieldset>
              </form>
            </section>
            {view === "applications" && <section className="space-y-3"><h2 className="text-xl font-semibold">Your applications ({applications.length})</h2>{!applications.length && <p className="text-muted-foreground">No applications yet. Add your first one above.</p>}{applications.map((app) => <article key={app.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-5"><div><Link className="text-lg font-semibold underline underline-offset-4" href={`/applications/${app.id}`}>{app.position} · {app.company}</Link><p className="mt-1 text-sm text-muted-foreground">{app.status} · {dateLabel(app.application_date)}</p></div><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => { setEditingApplication(app); setFeedback(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button><Button variant="destructive" disabled={busy} onClick={() => void deleteApplication(app)}>Delete</Button></div></article>)}</section>}
          </>}
          {view !== "applications" && <>
            <section className="rounded-lg border p-5 space-y-4"><h2 className="text-xl font-semibold">{editingTask ? "Edit task" : "New task"}</h2>
              {!applications.length ? <p><Link href="/applications" className="underline">Add an application</Link> before creating tasks.</p> : <form key={`${editingTask?.id ?? "new"}-${taskFormKey}`} onSubmit={saveTask} className="grid gap-4 sm:grid-cols-2"><fieldset disabled={busy} className="contents">
                <label className="space-y-2 sm:col-span-2">Application<select className={control} name="application_id" required defaultValue={editingTask?.application_id ?? applicationId ?? ""}>{!applicationId && <option value="" disabled>Select an application</option>}{applications.filter((app) => !applicationId || app.id === applicationId).map((app) => <option key={app.id} value={app.id}>{app.company} · {app.position}</option>)}</select></label>
                <label className="space-y-2">Title<Input name="title" required maxLength={300} defaultValue={editingTask?.title} /></label>
                <label className="space-y-2">Due date (optional)<Input type="date" name="due_date" defaultValue={editingTask?.due_date ?? ""} /></label>
                <label className="flex items-center gap-2"><input type="checkbox" name="done" defaultChecked={editingTask?.done ?? false} />Done</label>
                <div className="flex gap-3 sm:col-span-2"><Button type="submit">{busy ? "Saving…" : "Save task"}</Button>{editingTask && <Button type="button" variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>}</div>
              </fieldset></form>}
            </section>
            <section className="space-y-3"><h2 className="text-xl font-semibold">{view === "detail" ? "Application tasks" : "Your tasks"} ({visibleTasks.length})</h2>{!visibleTasks.length && <p className="text-muted-foreground">No tasks yet.</p>}{visibleTasks.map((task) => {
              const app = applications.find((item) => item.id === task.application_id);
              return <article key={task.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-5"><div className="space-y-1"><label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={task.done} disabled={busy} onChange={() => void mutate(async () => { const { error } = await supabase.from("tasks").update({ done: !task.done }).eq("id", task.id).eq("user_id", userId).select("id").single(); if (error) throw error; }, "Task saved.")} /><span className={task.done ? "line-through text-muted-foreground" : ""}>{task.title}</span></label><p className="text-sm text-muted-foreground">{dateLabel(task.due_date)} · {task.done ? "Done" : "To do"}</p><Link className="text-sm underline" href={`/applications/${task.application_id}`}>{app?.company} · {app?.position}</Link></div><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => { setEditingTask(task); setFeedback(null); }}>Edit</Button><Button variant="destructive" disabled={busy} onClick={() => { if (!window.confirm(`Delete task “${task.title}”?`)) return; void mutate(async () => { const { error } = await supabase.from("tasks").delete().eq("id", task.id).eq("user_id", userId).select("id").single(); if (error) throw error; if (editingTask?.id === task.id) setEditingTask(null); }, "Task deleted."); }}>Delete</Button></div></article>;
            })}</section>
          </>}
        </>}
      </>}
    </main>
  </div>;
}


import Link from "next/link";

export function TrackerNavigation() {
  return (
    <nav aria-label="Job Tracker" className="flex flex-wrap items-center gap-6 border-b px-6 py-5">
      <Link href="/applications" className="font-bold text-lg">Job Tracker</Link>
      <Link href="/applications" className="underline underline-offset-4">Applications</Link>
      <Link href="/tasks" className="underline underline-offset-4">Tasks</Link>
    </nav>
  );
}

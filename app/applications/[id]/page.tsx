import { Suspense } from "react";
import { Tracker } from "@/components/job-tracker/tracker";

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Tracker view="detail" applicationId={id} />;
}

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<p className="p-6">Loading application…</p>}><Detail params={params} /></Suspense>;
}

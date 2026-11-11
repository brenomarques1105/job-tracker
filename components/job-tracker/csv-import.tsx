"use client";

import { useState, type FormEvent } from "react";
import { parseApplicationsCsv, type ImportedApplication } from "@/lib/applications-csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CsvImport({ busy, onImport }: { busy: boolean; onImport: (rows: ImportedApplication[]) => Promise<boolean> }) {
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("csv");
    setError("");
    setReading(true);
    try {
      if (!(file instanceof File) || !file.size) throw new Error("Choose a non-empty CSV file.");
      if (file.size > 1024 * 1024) throw new Error("Choose a CSV smaller than 1 MB.");
      const rows = parseApplicationsCsv(await file.text());
      if (await onImport(rows)) form.reset();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not read the CSV file.");
    } finally { setReading(false); }
  }
  return <section className="space-y-4 rounded-lg border p-5">
    <h2 className="text-xl font-semibold">Import applications from CSV</h2>
    <p id="csv-help" className="text-sm text-muted-foreground">Columns: company,position,status,application_date,notes. Use YYYY-MM-DD dates. Notes may be empty. Maximum 1 MB and 1,000 applications.</p>
    <p className="text-sm text-muted-foreground">All rows are validated before saving. Importing adds new applications; importing the same file again creates duplicates.</p>
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="flex-1 space-y-2 min-w-0">CSV file<Input name="csv" type="file" accept=".csv,text/csv" required disabled={busy || reading} aria-describedby="csv-help" onChange={() => setError("")} /></label>
      <Button type="submit" disabled={busy || reading}>{reading ? "Importing…" : "Import CSV"}</Button>
    </form>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </section>;
}

export const applicationStatuses = ["Applied", "Interview", "Offer", "Rejected", "Withdrawn"];
export const csvColumns = ["company", "position", "status", "application_date", "notes"];
export type ImportedApplication = { company: string; position: string; status: string; application_date: string; notes: string };

// Parse quoted fields, escaped quotes, CRLF and line breaks inside quoted notes.
export function parseApplicationsCsv(source: string): ImportedApplication[] {
  const text = source.replace(/^\uFEFF/, "");
  const rows: { fields: string[]; line: number }[] = [];
  let fields: string[] = [], field = "", quoted = false, closed = false;
  let line = 1, rowLine = 1;
  function finishRow() {
    fields.push(field);
    if (fields.some((value) => value.trim() !== "")) rows.push({ fields, line: rowLine });
    fields = []; field = ""; closed = false;
    if (rows.length > 1001) throw new Error("Import at most 1,000 applications at a time.");
  }
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { field += '"'; index++; }
        else { quoted = false; closed = true; }
      } else { field += char; if (char === "\n") line++; }
    } else if (char === ",") {
      fields.push(field); field = ""; closed = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      finishRow(); line++; rowLine = line;
    } else if (char === '"' && field === "" && !closed) {
      quoted = true;
    } else {
      if (closed || char === '"') throw new Error(`Line ${line}: invalid CSV quoting.`);
      field += char;
    }
  }
  if (quoted) throw new Error(`Line ${rowLine}: missing closing quote.`);
  finishRow();
  const header = rows.shift()?.fields.map((value) => value.trim());
  if (!header || header.length !== csvColumns.length || csvColumns.some((column) => !header.includes(column)) || new Set(header).size !== header.length) {
    throw new Error(`CSV must contain exactly these columns: ${csvColumns.join(",")}.`);
  }
  if (!rows.length) throw new Error("The CSV contains no applications.");
  return rows.map(({ fields: values, line: row }) => {
    if (values.length !== header.length) throw new Error(`Line ${row}: expected 5 fields. Put values containing commas inside double quotes.`);
    const item = Object.fromEntries(header.map((key, index) => [key, values[index].trim()])) as ImportedApplication;
    if (!item.company || item.company.length > 200) throw new Error(`Line ${row}: company must contain 1–200 characters.`);
    if (!item.position || item.position.length > 200) throw new Error(`Line ${row}: position must contain 1–200 characters.`);
    if (!applicationStatuses.includes(item.status)) throw new Error(`Line ${row}: status must be ${applicationStatuses.join(", ")}.`);
    const date = new Date(`${item.application_date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.application_date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== item.application_date || item.application_date.startsWith("0000")) {
      throw new Error(`Line ${row}: application_date must be a valid date in YYYY-MM-DD format.`);
    }
    return item;
  });
}

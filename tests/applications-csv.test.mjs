import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(__dirname, "../lib/applications-csv.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const loaded = { exports: {} };
new Function("exports", "module", compiled)(loaded.exports, loaded);
const { parseApplicationsCsv: parse } = loaded.exports;
const header = "company,position,status,application_date,notes\n";
const row = "Google,Engineer,Applied,2026-09-01,";

test("imports the project's ten sample applications including accented company", () => {
  const rows = parse(fs.readFileSync(path.join(__dirname, "../teste-importacao.csv"), "utf8"));
  assert.equal(rows.length, 10);
  assert.equal(rows[4].company, "Itaú");
  assert.equal(rows[1].notes, "");
});
test("handles BOM, CRLF, escaped quotes, commas and multiline notes", () => {
  const rows = parse('\uFEFF' + header.replace('\n', '\r\n') + '"Acme, Inc",Engineer,Applied,2026-09-01,"Said ""hello""\r\nNext line"\r\n');
  assert.equal(rows[0].company, "Acme, Inc");
  assert.equal(rows[0].notes, 'Said "hello"\r\nNext line');
});
test("maps reordered columns by header and skips blank lines", () => {
  assert.equal(parse("notes,status,company,position,application_date\n\n,Applied,Google,Engineer,2026-09-01\n")[0].company, "Google");
});
test("rejects missing, duplicate and unexpected columns including user_id", () => {
  for (const value of ["company,position,status,application_date,user_id", "company,position,status,notes,notes", "company,position,status,application_date"]) assert.throws(() => parse(value + "\n" + row), /columns/);
});
test("rejects invalid statuses, missing values and impossible dates with line number", () => {
  for (const value of [",Engineer,Applied,2026-09-01,", "Google,Engineer,Other,2026-09-01,", "Google,Engineer,Applied,2026-02-30,", "Google,Engineer,Applied,2026-13-01,"]) assert.throws(() => parse(header + value), /Line 2/);
  assert.equal(parse(header + "Google,Engineer,Applied,2028-02-29,").length, 1);
});
test("rejects malformed quotes and extra fields", () => {
  for (const value of ['"Google,Engineer,Applied,2026-09-01,', '"Google"bad,Engineer,Applied,2026-09-01,', row + 'extra,field']) assert.throws(() => parse(header + value));
});
test("rejects empty imports, overlong company and more than 1000 rows", () => {
  assert.throws(() => parse(header), /no applications/);
  assert.throws(() => parse(header + "x".repeat(201) + ",Engineer,Applied,2026-09-01,"), /company/);
  assert.equal(parse(header + Array(1000).fill(row).join("\n")).length, 1000);
  assert.throws(() => parse(header + Array(1001).fill(row).join("\n")), /1,000/);
});

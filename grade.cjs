#!/usr/bin/env node
/**
 * Lab 6-1-node-npm — Autograder (grade.cjs)
 *
 * Scoring:
 * - TODO 1..5:
 *   - TODO 1..4: 15 marks each
 *   - TODO 5: 20 marks
 *   - TODO total = 80
 * - Submission: 20 marks (on-time=20, late=10, missing/empty calculator.js=0)
 * - Total = 100
 *
 * IMPORTANT (late check):
 * - We grade lateness using the latest *student* commit (non-bot),
 *   NOT the latest workflow/GitHub Actions commit.
 *
 * Status codes:
 * - 0 = on time
 * - 1 = late
 * - 2 = no submission OR empty calculator.js file
 *
 * Outputs:
 * - artifacts/grade.csv  (structure unchanged)
 * - artifacts/feedback/README.md
 * - GitHub Actions Step Summary (GITHUB_STEP_SUMMARY)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const LAB_NAME = "6-1-node-npm";

const ARTIFACTS_DIR = "artifacts";
const FEEDBACK_DIR = path.join(ARTIFACTS_DIR, "feedback");
fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

/** Due date: 05 Nov 2025 11:59 PM Riyadh time (UTC+03:00) */
const DUE_ISO = "2025-11-05T23:59:00+03:00";
const DUE_EPOCH_MS = Date.parse(DUE_ISO);

const TODO_TOTAL_MAX = 80;
const SUBMISSION_MAX = 20;
const TOTAL_MAX = 100;

const MAIN_FILE = "calculator.js"; // root
const OPS_FILE = path.join("utils", "operations.js");
const PARSER_FILE = path.join("utils", "parser.js");

/** ---------- Student ID ---------- */
function getStudentId() {
  const repoFull = process.env.GITHUB_REPOSITORY || ""; // org/repo
  const repoName = repoFull.includes("/") ? repoFull.split("/")[1] : repoFull;

  const fromRepoSuffix =
    repoName && repoName.includes("-") ? repoName.split("-").slice(-1)[0] : "";

  return (
    process.env.STUDENT_USERNAME ||
    fromRepoSuffix ||
    process.env.GITHUB_ACTOR ||
    repoName ||
    "student"
  );
}

/** ---------- Git helpers: latest *student* commit time (exclude bots/workflows) ---------- */
function getLatestStudentCommitEpochMs() {
  try {
    const out = execSync('git log --format=%ct|%an|%ae|%cn|%ce|%s -n 300', {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();

    if (!out) return null;

    const lines = out.split("\n");
    for (const line of lines) {
      const parts = line.split("|");
      const ct = parts[0];
      const an = parts[1] || "";
      const ae = parts[2] || "";
      const cn = parts[3] || "";
      const ce = parts[4] || "";
      const subject = parts.slice(5).join("|") || "";

      const hay = `${an} ${ae} ${cn} ${ce} ${subject}`.toLowerCase();

      const isBot =
        hay.includes("[bot]") ||
        hay.includes("github-actions") ||
        hay.includes("actions@github.com") ||
        hay.includes("github classroom") ||
        hay.includes("classroom[bot]") ||
        hay.includes("dependabot") ||
        hay.includes("autograding") ||
        hay.includes("workflow");

      if (isBot) continue;

      const seconds = Number(ct);
      if (!Number.isFinite(seconds)) continue;
      return seconds * 1000;
    }

    // Fallback: latest commit time
    const fallback = execSync("git log -1 --format=%ct", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    const seconds = Number(fallback);
    return Number.isFinite(seconds) ? seconds * 1000 : null;
  } catch {
    return null;
  }
}

function wasSubmittedLate() {
  const commitMs = getLatestStudentCommitEpochMs();
  if (!commitMs) return false; // best-effort
  return commitMs > DUE_EPOCH_MS;
}

/** ---------- File helpers ---------- */
function readTextSafe(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

function stripJsComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

function compactWs(s) {
  return s.replace(/\s+/g, " ").trim();
}

function isEmptyCode(code) {
  const stripped = compactWs(stripJsComments(code));
  return stripped.length < 10;
}

function hasRegex(code, re) {
  return re.test(code);
}

/** ---------- Requirement scoring ---------- */
function req(label, ok, detailIfFail = "") {
  return { label, ok: !!ok, detailIfFail };
}

function scoreFromRequirements(reqs, maxMarks) {
  const total = reqs.length;
  const ok = reqs.filter((r) => r.ok).length;
  if (!total) return { earned: 0, ok, total };
  return { earned: Math.round((maxMarks * ok) / total), ok, total };
}

function formatReqs(reqs) {
  return reqs.map((r) =>
    r.ok ? `- ✅ ${r.label}` : `- ❌ ${r.label}${r.detailIfFail ? ` — ${r.detailIfFail}` : ""}`
  );
}

/** ---------- Locate submission ---------- */
const studentId = getStudentId();

const hasMain = fs.existsSync(MAIN_FILE) && fs.statSync(MAIN_FILE).isFile();
const mainCode = hasMain ? readTextSafe(MAIN_FILE) : "";
const mainEmpty = hasMain ? isEmptyCode(mainCode) : true;

const hasOps = fs.existsSync(OPS_FILE) && fs.statSync(OPS_FILE).isFile();
const opsCode = hasOps ? readTextSafe(OPS_FILE) : "";

const hasParser = fs.existsSync(PARSER_FILE) && fs.statSync(PARSER_FILE).isFile();
const parserCode = hasParser ? readTextSafe(PARSER_FILE) : "";

const loadNote = hasMain
  ? mainEmpty
    ? `⚠️ Found \`${MAIN_FILE}\` but it appears empty (or only comments).`
    : `✅ Found \`${MAIN_FILE}\`.`
  : `❌ Missing \`${MAIN_FILE}\` in repo root.`;

/** ---------- Submission status + marks ---------- */
const late = wasSubmittedLate();
let status = 0;

if (!hasMain || mainEmpty) status = 2;
else status = late ? 1 : 0;

const submissionMarks = status === 2 ? 0 : status === 1 ? 10 : 20;

const commitMs = getLatestStudentCommitEpochMs();
const commitIso = commitMs ? new Date(commitMs).toISOString() : "unknown";

const submissionStatusText =
  status === 2
    ? "No submission detected (missing/empty calculator.js): submission marks = 0/20."
    : status === 1
    ? `Late submission detected via latest *student* commit time: 10/20. (student commit: ${commitIso})`
    : `On-time submission via latest *student* commit time: 20/20. (student commit: ${commitIso})`;

/** ---------- Cleaned code for flexible checks ---------- */
const mainClean = compactWs(stripJsComments(mainCode));
const opsClean = compactWs(stripJsComments(opsCode));
const parserClean = compactWs(stripJsComments(parserCode));

/** ---------- Flexible import matchers ---------- */
function hasImportFrom(code, fromPath, importedNames = []) {
  // supports:
  // import { a, b } from "./x.js";
  // import * as ops from "./x.js";
  // import ops from "./x.js";
  const fromOk = new RegExp(`\\bfrom\\s*["']${escapeRegExp(fromPath)}["']`, "i").test(code);
  if (!fromOk) return false;
  if (!importedNames.length) return true;

  // Must mention at least one imported name OR use namespace import
  const anyName = importedNames.some((n) => new RegExp(`\\b${escapeRegExp(n)}\\b`).test(code));
  const namespace = /\bimport\s+\*\s+as\s+[A-Za-z_$][\w$]*\s+from\b/i.test(code);
  return anyName || namespace;
}

function hasLodashImport(code) {
  // allow: import _ from "lodash"; OR import lodash from "lodash"; OR import { ... } from "lodash";
  return /\bimport\s+.*\s+from\s+["']lodash["']/i.test(code);
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** ---------- TODO Checks (5 TODOs) ---------- */
const tasks = [
  {
    id: "TODO 1",
    name: "Import Required Modules (calculator.js)",
    marks: 15,
    requirements: () => {
      const reqs = [];
      reqs.push(req(`calculator.js exists and is not empty`, hasMain && !mainEmpty, `Create ${MAIN_FILE} and add code.`));

      // operations import (accept any of add/subtract/multiply/divide or namespace import)
      const opsImportOk = hasImportFrom(mainCode, "./utils/operations.js", ["add", "subtract", "multiply", "divide"]);
      reqs.push(
        req(
          `Imports from "./utils/operations.js" (named or namespace)`,
          opsImportOk,
          `Import operation functions from "./utils/operations.js".`
        )
      );

      // parser import (accept parseNumbers/isValidOperation or namespace import)
      const parserImportOk = hasImportFrom(mainCode, "./utils/parser.js", ["parseNumbers", "isValidOperation"]);
      reqs.push(
        req(
          `Imports from "./utils/parser.js" (named or namespace)`,
          parserImportOk,
          `Import parser helpers from "./utils/parser.js".`
        )
      );

      // lodash import
      reqs.push(req(`Imports lodash from "lodash"`, hasLodashImport(mainCode), `Import lodash (e.g., import _ from "lodash").`));
      return reqs;
    },
  },
  {
    id: "TODO 2",
    name: "Parse Command Line Arguments (calculator.js)",
    marks: 15,
    requirements: () => {
      const reqs = [];
      const usesArgv = hasRegex(mainClean, /\bprocess\.argv\b/);
      const readsOp = hasRegex(mainClean, /\bprocess\.argv\s*\[\s*2\s*\]/) || hasRegex(mainClean, /\bargv\s*\[\s*2\s*\]/i);
      const slicesNums =
        hasRegex(mainClean, /\.slice\s*\(\s*3\s*\)/) ||
        hasRegex(mainClean, /\bprocess\.argv\.slice\s*\(\s*3\s*\)/) ||
        hasRegex(mainClean, /\bargv\.slice\s*\(\s*3\s*\)/i);

      reqs.push(req("Uses process.argv", usesArgv, "Use process.argv to read CLI arguments."));
      reqs.push(req("Extracts operation from argv[2] (or equivalent)", readsOp, "Set operation = process.argv[2]."));
      reqs.push(req("Extracts numbers from argv.slice(3) (or equivalent)", slicesNums, "Set numbers = process.argv.slice(3)."));
      return reqs;
    },
  },
  {
    id: "TODO 3",
    name: "Validate Input and Calculate (calculator.js)",
    marks: 15,
    requirements: () => {
      const reqs = [];

      const callsIsValid = hasRegex(mainClean, /\bisValidOperation\s*\(\s*operation\s*\)/i) || hasRegex(mainClean, /\.isValidOperation\s*\(/);
      const handlesInvalid =
        hasRegex(mainClean, /invalid operation/i) ||
        hasRegex(mainClean, /\bif\s*\(\s*!\s*isValidOperation\b/i) ||
        hasRegex(mainClean, /return\s*;/);

      const callsParseNums = hasRegex(mainClean, /\bparseNumbers\s*\(\s*numbers\s*\)/i) || hasRegex(mainClean, /\.parseNumbers\s*\(/);

      const usesSwitch = hasRegex(mainClean, /\bswitch\s*\(\s*operation\s*\)/i) && hasRegex(mainClean, /\bcase\s*["'](add|subtract|multiply|divide)["']\s*:/i);
      const usesIfElse = hasRegex(mainClean, /\bif\s*\(\s*operation\s*===\s*["']add["']/i) || hasRegex(mainClean, /\belse\s+if\b/i);

      const callsOps =
        hasRegex(mainClean, /\badd\s*\(/) ||
        hasRegex(mainClean, /\bsubtract\s*\(/) ||
        hasRegex(mainClean, /\bmultiply\s*\(/) ||
        hasRegex(mainClean, /\bdivide\s*\(/);

      const logsResult = hasRegex(mainClean, /\bconsole\.log\s*\(/) && (hasRegex(mainClean, /result/i) || hasRegex(mainClean, /`result:/i));

      reqs.push(req("Validates operation using isValidOperation()", callsIsValid, "Call isValidOperation(operation)."));
      reqs.push(req("Handles invalid operation (message/return)", handlesInvalid, 'Print "Invalid operation..." and return.'));
      reqs.push(req("Parses numbers using parseNumbers(numbers)", callsParseNums, "Call parseNumbers(numbers)."));
      reqs.push(req("Uses switch(operation) or if/else to pick operation", usesSwitch || usesIfElse, "Use switch or if/else on operation."));
      reqs.push(req("Calls an operation function (add/subtract/multiply/divide)", callsOps, "Call add/subtract/multiply/divide."));
      reqs.push(req("Outputs result using console.log", logsResult, "console.log the result."));
      return reqs;
    },
  },
  {
    id: "TODO 4",
    name: "Math Operation Functions (utils/operations.js)",
    marks: 15,
    requirements: () => {
      const reqs = [];

      reqs.push(req("utils/operations.js exists", hasOps, "Create utils/operations.js."));
      const hasAdd = hasRegex(opsClean, /\bexport\s+function\s+add\s*\(/) || hasRegex(opsClean, /\bexport\s*\{\s*add\b/) || hasRegex(opsClean, /\bconst\s+add\s*=/);
      const hasSub = hasRegex(opsClean, /\bexport\s+function\s+subtract\s*\(/) || hasRegex(opsClean, /\bconst\s+subtract\s*=/);
      const hasMul = hasRegex(opsClean, /\bexport\s+function\s+multiply\s*\(/) || hasRegex(opsClean, /\bconst\s+multiply\s*=/);
      const hasDiv = hasRegex(opsClean, /\bexport\s+function\s+divide\s*\(/) || hasRegex(opsClean, /\bconst\s+divide\s*=/);

      reqs.push(req("Defines add(numbers)", hasAdd, "Export an add(numbers) function."));
      reqs.push(req("Defines subtract(numbers)", hasSub, "Export a subtract(numbers) function."));
      reqs.push(req("Defines multiply(numbers)", hasMul, "Export a multiply(numbers) function."));
      reqs.push(req("Defines divide(numbers)", hasDiv, "Export a divide(numbers) function."));

      // Flexible implementation signals (don’t require exact approach)
      const usesReduceOrLoop =
        hasRegex(opsClean, /\.reduce\s*\(/) || hasRegex(opsClean, /\bfor\s*\(/) || hasRegex(opsClean, /\bwhile\s*\(/);
      reqs.push(req("Uses reduce or a loop (signal of array processing)", usesReduceOrLoop, "Use reduce() or a loop over numbers."));

      // Division by zero handling (flexible: check for 0 comparison anywhere in divide)
      const handlesZero =
        hasRegex(opsClean, /\b0\b/) && (hasRegex(opsClean, /divide/i) || hasRegex(opsClean, /\/\s*0/));
      reqs.push(req("Has some division-by-zero handling signal (flexible)", handlesZero, "Handle division by zero (check for 0)."));

      return reqs;
    },
  },
  {
    id: "TODO 5",
    name: "Parser Functions Using Lodash (utils/parser.js)",
    marks: 20,
    requirements: () => {
      const reqs = [];

      reqs.push(req("utils/parser.js exists", hasParser, "Create utils/parser.js."));
      const importsLodash =
        hasRegex(parserCode, /\bimport\s+.*\s+from\s+["']lodash["']/i) || hasRegex(parserCode, /\brequire\s*\(\s*["']lodash["']\s*\)/i);
      reqs.push(req("Imports lodash in parser.js", importsLodash, 'Import lodash (e.g., import _ from "lodash").'));

      const hasParseNumbers =
        hasRegex(parserClean, /\bexport\s+function\s+parseNumbers\s*\(/) || hasRegex(parserClean, /\bconst\s+parseNumbers\s*=/);
      const hasIsValidOperation =
        hasRegex(parserClean, /\bexport\s+function\s+isValidOperation\s*\(/) || hasRegex(parserClean, /\bconst\s+isValidOperation\s*=/);

      reqs.push(req("Defines parseNumbers(input)", hasParseNumbers, "Export parseNumbers(input)."));
      reqs.push(req("Defines isValidOperation(operation)", hasIsValidOperation, "Export isValidOperation(operation)."));

      // Lodash usage (must use lodash functions, but be flexible about chaining)
      const usesMap = hasRegex(parserClean, /\b_\.\s*map\s*\(/) || hasRegex(parserClean, /\bmap\s*\(/);
      const usesCompact = hasRegex(parserClean, /\b_\.\s*compact\s*\(/) || hasRegex(parserClean, /\bcompact\s*\(/);
      const usesIncludes = hasRegex(parserClean, /\b_\.\s*includes\s*\(/) || hasRegex(parserClean, /\bincludes\s*\(/);

      reqs.push(req("parseNumbers uses lodash map (signal)", usesMap, "Use _.map(...) to convert strings to numbers."));
      reqs.push(req("parseNumbers uses lodash compact (signal)", usesCompact, "Use _.compact(...) to remove invalid entries."));
      reqs.push(req("isValidOperation uses lodash includes (signal)", usesIncludes, "Use _.includes(validOps, operation)."));

      // validOps array signal
      const hasValidOpsArray = hasRegex(parserClean, /\[\s*["']add["']\s*,\s*["']subtract["']\s*,\s*["']multiply["']\s*,\s*["']divide["']\s*\]/i);
      reqs.push(req("Defines valid operations array (add/subtract/multiply/divide) (signal)", hasValidOpsArray, "Create validOps = ['add','subtract','multiply','divide']."));

      return reqs;
    },
  },
];

/** ---------- Grade tasks ---------- */
let earnedTodos = 0;

const taskResults = tasks.map((t) => {
  const reqs =
    status === 2 ? [req("No submission / empty calculator.js → cannot grade TODOs", false)] : t.requirements();
  const { earned } = scoreFromRequirements(reqs, t.marks);
  const earnedSafe = status === 2 ? 0 : earned;
  earnedTodos += earnedSafe;

  return { id: t.id, name: t.name, earned: earnedSafe, max: t.marks, reqs };
});

const totalEarned = Math.min(earnedTodos + submissionMarks, TOTAL_MAX);

/** ---------- Build Summary ---------- */
const now = new Date().toISOString();

let summary = `# Lab | ${LAB_NAME} | Autograding Summary

- Student: \`${studentId}\`
- ${loadNote}
- ${submissionStatusText}
- Due (Riyadh): \`${DUE_ISO}\`
- Status: **${status}** (0=on time, 1=late, 2=no submission/empty)
- Run: \`${now}\`

## Marks Breakdown

| Item | Marks |
|------|------:|
`;

for (const tr of taskResults) summary += `| ${tr.id}: ${tr.name} | ${tr.earned}/${tr.max} |\n`;
summary += `| Submission | ${submissionMarks}/${SUBMISSION_MAX} |\n`;

summary += `
## Total Marks

**${totalEarned} / ${TOTAL_MAX}**

## Detailed Feedback
`;

for (const tr of taskResults) {
  summary += `\n### ${tr.id}: ${tr.name}\n`;
  summary += formatReqs(tr.reqs).join("\n") + "\n";
}

/** ---------- Write outputs ---------- */
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

/** DO NOT change CSV structure */
const csv = `student_username,obtained_marks,total_marks,status
${studentId},${totalEarned},100,${status}
`;

fs.writeFileSync(path.join(ARTIFACTS_DIR, "grade.csv"), csv);
fs.writeFileSync(path.join(FEEDBACK_DIR, "README.md"), summary);

console.log(`✔ Lab graded: ${totalEarned}/100 (status=${status})`);

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const appRoot = path.join(root, "hairintel-vscode-ready");
const report = [];

function pass(msg) {
  report.push("PASS  " + msg);
}

function warn(msg) {
  report.push("WARN  " + msg);
}

function fail(msg) {
  report.push("FAIL  " + msg);
}

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", ".vercel"].includes(item.name)) continue;

    const full = path.join(dir, item.name);

    if (item.isDirectory()) {
      walk(full, exts, out);
    } else if (exts.includes(path.extname(item.name).toLowerCase())) {
      out.push(full);
    }
  }

  return out;
}

report.push("HAIRINTEL AUDIT REPORT");
report.push("Generated: " + new Date().toISOString());
report.push("Project root: " + root);
report.push("App root: " + appRoot);
report.push("");

const required = [
  "hairintel-vscode-ready/index.html",
  "hairintel-vscode-ready/public/placement-head.png",
  "hairintel-vscode-ready/js/app.js",
  "hairintel-vscode-ready/js/engine.js",
  "hairintel-vscode-ready/js/screens/s09-placement.js",
  "hairintel-vscode-ready/js/screens/s13-summary.js",
  "hairintel-vscode-ready/js/screens/s17-clients.js"
];

report.push("1) REQUIRED FILES");
for (const rel of required) {
  const file = path.join(root, rel);
  if (exists(file)) pass(rel + " exists");
  else fail(rel + " is missing");
}

report.push("");

const indexPath = path.join(appRoot, "index.html");
const index = read(indexPath);

report.push("2) HOMEPAGE DASHBOARD CHECKS");

if (!index) {
  fail("index.html could not be read");
} else {
  if (index.includes("Your Confidence")) pass("Luxury dashboard headline found");
  else fail("Luxury dashboard headline missing");

  if (index.includes("Placement Map Preview")) pass("Placement Map Preview found");
  else fail("Placement Map Preview missing");

  if (index.includes("public/placement-head.png")) pass("Placement head image is referenced");
  else fail("placement-head.png is not referenced in index.html");

  if (index.includes("No Client Selected")) pass("Fake client name removed from dashboard");
  else warn("Could not confirm neutral client placeholder");

  if (!index.includes("Ava Morgan")) pass("Ava Morgan removed");
  else fail("Fake name Ava Morgan still exists");

  if (!index.includes("Sophia Carter")) pass("Sophia Carter removed");
  else fail("Fake name Sophia Carter still exists");

  if (!index.includes(">Templates<") && !index.includes("☷ Templates")) pass("Templates button removed");
  else fail("Templates button still exists");

  if (!index.includes(">Support<") && !index.includes("? Support")) pass("Support button removed");
  else fail("Support button still exists");

  if (index.includes('data-action="dashboard"')) pass("Dashboard action exists");
  else fail("Dashboard action missing");

  if (index.includes('data-action="consultations"')) pass("Consultations action exists");
  else fail("Consultations action missing");

  if (index.includes('data-action="clients"')) pass("Clients action exists");
  else fail("Clients action missing");

  if (index.includes('data-action="education"')) pass("Education action exists");
  else fail("Education action missing");

  if (index.includes('data-action="review"')) pass("Review Plan action exists");
  else fail("Review Plan action missing");

  if (index.includes('data-action="share"')) pass("Share Results action exists");
  else fail("Share Results action missing");

  if (index.includes('data-action="export"')) pass("Export Report action exists");
  else fail("Export Report action missing");

  if (index.includes('data-action="book"')) pass("Start Consultation / Book action exists");
  else fail("Book / Start Consultation action missing");

  if (index.includes('data-action="save"')) pass("Save Dashboard action exists");
  else fail("Save Dashboard action missing");

  if (index.includes('function openConsultationBuilder')) pass("Consultation builder function exists");
  else fail("openConsultationBuilder function missing");

  if (index.includes('const CONSULT_URL = "hairintel/index.html"')) {
    pass("Consultation builder points to hairintel/index.html");
  } else {
    warn("Consultation URL may have changed; verify intended app path");
  }
}

report.push("");

report.push("3) IMAGE CHECK");
const headPath = path.join(appRoot, "public", "placement-head.png");
if (exists(headPath)) {
  const size = fs.statSync(headPath).size;
  if (size > 10000) pass("placement-head.png exists and is not tiny: " + size + " bytes");
  else warn("placement-head.png exists but seems small: " + size + " bytes");
} else {
  fail("placement-head.png missing from hairintel-vscode-ready/public");
}

report.push("");

report.push("4) OLD / DANGEROUS ARTIFACT CHECKS");

const badFiles = [
  "vercel.json",
  "dashboard.html"
];

for (const rel of badFiles) {
  const file = path.join(root, rel);
  if (exists(file)) warn(rel + " exists at root. This may be intentional, but it previously caused confusion.");
  else pass(rel + " not present at root");
}

if (index.includes("stay-on-luxe-dashboard")) fail("Old click-blocker script still exists");
else pass("Old click-blocker script removed");

if (index.includes("luxe-dashboard-actions")) warn("Old temporary dashboard action script still exists");
else pass("Old temporary dashboard action script not present");

if (index.includes("\\n \\n") || index.includes("\\n\\n\\n")) warn("Visible newline artifact may still exist in index.html");
else pass("No obvious visible newline artifact in index.html");

report.push("");

report.push("5) LINK SCAN");

const allTextFiles = walk(appRoot, [".html", ".js", ".css"]);
const suspicious = [];

for (const file of allTextFiles) {
  const txt = read(file);
  const rel = path.relative(root, file);

  if (txt.includes("NEW-LONG-URL-FROM-VERCEL")) suspicious.push(rel + " contains placeholder NEW-LONG-URL-FROM-VERCEL");
  if (txt.includes("abc123")) suspicious.push(rel + " contains placeholder abc123");
  if (txt.includes("dashboard.html")) suspicious.push(rel + " references dashboard.html");
  if (txt.includes("vercel.json")) suspicious.push(rel + " references vercel.json");
}

if (suspicious.length === 0) {
  pass("No obvious placeholder/dead deployment references found");
} else {
  suspicious.forEach(fail);
}

report.push("");

report.push("6) JAVASCRIPT SYNTAX CHECK");

const jsFiles = walk(appRoot, [".js"]);
let nodeCheckFailures = 0;

const { execSync } = require("child_process");

for (const file of jsFiles) {
  const rel = path.relative(root, file);

  try {
    execSync(`node --check "${file}"`, { stdio: "pipe" });
    pass("JS syntax OK: " + rel);
  } catch (err) {
    nodeCheckFailures++;
    fail("JS syntax error: " + rel);
    const msg = (err.stderr || err.stdout || "").toString().trim();
    if (msg) report.push("      " + msg.split("\n").slice(0, 3).join("\n      "));
  }
}

if (nodeCheckFailures === 0) pass("All JavaScript files passed node --check");

report.push("");

report.push("7) PACKAGE / DEPLOYMENT ROOT CHECK");

const pkgOuter = path.join(root, "package.json");
const pkgInner = path.join(appRoot, "package.json");

if (exists(pkgInner)) pass("Inner package.json exists");
else warn("Inner package.json missing");

if (exists(pkgOuter)) warn("Outer package.json exists. Verify Vercel root directory is hairintel-vscode-ready.");
else pass("No outer package.json detected");

report.push("");
report.push("8) FINAL VERDICT");

const fails = report.filter(line => line.startsWith("FAIL")).length;
const warns = report.filter(line => line.startsWith("WARN")).length;

if (fails === 0 && warns === 0) {
  report.push("CLEAN: No failures or warnings detected.");
} else if (fails === 0) {
  report.push("MOSTLY CLEAN: No hard failures. Review warnings.");
} else {
  report.push("NOT CLEAN: Fix hard failures before deploying again.");
}

const out = path.join(root, "AUDIT-REPORT.txt");
fs.writeFileSync(out, report.join("\n"), "utf8");

console.log(report.join("\n"));
console.log("");
console.log("Saved report to: " + out);

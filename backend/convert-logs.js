
const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "data", "logs.jsonl");
const OUT_FILE = path.join(__dirname, "data", "logs.csv");

function csvEscape(value) {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

if (!fs.existsSync(LOG_FILE)) {
  console.error("❌ Cannot find:", LOG_FILE);
  process.exit(1);
}

const lines = fs.readFileSync(LOG_FILE, "utf-8").split("\n").filter(Boolean);
console.log(`✅ Read ${lines.length} lines from logs.jsonl`);

const rows = lines.map((l) => {
  const r = JSON.parse(l);
  return {
    ...r,
    assistantText: String(r.assistantText || "").replace(/\n+/g, " "),
    userText: String(r.userText || "").replace(/\n+/g, " "),
  };
});

const header = ["timestamp", "userText", "assistantText", "sources"];

const csvLines = [
  header.join(","),
  ...rows.map((r) => {
    const sources = Array.isArray(r.sources) ? r.sources.join("; ") : (r.sources ?? "");
    return [
      csvEscape(r.timestamp),
      csvEscape(r.userText),
      csvEscape(r.assistantText),
      csvEscape(sources),
    ].join(",");
  }),
];

fs.writeFileSync(OUT_FILE, csvLines.join("\n"), "utf-8");
console.log("✅ Wrote CSV to:", OUT_FILE);

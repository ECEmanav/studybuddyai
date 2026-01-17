
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Data is now relative to the backend folder
const DATA_DIR = path.join(__dirname, "data");
const LOG_FILE = path.join(DATA_DIR, "logs.jsonl");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

function redactPII(text = "") {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/\b\d{6,}\b/g, "[REDACTED_NUMBER]");
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/log", (req, res) => {
  const { consent, userText, assistantText, sources, meta } = req.body;

  if (!consent) {
    return res.status(400).json({ ok: false, error: "User did not consent" });
  }

  const row = {
    timestamp: new Date().toISOString(),
    userText: redactPII(userText),
    assistantText: redactPII(assistantText),
    sources: sources || [],
    meta: meta || {}
  };

  fs.appendFileSync(LOG_FILE, JSON.stringify(row) + "\n", "utf-8");
  res.json({ ok: true });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`StudyBuddy Backend running at http://localhost:${PORT}`);
});

import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.MODEL || "gpt-4o-mini";
const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT || "You are an academic literacy tutor. Be clear and concise.";

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Set it in your environment or .env file.");
  process.exit(1);
}

app.use(helmet());
app.use(express.json({ limit: "1mb" }));

// Restrict CORS to your front-end origin (set ALLOWED_ORIGIN in env when deployed)
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    methods: ["POST", "GET", "OPTIONS"],
  })
);

// Serve static front-end (place your index.html and assets under /public)
app.use(express.static("public"));

app.post("/api/chat", async (req, res) => {
  const { message } = req.body || {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message is required." });
  }

  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
    "Cache-Control": "no-store",
  });

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
      }),
    });

    if (!r.ok || !r.body) {
      const text = await r.text().catch(() => "");
      throw new Error(`OpenAI error ${r.status}: ${text}`);
    }

    for await (const chunk of r.body) {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") {
          res.end();
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content || "";
          if (delta) res.write(delta);
        } catch {
          // ignore non-JSON keep-alive frames
        }
      }
    }

    res.end();
  } catch (err) {
    res.write(`\n\n[Error] ${err.message}`);
    res.end();
  }
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);

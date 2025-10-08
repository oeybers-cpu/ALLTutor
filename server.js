// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config(); // loads .env file

const app = express();
app.use(express.json());
app.use(express.static("public")); // serves your HTML shell from /public folder

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",   // replace with your chosen GPT model
        stream: true,
        messages: [
          { role: "system", content: "You are an academic literacy tutor. Be clear and concise." },
          { role: "user", content: message }
        ]
      })
    });

    for await (const chunk of response.body) {
      const lines = chunk.toString().split("\\n").filter(Boolean);
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return res.end();
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content || "";
          if (delta) res.write(delta);
        }
      }
    }
  } catch (err) {
    res.write(`Error: ${err.message}`);
  } finally {
    res.end();
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

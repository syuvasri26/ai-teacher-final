"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  async function upload() {
    if (!file) return;

    setStatus("Uploading and processing...");
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API}/api/documents/upload`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail ?? "Upload failed");
      }

      setStatus(`Uploaded: ${data.title} (document #${data.id})`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function askTeacher() {
    if (!question.trim()) return;

    setAsking(true);
    setAnswer("");

    try {
      const res = await fetch(`${API}/api/teacher/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          limit: 5,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail ?? "Could not get an answer");
      }

      setAnswer(data.answer);
    } catch (err) {
      setAnswer(err instanceof Error ? err.message : "Could not get an answer");
    } finally {
      setAsking(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "60px auto",
        padding: 24,
        fontFamily: "Arial",
      }}
    >
      <h1>AI Teacher</h1>

      <p>
        Upload educational material and ask questions about it.
      </p>

      <section
        style={{
          marginTop: 32,
          padding: 24,
          border: "1px solid #ddd",
          borderRadius: 16,
        }}
      >
        <h2>Step 1 - Upload a PDF</h2>

        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <button
          onClick={upload}
          disabled={!file}
          style={{
            display: "block",
            marginTop: 16,
            padding: "10px 18px",
            cursor: "pointer",
          }}
        >
          Process PDF
        </button>

        {status && <p style={{ marginTop: 16 }}>{status}</p>}
      </section>

      <section
        style={{
          marginTop: 24,
          padding: 24,
          border: "1px solid #ddd",
          borderRadius: 16,
        }}
      >
        <h2>Step 2 - Ask the AI Teacher</h2>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your uploaded PDF..."
          rows={5}
          style={{
            width: "100%",
            padding: 12,
            marginTop: 12,
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={askTeacher}
          disabled={!question.trim() || asking}
          style={{
            marginTop: 16,
            padding: "10px 18px",
            cursor: "pointer",
          }}
        >
          {asking ? "Teacher is thinking..." : "Ask Teacher"}
        </button>

        {answer && (
          <div
            style={{
              marginTop: 24,
              padding: 20,
              background: "#f5f5f5",
              borderRadius: 12,
              lineHeight: 1.6,
            }}
          >
            <h3>Teacher Answer</h3>
            <p>{answer}</p>
          </div>
        )}
      </section>
    </main>
  );
}

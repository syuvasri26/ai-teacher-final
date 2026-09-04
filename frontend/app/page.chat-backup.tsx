"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [summary, setSummary] = useState("");
  const [asking, setAsking] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  async function upload() {
    if (!file) return;

    setStatus("Uploading and processing...");
    setSummary("");

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

      setDocumentId(data.id);
      setStatus(`Uploaded successfully: ${data.title}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function summarizeDocument() {
    if (!documentId) return;

    setSummarizing(true);
    setSummary("");

    try {
      const res = await fetch(`${API}/api/summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_id: documentId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail ?? "Could not create summary");
      }

      setSummary(data.summary);
    } catch (err) {
      setSummary(
        err instanceof Error
          ? err.message
          : "Could not create summary"
      );
    } finally {
      setSummarizing(false);
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
      setAnswer(
        err instanceof Error ? err.message : "Could not get an answer"
      );
    } finally {
      setAsking(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f6fa",
        color: "#172033",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          background: "#172033",
          color: "white",
          padding: "32px 24px",
        }}
      >
        <div style={{ maxWidth: 1050, margin: "0 auto" }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: "bold",
              letterSpacing: 2,
              opacity: 0.75,
            }}
          >
            SMART LEARNING PLATFORM
          </div>

          <h1 style={{ fontSize: 38, margin: "10px 0 6px" }}>
            AI Teacher
          </h1>

          <p style={{ margin: 0, fontSize: 17, opacity: 0.85 }}>
            Your personal teacher for learning from your study materials.
          </p>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1050,
          margin: "0 auto",
          padding: "36px 20px 70px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div style={cardStyle}>
            <div style={numberStyle}>01</div>
            <h3>Upload</h3>
            <p style={smallTextStyle}>Add your educational PDF.</p>
          </div>

          <div style={cardStyle}>
            <div style={numberStyle}>02</div>
            <h3>Summarize</h3>
            <p style={smallTextStyle}>
              Create a simple study summary.
            </p>
          </div>

          <div style={cardStyle}>
            <div style={numberStyle}>03</div>
            <h3>Ask</h3>
            <p style={smallTextStyle}>
              Ask questions and learn from the material.
            </p>
          </div>
        </div>

        <section style={sectionStyle}>
          <div style={labelStyle}>STEP 1</div>

          <h2 style={headingStyle}>Upload your study material</h2>

          <p style={descriptionStyle}>
            Upload a PDF and the AI Teacher will learn from its contents.
          </p>

          <div
            style={{
              border: "2px dashed #c7d2e0",
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
              background: "#fafcff",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto 16px",
                borderRadius: 16,
                background: "#e8eef8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              PDF
            </div>

            <h3 style={{ margin: "0 0 8px" }}>
              Choose an educational PDF
            </h3>

            <p style={smallTextStyle}>Supported format: PDF</p>

            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ marginTop: 12 }}
            />

            {file && (
              <p style={{ marginTop: 14, fontWeight: "bold" }}>
                Selected: {file.name}
              </p>
            )}

            <div>
              <button
                onClick={upload}
                disabled={!file}
                style={{
                  marginTop: 16,
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: 10,
                  background: file ? "#2563eb" : "#cbd5e1",
                  color: "white",
                  fontWeight: "bold",
                  cursor: file ? "pointer" : "not-allowed",
                  marginRight: 10,
                }}
              >
                Process PDF
              </button>

              <button
                onClick={summarizeDocument}
                disabled={!documentId || summarizing}
                style={{
                  marginTop: 16,
                  padding: "12px 24px",
                  border: "1px solid #172033",
                  borderRadius: 10,
                  background:
                    documentId && !summarizing ? "white" : "#eef1f5",
                  color:
                    documentId && !summarizing ? "#172033" : "#98a2b3",
                  fontWeight: "bold",
                  cursor:
                    documentId && !summarizing
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {summarizing ? "Creating Summary..." : "Summarize PDF"}
              </button>
            </div>
          </div>

          {status && (
            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 10,
                background: "#eef4ff",
                color: "#24436e",
              }}
            >
              {status}
            </div>
          )}
        </section>

        {summary && (
          <section style={sectionStyle}>
            <div style={labelStyle}>STUDY SUMMARY</div>

            <h2 style={headingStyle}>Your PDF Summary</h2>

            <div
              style={{
                background: "#f7f9fc",
                borderRadius: 14,
                padding: 22,
                borderLeft: "5px solid #2563eb",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {summary}
            </div>
          </section>
        )}

        <section style={sectionStyle}>
          <div style={labelStyle}>STEP 2</div>

          <h2 style={headingStyle}>Ask your AI Teacher</h2>

          <p style={descriptionStyle}>
            Ask a question about the PDF you uploaded.
          </p>

          <div
            style={{
              background: "#f7f9fc",
              borderRadius: 16,
              padding: 22,
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "inline-block",
                maxWidth: 650,
                background: "#172033",
                color: "white",
                padding: "14px 18px",
                borderRadius: "14px 14px 14px 4px",
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              Hello! I am your AI Teacher. Ask me something about your
              uploaded study material.
            </div>

            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your question here..."
              rows={5}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 16,
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                fontSize: 16,
                resize: "vertical",
              }}
            />

            <button
              onClick={askTeacher}
              disabled={!question.trim() || asking}
              style={{
                marginTop: 14,
                padding: "12px 28px",
                border: "none",
                borderRadius: 10,
                background:
                  question.trim() && !asking ? "#172033" : "#cbd5e1",
                color: "white",
                fontWeight: "bold",
                fontSize: 15,
                cursor:
                  question.trim() && !asking ? "pointer" : "not-allowed",
              }}
            >
              {asking ? "Teacher is thinking..." : "Ask Teacher"}
            </button>
          </div>

          {answer && (
            <div
              style={{
                marginTop: 22,
                padding: 22,
                background: "#ffffff",
                borderRadius: 16,
                border: "1px solid #dbe3ee",
                borderLeft: "5px solid #2563eb",
                boxShadow: "0 5px 20px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: 17,
                  marginBottom: 10,
                }}
              >
                Teacher's Answer
              </div>

              <p
                style={{
                  margin: 0,
                  lineHeight: 1.7,
                  color: "#344054",
                }}
              >
                {answer}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const sectionStyle = {
  background: "white",
  borderRadius: 20,
  padding: 30,
  marginBottom: 24,
  boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
};

const cardStyle = {
  background: "white",
  borderRadius: 16,
  padding: 22,
  boxShadow: "0 5px 20px rgba(0,0,0,0.05)",
};

const numberStyle = {
  fontSize: 13,
  fontWeight: "bold" as const,
  color: "#2563eb",
  letterSpacing: 1,
};

const labelStyle = {
  fontSize: 13,
  fontWeight: "bold" as const,
  color: "#2563eb",
  letterSpacing: 1,
};

const headingStyle = {
  fontSize: 27,
  margin: "8px 0",
};

const descriptionStyle = {
  color: "#667085",
  fontSize: 16,
  marginBottom: 24,
};

const smallTextStyle = {
  color: "#667085",
  lineHeight: 1.5,
};

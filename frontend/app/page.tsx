"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://ai-teacher-final.onrender.com";

type Message = {
  role: "student" | "teacher";
  text: string;
};

type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [question, setQuestion] = useState("");
  const [summary, setSummary] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [flashcards, setFlashcards] = useState<
    { question: string; answer: string }[]
  >([]);
  const [flashcardLoading, setFlashcardLoading] = useState(false);
  const [flashcardStarted, setFlashcardStarted] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
const [teachingStarted, setTeachingStarted] = useState(false);
const [lessonPoints, setLessonPoints] = useState<string[]>([]);
const [lessonTitle, setLessonTitle] = useState("AI Teacher Lesson");

function speakTeacher(text: string) {
  if (typeof window === "undefined") return;

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(text);
speech.lang =
  selectedLanguage === "Tamil"
    ? "ta-IN"
    : selectedLanguage === "Hindi"
    ? "hi-IN"
    : "en-US";
  speech.rate = 0.9;
  speech.pitch = 1.1;
  speech.volume = 1;

  window.speechSynthesis.speak(speech);
}
const [teachingStep, setTeachingStep] = useState(0);
const [teachingAnswer, setTeachingAnswer] = useState("");
const [teachingFeedback, setTeachingFeedback] = useState("");
const [understandingLevel, setUnderstandingLevel] = useState("");
const [selectedLanguage, setSelectedLanguage] = useState("English");
const [nextRecommendation, setNextRecommendation] = useState("");

  async function upload() {
    if (!file) return;

    setStatus("Uploading and processing...");
    setSummary("");
    setMessages([]);
    setFollowUps([]);
    setQuiz([]);
    setQuizStarted(false);
    setQuizFinished(false);

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
        err instanceof Error ? err.message : "Could not create summary"
      );
    } finally {
      setSummarizing(false);
    }
  }

  async function askTeacher(customQuestion?: string) {
    const text = (customQuestion ?? question).trim();

    if (!text) return;

    setQuestion("");
    setAsking(true);

    setMessages((previous) => [
      ...previous,
      { role: "student", text },
    ]);

    try {
      const res = await fetch(`${API}/api/teacher/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
       body: JSON.stringify({
  question: text,
  document_id: documentId,
  limit: 5,
  language: selectedLanguage,
}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail ?? "Could not get an answer");
      }

      setMessages((previous) => [
        ...previous,
        { role: "teacher", text: data.answer },
      ]);
speakTeacher(data.answer);
      setFollowUps([
        "Can you explain that more simply?",
        "What are the key points?",
        "Can you give me an example?",
      ]);
    } catch (err) {
      setMessages((previous) => [
        ...previous,
        {
          role: "teacher",
          text:
            err instanceof Error
              ? err.message
              : "Could not get an answer",
        },
      ]);
    } finally {
      setAsking(false);
    }
  }

  function parseQuiz(text: string): QuizQuestion[] {
    const questions: QuizQuestion[] = [];

    const blocks = text.split(/QUESTION\s+\d+\s*:/i).slice(1);

    for (const block of blocks) {
      const questionMatch = block.match(
        /^\s*([\s\S]*?)\s*\n\s*A\)\s*([\s\S]*?)\s*\n\s*B\)\s*([\s\S]*?)\s*\n\s*C\)\s*([\s\S]*?)\s*\n\s*D\)\s*([\s\S]*?)\s*\n\s*ANSWER:\s*([ABCD])\s*\n\s*EXPLANATION:\s*([\s\S]*?)(?=\n\s*QUESTION\s+\d+\s*:|$)/i
      );

      if (!questionMatch) continue;

      questions.push({
        question: questionMatch[1].trim(),
        options: [
          questionMatch[2].trim(),
          questionMatch[3].trim(),
          questionMatch[4].trim(),
          questionMatch[5].trim(),
        ],
        answer: questionMatch[6].trim().toUpperCase(),
        explanation: questionMatch[7].trim(),
      });
    }

    return questions;
  }
  async function startFlashcards() {
    if (!documentId) return;

    setFlashcardLoading(true);
    setFlashcards([]);
    setFlashcardStarted(false);
    setFlashcardIndex(0);
    setFlashcardFlipped(false);

    try {
      const res = await fetch(`${API}/api/flashcards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_id: documentId,
          card_count: 5,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail ?? "Could not create flashcards");
      }

      const parsed = data.flashcards as {
        question: string;
        answer: string;
      }[];

      if (parsed.length === 0) {
        throw new Error("The AI did not return flashcards.");
      }

      setFlashcards(parsed);
      setFlashcardStarted(true);
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : "Could not create flashcards"
      );
    } finally {
      setFlashcardLoading(false);
    }
  }
async function submitTeachingAnswer() {
  if (!documentId || !teachingAnswer.trim()) return;

  setTeachingFeedback("AI Teacher is evaluating your answer...");

  try {
    const res = await fetch(`${API}/api/teacher/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question:
          `I am teaching a student about the uploaded study material.

The student was asked a question by the AI Teacher.

Student's answer:
"${teachingAnswer}"

Evaluate the student's answer like a real teacher.

Follow these rules:
- Say whether the answer shows understanding.
- If it is correct, encourage the student briefly.
- If it is partially correct, explain what is missing.
- If it is incorrect, explain the concept again in simpler language.
- Identify the student's possible difficulty.
- If the student needs help, give one simple example.
- End by asking one short follow-up question.
- Use ONLY information supported by the uploaded study material.`,
        document_id: documentId,
        limit: 5,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail ?? "Could not evaluate your answer");
    }

setTeachingFeedback(data.answer);

if (
  data.answer.toLowerCase().includes("correct") ||
  data.answer.toLowerCase().includes("understanding")
) {
  setUnderstandingLevel("Good understanding");
} else if (
  data.answer.toLowerCase().includes("partial") ||
  data.answer.toLowerCase().includes("missing")
) {
  setUnderstandingLevel("Needs a little more practice");
} else {
  setUnderstandingLevel("Needs more explanation");
}
setNextRecommendation(
  understandingLevel === "Good understanding"
    ? "Next: Try a more challenging question."
    : understandingLevel === "Needs a little more practice"
    ? "Next: Review this concept and try another example."
    : "Next: Relearn this concept with a simpler explanation."
);

speakTeacher(data.answer);
      } catch (err) {
    setTeachingFeedback(
      err instanceof Error
        ? err.message
        : "Could not evaluate your answer"
    );
  }
}
async function loadLessonPoints(id: number) {
  try {
    const res = await fetch(`${API}/api/teacher/lesson-points`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        document_id: id,
        limit: 8,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setLessonTitle(data.title);
      setLessonPoints(data.points);
    }
  } catch {
    setLessonPoints([]);
  }
}
async function startTeachingSession() {
  if (!documentId) return;

  setTeachingStarted(true);
  setTeachingStep(0);
  setTeachingAnswer("");
  setTeachingFeedback("");

await loadLessonPoints(documentId);

 await askTeacher(
  `Start a personalized teaching session from the uploaded study material. Teach in ${selectedLanguage}. ` +
    "First identify the main topic, explain it in simple language like a real teacher, " +
    "give one practical example, and then ask me one short question to check my understanding. " +
    "Do not give the answer to the question."
  );

  speakTeacher(
    "Welcome to your personalized teaching session. " +
    "I will explain the topic, give you an example, and then ask you a question."
  );
}
  async function startQuiz() {
    if (!documentId) return;

    setQuizLoading(true);
    setQuiz([]);
    setQuizStarted(false);
    setQuizFinished(false);
    setQuizIndex(0);
    setSelectedAnswer("");
    setQuizScore(0);

    try {
      const res = await fetch(`${API}/api/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_id: documentId,
          question_count: 5,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail ?? "Could not create quiz");
      }

      const parsed = parseQuiz(data.quiz);

      if (parsed.length === 0) {
        throw new Error("The AI did not return a readable quiz.");
      }

      setQuiz(parsed);
      setQuizStarted(true);
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : "Could not create quiz"
      );
    } finally {
      setQuizLoading(false);
    }
  }

  function chooseAnswer(letter: string) {
    if (selectedAnswer || quizFinished) return;

    setSelectedAnswer(letter);

    if (letter === quiz[quizIndex].answer) {
      setQuizScore((previous) => previous + 1);
    }
  }

  function nextQuestion() {
    if (quizIndex + 1 >= quiz.length) {
      setQuizFinished(true);
      return;
    }

    setQuizIndex((previous) => previous + 1);
    setSelectedAnswer("");
  }

  function retryQuiz() {
    startQuiz();
  }

  function newChat() {
    setMessages([]);
    setFollowUps([]);
  }

  function resetCurrentSession() {
    setFile(null);
    setDocumentId(null);
    setStatus("");
    setSummary("");
    setMessages([]);
    setFollowUps([]);
    setQuestion("");
    setQuiz([]);
    setQuizStarted(false);
    setQuizFinished(false);
    setQuizIndex(0);
    setSelectedAnswer("");
    setQuizScore(0);
    setFlashcards([]);
    setFlashcardStarted(false);
    setFlashcardIndex(0);
    setFlashcardFlipped(false);
  }

  const currentQuizQuestion = quiz[quizIndex];

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
<img
  src="/ai-teacher-avatar.png"
  alt="Female AI Teacher"
  style={{
    width: "110px",
    height: "110px",
    objectFit: "cover",
    borderRadius: "50%",
  }}
/>
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
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div style={cardStyle}>
            <div style={numberStyle}>01</div>
            <h3>Upload</h3>
            <p style={smallTextStyle}>
              Add your educational PDF.
            </p>
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

          <div style={cardStyle}>
            <div style={numberStyle}>04</div>
            <h3>Quiz</h3>
            <p style={smallTextStyle}>
              Test your understanding.
            </p>
          </div>
        </div>

        <section style={sectionStyle}>
          <div style={labelStyle}>STEP 1</div>

          <h2 style={headingStyle}>
            Upload your study material
          </h2>

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

            <p style={smallTextStyle}>
              Supported format: PDF
            </p>

            <input
              type="file"
              accept=".pdf"
              onChange={(e) =>
                setFile(e.target.files?.[0] ?? null)
              }
              style={{ marginTop: 12 }}
            />

            {file && (
              <p style={{ marginTop: 14, fontWeight: "bold" }}>
                Selected: {file.name}
              </p>
            )}

            <div>
              <button
                onClick={resetCurrentSession}
                style={{
                  marginTop: 16,
                  marginRight: 10,
                  padding: "12px 24px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  background: "white",
                  color: "#344054",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Upload New PDF
              </button>

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
                    documentId && !summarizing
                      ? "white"
                      : "#eef1f5",
                  color:
                    documentId && !summarizing
                      ? "#172033"
                      : "#98a2b3",
                  fontWeight: "bold",
                  cursor:
                    documentId && !summarizing
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {summarizing
                  ? "Creating Summary..."
                  : "Summarize PDF"}
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

            <h2 style={headingStyle}>
              Your PDF Summary
            </h2>

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

          <h2 style={headingStyle}>
            Ask your AI Teacher
          </h2>

          <button
            onClick={newChat}
            disabled={messages.length === 0}
            style={{
              marginBottom: 16,
              padding: "9px 16px",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              background:
                messages.length > 0 ? "white" : "#eef1f5",
              color:
                messages.length > 0 ? "#344054" : "#98a2b3",
              fontWeight: "bold",
              cursor:
                messages.length > 0 ? "pointer" : "not-allowed",
            }}
          >
            New Chat
          </button>

          <p style={descriptionStyle}>
            Have a conversation with your study material.
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
                display: "flex",
                justifyContent: "flex-start",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  maxWidth: "78%",
                  background: "#172033",
                  color: "white",
                  padding: "14px 18px",
                  borderRadius: "16px 16px 16px 4px",
                  lineHeight: 1.5,
                }}
              >
                Hello! I am your AI Teacher. Ask me anything about
                your uploaded study material.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 18,
              }}
            >
              {[
                "What is the main topic?",
                "Explain this document simply.",
                "What are the key points?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => askTeacher(suggestion)}
                  disabled={asking || !documentId}
                  style={{
                    padding: "9px 13px",
                    borderRadius: 20,
                    border: "1px solid #cbd5e1",
                    background: "white",
                    color: "#344054",
                    cursor:
                      asking || !documentId
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-end",
              }}
            >
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    askTeacher();
                  }
                }}
                placeholder={
                  documentId
                    ? "Type your question..."
                    : "Process a PDF first..."
                }
                disabled={!documentId || asking}
                rows={3}
                style={{
                  flex: 1,
                  boxSizing: "border-box",
                  padding: 16,
                  border: "1px solid #cbd5e1",
                  borderRadius: 12,
                  fontSize: 16,
                  resize: "vertical",
                  background:
                    documentId ? "white" : "#eef1f5",
                }}
              />

              <button
                onClick={() => askTeacher()}
                disabled={
                  !question.trim() || !documentId || asking
                }
                style={{
                  padding: "12px 22px",
                  border: "none",
                  borderRadius: 10,
                  background:
                    question.trim() &&
                    documentId &&
                    !asking
                      ? "#172033"
                      : "#cbd5e1",
                  color: "white",
                  fontWeight: "bold",
                  cursor:
                    question.trim() &&
                    documentId &&
                    !asking
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {asking ? "Thinking..." : "Send"}
              </button>
            </div>

            {followUps.length > 0 && (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  background: "#eef4ff",
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    marginBottom: 10,
                    color: "#344054",
                  }}
                >
                  Continue learning
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {followUps.map((followUp) => (
                    <button
                      key={followUp}
                      onClick={() => askTeacher(followUp)}
                      disabled={asking || !documentId}
                      style={{
                        padding: "9px 13px",
                        borderRadius: 20,
                        border: "1px solid #93b4e8",
                        background: "white",
                        color: "#24436e",
                        cursor:
                          asking || !documentId
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {followUp}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.length > 0 && (
              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {messages.map((message, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent:
                        message.role === "student"
                          ? "flex-end"
                          : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "78%",
                        padding: "14px 18px",
                        borderRadius:
                          message.role === "student"
                            ? "16px 16px 4px 16px"
                            : "16px 16px 16px 4px",
                        background:
                          message.role === "student"
                            ? "#2563eb"
                            : "white",
                        color:
                          message.role === "student"
                            ? "white"
                            : "#344054",
                        border:
                          message.role === "student"
                            ? "none"
                            : "1px solid #dbe3ee",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: "bold",
                          marginBottom: 6,
                          opacity: 0.7,
                        }}
                      >
                        {message.role === "student"
                          ? "You"
                          : "AI Teacher"}
                      </div>

                      {message.text}
                    </div>
                  </div>
                ))}

                {asking && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        background: "white",
                        border: "1px solid #dbe3ee",
                        padding: "12px 18px",
                        borderRadius: "16px 16px 16px 4px",
                        color: "#667085",
                      }}
                    >
                      AI Teacher is thinking...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

<section style={sectionStyle}>
  <div style={labelStyle}>AI TEACHING MODE</div>

  <h2 style={headingStyle}>
    Learn with your AI Teacher
  </h2>

  <p style={descriptionStyle}>
    Start a guided teaching session. Your AI Teacher will explain the topic,
    give examples, ask questions, and help you understand difficult areas.
  </p>

  <select
    value={selectedLanguage}
    onChange={(e) => setSelectedLanguage(e.target.value)}
    style={{
      padding: "10px 14px",
      borderRadius: 8,
      border: "1px solid #ccc",
      marginBottom: 12,
      display: "block",
    }}
  >
    <option value="English">English</option>
    <option value="Tamil">Tamil</option>
    <option value="Hindi">Hindi</option>
  </select>

  {!teachingStarted && (
    <button  
      onClick={startTeachingSession}
      disabled={!documentId}
      style={{
        padding: "14px 26px",
        border: "none",
        borderRadius: 10,
        background: documentId ? "#2563eb" : "#cbd5e1",
        color: "white",
        fontWeight: "bold",
        cursor: documentId ? "pointer" : "not-allowed",
        fontSize: 16,
      }}
    >
      🎓 Start Teaching Session
    </button>
  )}
{teachingStarted && (
  <div
    style={{
      marginTop: 22,
      padding: 22,
      background: "#f7f9fc",
      border: "1px solid #dbe3ee",
      borderRadius: 16,
    }}
  >
    <h3 style={{ marginTop: 0 }}>
      👩‍🏫 Your AI Teacher is teaching
    </h3>
<div
  style={{
    marginTop: 18,
    background: "#111827",
    borderRadius: 18,
    padding: 20,
    minHeight: 360,
    position: "relative",
    overflow: "hidden",
    color: "white",
  }}
>
  <div
    style={{
      position: "absolute",
      top: 16,
      left: 16,
      padding: "6px 12px",
      borderRadius: 20,
      background: "#dc2626",
      fontSize: 12,
      fontWeight: "bold",
    }}
  >
    ● AI TEACHER LIVE
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: 300,
    }}
  >
<style>
  {`
    @keyframes teacherFloat {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
      100% { transform: translateY(0px); }
    }
  `}
</style>

<img
  src="/ai-teacher-avatar.png"
  alt="AI Teacher"
  style={{
    width: 220,
    height: 220,
    objectFit: "cover",
    borderRadius: "50%",
    border: "5px solid white",
    animation: "teacherFloat 3s ease-in-out infinite",
  }}
/>  
  <div
  style={{
    marginLeft: 20,
    padding: 16,
    background: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.8,
  }}
>
  {lessonPoints.map((point, index) => (
  <div key={index}>💡 {point}</div>
))}
</div>
  </div>

<div
  style={{
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    background: "rgba(0,0,0,0.75)",
    padding: "12px 16px",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 15,
  }}
>
📚 Today's Lesson: {lessonTitle}  
  <br />
  🔊 Your AI Teacher is explaining the lesson...
</div>
  </div>
<div
  style={{
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 20,
    background: "#e8f5e9",
    color: "#2e7d32",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 12,
  }}
>
  ● PERSONALIZED TEACHING
</div>

    <p style={{ color: "#667085", lineHeight: 1.6 }}>
      Read the lesson above carefully. Your teacher has explained the topic,
      provided an example, and asked you a question.
    </p>

    <textarea
      value={teachingAnswer}
      onChange={(e) => setTeachingAnswer(e.target.value)}
      placeholder="Type your answer to the teacher's question..."
      rows={4}
      style={{
        width: "100%",
        padding: 14,
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        fontSize: 16,
        resize: "vertical",
        boxSizing: "border-box",
      }}
    />

    <button
  onClick={submitTeachingAnswer}
  disabled={!teachingAnswer.trim()}
      style={{
        marginTop: 14,
        padding: "12px 22px",
        border: "none",
        borderRadius: 10,
        background: teachingAnswer.trim() ? "#2563eb" : "#cbd5e1",
        color: "white",
        fontWeight: "bold",
        cursor: teachingAnswer.trim() ? "pointer" : "not-allowed",
      }}
    >
      Submit Answer
    </button>
{teachingFeedback && (
  <div
    style={{
      marginTop: 20,
      padding: 18,
      background: "white",
      border: "1px solid #dbe3ee",
      borderRadius: 12,
      lineHeight: 1.6,
      whiteSpace: "pre-wrap",
    }}
  >
    <div
      style={{
        fontWeight: "bold",
        marginBottom: 8,
        color: "#2563eb",
      }}
    >
{understandingLevel && (
  <div
    style={{
      marginBottom: 12,
      padding: "8px 12px",
      borderRadius: 8,
      background: "#e8f5e9",
      color: "#2e7d32",
      fontWeight: "bold",
    }}
  >
    📊 Learning Status: {understandingLevel}
  </div>
)}
{nextRecommendation && (
  <div
    style={{
      marginBottom: 12,
      padding: "10px 12px",
      borderRadius: 8,
      background: "#fff3e0",
      color: "#e65100",
      fontWeight: "bold",
    }}
  >
    🎯 {nextRecommendation}
  </div>
)}
      👩‍🏫 AI Teacher Feedback
    </div>

    {teachingFeedback}
  </div>
)}
  </div>
)}
  </section>
        <section style={sectionStyle}>
          <div style={labelStyle}>STEP 3</div>

          <h2 style={headingStyle}>
            Test your knowledge
          </h2>

          <p style={descriptionStyle}>
            Take a short quiz based on your uploaded study material.
          </p>

          {!quizStarted && !quizFinished && (
            <button
              onClick={startQuiz}
              disabled={!documentId || quizLoading}
              style={{
                padding: "13px 24px",
                border: "none",
                borderRadius: 10,
                background:
                  documentId && !quizLoading
                    ? "#2563eb"
                    : "#cbd5e1",
                color: "white",
                fontWeight: "bold",
                cursor:
                  documentId && !quizLoading
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              {quizLoading
                ? "Creating Quiz..."
                : "Start 5-Question Quiz"}
            </button>
          )}

          {quizStarted && currentQuizQuestion && !quizFinished && (
            <div
              style={{
                background: "#f7f9fc",
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: "bold",
                  color: "#2563eb",
                  marginBottom: 10,
                }}
              >
                QUESTION {quizIndex + 1} OF {quiz.length}
              </div>

              <h3
                style={{
                  fontSize: 21,
                  lineHeight: 1.5,
                  margin: "0 0 20px",
                }}
              >
                {currentQuizQuestion.question}
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {currentQuizQuestion.options.map(
                  (option, index) => {
                    const letter = String.fromCharCode(
                      65 + index
                    );

                    const isSelected =
                      selectedAnswer === letter;
                    const isCorrect =
                      currentQuizQuestion.answer === letter;

                    let background = "white";
                    let border = "1px solid #cbd5e1";

                    if (selectedAnswer) {
                      if (isCorrect) {
                        background = "#e8f7ee";
                        border = "2px solid #36a269";
                      } else if (isSelected) {
                        background = "#fff0f0";
                        border = "2px solid #d9534f";
                      }
                    } else if (isSelected) {
                      background = "#eef4ff";
                      border = "2px solid #2563eb";
                    }

                    return (
                      <button
                        key={letter}
                        onClick={() => chooseAnswer(letter)}
                        disabled={!!selectedAnswer}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "14px 16px",
                          border,
                          borderRadius: 12,
                          background,
                          color: "#344054",
                          cursor:
                            selectedAnswer
                              ? "default"
                              : "pointer",
                          fontSize: 16,
                        }}
                      >
                        <strong>{letter})</strong>{" "}
                        {option}
                      </button>
                    );
                  }
                )}
              </div>

              {selectedAnswer && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 18,
                    background: "white",
                    borderRadius: 12,
                    border: "1px solid #dbe3ee",
                    lineHeight: 1.6,
                  }}
                >
                  <strong>
                    {selectedAnswer ===
                    currentQuizQuestion.answer
                      ? "Correct"
                      : "Not quite"}
                  </strong>

                  <p style={{ marginBottom: 0 }}>
                    {currentQuizQuestion.explanation}
                  </p>
                </div>
              )}

              {selectedAnswer && (
                <button
                  onClick={nextQuestion}
                  style={{
                    marginTop: 18,
                    padding: "12px 22px",
                    border: "none",
                    borderRadius: 10,
                    background: "#172033",
                    color: "white",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {quizIndex + 1 >= quiz.length
                    ? "Finish Quiz"
                    : "Next Question"}
                </button>
              )}
            </div>
          )}

          {quizFinished && (
            <div
              style={{
                background: "#f7f9fc",
                borderRadius: 16,
                padding: 28,
                textAlign: "center",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={labelStyle}>QUIZ COMPLETE</div>

              <h3
                style={{
                  fontSize: 32,
                  margin: "10px 0",
                }}
              >
                {quizScore} / {quiz.length}
              </h3>

              <p
                style={{
                  color: "#667085",
                  fontSize: 17,
                }}
              >
                {quizScore === quiz.length
                  ? "Excellent work. You got every question correct."
                  : quizScore >= Math.ceil(quiz.length * 0.6)
                    ? "Good work. Review the questions you missed and try again."
                    : "Keep studying the material and try the quiz again."}
              </p>

              <button
                onClick={retryQuiz}
                disabled={quizLoading}
                style={{
                  marginTop: 10,
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: 10,
                  background: "#2563eb",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {quizLoading
                  ? "Creating Quiz..."
                  : "Retry Quiz"}
              </button>
            </div>
          )}
        </section>
        <section style={sectionStyle}>
          <div style={labelStyle}>STEP 4</div>

          <h2 style={headingStyle}>
            Study Flashcards
          </h2>

          <p style={descriptionStyle}>
            Review important facts from your uploaded study material.
          </p>

          {!flashcardStarted && (
            <button
              onClick={startFlashcards}
              disabled={!documentId || flashcardLoading}
              style={{
                padding: "13px 24px",
                border: "none",
                borderRadius: 10,
                background:
                  documentId && !flashcardLoading
                    ? "#2563eb"
                    : "#cbd5e1",
                color: "white",
                fontWeight: "bold",
                cursor:
                  documentId && !flashcardLoading
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              {flashcardLoading
                ? "Creating Flashcards..."
                : "Start 5 Flashcards"}
            </button>
          )}

          {flashcardStarted && flashcards.length > 0 && (
            <div
              style={{
                background: "#f7f9fc",
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: 24,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: "bold",
                  color: "#2563eb",
                  marginBottom: 12,
                }}
              >
                FLASHCARD {flashcardIndex + 1} OF {flashcards.length}
              </div>

              <div
                onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                style={{
                  minHeight: 180,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 24,
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: 16,
                  cursor: "pointer",
                  lineHeight: 1.6,
                  fontSize: 20,
                  fontWeight: "bold",
                }}
              >
                {flashcardFlipped
                  ? flashcards[flashcardIndex].answer
                  : flashcards[flashcardIndex].question}
              </div>

              <p
                style={{
                  color: "#667085",
                  marginTop: 12,
                }}
              >
                Click the card to {flashcardFlipped ? "see the question" : "reveal the answer"}.
              </p>

              <button
                onClick={() => {
                  if (flashcardIndex + 1 < flashcards.length) {
                    setFlashcardIndex((previous) => previous + 1);
                    setFlashcardFlipped(false);
                  } else {
                    setFlashcardStarted(false);
                    setFlashcardIndex(0);
                    setFlashcardFlipped(false);
                  }
                }}
                style={{
                  marginTop: 8,
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: 10,
                  background: "#172033",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {flashcardIndex + 1 < flashcards.length
                  ? "Next Flashcard"
                  : "Finish Flashcards"}
              </button>
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

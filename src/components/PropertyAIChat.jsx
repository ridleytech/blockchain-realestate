import React, { useState } from "react";

export default function PropertyAIChat({ propertyId }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/ai/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ propertyId, question }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Request failed");
      }
      setAnswer(data.answer || "");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mt-3">
      <div className="card-body">
        <h5 className="card-title">Ask about this property</h5>
        <form onSubmit={ask} className="d-flex gap-2">
          <input
            type="text"
            className="form-control"
            placeholder="e.g., What are the key risks or expected yield?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Asking..." : "Ask"}
          </button>
        </form>
        {error && <div className="text-danger mt-2">{error}</div>}
        {answer && (
          <div className="mt-3">
            <div className="fw-bold mb-1">Answer</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{answer}</div>
          </div>
        )}
      </div>
    </div>
  );
}

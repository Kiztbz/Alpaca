"use client";

export function ResponseCard({
  answers = [],
  setAnswers,
  hasAnswered,
  setHasAnswered,
  isCorrect,
  lighter,
}) {
  const currentValue = Array.isArray(answers)
    ? answers[0] || ""
    : typeof answers === "string"
    ? answers
    : "";

  let borderColor = "var(--border-color)";
  let bgColor = "var(--bg-3)";
  if (hasAnswered) {
    if (!isCorrect) {
      borderColor = "var(--danger)";
      bgColor = "var(--danger-08)";
    } else {
      borderColor = "var(--success)";
      bgColor = "var(--success-08)";
    }
  }

  return (
    <div style={{ width: "100%", margin: "24px 0 12px" }}>
      <label
        style={{
          display: "block",
          fontSize: "13px",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--fg-3)",
          marginBottom: "10px",
        }}
      >
        Your Response
      </label>
      <input
        type="text"
        value={currentValue}
        disabled={hasAnswered && isCorrect}
        autoFocus
        placeholder="Type your response here..."
        style={{
          width: "100%",
          height: "54px",
          padding: "12px 18px",
          fontSize: "18px",
          fontWeight: "600",
          fontFamily: "inherit",
          color: "var(--fg-1)",
          background: bgColor,
          border: `2px solid ${borderColor}`,
          borderRadius: "var(--radius-large)",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
        }}
        onFocus={(e) => {
          if (!hasAnswered) {
            e.target.style.borderColor = "var(--accent)";
            e.target.style.boxShadow = "0 0 0 3px var(--accent-20)";
          }
        }}
        onBlur={(e) => {
          if (!hasAnswered) {
            e.target.style.borderColor = "var(--border-color)";
            e.target.style.boxShadow = "none";
          }
        }}
        onChange={(e) => {
          setAnswers([e.target.value]);
          setHasAnswered(false);
        }}
      />
    </div>
  );
}

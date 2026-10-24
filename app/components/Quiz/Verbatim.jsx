"use client";

import { useState, useEffect } from "react";

export function Verbatim({
  quiz,
  answers = [],
  setAnswers,
  hasAnswered,
  setHasAnswered,
  incorrectIndexes = [],
  setIncorrectIndexes,
  lighter,
}) {
  const numAnswers = Math.max(1, quiz.numOfAnswers || 1);
  const [uAns, setUAns] = useState(new Array(numAnswers).fill(""));

  useEffect(() => {
    setUAns(
      new Array(numAnswers).fill("").map((_, index) => {
        if (answers[index] !== undefined && answers[index] !== null) {
          return String(answers[index]);
        }
        return "";
      })
    );
  }, [answers, numAnswers]);

  // If verbatim has only 1 expected response/word, render as a prominent single input
  if (numAnswers === 1) {
    const hasError = incorrectIndexes.includes(0);

    let borderColor = "var(--border-color)";
    let bgColor = "var(--bg-3)";
    if (hasAnswered) {
      if (hasError) {
        borderColor = "var(--danger)";
        bgColor = "var(--danger-08)";
      } else {
        borderColor = "var(--success)";
        bgColor = "var(--success-08)";
      }
    }

    return (
      <div style={{ width: "100%", margin: "22px 0 10px" }}>
        <label
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--fg-3)",
            marginBottom: "8px",
          }}
        >
          Your Response (Verbatim)
        </label>
        <input
          type="text"
          value={uAns[0] || ""}
          disabled={hasAnswered && !hasError}
          autoFocus
          placeholder="Type the exact answer..."
          style={{
            width: "100%",
            height: "52px",
            padding: "12px 18px",
            fontSize: "18px",
            fontWeight: "600",
            color: "var(--fg-1)",
            background: bgColor,
            border: `2px solid ${borderColor}`,
            borderRadius: "var(--radius-large)",
            outline: "none",
            boxSizing: "border-box",
            transition: "all 0.15s ease",
          }}
          onFocus={(e) => {
            if (!hasAnswered) e.target.style.borderColor = "var(--accent)";
          }}
          onBlur={(e) => {
            if (!hasAnswered) e.target.style.borderColor = "var(--border-color)";
          }}
          onChange={(e) => {
            const val = e.target.value;
            setUAns([val]);
            setAnswers([val]);
            setHasAnswered(false);
            if (hasError && setIncorrectIndexes) {
              setIncorrectIndexes([]);
            }
          }}
        />
      </div>
    );
  }

  // Multiple words verbatim
  return (
    <div style={{ width: "100%", margin: "22px 0 10px" }}>
      <label
        style={{
          display: "block",
          fontSize: "13px",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--fg-3)",
          marginBottom: "12px",
        }}
      >
        Fill in each word ({numAnswers} expected):
      </label>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "14px",
          alignItems: "center",
        }}
      >
        {uAns.map((ans, index) => {
          const hasError = incorrectIndexes.includes(index);
          let borderColor = "var(--border-color)";
          let bgColor = "var(--bg-3)";
          if (hasAnswered) {
            if (hasError) {
              borderColor = "var(--danger)";
              bgColor = "var(--danger-08)";
            } else {
              borderColor = "var(--success)";
              bgColor = "var(--success-08)";
            }
          }

          const dynamicWidth = `min(340px, max(130px, calc(${Math.max(
            ans?.length || 0,
            8
          )}ch + 32px)))`;

          return (
            <div
              key={`verbatim-${quiz.id}-${index}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                flex: "1 1 auto",
                maxWidth: "340px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--fg-4)",
                  textTransform: "uppercase",
                }}
              >
                Word {index + 1}
              </span>
              <input
                type="text"
                placeholder={`word ${index + 1}`}
                value={ans || ""}
                disabled={hasAnswered && !hasError}
                autoFocus={index === 0}
                style={{
                  height: "48px",
                  width: dynamicWidth,
                  padding: "10px 14px",
                  fontSize: "17px",
                  fontWeight: "600",
                  color: "var(--fg-1)",
                  background: bgColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: "var(--radius-medium)",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "all 0.15s ease",
                }}
                onFocus={(e) => {
                  if (!hasAnswered) e.target.style.borderColor = "var(--accent)";
                }}
                onBlur={(e) => {
                  if (!hasAnswered) e.target.style.borderColor = "var(--border-color)";
                }}
                onChange={(e) => {
                  const newAnswers = [...uAns];
                  newAnswers[index] = e.target.value;
                  setUAns(newAnswers);
                  setAnswers(newAnswers);
                  setHasAnswered(false);

                  if (hasError && setIncorrectIndexes) {
                    setIncorrectIndexes(
                      incorrectIndexes.filter((i) => i !== index)
                    );
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

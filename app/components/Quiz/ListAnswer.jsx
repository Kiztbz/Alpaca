"use client";

import { useState, useEffect } from "react";

export function ListAnswer({
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
    setUAns(() => {
      return new Array(numAnswers).fill("").map((_, index) => {
        if (answers[index] !== undefined && answers[index] !== null) {
          return String(answers[index]);
        }
        return "";
      });
    });
  }, [answers, numAnswers]);

  return (
    <div
      style={{
        width: "100%",
        margin: "24px 0 12px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
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

        return (
          <div key={`answer-${index}`} style={{ width: "100%" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--fg-3)",
                marginBottom: "8px",
              }}
            >
              Item {index + 1} of {numAnswers}
            </label>
            <input
              type="text"
              value={ans || ""}
              placeholder={`Type item ${index + 1}...`}
              autoFocus={index === 0}
              disabled={hasAnswered && !hasError}
              style={{
                width: "100%",
                height: "50px",
                padding: "10px 16px",
                fontSize: "17px",
                fontWeight: "600",
                fontFamily: "inherit",
                color: "var(--fg-1)",
                background: bgColor,
                border: `2px solid ${borderColor}`,
                borderRadius: "var(--radius-medium)",
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
                const newAnswers = [...uAns];
                newAnswers[index] = e.target.value;
                setUAns(newAnswers);
                setAnswers(newAnswers);
                setHasAnswered(false);

                if (hasError && setIncorrectIndexes) {
                  setIncorrectIndexes((prev) =>
                    prev.filter((i) => i !== index)
                  );
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

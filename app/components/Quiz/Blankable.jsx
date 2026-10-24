"use client";

import styles from "./QuizInput.module.css";
import { useEffect, useState } from "react";

export function Blankable({
  quiz,
  answers = [],
  setAnswers,
  hasAnswered,
  setHasAnswered,
  incorrectIndexes = [],
  setIncorrectIndexes,
  lighter,
}) {
  const texts = (quiz.prompt || "").split(/<blank \/>/);
  const numBlanks = Math.max(0, texts.length - 1);

  const [uAns, setUAns] = useState(new Array(numBlanks).fill(""));

  useEffect(() => {
    setUAns(
      new Array(numBlanks).fill("").map((_, index) => {
        if (answers[index] !== undefined && answers[index] !== null) {
          return String(answers[index]);
        }
        return "";
      })
    );
  }, [answers, numBlanks]);

  return (
    <div
      className={styles.blanks}
      style={{
        fontSize: "20px",
        lineHeight: "2.6",
        color: "var(--fg-1)",
        fontWeight: 500,
        wordBreak: "break-word",
        margin: "24px 0 16px",
        padding: "4px 0",
      }}
    >
      {texts.map((text, index) => {
        const hasError = incorrectIndexes.includes(index);
        const textLength = uAns[index]?.length || 0;
        const dynamicWidth = `min(340px, max(130px, calc(${Math.max(textLength, 8)}ch + 36px)))`;

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
          <span key={`blank-span-${index}`} className={styles.span}>
            {text}
            {index < numBlanks && (
              <input
                type="text"
                value={uAns[index] || ""}
                disabled={hasAnswered && !hasError}
                autoFocus={index === 0}
                placeholder="type here..."
                aria-label={`Blank ${index + 1}`}
                style={{
                  display: "inline-block",
                  verticalAlign: "middle",
                  height: "44px",
                  width: dynamicWidth,
                  margin: "4px 8px",
                  padding: "6px 14px",
                  fontSize: "18px",
                  fontWeight: "700",
                  fontFamily: "inherit",
                  color: "var(--fg-1)",
                  background: bgColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: "var(--radius-medium)",
                  outline: "none",
                  boxSizing: "border-box",
                  textAlign: "center",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
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
                    setIncorrectIndexes(
                      incorrectIndexes.filter((i) => i !== index)
                    );
                  }
                }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}

"use client";

import styles from "./MultipleChoice.module.css";
import { useCallback, useEffect } from "react";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function MultipleChoiceCard({
  quiz,
  answers = [],
  setAnswers,
  hasAnswered,
  setHasAnswered,
  isCorrect,
  lighter,
}) {
  const choices = Array.isArray(quiz?.choices) ? quiz.choices : [];
  const multiple = Boolean(quiz?.multipleAnswers);
  const correctAnswers = Array.isArray(quiz?.answers)
    ? quiz.answers
    : typeof quiz?.answers === "string"
    ? JSON.parse(quiz.answers)
    : [];

  const handleSelectChoice = useCallback(
    (choiceText) => {
      if (hasAnswered) return;

      if (multiple) {
        let newAnswers = Array.isArray(answers) ? [...answers] : [];
        if (newAnswers.includes(choiceText)) {
          newAnswers = newAnswers.filter((a) => a !== choiceText);
        } else {
          newAnswers.push(choiceText);
        }
        setAnswers(newAnswers);
      } else {
        setAnswers([choiceText]);
      }
      setHasAnswered(false);
    },
    [answers, hasAnswered, multiple, setAnswers, setHasAnswered]
  );

  // Keyboard shortcut listener (1-4 or A-D)
  useEffect(() => {
    if (hasAnswered) return;

    function handleKeyDown(e) {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      const numKey = parseInt(e.key, 10);
      if (!isNaN(numKey) && numKey >= 1 && numKey <= choices.length) {
        e.preventDefault();
        handleSelectChoice(choices[numKey - 1]);
        return;
      }

      const letterIndex = OPTION_LETTERS.findIndex(
        (l) => l.toLowerCase() === e.key.toLowerCase()
      );
      if (letterIndex !== -1 && letterIndex < choices.length) {
        e.preventDefault();
        handleSelectChoice(choices[letterIndex]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [choices, handleSelectChoice, hasAnswered]);

  return (
    <div className={styles.choiceGrid}>
      {choices.map((choice, index) => {
        const isSelected = Array.isArray(answers) && answers.includes(choice);
        const isAnswerCorrect = correctAnswers.includes(choice);

        // Feedback styling after user checks answer
        let statusClass = "";
        if (hasAnswered) {
          if (isSelected && isAnswerCorrect) {
            statusClass = styles.correctOption;
          } else if (isSelected && !isAnswerCorrect) {
            statusClass = styles.wrongOption;
          } else if (!isSelected && isAnswerCorrect) {
            statusClass = styles.solutionHighlight;
          }
        } else if (isSelected) {
          statusClass = styles.selected;
        }

        return (
          <button
            key={`choice-${index}-${choice}`}
            type="button"
            className={`${styles.choiceOption} ${statusClass}`}
            onClick={() => handleSelectChoice(choice)}
            disabled={hasAnswered}
          >
            <div className={styles.choiceLeft}>
              <span className={styles.keyBadge}>
                {OPTION_LETTERS[index] || index + 1}
              </span>
              <span className={styles.choiceText}>{choice}</span>
            </div>

            {hasAnswered && !isSelected && isAnswerCorrect ? (
              <span className={styles.solutionBadge}>Correct Answer</span>
            ) : (
              <div className={styles.radioCircle}>
                {isSelected && (
                  hasAnswered ? (
                    isAnswerCorrect ? "✓" : "✕"
                  ) : (
                    <div className={styles.selectedDot} />
                  )
                )}
              </div>
            )}
          </button>
        );
      })}

      {multiple && !hasAnswered && (
        <span className={styles.instruction}>
          Select all options that apply ({quiz.numOfAnswers || "multiple"} expected)
        </span>
      )}
    </div>
  );
}

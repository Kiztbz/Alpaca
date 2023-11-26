"use client";

import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Input, Card, Alert } from "@components/client";
import correctConfetti from "@/lib/correctConfetti";
import stringCompare from "@/lib/stringCompare";
import shuffleArray from "@/lib/shuffleArray";
import { useState, useEffect } from "react";
import makeUniqueId from "@/lib/uniqueId";

export function ResponseCard({
    canClientCheck,
    quiz,
    handleWhenCorrect,
    isFlashcard,
}) {
    const [userResponse, setUserResponse] = useState("");
    const [hasAnswered, setHasAnswered] = useState(false);
    const [correctAnswer, setCorrectAnswer] = useState(false);
    const [failures, setFailures] = useState(0);
    const [choices, setChoices] = useState([]);

    const [showAnswer, setShowAnswer] = useState(false);

    const [showAlert, setShowAlert] = useState(false);
    const [requestStatus, setRequestStatus] = useState({});

    useEffect(() => {
        if (quiz.choices)
            setChoices(
                quiz.choices
                    ? shuffleArray(
                          quiz.choices.map((x) => ({
                              label: x,
                              value: x,
                              key: makeUniqueId(),
                          })),
                      )
                    : null,
            );
    }, []);

    useEffect(() => {
        if (choices.length) setUserResponse(choices[0].value);
    }, [choices]);

    const type = quiz.type === "prompt-response" ? "text" : "select";

    function handleInput(e) {
        e.preventDefault();
        setHasAnswered(false);
        console.log(e.target.value);
        setUserResponse(e.target.value);
    }

    async function handleCheckAnswer() {
        if (hasAnswered || !userResponse) return;

        if (canClientCheck) {
            const isCorrect =
                quiz.correctResponses.find(
                    (x) => stringCompare(x, userResponse) >= 0.8,
                ) !== undefined;

            if (isCorrect) {
                setFailures(0);
                correctConfetti();
            } else {
                setFailures(failures + 1);
            }

            setCorrectAnswer(isCorrect);
            setHasAnswered(true);
        } else {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BASEPATH ?? ""}/api/quiz/${
                    quiz._id
                }`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ userResponse }),
                },
            );

            if (response.status === 401) {
                setRequestStatus({
                    success: false,
                    message: "Please log in and try again",
                });
                setShowAlert(true);
                return;
            }

            const resJson = await response.json();
            console.log(resJson);
            const message = resJson.message;
            const isCorrect = message.isCorrect;

            if (isCorrect) {
                setFailures(0);
                correctConfetti();
                handleWhenCorrect();
            } else {
                setFailures(failures + 1);
            }

            setCorrectAnswer(isCorrect);
            setHasAnswered(true);
        }
    }

    function handleShowAnswer() {
        if (!isFlashcard) return;
        setShowAnswer((prev) => !prev);
    }

    let label, color, icon, outline;
    if (isFlashcard) {
        label = showAnswer ? "Return to Your Answers" : "Show Correct Answers";
        color = showAnswer ? "var(--accent-tertiary-1)" : undefined;
        outline = showAnswer ? "var(--accent-tertiary-outline)" : undefined;
    } else if (hasAnswered) {
        label = correctAnswer ? "Correct" : "Incorrect";
        icon = correctAnswer ? faCheck : faXmark;
        color = correctAnswer
            ? "var(--accent-tertiary-1)"
            : "var(--accent-secondary-1)";
        outline = correctAnswer
            ? "var(--accent-tertiary-outline)"
            : "var(--accent-secondary-outline)";
    } else {
        label = "Check Answer";
    }

    return (
        <Card
            title={quiz.prompt}
            buttons={[
                {
                    label,
                    icon,
                    color,
                    onClick: isFlashcard ? handleShowAnswer : handleCheckAnswer,
                },
            ]}
        >
            <Alert
                show={showAlert}
                setShow={setShowAlert}
                success={requestStatus.success}
                message={requestStatus.message}
            />

            <Input
                type={type}
                description="Your response to the prompt"
                choices={choices}
                label="Your Response"
                value={
                    isFlashcard && showAnswer
                        ? quiz.correctResponses[0]
                        : userResponse
                }
                onChange={handleInput}
                onActionTrigger={handleCheckAnswer}
                outlineColor={outline}
            />

            {!correctAnswer && failures > 2 && (
                <div data-type="hints">
                    <p>You're having some trouble. Here are some hints:</p>
                    <ul>
                        {quiz.correctResponses.map((x, index) => (
                            <li key={index}>{x}</li>
                        ))}
                    </ul>
                </div>
            )}
        </Card>
    );
}

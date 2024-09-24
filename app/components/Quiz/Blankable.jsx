"use client";

import whichIndexesIncorrect from "@/lib/whichIndexesIncorrect";
import { correctConfetti } from "@/lib/correctConfetti";
import { useEffect, useState } from "react";
import { useAlerts } from "@/store/store";
import { Card, Input } from "@client";

export function Blankable({
    canClientCheck,
    quiz,
    handleWhenCorrect,
    isFlashcard,
}) {
    const [userResponse, setUserResponse] = useState(
        [...Array(quiz.correctResponses.length)].map(() => ""),
    );
    const [responseStatus, setResponseStatus] = useState("empty");
    const [responseCorrect, setResponseCorrect] = useState(false);
    const [failures, setFailures] = useState(0);
    const [incorrectIndexes, setIncorrectIndexes] = useState([]);

    const [showAnswer, setShowAnswer] = useState(false);

    const addAlert = useAlerts((state) => state.addAlert);

    useEffect(() => {
        if (responseStatus === "empty") return;
        if (incorrectIndexes.length === 0) {
            setResponseCorrect(true);
            setFailures(0);
            correctConfetti();
            handleWhenCorrect();
        } else {
            setFailures(failures + 1);
        }
    }, [incorrectIndexes]);

    const texts = quiz.prompt.split(/<blank \/>/);

    function handleChange(index, value) {
        setResponseStatus("incomplete");
        let array = [...userResponse];
        array[index] = value;
        setUserResponse(array);
    }

    async function handleCheckAnswer() {
        setResponseStatus("complete");
        if (canClientCheck) {
            setIncorrectIndexes(
                whichIndexesIncorrect(userResponse, quiz.correctResponses),
            );
        } else {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BASEPATH ?? ""}/api/quiz/${quiz.id}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ userResponse }),
                },
            );

            const resJson = await response.json();
            console.log(resJson);
            const message = resJson.message;
            setIncorrectIndexes(message.incorrectIndexes);
            setResponseStatus("complete");
        }
    }

    function handleShowAnswer() {
        if (!isFlashcard) return;
        setShowAnswer((prev) => !prev);
    }

    let label, color, icon;
    if (isFlashcard) {
        label = showAnswer ? "Return to Your Answers" : "Show Correct Answers";
        color = showAnswer ? "var(--accent)" : undefined;
    } else if (responseStatus === "complete") {
        label = incorrectIndexes.length ? "Incorrect" : "Correct";
        color = incorrectIndexes.length ? "var(--accent)" : "var(--accent)";
        icon = incorrectIndexes.length ? <></> : <></>;
    } else {
        label = "Check Answer";
    }

    return (
        <Card
            title={"Fill in the blanks"}
            buttons={[
                {
                    label,
                    icon,
                    color,
                    onClick: isFlashcard ? handleShowAnswer : handleCheckAnswer,
                },
            ]}
        >
            {texts.map((text, index) => {
                let isCorrect;
                if (incorrectIndexes.includes(index)) {
                    isCorrect = false;
                } else if (responseStatus === "complete") {
                    isCorrect = true;
                }

                return (
                    <span key={index}>
                        {text}
                        {index < texts.length - 1 && (
                            <Input
                                id={`blank-${index}`}
                                inline
                                isCorrect={isCorrect}
                                value={
                                    isFlashcard && showAnswer
                                        ? quiz.correctResponses[index]
                                        : userResponse[index]
                                }
                                onChange={(e) => {
                                    handleChange(index, e.target.value);
                                }}
                                outlineColor={
                                    responseStatus === "complete" &&
                                    (incorrectIndexes.includes(index)
                                        ? "var(--accent-2)"
                                        : "var(--accent)")
                                }
                            />
                        )}
                    </span>
                );
            })}

            {!responseCorrect &&
                responseStatus === "complete" &&
                quiz.hints &&
                quiz.hints.length > 0 &&
                failures > 2 && (
                    <div data-type="hints">
                        <p>You're having some trouble. Here are some hints:</p>
                        <ul>
                            {quiz.hints.map((hint, index) => {
                                return <li key={`hint_${index}`}>{hint}</li>;
                            })}
                        </ul>
                    </div>
                )}
        </Card>
    );
}

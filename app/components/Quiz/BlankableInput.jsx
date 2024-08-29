"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./QuizInput.module.css";
import { Input } from "@client";
import { validation } from "@/lib/validation";

export function BlankableInput({
    prompt,
    setPrompt,
    promptError,
    setPromptError,
    responses,
    setResponses,
}) {
    const [promptInput, setPromptInput] = useState("");
    const [promptWords, setPromptWords] = useState([]);
    const promptBank = useRef(null);

    useEffect(() => {
        let resIndex = 0;
        const promptArray = prompt
            .split(/(<blank\s*\/>)|([A-Za-z]+(?:'[A-Za-z]+)?|\W)/)
            .filter((x) => x !== undefined && x !== "")
            .map((x) => {
                if (/(<blank\s*\/>)/.test(x)) {
                    let newWord = responses[resIndex];
                    resIndex++;
                    if (resIndex === responses.length) {
                        resIndex = 0;
                    }
                    return {
                        word: newWord,
                        isBlank: true,
                    };
                } else if (/[\s.,!?;:"<>\[\]{}()]+/.test(x)) {
                    return {
                        punctuation: x,
                    };
                } else {
                    return {
                        word: x,
                        isBlank: false,
                    };
                }
            });

        setPromptWords(promptArray);
        setPromptInput(
            promptArray.map((x) => x.punctuation ?? x.word).join(""),
        );
    }, []);

    function handleChangePrompt(e) {
        setPromptInput(e.target.value);
        setPromptError("");
        let promptArray = e.target.value
            .split(/([A-Za-z]+(?:'[A-Za-z]+)?|\W)/)
            .filter((x) => x !== undefined && x !== "")
            .map((x) => {
                if (/[\s.,!?;:"<>\[\]{}()]+/.test(x)) {
                    return {
                        punctuation: x,
                    };
                } else {
                    return {
                        word: x,
                        isBlank: false,
                    };
                }
            });

        let words = [...promptWords];
        promptArray.forEach((wordObj, index) => {
            // punctuation is not able to be a blank
            if (wordObj.punctuation) return;

            if (
                wordObj.word &&
                words[index] &&
                words[index].word &&
                wordObj.word === words[index].word
            ) {
                wordObj.isBlank = words[index].isBlank;
                return;
            }

            if (!words[index]) {
                return;
            }

            if (wordObj.word !== words[index].word) {
                let props = words.find((x, idx) => {
                    // This prevents it from marking isBlank true for all matching words
                    // The bad news is that if you delete or paste multiple words, all of the isBlanks will be made false
                    if (idx < index - 2 || idx > index + 2) {
                        return false;
                    }
                    return x.word === wordObj.word;
                });

                if (props) {
                    wordObj.isBlank = props.isBlank;
                } else if (
                    (words[index - 2] &&
                        promptArray[index - 2] &&
                        words[index - 2].word ===
                            promptArray[index - 2].word) ||
                    (words[index + 2] &&
                        promptArray[index + 2] &&
                        words[index + 2].word === promptArray[index + 2].word)
                ) {
                    wordObj.isBlank = words[index].isBlank;
                }
            }
        });

        setPromptWords(promptArray);
        setResponses(promptArray.filter((x) => x.isBlank).map((x) => x.word));
        setPrompt(
            promptArray
                .map((x) => {
                    if (x.isBlank) {
                        return "<blank />";
                    }
                    return x.punctuation ?? x.word;
                })
                .join(""),
        );
    }

    function handleChangeBlank() {
        const spans = promptBank.current.querySelectorAll("span");

        let promptArray = [];
        let responseArray = [];
        let words = [...promptWords];
        spans.forEach((x, index) => {
            let input = x.querySelector("input");
            if (input && input.checked) {
                promptArray.push("<blank />");
                words[index].isBlank = true;
                responseArray.push(x.getAttribute("data-word"));
            } else if (input && !input.checked) {
                promptArray.push(x.getAttribute("data-word"));
                words[index].isBlank = false;
            } else {
                promptArray.push(x.textContent);
            }
        });
        setPrompt(promptArray.join(""));
        setPromptWords(words);
        setResponses(responseArray);
    }

    return (
        <div>
            <Input
                label={"Enter text that you wish to make blanks within"}
                description={"Question prompt. Can be a question or statement"}
                required={true}
                value={promptInput}
                maxLength={validation.quiz.prompt.maxLength}
                error={promptError}
                onChange={handleChangePrompt}
            />
            <div className={styles.blankBank} ref={promptBank}>
                <p>Click the words you would like to be blank.</p>
                {promptWords.map((x, index) => {
                    if (x.punctuation) {
                        return <span key={index}>{x.punctuation}</span>;
                    } else {
                        return (
                            <span key={index} data-word={x.word}>
                                <input
                                    autoCapitalize="none"
                                    type="checkbox"
                                    id={`${index}_${x.word}`}
                                    checked={x.isBlank}
                                    onChange={handleChangeBlank}
                                />
                                <label htmlFor={`${index}_${x.word}`}>
                                    {x.word}
                                </label>
                            </span>
                        );
                    }
                })}
            </div>
        </div>
    );
}

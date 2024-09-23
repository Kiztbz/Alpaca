"use client";

import { DeletePopup } from "../DeletePopup/DeletePopup";
import { useStore, useAlerts } from "@/store/store";
import { useEffect, useReducer } from "react";
import { validation } from "@/lib/validation";
import { Validator } from "@/lib/validation";
import { getNanoId } from "@/lib/random";
import {
    BlankableInput,
    Permissions,
    Spinner,
    Select,
    Input,
    Form,
} from "@client";

const defaultState = {
    type: "prompt-response",
    prompt: "",
    answer: "",
    answers: [],
    choice: "",
    choices: [],
    hint: "",
    hints: [],
    sources: [],
    notes: [],
    courses: [],
    tag: "",
    tags: [],
    permissions: {
        allRead: false,
        allWrite: false,
        read: [],
        write: [],
        groupId: null,
        groupLocked: false,
    },
    loading: false,
    errors: {},
};

function stateReducer(state, action) {
    switch (action.type) {
        case "type":
            return { ...state, type: action.value };
        case "prompt":
            return { ...state, prompt: action.value };
        case "answer":
            return { ...state, answer: action.value };
        case "addAnswer":
            return {
                ...state,
                answers: [...state.answers, action.value],
            };
        case "removeAnswer":
            return {
                ...state,
                answers: state.answers.filter((x) => x !== action.value),
            };
        case "answers":
            return { ...state, answers: action.value };
        case "choice":
            return { ...state, choice: action.value };
        case "addChoice":
            return {
                ...state,
                choices: [...state.choices, action.value],
            };
        case "removeChoice":
            return {
                ...state,
                choices: state.choices.filter((x) => x !== action.value),
            };
        case "choices":
            return { ...state, choices: action.value };
        case "hint":
            return { ...state, hint: action.value };
        case "addHint":
            return {
                ...state,
                hints: [...state.hints, action.value],
            };
        case "removeHint":
            return {
                ...state,
                hints: state.hints.filter((x) => x !== action.value),
            };
        case "hints":
            return { ...state, hints: action.value };
        case "sources":
            return { ...state, sources: action.value };
        case "notes":
            return { ...state, notes: action.value };
        case "courses":
            return { ...state, courses: action.value };
        case "tag":
            return { ...state, tag: action.value };
        case "addTag":
            return {
                ...state,
                tags: [...state.tags, action.value],
            };
        case "removeTag":
            return {
                ...state,
                tags: state.tags.filter((x) => x !== action.value),
            };
        case "tags":
            return { ...state, tags: action.value };
        case "permissions":
            return { ...state, permissions: action.value };
        case "loading":
            return { ...state, loading: action.value };
        case "errors":
            return { ...state, errors: { ...state.errors, ...action.value } };
        case "editing":
            return {
                ...state,
                ...action.value,
                sources:
                    action.value.sources.map((id) => {
                        const source = action.sources.find((x) => x.id === id);

                        return (
                            source ?? {
                                id: getNanoId(),
                                title: "Unavailable",
                            }
                        );
                    }) ?? [],
                notes:
                    action.value.notes.map((id) => {
                        const note = action.notes.find((x) => x.id === id);

                        return (
                            note ?? {
                                id: getNanoId(),
                                title: "Unavailable",
                            }
                        );
                    }) ?? [],
                courses:
                    action.value.courses.map((id) => {
                        const course = action.courses.find((x) => x.id === id);

                        return (
                            course ?? {
                                id: getNanoId(),
                                name: "Unavailable",
                            }
                        );
                    }) ?? [],
            };
        case "reset":
            return defaultState;
        default:
            return state;
    }
}

export function QuizInput({ quiz }) {
    const [state, dispatch] = useReducer(stateReducer, defaultState);

    const addAlert = useAlerts((state) => state.addAlert);
    const sources = useStore((state) => state.sources);
    const courses = useStore((state) => state.courses);
    const notes = useStore((state) => state.notes);
    const user = useStore((state) => state.user);

    const isOwner = quiz && user && quiz.creator.id === user.id;
    const canChangePermissions = isOwner || !quiz;

    useEffect(() => {
        if (!quiz) return;

        dispatch({
            type: "editing",
            value: quiz,
            sources,
            notes,
            courses,
        });
    }, []);

    if (
        state.type === "multiple-choice" &&
        state.answers.find((x) => !state.choices.includes(x))
    ) {
        // Remove answers that are not in the choices
        dispatch({
            type: "answers",
            value: state.answers.filter((x) => state.choices.includes(x)),
        });
    }

    const types = [
        { label: "Prompt/Response", value: "prompt-response" },
        { label: "Multiple Choice", value: "multiple-choice" },
        { label: "Fill in the Blank", value: "fill-in-the-blank" },
        { label: "Ordered List Answer", value: "ordered-list-answer" },
        { label: "Unordered List Answer", value: "unordered-list-answer" },
        { label: "Verbatim", value: "verbatim" },
    ];

    async function handleSubmit(e) {
        e.preventDefault();
        if (state.loading) return;

        const validator = new Validator();

        validator.validateAll(
            [
                ["type", state.type],
                ["prompt", state.prompt.trim()],
                ["answers", state.answers],
                ["choices", state.choices],
                ["hints", state.hints],
                ["sources", state.sources],
                ["notes", state.notes],
                ["courses", state.courses],
            ].map(([field, value]) => ({ field, value })),
            "quiz",
        );

        validator.validate({ field: "tags", value: state.tags, type: "misc" });
        const perm = validator.validatePermissions(state.permissions);

        if (state.type === "multiple-choice" && state.answer.length < 2) {
            validator.addError({
                field: "answers",
                message: "Must have at least 2 answers",
            });
        }

        if (!validator.isValid) {
            dispatch({ type: "errors", value: validator.errors });

            return addAlert({
                success: false,
                message: "Please fix the errors before submitting",
            });
        }

        dispatch({ type: "loading", value: true });

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_BASEPATH ?? ""}/api/quiz`,
            {
                method: quiz && quiz.id ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: quiz?.id,
                    type: state.type,
                    prompt: state.prompt.trim(),
                    answers: state.answers,
                    choices: state.choices,
                    hints: state.hints,
                    tags: state.tags,
                    // sources: sources.map((src) => ({
                    //     resourceId: quiz ? quiz.id : undefined,
                    //     resourceType: "quiz",
                    //     sourceId: src.id,
                    //     locInSource: "unknown",
                    //     locType: "page",
                    // })),
                    sources: state.sources.map((s) => s.id),
                    notes: notes.map((n) => n.id),
                    courses: courses.map((c) => c.id),
                    permissions: perm,
                }),
            },
        );

        dispatch({ type: "loading", value: false });

        if (response.status === 201) {
            dispatch({ type: "reset" });

            addAlert({
                success: true,
                message: "Successfully created quiz.",
            });
        } else if (response.status === 200) {
            addAlert({
                success: true,
                message: "Successfully updated quiz.",
            });
        } else {
            const data = await response.json();

            dispatch({ type: "errors", value: data.errors });

            addAlert({
                success: false,
                message: data.message,
            });
        }
    }

    return (
        <Form onSubmit={handleSubmit}>
            <Select
                required
                label="Type"
                options={types}
                value={state.type}
                error={state.errors.type}
                description="The type of quiz question"
                onChange={(value) => dispatch({ type: "type", value })}
            />

            {state.type === "fill-in-the-blank" ? (
                <BlankableInput
                    prompt={state.prompt}
                    answers={state.answers}
                    error={state.errors.prompt}
                    setPrompt={(value) => {
                        dispatch({ type: "prompt", value });
                        dispatch({ type: "errors", value: { prompt: "" } });
                    }}
                    setAnswers={(value) => {
                        dispatch({ type: "answers", value });
                        dispatch({ type: "errors", value: { answers: "" } });
                    }}
                />
            ) : (
                <Input
                    required
                    label="Prompt"
                    value={state.prompt}
                    error={state.errors.prompt}
                    placeholder="What is the capital of France?"
                    maxLength={validation.quiz.prompt.maxLength}
                    type={state.type === "verbatim" ? "textarea" : "text"}
                    description="Question prompt. Can be a question or statement"
                    onChange={(e) => {
                        dispatch({ type: "prompt", value: e.target.value });
                        dispatch({ type: "errors", value: { prompt: "" } });
                    }}
                />
            )}

            {state.type === "multiple-choice" && (
                <Input
                    required
                    multiple
                    label="Choices"
                    data={state.choices}
                    value={state.choice}
                    placeholder="Marseille"
                    error={state.errors.choices}
                    maxLength={validation.quiz.choice.maxLength}
                    description="Enter a choice and press enter"
                    removeItem={(item) => {
                        dispatch({ type: "removeChoice", value: item });
                    }}
                    addItem={(item) => {
                        dispatch({ type: "addChoice", value: item });
                        dispatch({ type: "choice", value: "" });
                    }}
                    onChange={(e) => {
                        dispatch({ type: "choice", value: e.target.value });
                        dispatch({ type: "errors", value: { choices: "" } });
                    }}
                />
            )}

            {state.type !== "fill-in-the-blank" && (
                <Input
                    multiple
                    notObject
                    label="Answers"
                    placeholder={
                        state.type === "multiple-choice"
                            ? "Select answers"
                            : "Paris"
                    }
                    data={state.answers}
                    value={state.answer}
                    options={state.choices}
                    error={state.errors.answers}
                    setter={(value) => dispatch({ type: "answers", value })}
                    description={
                        state.type === "multiple-choice"
                            ? "Select answers from the choices"
                            : "Enter an answer and press enter"
                    }
                    type={
                        state.type === "multiple-choice"
                            ? "select"
                            : state.type === "verbatim"
                              ? "textarea"
                              : "text"
                    }
                    maxLength={
                        state.type !== "verbatim"
                            ? validation.quiz.choice
                            : validation.quiz.prompt
                    }
                    removeItem={(item) => {
                        dispatch({ type: "removeAnswer", value: item });
                    }}
                    addItem={(item) => {
                        dispatch({ type: "addAnswer", value: item });
                        dispatch({ type: "answer", value: "" });
                    }}
                    onChange={(e) => {
                        dispatch({ type: "answer", value: e.target.value });
                        dispatch({ type: "errors", value: { answers: "" } });
                    }}
                />
            )}

            <Select
                multiple
                required
                itemValue="id"
                label="Sources"
                options={sources}
                itemLabel="title"
                data={state.sources}
                placeholder="Select sources"
                error={state.errors.sources}
                description="The sources you used to create this note"
                setter={(value) => {
                    dispatch({ type: "sources", value });
                    dispatch({ type: "errors", value: { sources: "" } });
                }}
            />

            <Select
                multiple
                label="Notes"
                itemValue="id"
                options={notes}
                itemLabel="title"
                data={state.notes}
                placeholder="Select notes"
                error={state.errors.notes}
                description="The notes this quiz is related to"
                setter={(value) => {
                    dispatch({ type: "notes", value });
                    dispatch({ type: "errors", value: { notes: "" } });
                }}
            />

            <Select
                multiple
                itemValue="id"
                label="Courses"
                itemLabel="name"
                options={courses}
                data={state.courses}
                placeholder="Select courses"
                error={state.errors.courses}
                description="The courses this note is related to"
                setter={(value) => {
                    dispatch({ type: "courses", value });
                    dispatch({ type: "errors", value: { courses: "" } });
                }}
            />

            <Input
                multiple
                label="Hints"
                value={state.hint}
                data={state.hints}
                autoComplete="off"
                error={state.errors.hints}
                placeholder="Enter a hint and press enter"
                maxLength={validation.misc.tag.maxLength}
                description="A hint to help the user answer the question"
                removeItem={(item) => {
                    dispatch({ type: "removeHint", value: item });
                }}
                addItem={(item) => {
                    dispatch({ type: "addHint", value: item });
                    dispatch({ type: "hint", value: "" });
                }}
                onChange={(e) => {
                    dispatch({ type: "hint", value: e.target.value });
                    dispatch({ type: "errors", value: { hints: "" } });
                }}
            />

            <Input
                multiple
                label="Tags"
                value={state.tag}
                data={state.tags}
                autoComplete="off"
                error={state.errors.tags}
                placeholder="Enter a tag and press enter"
                maxLength={validation.misc.tag.maxLength}
                description="A word or phrase that could be used to search for this note"
                removeItem={(item) => {
                    dispatch({ type: "removeTag", value: item });
                }}
                addItem={(item) => {
                    dispatch({ type: "addTag", value: item });
                    dispatch({ type: "tag", value: "" });
                }}
                onChange={(e) => {
                    dispatch({ type: "tag", value: e.target.value });
                    dispatch({ type: "errors", value: { tags: "" } });
                }}
            />

            {canChangePermissions && (
                <Permissions
                    disabled={state.loading}
                    permissions={state.permissions}
                    error={state.errors.permissions}
                    setPermissions={(value) => {
                        dispatch({ type: "permissions", value });
                        dispatch({
                            type: "errors",
                            value: { permissions: "" },
                        });
                    }}
                />
            )}

            {["fill-in-the-blank", "prompt-response"].includes(state.type) && (
                <div />
            )}

            <button className="button submit primary">
                Submit Quiz {state.loading && <Spinner />}
            </button>

            {isOwner && (
                <DeletePopup resourceType="quiz" resourceId={quiz.id} />
            )}
        </Form>
    );
}

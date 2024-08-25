"use client";

import { useEffect, useState, useRef } from "react";
import makeUniqueId from "@/lib/uniqueId";
import styles from "./Input.module.css";
import inputSize from "@/lib/inputSize";

export function Label({ required, error, errorId, label, htmlFor, checkbox }) {
    return (
        <div
            className={`${styles.labelContainer} ${checkbox && styles.normal}`}
        >
            <label htmlFor={htmlFor}>
                {label} {required && <span>*</span>}
            </label>

            {error && (
                <span id={errorId} aria-live="polite">
                    {error}
                </span>
            )}
        </div>
    );
}

export function Input({
    id,
    type,
    pattern,
    description,
    autoComplete,
    choices,
    required,
    onChange,
    value,
    min,
    max,
    minLength,
    maxLength,
    isCorrect,
    error,
    label,
    onFocus,
    onBlur,
    action,
    onActionTrigger,
    disabled,
    autoFocus,
    outlineColor,
    inline,
    placeholder,
}) {
    const [inputId, setInputId] = useState("");
    const [errorId, setErrorId] = useState("");
    const [open, setOpen] = useState(false);

    const container = useRef(null);
    const firstElement = useRef(null);

    useEffect(() => {
        if (!id && !label) return;
        setInputId(`${id ?? label.split(" ").join("_")}-${makeUniqueId()}`);
        setErrorId(`${inputId}-error`);
    }, []);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape") setOpen(false);
        };

        const handleKeyDown = (e) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                const next = e.target.nextSibling;
                if (next) next.focus();
            }

            if (e.key === "ArrowUp") {
                e.preventDefault();
                const prev = e.target.previousSibling;
                if (prev) prev.focus();
            }
        };

        const handleClickOutside = (e) => {
            if (!container.current.contains(e.target)) setOpen(false);
        };

        if (open) {
            firstElement.current.focus();
            document.addEventListener("keydown", handleEscape);
            document.addEventListener("keydown", handleKeyDown);
            document.addEventListener("click", handleClickOutside);
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("click", handleClickOutside);
        };
    }, [open]);

    let status = "";
    if (isCorrect === true) {
        status = styles.correct;
    } else if (isCorrect === false) {
        status = styles.incorrect;
    }

    if (type === "checkbox" && typeof value === "boolean")
        return (
            <div
                className={`${styles.inlineContainer} ${
                    disabled && styles.disabled
                }`}
                onClick={
                    type === "checkbox" && !disabled ? onChange : undefined
                }
            >
                {label && (
                    <Label
                        label={label}
                        error={error}
                        errorId={errorId}
                        htmlFor={inputId}
                        required={required}
                        checkbox={true}
                    />
                )}

                <div
                    className={styles.checkbox}
                    style={{
                        backgroundColor: value
                            ? "var(--accent-3-light)"
                            : "var(--bg-3)",
                    }}
                >
                    <svg
                        viewBox="0 0 28 20"
                        preserveAspectRatio="xMinYMid meet"
                        aria-hidden="true"
                        style={{ left: value ? "12px" : "-3px" }}
                        className="base"
                    >
                        <rect
                            className="base"
                            fill="white"
                            x="4"
                            y="0"
                            height="20"
                            width="20"
                            rx="10"
                        />

                        {value ? (
                            <svg
                                viewBox="0 0 20 20"
                                fill="none"
                                className="base"
                            >
                                <path
                                    className="base"
                                    fill="rgba(35, 165, 90, 1)"
                                    d="M7.89561 14.8538L6.30462 13.2629L14.3099 5.25755L15.9009 6.84854L7.89561 14.8538Z"
                                />
                                <path
                                    className="base"
                                    fill="rgba(35, 165, 90, 1)"
                                    d="M4.08643 11.0903L5.67742 9.49929L9.4485 13.2704L7.85751 14.8614L4.08643 11.0903Z"
                                />
                            </svg>
                        ) : (
                            <svg
                                viewBox="0 0 20 20"
                                fill="none"
                                className="base"
                            >
                                <path
                                    className="base"
                                    fill="rgba(128, 132, 142, 1)"
                                    d="M5.13231 6.72963L6.7233 5.13864L14.855 13.2704L13.264 14.8614L5.13231 6.72963Z"
                                />
                                <path
                                    className="base"
                                    fill="rgba(128, 132, 142, 1)"
                                    d="M13.2704 5.13864L14.8614 6.72963L6.72963 14.8614L5.13864 13.2704L13.2704 5.13864Z"
                                />
                            </svg>
                        )}
                    </svg>

                    <input
                        className={status}
                        type="checkbox"
                        id={inputId}
                        pattern={pattern}
                        min={min}
                        max={max}
                        autoCapitalize="none"
                        autoFocus={autoFocus ? true : false}
                        autoComplete={autoComplete || "off"}
                        aria-describedby={description}
                        aria-required={error ? error : ""}
                        aria-disabled={disabled}
                        aria-invalid={error ? "true" : "false"}
                        aria-errormessage={error ? errorId : ""}
                        required={required}
                        disabled={disabled}
                        onChange={onChange}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        checked={value}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && action) onActionTrigger(e);
                        }}
                    />
                </div>
            </div>
        );

    return (
        <div
            className={`${styles.container} ${inline ? styles.inline : ""}`}
            style={{
                opacity: disabled ? "0.3" : "",
                cursor: disabled ? "not-allowed" : "",
            }}
        >
            {label && (
                <Label
                    label={label}
                    error={error}
                    errorId={errorId}
                    htmlFor={inputId}
                    required={required}
                />
            )}

            <div
                ref={container}
                className={styles.inputContainer}
                style={{ pointerEvents: disabled ? "none" : "" }}
            >
                {type === "select" && choices?.length > 0 && (
                    <select
                        id={inputId}
                        autoFocus={autoFocus ? true : false}
                        autoComplete={autoComplete || "off"}
                        aria-describedby={description}
                        aria-required={error ? error : ""}
                        aria-disabled={disabled}
                        aria-invalid={error ? "true" : "false"}
                        aria-errormessage={error ? errorId : ""}
                        className={`thinScroller ${status}`}
                        required={required}
                        onChange={onChange}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        value={value || ""}
                        minLength={minLength}
                        maxLength={maxLength}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && action) onActionTrigger(e);
                        }}
                    >
                        {choices.map((choice) => (
                            <option
                                key={choice.key ?? choice.label}
                                value={choice.value}
                            >
                                {choice.label}
                            </option>
                        ))}
                    </select>
                )}

                {type === "textarea" && (
                    <textarea
                        id={inputId}
                        placeholder={placeholder}
                        autoCapitalize="sentences"
                        autoFocus={autoFocus ? true : false}
                        autoComplete={autoComplete || "off"}
                        aria-describedby={description}
                        aria-required={error ? error : ""}
                        aria-disabled={disabled}
                        aria-invalid={error ? "true" : "false"}
                        aria-errormessage={error ? errorId : ""}
                        className={`thinScroller ${status}`}
                        required={required}
                        onChange={onChange}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        value={value || ""}
                        minLength={minLength}
                        maxLength={maxLength}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && action) onActionTrigger(e);
                        }}
                    />
                )}

                {type === "checkbox" && (
                    <input
                        type="checkbox"
                        id={inputId}
                        pattern={pattern}
                        min={min}
                        max={max}
                        placeholder={placeholder}
                        autoCapitalize="none"
                        className={status}
                        autoFocus={autoFocus ? true : false}
                        autoComplete={autoComplete || "off"}
                        aria-describedby={description}
                        aria-required={error ? error : ""}
                        aria-disabled={disabled}
                        aria-invalid={error ? "true" : "false"}
                        aria-errormessage={error ? errorId : ""}
                        required={required}
                        disabled={disabled}
                        onChange={onChange}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        checked={
                            value === "on" || value === true ? true : false
                        }
                        minLength={minLength}
                        maxLength={maxLength}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && action) onActionTrigger(e);
                        }}
                    />
                )}

                {type === "datalist" && (
                    <input
                        id={inputId}
                        list={`${inputId}_list`}
                        placeholder={placeholder}
                        autoFocus={autoFocus ? true : false}
                        autoComplete={autoComplete || "off"}
                        aria-describedby={description}
                        aria-required={error ? error : ""}
                        aria-disabled={disabled}
                        aria-invalid={error ? "true" : "false"}
                        aria-errormessage={error ? errorId : ""}
                        className={`thinScroller ${status}`}
                        required={required}
                        onChange={onChange}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        value={value || ""}
                        minLength={minLength}
                        maxLength={maxLength}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && action) onActionTrigger(e);
                        }}
                    />
                )}

                {type === "datalist" && choices?.length > 0 && (
                    <datalist id={`${inputId}_list`}>
                        {choices.map((choice, index) => {
                            let key, label, value;
                            if (typeof choice === "string") {
                                key = choice + index;
                                label = choice;
                                value = choice;
                            } else {
                                key = choice.key ?? choice.label;
                                label = choice.label;
                                value = choice.value;
                            }
                            return (
                                <option key={key} value={value}>
                                    {label}
                                </option>
                            );
                        })}
                    </datalist>
                )}

                {!["select", "checkbox", "textarea", "datalist"].includes(
                    type,
                ) && (
                    <input
                        id={inputId}
                        pattern={pattern}
                        min={min}
                        max={max}
                        autoCapitalize="none"
                        className={status}
                        placeholder={placeholder}
                        autoFocus={autoFocus ? true : false}
                        autoComplete={autoComplete || "off"}
                        aria-describedby={description}
                        aria-required={error ? error : ""}
                        aria-disabled={disabled}
                        aria-invalid={error ? "true" : "false"}
                        aria-errormessage={error ? errorId : ""}
                        type={type || "text"}
                        size={inline ? inputSize(String(value)) : undefined}
                        required={required}
                        onChange={onChange}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        value={value || ""}
                        minLength={minLength}
                        maxLength={maxLength}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && onActionTrigger) {
                                onActionTrigger(e);
                            }
                        }}
                        style={{
                            paddingRight: action ? "44px" : "",
                            outlineColor: outlineColor || "",
                        }}
                    />
                )}

                {action && (
                    <button
                        type="button"
                        title={action}
                        tabIndex={-1}
                        className={styles.actionButton}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onActionTrigger(e);
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                        >
                            <path d="M12 5l0 14" />
                            <path d="M5 12l14 0" />
                        </svg>
                    </button>
                )}
            </div>

            {maxLength > 0 && (
                <div className={styles.count}>
                    {value.length}/{maxLength}
                </div>
            )}
        </div>
    );
}

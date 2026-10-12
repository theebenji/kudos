"use client";

import { clsx } from "clsx";
import { type ComponentPropsWithRef, type ReactNode, useId } from "react";
import styles from "./Field.module.css";

type FieldChrome = {
  label: string;
  /** Hint shown under the label and linked with `aria-describedby`. */
  description?: ReactNode;
  /** Error message; marks the control `aria-invalid` and links it. */
  error?: string | null;
  /** Visually hide the label (it stays the accessible name). */
  hideLabel?: boolean;
};

function useFieldIds(id: string | undefined) {
  const generated = useId();
  const controlId = id ?? generated;
  return {
    controlId,
    descriptionId: `${controlId}-description`,
    errorId: `${controlId}-error`,
    counterId: `${controlId}-counter`,
  };
}

function describedBy(...ids: (string | false | undefined)[]) {
  return ids.filter(Boolean).join(" ") || undefined;
}

function FieldFrame({
  label,
  description,
  error,
  hideLabel,
  ids,
  counter,
  children,
}: FieldChrome & {
  ids: ReturnType<typeof useFieldIds>;
  counter?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <div className={styles.header}>
        <label htmlFor={ids.controlId} className={clsx(styles.label, hideLabel && styles.hidden)}>
          {label}
        </label>
        {counter}
      </div>
      {description && (
        <p id={ids.descriptionId} className={styles.description}>
          {description}
        </p>
      )}
      {children}
      {error && (
        <p id={ids.errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export type TextFieldProps = Omit<ComponentPropsWithRef<"input">, "children"> & FieldChrome;

export function TextField({
  label,
  description,
  error,
  hideLabel,
  id,
  className,
  ...props
}: TextFieldProps) {
  const ids = useFieldIds(id);
  return (
    <FieldFrame {...{ label, description, error, hideLabel, ids }}>
      <input
        id={ids.controlId}
        className={clsx(styles.control, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(
          description !== undefined && ids.descriptionId,
          !!error && ids.errorId,
        )}
        {...props}
      />
    </FieldFrame>
  );
}

export type TextAreaProps = Omit<ComponentPropsWithRef<"textarea">, "children"> &
  FieldChrome & {
    /** Shows a "12 / 280" counter when `maxLength` is set and `value` is controlled. */
    showCount?: boolean;
  };

export function TextArea({
  label,
  description,
  error,
  hideLabel,
  showCount = true,
  id,
  className,
  maxLength,
  value,
  ...props
}: TextAreaProps) {
  const ids = useFieldIds(id);
  const length = typeof value === "string" ? value.length : undefined;
  const counter =
    showCount && maxLength !== undefined && length !== undefined ? (
      <span
        id={ids.counterId}
        className={clsx(styles.counter, length >= maxLength && styles.counterFull)}
      >
        {`${length} / ${maxLength}`}
      </span>
    ) : undefined;
  return (
    <FieldFrame {...{ label, description, error, hideLabel, ids, counter }}>
      <textarea
        id={ids.controlId}
        className={clsx(styles.control, styles.textarea, className)}
        maxLength={maxLength}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(
          description !== undefined && ids.descriptionId,
          !!counter && ids.counterId,
          !!error && ids.errorId,
        )}
        {...props}
      />
    </FieldFrame>
  );
}

export type SelectFieldProps = Omit<ComponentPropsWithRef<"select">, "children"> &
  FieldChrome & {
    options: { value: string; label: string }[];
    /** Optional first option, e.g. "All values". Its value is "". */
    placeholder?: string;
  };

/** Native select: the most robust accessible choice for short lists (keyboard, screen readers, mobile). */
export function SelectField({
  label,
  description,
  error,
  hideLabel,
  id,
  className,
  options,
  placeholder,
  ...props
}: SelectFieldProps) {
  const ids = useFieldIds(id);
  return (
    <FieldFrame {...{ label, description, error, hideLabel, ids }}>
      <select
        id={ids.controlId}
        className={clsx(styles.control, styles.select, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(
          description !== undefined && ids.descriptionId,
          !!error && ids.errorId,
        )}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

export type CheckboxFieldProps = Omit<ComponentPropsWithRef<"input">, "type" | "children"> & {
  label: string;
  description?: ReactNode;
};

export function CheckboxField({ label, description, id, className, ...props }: CheckboxFieldProps) {
  const ids = useFieldIds(id);
  return (
    <div className={styles.checkboxField}>
      <input
        id={ids.controlId}
        type="checkbox"
        className={clsx(styles.checkbox, className)}
        aria-describedby={description !== undefined ? ids.descriptionId : undefined}
        {...props}
      />
      <label htmlFor={ids.controlId} className={styles.label}>
        {label}
      </label>
      {description && (
        <p id={ids.descriptionId} className={styles.checkboxDescription}>
          {description}
        </p>
      )}
    </div>
  );
}

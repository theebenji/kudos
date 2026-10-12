import { builder } from "./builder";

// Domain errors returned as data in mutation result unions (errors plugin).
// Auth failures stay top-level GraphQL errors (UNAUTHENTICATED / FORBIDDEN-style messages from scope auth).

export type FieldError = { path: string; message: string };

export class ValidationError extends Error {
  readonly fieldErrors: FieldError[];

  constructor(fieldErrors: FieldError[], message = "Some fields are invalid") {
    super(message);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** The viewer may see the thing but not change it (e.g. editing someone else's kudo). */
export class ForbiddenError extends Error {
  constructor(message = "You can't do that") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const ErrorInterface = builder.interfaceRef<Error>("Error").implement({
  fields: (t) => ({ message: t.exposeString("message") }),
});

const FieldErrorRef = builder.objectRef<FieldError>("FieldError").implement({
  fields: (t) => ({
    path: t.exposeString("path", { description: "Input field the error refers to, e.g. `name`" }),
    message: t.exposeString("message"),
  }),
});

builder.objectType(ValidationError, {
  name: "ValidationError",
  interfaces: [ErrorInterface],
  isTypeOf: (value) => value instanceof ValidationError,
  fields: (t) => ({
    fieldErrors: t.field({ type: [FieldErrorRef], resolve: (error) => error.fieldErrors }),
  }),
});

builder.objectType(ConflictError, {
  name: "ConflictError",
  interfaces: [ErrorInterface],
  isTypeOf: (value) => value instanceof ConflictError,
});

builder.objectType(NotFoundError, {
  name: "NotFoundError",
  interfaces: [ErrorInterface],
  isTypeOf: (value) => value instanceof NotFoundError,
});

builder.objectType(ForbiddenError, {
  name: "ForbiddenError",
  interfaces: [ErrorInterface],
  isTypeOf: (value) => value instanceof ForbiddenError,
});

builder.objectType(RateLimitError, {
  name: "RateLimitError",
  interfaces: [ErrorInterface],
  isTypeOf: (value) => value instanceof RateLimitError,
  fields: (t) => ({ retryAfterSeconds: t.exposeInt("retryAfterSeconds") }),
});

/** Postgres unique-violation, whether thrown by pg directly or wrapped by Drizzle. */
export function isUniqueViolation(error: unknown): boolean {
  const code = (e: unknown) => (e && typeof e === "object" && "code" in e ? e.code : undefined);
  return (
    code(error) === "23505" ||
    (error instanceof Error && code((error as Error & { cause?: unknown }).cause) === "23505")
  );
}

/** Converts a zod error into our field-level ValidationError. */
export function toValidationError(issues: { path: PropertyKey[]; message: string }[]) {
  return new ValidationError(
    issues.map((issue) => ({ path: issue.path.map(String).join("."), message: issue.message })),
  );
}

import type { JobPayload } from "../../types/job";

const supportedJobTypes = ["demo", "email"] as const;

export type CreateJobRequest = {
  type: string;
  payload: JobPayload;
};

export type ValidationResult =
  | { ok: true; data: CreateJobRequest }
  | { ok: false; message: string };

export function validateCreateJobRequest(
  body?: string | null,
): ValidationResult {
  if (!body) {
    return {
      ok: false,
      message: "Request body is required and must be a JSON object",
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch {
    return {
      ok: false,
      message: "Request body is required and must be a JSON object",
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      message: "Request body is required and must be a JSON object",
    };
  }

  const request = parsed as { type?: unknown; payload?: unknown };

  if (typeof request.type !== "string" || request.type.trim() === "") {
    return {
      ok: false,
      message: "Request body must include a non-empty type and a payload object",
    };
  }

  if (
    !request.payload ||
    typeof request.payload !== "object" ||
    Array.isArray(request.payload)
  ) {
    return {
      ok: false,
      message: "Request body must include a non-empty type and a payload object",
    };
  }

  const normalizedType = request.type.trim();
  const payload = request.payload as JobPayload;

  if (
    !supportedJobTypes.includes(
      normalizedType as (typeof supportedJobTypes)[number],
    )
  ) {
    return {
      ok: false,
      message: `Unsupported job type: ${normalizedType}`,
    };
  }

  if (Object.keys(payload).length === 0) {
    return {
      ok: false,
      message: "Payload cannot be an empty object",
    };
  }

  if (normalizedType === "email") {
    const { to, subject, body } = payload;

    if (
      typeof to !== "string" ||
      to.trim() === "" ||
      typeof subject !== "string" ||
      subject.trim() === "" ||
      typeof body !== "string" ||
      body.trim() === ""
    ) {
      return {
        ok: false,
        message: "Email jobs require non-empty to, subject, and body fields",
      };
    }
  }

  return {
    ok: true,
    data: {
      type: normalizedType,
      payload,
    },
  };
}
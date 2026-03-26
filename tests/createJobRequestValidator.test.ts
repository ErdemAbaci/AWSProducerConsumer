import { describe, expect, it } from "vitest";
import { validateCreateJobRequest } from "../src/services/jobValidation/createJobRequestValidator";

describe("validateCreateJobRequest", () => {
  it("should fail when body is missing", () => {
    const result = validateCreateJobRequest();

    expect(result).toEqual({
      ok: false,
      message: "Request body is required and must be a JSON object",
    });
  });

  it("should fail when body is invalid JSON", () => {
    const result = validateCreateJobRequest('{"type":"demo"');

    expect(result).toEqual({
      ok: false,
      message: "Request body is required and must be a JSON object",
    });
  });

  it("should fail when body is not an object", () => {
    const result = validateCreateJobRequest(JSON.stringify(["not-an-object"]));

    expect(result).toEqual({
      ok: false,
      message: "Request body is required and must be a JSON object",
    });
  });

  it("should fail when type is missing", () => {
    const result = validateCreateJobRequest(
      JSON.stringify({
        payload: {
          task: "demo-task",
        },
      }),
    );

    expect(result).toEqual({
      ok: false,
      message: "Request body must include a non-empty type and a payload object",
    });
  });

  it("should fail when payload is missing", () => {
    const result = validateCreateJobRequest(
      JSON.stringify({
        type: "demo",
      }),
    );

    expect(result).toEqual({
      ok: false,
      message: "Request body must include a non-empty type and a payload object",
    });
  });

  it("should fail when job type is unsupported", () => {
    const result = validateCreateJobRequest(
      JSON.stringify({
        type: "sms",
        payload: {
          phone: "+905551112233",
        },
      }),
    );

    expect(result).toEqual({
      ok: false,
      message: "Unsupported job type: sms",
    });
  });

  it("should fail when payload is an empty object", () => {
    const result = validateCreateJobRequest(
      JSON.stringify({
        type: "demo",
        payload: {},
      }),
    );

    expect(result).toEqual({
      ok: false,
      message: "Payload cannot be an empty object",
    });
  });

  it("should fail when email payload is invalid", () => {
    const result = validateCreateJobRequest(
      JSON.stringify({
        type: "email",
        payload: {
          to: "",
          subject: "Welcome",
          body: "Hello",
        },
      }),
    );

    expect(result).toEqual({
      ok: false,
      message: "Email jobs require non-empty to, subject, and body fields",
    });
  });

  it("should pass for a valid demo request", () => {
    const result = validateCreateJobRequest(
      JSON.stringify({
        type: "demo",
        payload: {
          task: "demo-task",
        },
      }),
    );

    expect(result).toEqual({
      ok: true,
      data: {
        type: "demo",
        payload: {
          task: "demo-task",
        },
      },
    });
  });

  it("should pass for a valid email request", () => {
    const result = validateCreateJobRequest(
      JSON.stringify({
        type: "email",
        payload: {
          to: "test@example.com",
          subject: "Welcome",
          body: "Hello there",
        },
      }),
    );

    expect(result).toEqual({
      ok: true,
      data: {
        type: "email",
        payload: {
          to: "test@example.com",
          subject: "Welcome",
          body: "Hello there",
        },
      },
    });
  });
});
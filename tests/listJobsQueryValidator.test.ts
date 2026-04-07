import { describe, expect, it } from "vitest";

import { validateListJobsQuery } from "../src/services/jobValidation/listJobsQueryValidator";

describe("validateListJobsQuery", () => {
  it("should fail when limit is not a positive integer", () => {
    const result = validateListJobsQuery({
      limit: "0",
    });

    expect(result).toEqual({
      ok: false,
      message: "limit must be a positive integer",
    });
  });

  it("should fail when cursor is not valid encoded JSON", () => {
    const result = validateListJobsQuery({
      cursor: "%7Bbad-json",
    });

    expect(result).toEqual({
      ok: false,
      message: "cursor must be a valid encoded JSON object",
    });
  });

  it("should fail when sort order is invalid", () => {
    const result = validateListJobsQuery({
      sortOrder: "newest",
    });

    expect(result).toEqual({
      ok: false,
      message: "sortOrder must be either 'asc' or 'desc'",
    });
  });

  it("should fail when status is invalid", () => {
    const result = validateListJobsQuery({
      status: "queued",
    });

    expect(result).toEqual({
      ok: false,
      message: "status must be one of: pending, processing, completed, failed",
    });
  });

  it("should parse valid filters, limit, cursor, and sort order", () => {
    const result = validateListJobsQuery({
      status: "completed",
      type: "email",
      limit: "10",
      cursor: encodeURIComponent(JSON.stringify({ id: "job-10" })),
      sortOrder: "desc",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        filters: {
          status: "completed",
          type: "email",
        },
        limit: 10,
        cursor: {
          id: "job-10",
        },
        sortOrder: "desc",
      },
    });
  });
});

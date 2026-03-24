import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/repositories/jobRepository", () => ({
  jobRepository: {
    getById: vi.fn(),
  },
}));

import { handler } from "../src/handlers/getJob";
import { jobRepository } from "../src/repositories/jobRepository";
import type { Job } from "../src/types/job";

function parseBody(response: { body: string }) {
  return JSON.parse(response.body);
}

function buildJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-123",
    type: "demo",
    status: "pending",
    payload: {
      input: "value",
    },
    attemptCount: 0,
    createdAt: "2026-03-24T10:00:00.000Z",
    updatedAt: "2026-03-24T10:00:00.000Z",
    ...overrides,
  };
}

describe("getJob handler", () => {
  const getByIdMock = vi.mocked(jobRepository.getById);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when id is missing", async () => {
    const response = await handler({});

    expect(response.statusCode).toBe(400);
    expect(parseBody(response)).toEqual({
      message: "Job id is required",
    });
  });

  it("should return 404 when job is not found", async () => {
    getByIdMock.mockResolvedValue(undefined);

    const response = await handler({
      pathParameters: {
        id: "job-123",
      },
    });

    expect(getByIdMock).toHaveBeenCalledWith("job-123");
    expect(response.statusCode).toBe(404);
    expect(parseBody(response)).toEqual({
      message: "Job not found",
    });
  });

  it("should return 200 when job exists", async () => {
    getByIdMock.mockResolvedValue(
      buildJob({
        status: "completed",
        attemptCount: 1,
        result: {
          output: "done",
        },
      }),
    );

    const response = await handler({
      pathParameters: {
        id: "job-123",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual({
      id: "job-123",
      type: "demo",
      status: "completed",
      attemptCount: 1,
      createdAt: "2026-03-24T10:00:00.000Z",
      updatedAt: "2026-03-24T10:00:00.000Z",
      result: {
        output: "done",
      },
      error: undefined,
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/repositories/jobRepository", () => ({
  jobRepository: {
    listJobs: vi.fn(),
  },
}));

import { handler } from "../src/handlers/listJobs";
import { jobRepository } from "../src/repositories/jobRepository";
import type { Job } from "../src/types/job";

function parseBody(response: { body: string }) {
  return JSON.parse(response.body);
}

function buildJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-123",
    ownerId: "user-123",
    type: "demo",
    status: "pending",
    payload: {
      task: "demo-task",
    },
    attemptCount: 0,
    createdAt: "2026-04-07T09:00:00.000Z",
    updatedAt: "2026-04-07T09:00:00.000Z",
    history: [
      {
        eventType: "status_change",
        status: "pending",
        timestamp: "2026-04-07T09:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function buildAuthenticatedEvent(queryStringParameters?: {
  status?: string;
  type?: string;
  limit?: string;
  cursor?: string;
  sortOrder?: string;
}) {
  return {
    queryStringParameters,
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: "user-123",
          },
        },
      },
    },
  };
}

describe("listJobs handler", () => {
  const listJobsMock = vi.mocked(jobRepository.listJobs);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when authentication is missing", async () => {
    const response = await handler({});

    expect(response.statusCode).toBe(401);
    expect(parseBody(response)).toEqual({
      message: "Authentication required",
    });
  });

  it("should return 400 when query is invalid", async () => {
    const response = await handler(
      buildAuthenticatedEvent({
        limit: "0",
      }),
    );

    expect(response.statusCode).toBe(400);
    expect(parseBody(response)).toEqual({
      message: "limit must be a positive integer",
    });
  });

  it("should return 200 with mapped jobs and encoded next cursor", async () => {
    listJobsMock.mockResolvedValue({
      items: [
        buildJob({
          id: "job-1",
          status: "completed",
          result: {
            message: "done",
          },
        }),
      ],
      nextCursor: {
        id: "job-1",
      },
    });

    const response = await handler(
      buildAuthenticatedEvent({
        status: "completed",
        type: "demo",
        limit: "5",
        cursor: encodeURIComponent(JSON.stringify({ id: "job-0" })),
        sortOrder: "asc",
      }),
    );

    expect(listJobsMock).toHaveBeenCalledWith(
      {
        status: "completed",
        type: "demo",
        ownerId: "user-123",
      },
      5,
      {
        id: "job-0",
      },
      "asc",
    );
    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual({
      items: [
        {
          id: "job-1",
          type: "demo",
          status: "completed",
          attemptCount: 0,
          createdAt: "2026-04-07T09:00:00.000Z",
          updatedAt: "2026-04-07T09:00:00.000Z",
          history: [
            {
              eventType: "status_change",
              status: "pending",
              timestamp: "2026-04-07T09:00:00.000Z",
            },
          ],
          result: {
            message: "done",
          },
          error: undefined,
        },
      ],
      nextCursor: encodeURIComponent(JSON.stringify({ id: "job-1" })),
    });
  });
});

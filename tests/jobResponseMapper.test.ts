import { describe, expect, it } from "vitest";
import { toJobResponse } from "../src/mappers/jobResponseMapper";
import type { Job } from "../src/types/job";

describe("toJobResponse", () => {
  it("should map job fields including history", () => {
    const job: Job = {
      id: "job-123",
      type: "email",
      status: "failed",
      attemptCount: 2,
      payload: {
        to: "test@example.com",
        subject: "Welcome",
        body: "Hello there",
      },
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:05:00.000Z",
      history: [
        {
          eventType: "status_change",
          status: "pending",
          timestamp: "2026-01-01T10:00:00.000Z",
        },
        {
          eventType: "status_change",
          status: "processing",
          timestamp: "2026-01-01T10:01:00.000Z",
          metadata: {
            attemptIncrementBy: 1,
          },
        },
        {
          eventType: "status_change",
          status: "failed",
          timestamp: "2026-01-01T10:05:00.000Z",
          message: "Invalid email payload",
          metadata: {
            jobType: "email",
          },
        },
      ],
      error: "Invalid email payload",
    };

    expect(toJobResponse(job)).toEqual({
      id: "job-123",
      type: "email",
      status: "failed",
      attemptCount: 2,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:05:00.000Z",
      history: [
        {
          eventType: "status_change",
          status: "pending",
          timestamp: "2026-01-01T10:00:00.000Z",
        },
        {
          eventType: "status_change",
          status: "processing",
          timestamp: "2026-01-01T10:01:00.000Z",
          metadata: {
            attemptIncrementBy: 1,
          },
        },
        {
          eventType: "status_change",
          status: "failed",
          timestamp: "2026-01-01T10:05:00.000Z",
          message: "Invalid email payload",
          metadata: {
            jobType: "email",
          },
        },
      ],
      result: undefined,
      error: "Invalid email payload",
    });
  });

  it("should include result when job is completed", () => {
    const job: Job = {
      id: "job-456",
      type: "demo",
      status: "completed",
      attemptCount: 1,
      payload: {
        task: "run-demo",
      },
      createdAt: "2026-01-02T09:00:00.000Z",
      updatedAt: "2026-01-02T09:01:00.000Z",
      history: [
        {
          eventType: "status_change",
          status: "pending",
          timestamp: "2026-01-02T09:00:00.000Z",
        },
        {
          eventType: "status_change",
          status: "processing",
          timestamp: "2026-01-02T09:00:30.000Z",
          metadata: {
            attemptIncrementBy: 1,
          },
        },
        {
          eventType: "status_change",
          status: "completed",
          timestamp: "2026-01-02T09:01:00.000Z",
          message: "Job processed successfully",
          metadata: {
            jobType: "demo",
          },
        },
      ],
      result: {
        message: "Job processed successfully",
        processedAt: "2026-01-02T09:01:00.000Z",
        executionId: "exec-123",
      },
    };

    expect(toJobResponse(job)).toEqual({
      id: "job-456",
      type: "demo",
      status: "completed",
      attemptCount: 1,
      createdAt: "2026-01-02T09:00:00.000Z",
      updatedAt: "2026-01-02T09:01:00.000Z",
      history: [
        {
          eventType: "status_change",
          status: "pending",
          timestamp: "2026-01-02T09:00:00.000Z",
        },
        {
          eventType: "status_change",
          status: "processing",
          timestamp: "2026-01-02T09:00:30.000Z",
          metadata: {
            attemptIncrementBy: 1,
          },
        },
        {
          eventType: "status_change",
          status: "completed",
          timestamp: "2026-01-02T09:01:00.000Z",
          message: "Job processed successfully",
          metadata: {
            jobType: "demo",
          },
        },
      ],
      result: {
        message: "Job processed successfully",
        processedAt: "2026-01-02T09:01:00.000Z",
        executionId: "exec-123",
      },
      error: undefined,
    });
  });
});
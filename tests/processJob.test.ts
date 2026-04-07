import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/repositories/jobRepository", () => ({
  jobRepository: {
    claimJobIfPending: vi.fn(),
    markAsCompleted: vi.fn(),
    markAsFailed: vi.fn(),
  },
}));

vi.mock("../src/services/email/emailService", () => ({
  emailService: {
    sendEmail: vi.fn(),
  },
}));

vi.mock("../src/services/events/jobEventsPublisher", () => ({
  jobEventsPublisher: {
    publish: vi.fn(),
  },
}));

import { handler } from "../src/handlers/processJob";
import { jobRepository } from "../src/repositories/jobRepository";
import { emailService } from "../src/services/email/emailService";
import { jobEventsPublisher } from "../src/services/events/jobEventsPublisher";
import type { Job } from "../src/types/job";

function buildJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-123",
    ownerId: "user-123",
    type: "demo",
    status: "pending",
    payload: {},
    attemptCount: 0,
    createdAt: "2026-03-24T10:00:00.000Z",
    updatedAt: "2026-03-24T10:00:00.000Z",
    history: [
      {
        eventType: "status_change",
        status: "pending",
        timestamp: "2026-03-24T10:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("processJob handler", () => {
  const claimJobIfPendingMock = vi.mocked(jobRepository.claimJobIfPending);
  const markAsCompletedMock = vi.mocked(jobRepository.markAsCompleted);
  const markAsFailedMock = vi.mocked(jobRepository.markAsFailed);
  const sendEmailMock = vi.mocked(emailService.sendEmail);
  const publishMock = vi.mocked(jobEventsPublisher.publish);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    claimJobIfPendingMock.mockResolvedValue(undefined);
    markAsCompletedMock.mockResolvedValue(undefined);
    markAsFailedMock.mockResolvedValue(undefined);
    sendEmailMock.mockResolvedValue({
      messageId: "message-123",
      recipient: "test@example.com",
    });
    publishMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should skip invalid SQS messages", async () => {
    await expect(
      handler({
        Records: [
          {
            body: "not-json",
          },
        ],
      }),
    ).resolves.toBeUndefined();

    expect(claimJobIfPendingMock).not.toHaveBeenCalled();
    expect(markAsCompletedMock).not.toHaveBeenCalled();
    expect(markAsFailedMock).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("should continue when claimJobIfPending returns undefined", async () => {
    claimJobIfPendingMock.mockResolvedValue(undefined);

    await expect(
      handler({
        Records: [
          {
            body: JSON.stringify({
              jobId: "job-123",
            }),
          },
        ],
      }),
    ).resolves.toBeUndefined();

    expect(claimJobIfPendingMock).toHaveBeenCalledWith("job-123");
    expect(markAsCompletedMock).not.toHaveBeenCalled();
    expect(markAsFailedMock).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("should mark job as completed for a valid demo job", async () => {
    claimJobIfPendingMock.mockResolvedValue(
      buildJob({
        id: "job-123",
        type: "demo",
        payload: {
          task: "demo",
        },
      }),
    );

    await expect(
      handler({
        Records: [
          {
            body: JSON.stringify({
              jobId: "job-123",
            }),
          },
        ],
      }),
    ).resolves.toBeUndefined();

    expect(markAsCompletedMock).toHaveBeenCalledTimes(1);
    expect(markAsCompletedMock).toHaveBeenCalledWith(
      "job-123",
      "demo",
      expect.objectContaining({
        message: "Job processed successfully",
        processedAt: expect.any(String),
        executionId: expect.any(String),
      }),
    );
    expect(markAsFailedMock).not.toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "job.completed",
        jobId: "job-123",
        jobType: "demo",
        ownerId: "user-123",
        timestamp: expect.any(String),
        result: expect.objectContaining({
          message: "Job processed successfully",
        }),
      }),
    );
  });

  it("should mark job as failed when payload.shouldFail is true", async () => {
    claimJobIfPendingMock.mockResolvedValue(
      buildJob({
        id: "job-456",
        type: "demo",
        payload: {
          shouldFail: true,
        },
      }),
    );

    await expect(
      handler({
        Records: [
          {
            body: JSON.stringify({
              jobId: "job-456",
            }),
          },
        ],
      }),
    ).rejects.toThrow("Job was asked to fail");

    expect(markAsFailedMock).toHaveBeenCalledTimes(1);
    expect(markAsFailedMock).toHaveBeenCalledWith(
      "job-456",
      "demo",
      "Job was asked to fail",
    );
    expect(markAsCompletedMock).not.toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "job.failed",
        jobId: "job-456",
        jobType: "demo",
        ownerId: "user-123",
        timestamp: expect.any(String),
        error: "Job was asked to fail",
      }),
    );
  });

  it("should mark email jobs as completed when payload is valid", async () => {
    claimJobIfPendingMock.mockResolvedValue(
      buildJob({
        id: "job-789",
        type: "email",
        payload: {
          to: "test@example.com",
          subject: "Welcome",
          body: "Hello there",
        },
      }),
    );

    await expect(
      handler({
        Records: [
          {
            body: JSON.stringify({
              jobId: "job-789",
            }),
          },
        ],
      }),
    ).resolves.toBeUndefined();

    expect(markAsCompletedMock).toHaveBeenCalledTimes(1);
    expect(markAsCompletedMock).toHaveBeenCalledWith(
      "job-789",
      "email",
      expect.objectContaining({
        message: "Email job processed successfully",
        processedAt: expect.any(String),
        messageId: "message-123",
        recipient: "test@example.com",
        subject: "Welcome",
      }),
    );
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith({
      to: "test@example.com",
      subject: "Welcome",
      body: "Hello there",
    });
    expect(markAsFailedMock).not.toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "job.completed",
        jobId: "job-789",
        jobType: "email",
        ownerId: "user-123",
        timestamp: expect.any(String),
        result: expect.objectContaining({
          message: "Email job processed successfully",
          recipient: "test@example.com",
          messageId: "message-123",
        }),
      }),
    );
  });

  it("should mark email jobs as failed when payload is invalid", async () => {
    claimJobIfPendingMock.mockResolvedValue(
      buildJob({
        id: "job-790",
        type: "email",
        payload: {
          to: "",
          subject: "Welcome",
          body: "Hello there",
        },
      }),
    );

    await expect(
      handler({
        Records: [
          {
            body: JSON.stringify({
              jobId: "job-790",
            }),
          },
        ],
      }),
    ).rejects.toThrow("Invalid email payload");

    expect(markAsFailedMock).toHaveBeenCalledTimes(1);
    expect(markAsFailedMock).toHaveBeenCalledWith(
      "job-790",
      "email",
      "Invalid email payload",
    );
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(markAsCompletedMock).not.toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "job.failed",
        jobId: "job-790",
        jobType: "email",
        ownerId: "user-123",
        timestamp: expect.any(String),
        error: "Invalid email payload",
      }),
    );
  });

  it("should fail unsupported job types", async () => {
    claimJobIfPendingMock.mockResolvedValue(
      buildJob({
        id: "job-791",
        type: "sms",
        payload: {
          phone: "+905551112233",
          message: "Hello",
        },
      }),
    );

    await expect(
      handler({
        Records: [
          {
            body: JSON.stringify({
              jobId: "job-791",
            }),
          },
        ],
      }),
    ).rejects.toThrow("Unsupported job type: sms");

    expect(markAsFailedMock).toHaveBeenCalledTimes(1);
    expect(markAsFailedMock).toHaveBeenCalledWith(
      "job-791",
      "sms",
      "Unsupported job type: sms",
    );
    expect(markAsCompletedMock).not.toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "job.failed",
        jobId: "job-791",
        jobType: "sms",
        ownerId: "user-123",
        timestamp: expect.any(String),
        error: "Unsupported job type: sms",
      }),
    );
  });

  it("should process multiple SQS records independently", async () => {
    claimJobIfPendingMock
      .mockResolvedValueOnce(
        buildJob({
          id: "job-111",
          type: "demo",
          payload: {
            task: "first-job",
          },
        }),
      )
      .mockResolvedValueOnce(undefined);

    await expect(
      handler({
        Records: [
          {
            body: JSON.stringify({
              jobId: "job-111",
            }),
          },
          {
            body: "not-json",
          },
          {
            body: JSON.stringify({
              jobId: "job-222",
            }),
          },
        ],
      }),
    ).resolves.toBeUndefined();

    expect(claimJobIfPendingMock).toHaveBeenCalledTimes(2);
    expect(claimJobIfPendingMock).toHaveBeenNthCalledWith(1, "job-111");
    expect(claimJobIfPendingMock).toHaveBeenNthCalledWith(2, "job-222");

    expect(markAsCompletedMock).toHaveBeenCalledTimes(1);
    expect(markAsCompletedMock).toHaveBeenCalledWith(
      "job-111",
      "demo",
      expect.objectContaining({
        message: "Job processed successfully",
        processedAt: expect.any(String),
        executionId: expect.any(String),
      }),
    );

    expect(markAsFailedMock).not.toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "job.completed",
        jobId: "job-111",
      }),
    );
  });
});

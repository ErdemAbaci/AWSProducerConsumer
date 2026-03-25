import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/repositories/jobRepository", () => ({
  jobRepository: {
    save: vi.fn(),
  },
}));

vi.mock("../src/services/queueService", () => ({
  queueService: {
    sendJob: vi.fn(),
  },
}));

import { handler } from "../src/handlers/createJob";
import { jobRepository } from "../src/repositories/jobRepository";
import { queueService } from "../src/services/queueService";

function parseBody(response: { body: string }) {
  return JSON.parse(response.body);
}

describe("createJob handler", () => {
  const validEvent = {
    body: JSON.stringify({
      type: "demo",
      payload: {
        name: "sample-job",
      },
    }),
  };

  const saveMock = vi.mocked(jobRepository.save);
  const sendJobMock = vi.mocked(queueService.sendJob);

  beforeEach(() => {
    vi.clearAllMocks();
    saveMock.mockResolvedValue(undefined);
    sendJobMock.mockResolvedValue(undefined);
  });

  it("should return 400 when body is missing", async () => {
    const response = await handler({});

    expect(response.statusCode).toBe(400);
    expect(parseBody(response)).toEqual({
      message: "Request body is required and must be a JSON object",
    });
  });

  it("should return 400 when body is invalid", async () => {
    const response = await handler({
      body: "{\"type\":\"demo\"",
    });

    expect(response.statusCode).toBe(400);
    expect(parseBody(response)).toEqual({
      message: "Request body is required and must be a JSON object",
    });
  });

  it("should return 202 when request body is valid", async () => {
    const response = await handler(validEvent);

    expect(response.statusCode).toBe(202);
    expect(parseBody(response)).toEqual({
      id: expect.any(String),
      status: "pending",
    });
  });

  it("should call jobRepository.save", async () => {
    await handler(validEvent);

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        type: "demo",
        status: "pending",
        payload: {
          name: "sample-job",
        },
        attemptCount: 0,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );
  });

  it("should call queueService.sendJob", async () => {
    await handler(validEvent);

    const savedJob = saveMock.mock.calls[0]?.[0];

    expect(savedJob).toBeDefined();
    expect(sendJobMock).toHaveBeenCalledTimes(1);
    expect(sendJobMock).toHaveBeenCalledWith({
      jobId: savedJob.id,
    });
  });
  
  it("should return 400 when job type is unsupported", async () => {
  const response = await handler({
    body: JSON.stringify({
      type: "sms",
      payload: {
        phone: "+905551112233",
      },
    }),
  });

  expect(response.statusCode).toBe(400);
  expect(parseBody(response)).toEqual({
    message: "Unsupported job type: sms",
  });
});

  it("should return 400 when payload is an empty object", async () => {
  const response = await handler({
    body: JSON.stringify({
      type: "demo",
      payload: {},
    }),
  });

  expect(response.statusCode).toBe(400);
  expect(parseBody(response)).toEqual({
    message: "Payload cannot be an empty object",
  });
});
});

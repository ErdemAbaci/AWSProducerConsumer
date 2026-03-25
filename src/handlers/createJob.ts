import { randomUUID } from "node:crypto";
import { jobRepository } from "../repositories/jobRepository";
import { queueService } from "../services/queueService";
import { validateCreateJobRequest } from "../services/jobValidation/createJobRequestValidator";
import type { Job } from "../types/job";

type ApiEvent = {
  body?: string | null;
};

type ApiResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

function json(statusCode: number, body: unknown): ApiResponse {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const validation = validateCreateJobRequest(event.body);

  if (!validation.ok) {
    return json(400, { message: validation.message });
  }

  const request = validation.data;

  const now = new Date().toISOString();
  const job: Job = {
    id: randomUUID(),
    type: request.type,
    status: "pending",
    payload: request.payload,
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await jobRepository.save(job);
    await queueService.sendJob({ jobId: job.id });
  } catch (error) {
    console.error("Failed to create job", error);

    return json(500, { message: "Could not create job" });
  }

  return json(202, {
    id: job.id,
    status: job.status,
  });
}

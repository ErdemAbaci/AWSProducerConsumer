import { randomUUID } from "node:crypto";
import { jobRepository } from "../repositories/jobRepository";
import { queueService } from "../services/queueService";
import type { Job, JobPayload } from "../types/job";
// Bu dosya yeni bir iş oluşturmak ve kuyruğa göndermek için kullanılır.
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

function parsePayload(body?: string | null): JobPayload | null {
  if (!body) {
    return null;
  }

  try {
    const parsed = JSON.parse(body);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as JobPayload;
  } catch {
    return null;
  }
}

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const payload = parsePayload(event.body);

  if (payload === null) {
    return json(400, { message: "Request body is required and must be a JSON object" });
  }
  if(Object.keys(payload).length === 0){
    return json(400, { message: "Payload cannot be an empty object" });
  }
  const now = new Date().toISOString();
  const job: Job = {
    id: randomUUID(),
    status: "pending",
    payload,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await jobRepository.save(job); // save job to database
    await queueService.sendJob({ jobId: job.id }); // send job to queue
  } catch (error) {
    console.error("Failed to create job", error);

    return json(500, { message: "Could not create job" });
  }

  return json(202, {id:job.id, status:job.status,});
}

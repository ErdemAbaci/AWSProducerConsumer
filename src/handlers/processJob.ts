import { jobRepository } from "../repositories/jobRepository";
import { randomUUID } from "node:crypto";
import type { Job, JobMessage } from "../types/job";

type SqsEvent = {
  Records: Array<{
    body: string;
  }>;
};

function parseMessage(body: string): JobMessage | null {
  try {
    const parsed = JSON.parse(body);

    if (!parsed || typeof parsed !== "object" || typeof parsed.jobId !== "string") {
      return null;
    }

    return parsed as JobMessage;
  } catch {
    return null;
  }
}

function setJobState(job: Job, status: Job["status"]) {
  job.status = status;
  job.updatedAt = new Date().toISOString();
}

export async function handler(event: SqsEvent): Promise<void> {
  for (const record of event.Records) {
    const message = parseMessage(record.body);

    if (!message) {
      console.error("Skipping invalid SQS message", record.body);
      continue;
    }

    const job = await jobRepository.claimJobIfPending(message.jobId);

    if (!job) {
      console.log(`Job ${message.jobId} is missing or already claimed/processed`);
      continue;
    }

    try {
      delete job.error;
      delete job.result;
      if (job.type !== "demo") {
        throw new Error(`Unsupported job type: ${job.type}`);
      } 
      if (job.payload["shouldFail"] === true) {
        throw new Error("Job was asked to fail");
      }

      setJobState(job, "completed");
      job.result = {
        message: "Job processed successfully",
        processedAt: job.updatedAt,
        executionId: randomUUID(),
      };
      await jobRepository.save(job);
    } catch (error) {
      setJobState(job, "failed");
      job.error = error instanceof Error ? error.message : "Unknown error";
      delete job.result;
      await jobRepository.save(job);
      throw error;
    }
  }
}

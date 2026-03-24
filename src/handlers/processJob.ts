import { jobRepository } from "../repositories/jobRepository";
import { randomUUID } from "node:crypto";
import type { JobMessage } from "../types/job";

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

function processDemoJob(job: { payload: Record<string, unknown> }) {
  if (job.payload["shouldFail"] === true) {
    throw new Error("Job was asked to fail");
  }

  return {
    message: "Job processed successfully",
    processedAt: new Date().toISOString(),
    executionId: randomUUID(),
  };
}

function processEmailJob(job: { payload: Record<string, unknown> }) {
  const { to, subject, body } = job.payload;

  if (
    typeof to !== "string" ||
    to.trim() === "" ||
    typeof subject !== "string" ||
    subject.trim() === "" ||
    typeof body !== "string" ||
    body.trim() === ""
  ) {
    throw new Error("Invalid email payload");
  }

  return {
    message: "Email job processed successfully",
    processedAt: new Date().toISOString(),
    executionId: randomUUID(),
    recipient: to,
    subject,
  };
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
      let result;

      if (job.type === "demo") {
        result = processDemoJob(job);
      } else if (job.type === "email") {
        result = processEmailJob(job);
      } else {
        throw new Error(`Unsupported job type: ${job.type}`);
      }

      await jobRepository.markAsCompleted(job.id, result);
    } catch (error) {
        await jobRepository.markAsFailed(
        job.id,
        error instanceof Error ? error.message : "Unknown error",
      );
      throw error;
    }
  }
}

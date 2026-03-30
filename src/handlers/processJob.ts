import { jobRepository } from "../repositories/jobRepository";
import { processorRegistry } from "../services/jobProcessors/processorRegistry";
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
      const processor = processorRegistry[job.type];

    if (!processor) {
    throw new Error(`Unsupported job type: ${job.type}`);
    }

    const result = await processor(job);

    await jobRepository.markAsCompleted(job.id, job.type, result);
    } catch (error) {
      await jobRepository.markAsFailed(
        job.id,
        job.type,
        error instanceof Error ? error.message : "Unknown error",
      );
      throw error;
    }
  }
}

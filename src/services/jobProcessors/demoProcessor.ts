import { randomUUID } from "node:crypto";
import type { Job } from "../../types/job";

export function processDemoJob(job: Job) {
  if (job.payload["shouldFail"] === true) {
    throw new Error("Job was asked to fail");
  }

  return {
    message: "Job processed successfully",
    processedAt: new Date().toISOString(),
    executionId: randomUUID(),
  };
}
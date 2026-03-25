import { randomUUID } from "node:crypto";
import type { Job } from "../../types/job";

export function processEmailJob(job: Job) {
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
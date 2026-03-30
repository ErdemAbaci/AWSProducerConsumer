import type { Job } from "../../types/job";
import { emailService } from "../email/emailService";

export async function processEmailJob(job: Job) {
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

  const sendResult = await emailService.sendEmail({
    to,
    subject,
    body,
  });

  return {
    message: "Email job processed successfully",
    processedAt: new Date().toISOString(),
    recipient: sendResult.recipient,
    messageId: sendResult.messageId,
    subject,
  };
}
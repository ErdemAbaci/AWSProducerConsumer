import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

import type { JobMessage } from "../types/job";

const sqs = new SQSClient({});

function getQueueUrl() {
  const queueUrl = process.env.JOBS_QUEUE_URL;

  if (!queueUrl) {
    throw new Error("JOBS_QUEUE_URL environment variable is required");
  }

  return queueUrl;
}

export const queueService = {
  async sendJob(message: JobMessage) {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: getQueueUrl(),
        MessageBody: JSON.stringify(message),
      }),
    );
  },
};

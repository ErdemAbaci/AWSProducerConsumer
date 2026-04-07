import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({});

function getTopicArn() {
  const topicArn = process.env.JOB_EVENTS_TOPIC_ARN;

  if (!topicArn) {
    throw new Error("JOB_EVENTS_TOPIC_ARN environment variable is required");
  }

  return topicArn;
}

export const jobEventsPublisher = {
  async publish(event: Record<string, unknown>) {
    await snsClient.send(
      new PublishCommand({
        TopicArn: getTopicArn(),
        Message: JSON.stringify(event),
      }),
    );
  },
};
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type { Job } from "../types/job";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

function getTableName() {
  const tableName = process.env.JOBS_TABLE_NAME;

  if (!tableName) {
    throw new Error("JOBS_TABLE_NAME environment variable is required");
  }

  return tableName;
}

export const jobRepository = {
  async save(job: Job) {
    await dynamoDb.send(
      new PutCommand({
        TableName: getTableName(),
        Item: job,
      }),
    );
  },

  async getById(id: string): Promise<Job | undefined> {
    const response = await dynamoDb.send(
      new GetCommand({
        TableName: getTableName(),
        Key: { id },
      }),
    );

    return response.Item as Job | undefined;
  },

  async claimJobIfPending(id: string): Promise<Job | undefined> {
    try {
      const response = await dynamoDb.send(
        new UpdateCommand({
          TableName: getTableName(),
          Key: { id },
          UpdateExpression: "SET #status = :processing, updatedAt = :updatedAt",
          ConditionExpression: "#status = :pending",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":pending": "pending",
            ":processing": "processing",
            ":updatedAt": new Date().toISOString(),
          },
          ReturnValues: "ALL_NEW",
        }),
      );

      return response.Attributes as Job | undefined;
    } catch (error: any) {
      if (error?.name === "ConditionalCheckFailedException") {
        return undefined;
      }

      throw error;
    }
  },
};
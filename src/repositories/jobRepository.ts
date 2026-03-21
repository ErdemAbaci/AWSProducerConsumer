import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

import type { Job } from "../types/job";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

function getTableName() {
  const tableName = process.env.JOBS_TABLE;

  if (!tableName) {
    throw new Error("JOBS_TABLE environment variable is required");
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
};

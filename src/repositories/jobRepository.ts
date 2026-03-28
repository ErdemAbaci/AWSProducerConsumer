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
          UpdateExpression:"SET #status = :processing, updatedAt = :updatedAt, attemptCount = attemptCount + :increment, #history = list_append(#history, :historyEvent)",
          ConditionExpression: "#status = :pending",
          ExpressionAttributeNames: {
            "#status": "status",
            "#history": "history",
          },
          ExpressionAttributeValues: {
            ":pending": "pending",
            ":processing": "processing",
            ":updatedAt": new Date().toISOString(),
            ":increment": 1,
            ":historyEvent":[
              {
                eventType: "status_change",
                status: "processing",
                timestamp: new Date().toISOString(),
                metadata:{
                  attemptIncrementBy: 1,
                }
              },
            ],
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

    async markAsCompleted(
    id: string,
    jobType:string,
    result: Job["result"],
  ): Promise<Job | undefined> {
    const updatedAt = new Date().toISOString();

    const response = await dynamoDb.send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: { id },
        UpdateExpression:
  "SET #status = :completed, updatedAt = :updatedAt, #result = :result, #history = list_append(#history, :historyEvent) REMOVE #error",
        ExpressionAttributeNames: {
          "#status": "status",
          "#result": "result",
          "#error": "error",
          "#history": "history",
        },
        ExpressionAttributeValues: {
          ":completed": "completed",
          ":updatedAt": updatedAt,
          ":result": result,
          ":historyEvent": [
        {
           eventType: "status_change",
           status: "completed",
           timestamp: updatedAt,
          message:
          typeof result?.message === "string"
          ? result.message
          : "Job completed",
          metadata: {
            jobType,
    },
        },
        ],
        },
        ReturnValues: "ALL_NEW",
      }),
    );

    return response.Attributes as Job | undefined;
  },

  async markAsFailed(id: string, jobType: string, errorMessage: string): Promise<Job | undefined> {
    const updatedAt = new Date().toISOString();

    const response = await dynamoDb.send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: { id },
        UpdateExpression:
  "SET #status = :failed, updatedAt = :updatedAt, #error = :error, #history = list_append(#history, :historyEvent) REMOVE #result",
        ExpressionAttributeNames: {
          "#status": "status",
          "#error": "error",
          "#result": "result",
          "#history": "history",
        },
        ExpressionAttributeValues: {
  ":failed": "failed",
  ":updatedAt": updatedAt,
  ":error": errorMessage,
  ":historyEvent": [
    {
      eventType:"status_change",
      status: "failed",
      timestamp: updatedAt,
      message: errorMessage,
      metadata:{
        jobType,
      }
    },
  ],
},
        ReturnValues: "ALL_NEW",
      }),
    );

    return response.Attributes as Job | undefined;
  },
};
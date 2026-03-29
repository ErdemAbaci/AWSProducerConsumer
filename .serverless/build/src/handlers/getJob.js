var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/handlers/getJob.ts
var getJob_exports = {};
__export(getJob_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(getJob_exports);

// src/repositories/jobRepository.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var dynamoDb = import_lib_dynamodb.DynamoDBDocumentClient.from(new import_client_dynamodb.DynamoDBClient({}), {
  marshallOptions: {
    removeUndefinedValues: true
  }
});
function getTableName() {
  const tableName = process.env.JOBS_TABLE_NAME;
  if (!tableName) {
    throw new Error("JOBS_TABLE_NAME environment variable is required");
  }
  return tableName;
}
var jobRepository = {
  async save(job) {
    await dynamoDb.send(
      new import_lib_dynamodb.PutCommand({
        TableName: getTableName(),
        Item: job
      })
    );
  },
  async getById(id) {
    const response = await dynamoDb.send(
      new import_lib_dynamodb.GetCommand({
        TableName: getTableName(),
        Key: { id }
      })
    );
    return response.Item;
  },
  async listJobs(filters, limit, cursor) {
    const filterExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    if (filters?.status) {
      filterExpressions.push("#status = :status");
      expressionAttributeNames["#status"] = "status";
      expressionAttributeValues[":status"] = filters.status;
    }
    if (filters?.type) {
      filterExpressions.push("#type = :type");
      expressionAttributeNames["#type"] = "type";
      expressionAttributeValues[":type"] = filters.type;
    }
    const response = await dynamoDb.send(
      new import_lib_dynamodb.ScanCommand({
        TableName: getTableName(),
        ...filterExpressions.length > 0 ? {
          FilterExpression: filterExpressions.join(" AND "),
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues
        } : {},
        ...limit ? { Limit: limit } : {},
        ...cursor ? { ExclusiveStartKey: cursor } : {}
      })
    );
    return {
      items: response.Items ?? [],
      nextCursor: response.LastEvaluatedKey
    };
  },
  async claimJobIfPending(id) {
    const existingJob = await this.getById(id);
    if (!existingJob) {
      return void 0;
    }
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const nextAttemptCount = existingJob.attemptCount + 1;
    try {
      const response = await dynamoDb.send(
        new import_lib_dynamodb.UpdateCommand({
          TableName: getTableName(),
          Key: { id },
          UpdateExpression: "SET #status = :processing, updatedAt = :updatedAt, attemptCount = :attemptCount, #history = list_append(#history, :historyEvent)",
          ConditionExpression: "#status = :pending",
          ExpressionAttributeNames: {
            "#status": "status",
            "#history": "history"
          },
          ExpressionAttributeValues: {
            ":pending": "pending",
            ":processing": "processing",
            ":updatedAt": updatedAt,
            ":attemptCount": nextAttemptCount,
            ":historyEvent": [
              {
                eventType: "status_change",
                status: "processing",
                timestamp: updatedAt,
                metadata: {
                  attemptCount: nextAttemptCount
                }
              }
            ]
          },
          ReturnValues: "ALL_NEW"
        })
      );
      return response.Attributes;
    } catch (error) {
      if (error?.name === "ConditionalCheckFailedException") {
        return void 0;
      }
      throw error;
    }
  },
  async markAsCompleted(id, jobType, result) {
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const response = await dynamoDb.send(
      new import_lib_dynamodb.UpdateCommand({
        TableName: getTableName(),
        Key: { id },
        UpdateExpression: "SET #status = :completed, updatedAt = :updatedAt, #result = :result, #history = list_append(#history, :historyEvent) REMOVE #error",
        ExpressionAttributeNames: {
          "#status": "status",
          "#result": "result",
          "#error": "error",
          "#history": "history"
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
              message: typeof result?.message === "string" ? result.message : "Job completed",
              metadata: {
                jobType
              }
            }
          ]
        },
        ReturnValues: "ALL_NEW"
      })
    );
    return response.Attributes;
  },
  async markAsFailed(id, jobType, errorMessage) {
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const response = await dynamoDb.send(
      new import_lib_dynamodb.UpdateCommand({
        TableName: getTableName(),
        Key: { id },
        UpdateExpression: "SET #status = :failed, updatedAt = :updatedAt, #error = :error, #history = list_append(#history, :historyEvent) REMOVE #result",
        ExpressionAttributeNames: {
          "#status": "status",
          "#error": "error",
          "#result": "result",
          "#history": "history"
        },
        ExpressionAttributeValues: {
          ":failed": "failed",
          ":updatedAt": updatedAt,
          ":error": errorMessage,
          ":historyEvent": [
            {
              eventType: "status_change",
              status: "failed",
              timestamp: updatedAt,
              message: errorMessage,
              metadata: {
                jobType
              }
            }
          ]
        },
        ReturnValues: "ALL_NEW"
      })
    );
    return response.Attributes;
  }
};

// src/mappers/jobResponseMapper.ts
function toJobResponse(job) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    attemptCount: job.attemptCount,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    history: job.history,
    result: job.result,
    error: job.error
  };
}

// src/handlers/getJob.ts
function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}
async function handler(event) {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return json(400, { message: "Job id is required" });
  }
  try {
    const job = await jobRepository.getById(jobId);
    if (!job) {
      return json(404, { message: "Job not found" });
    }
    return json(200, toJobResponse(job));
  } catch (error) {
    console.error("Failed to load job", error);
    return json(500, { message: "Could not load job" });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=getJob.js.map

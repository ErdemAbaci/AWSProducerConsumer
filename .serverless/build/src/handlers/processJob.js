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

// src/handlers/processJob.ts
var processJob_exports = {};
__export(processJob_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(processJob_exports);

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
  async listJobs(filters, limit, cursor, sortOrder) {
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
    const items = (response.Items ?? []).sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      if (sortOrder === "asc") {
        return aTime - bTime;
      }
      return bTime - aTime;
    });
    return {
      items,
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

// src/services/jobProcessors/demoProcessor.ts
var import_node_crypto = require("node:crypto");
function processDemoJob(job) {
  if (job.payload["shouldFail"] === true) {
    throw new Error("Job was asked to fail");
  }
  return {
    message: "Job processed successfully",
    processedAt: (/* @__PURE__ */ new Date()).toISOString(),
    executionId: (0, import_node_crypto.randomUUID)()
  };
}

// src/services/jobProcessors/emailProcessor.ts
var import_node_crypto2 = require("node:crypto");
function processEmailJob(job) {
  const { to, subject, body } = job.payload;
  if (typeof to !== "string" || to.trim() === "" || typeof subject !== "string" || subject.trim() === "" || typeof body !== "string" || body.trim() === "") {
    throw new Error("Invalid email payload");
  }
  return {
    message: "Email job processed successfully",
    processedAt: (/* @__PURE__ */ new Date()).toISOString(),
    executionId: (0, import_node_crypto2.randomUUID)(),
    recipient: to,
    subject
  };
}

// src/services/jobProcessors/processorRegistry.ts
var processorRegistry = {
  demo: processDemoJob,
  email: processEmailJob
};

// src/handlers/processJob.ts
function parseMessage(body) {
  try {
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || typeof parsed.jobId !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
async function handler(event) {
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
      const result = processor(job);
      await jobRepository.markAsCompleted(job.id, job.type, result);
    } catch (error) {
      await jobRepository.markAsFailed(
        job.id,
        job.type,
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=processJob.js.map

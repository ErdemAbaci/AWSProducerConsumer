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

// src/handlers/createJob.ts
var createJob_exports = {};
__export(createJob_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(createJob_exports);
var import_node_crypto = require("node:crypto");

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

// src/services/queueService.ts
var import_client_sqs = require("@aws-sdk/client-sqs");
var sqs = new import_client_sqs.SQSClient({});
function getQueueUrl() {
  const queueUrl = process.env.JOBS_QUEUE_URL;
  if (!queueUrl) {
    throw new Error("JOBS_QUEUE_URL environment variable is required");
  }
  return queueUrl;
}
var queueService = {
  async sendJob(message) {
    await sqs.send(
      new import_client_sqs.SendMessageCommand({
        QueueUrl: getQueueUrl(),
        MessageBody: JSON.stringify(message)
      })
    );
  }
};

// src/services/jobValidation/createJobRequestValidator.ts
var supportedJobTypes = ["demo", "email"];
function validateCreateJobRequest(body) {
  if (!body) {
    return {
      ok: false,
      message: "Request body is required and must be a JSON object"
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return {
      ok: false,
      message: "Request body is required and must be a JSON object"
    };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      message: "Request body is required and must be a JSON object"
    };
  }
  const request = parsed;
  if (typeof request.type !== "string" || request.type.trim() === "") {
    return {
      ok: false,
      message: "Request body must include a non-empty type and a payload object"
    };
  }
  if (!request.payload || typeof request.payload !== "object" || Array.isArray(request.payload)) {
    return {
      ok: false,
      message: "Request body must include a non-empty type and a payload object"
    };
  }
  const normalizedType = request.type.trim();
  const payload = request.payload;
  if (!supportedJobTypes.includes(
    normalizedType
  )) {
    return {
      ok: false,
      message: `Unsupported job type: ${normalizedType}`
    };
  }
  if (Object.keys(payload).length === 0) {
    return {
      ok: false,
      message: "Payload cannot be an empty object"
    };
  }
  if (normalizedType === "email") {
    const { to, subject, body: body2 } = payload;
    if (typeof to !== "string" || to.trim() === "" || typeof subject !== "string" || subject.trim() === "" || typeof body2 !== "string" || body2.trim() === "") {
      return {
        ok: false,
        message: "Email jobs require non-empty to, subject, and body fields"
      };
    }
  }
  return {
    ok: true,
    data: {
      type: normalizedType,
      payload
    }
  };
}

// src/handlers/createJob.ts
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
  const validation = validateCreateJobRequest(event.body);
  if (!validation.ok) {
    return json(400, { message: validation.message });
  }
  const request = validation.data;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const job = {
    id: (0, import_node_crypto.randomUUID)(),
    type: request.type,
    status: "pending",
    attemptCount: 0,
    payload: request.payload,
    createdAt: now,
    updatedAt: now,
    history: [
      {
        eventType: "status_change",
        status: "pending",
        timestamp: now
      }
    ]
  };
  try {
    await jobRepository.save(job);
    await queueService.sendJob({ jobId: job.id });
  } catch (error) {
    console.error("Failed to create job", error);
    return json(500, { message: "Could not create job" });
  }
  return json(202, {
    id: job.id,
    status: job.status
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=createJob.js.map

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
  async claimJobIfPending(id) {
    try {
      const response = await dynamoDb.send(
        new import_lib_dynamodb.UpdateCommand({
          TableName: getTableName(),
          Key: { id },
          UpdateExpression: "SET #status = :processing, updatedAt = :updatedAt, attemptCount = attemptCount + :increment",
          ConditionExpression: "#status = :pending",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":pending": "pending",
            ":processing": "processing",
            ":updatedAt": (/* @__PURE__ */ new Date()).toISOString(),
            ":increment": 1
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
  async markAsCompleted(id, result) {
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const response = await dynamoDb.send(
      new import_lib_dynamodb.UpdateCommand({
        TableName: getTableName(),
        Key: { id },
        UpdateExpression: "SET #status = :completed, updatedAt = :updatedAt, #result = :result REMOVE #error",
        ExpressionAttributeNames: {
          "#status": "status",
          "#result": "result",
          "#error": "error"
        },
        ExpressionAttributeValues: {
          ":completed": "completed",
          ":updatedAt": updatedAt,
          ":result": result
        },
        ReturnValues: "ALL_NEW"
      })
    );
    return response.Attributes;
  },
  async markAsFailed(id, errorMessage) {
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const response = await dynamoDb.send(
      new import_lib_dynamodb.UpdateCommand({
        TableName: getTableName(),
        Key: { id },
        UpdateExpression: "SET #status = :failed, updatedAt = :updatedAt, #error = :error REMOVE #result",
        ExpressionAttributeNames: {
          "#status": "status",
          "#error": "error",
          "#result": "result"
        },
        ExpressionAttributeValues: {
          ":failed": "failed",
          ":updatedAt": updatedAt,
          ":error": errorMessage
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
function parseRequest(body) {
  if (!body) {
    return null;
  }
  try {
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    if (typeof parsed.type !== "string" || parsed.type.trim() === "") {
      return null;
    }
    if (!parsed.payload || typeof parsed.payload !== "object" || Array.isArray(parsed.payload)) {
      return null;
    }
    return {
      type: parsed.type.trim(),
      payload: parsed.payload
    };
  } catch {
    return null;
  }
}
async function handler(event) {
  const request = parseRequest(event.body);
  if (request === null) {
    return json(400, { message: "Request body is required and must be a JSON object" });
  }
  if (Object.keys(request.payload).length === 0) {
    return json(400, { message: "Payload cannot be an empty object" });
  }
  if (request.type === "email") {
    const { to, subject, body } = request.payload;
    if (typeof to !== "string" || to.trim() === "" || typeof subject !== "string" || subject.trim() === "" || typeof body !== "string" || body.trim() === "") {
      return json(400, {
        message: "Email jobs require non-empty to, subject, and body fields"
      });
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const job = {
    id: (0, import_node_crypto.randomUUID)(),
    type: request.type,
    status: "pending",
    payload: request.payload,
    attemptCount: 0,
    createdAt: now,
    updatedAt: now
  };
  try {
    await jobRepository.save(job);
    await queueService.sendJob({ jobId: job.id });
  } catch (error) {
    console.error("Failed to create job", error);
    return json(500, { message: "Could not create job" });
  }
  return json(202, { id: job.id, status: job.status });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=createJob.js.map

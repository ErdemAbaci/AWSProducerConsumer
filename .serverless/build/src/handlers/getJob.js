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
  }
};

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
    return json(200, {
      id: job.id,
      type: job.type,
      status: job.status,
      attemptCount: job.attemptCount,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      result: job.result,
      error: job.error
    });
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

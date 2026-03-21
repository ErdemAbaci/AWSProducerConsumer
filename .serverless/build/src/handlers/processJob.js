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
  const tableName = process.env.JOBS_TABLE;
  if (!tableName) {
    throw new Error("JOBS_TABLE environment variable is required");
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
  }
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
function setJobState(job, status) {
  job.status = status;
  job.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
}
async function handler(event) {
  for (const record of event.Records) {
    const message = parseMessage(record.body);
    if (!message) {
      console.error("Skipping invalid SQS message", record.body);
      continue;
    }
    const job = await jobRepository.getById(message.jobId);
    if (!job) {
      console.error(`Job ${message.jobId} was not found`);
      continue;
    }
    try {
      setJobState(job, "processing");
      delete job.error;
      delete job.result;
      await jobRepository.save(job);
      if (job.payload["shouldFail"] === true) {
        throw new Error("Job was asked to fail");
      }
      setJobState(job, "completed");
      job.result = {
        message: "Job processed successfully",
        processedAt: job.updatedAt
      };
      await jobRepository.save(job);
    } catch (error) {
      setJobState(job, "failed");
      job.error = error instanceof Error ? error.message : "Unknown error";
      delete job.result;
      await jobRepository.save(job);
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=processJob.js.map

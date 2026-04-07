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

// src/handlers/listJobs.ts
var listJobs_exports = {};
__export(listJobs_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(listJobs_exports);

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
    if (filters?.ownerId) {
      filterExpressions.push("#ownerId = :ownerId");
      expressionAttributeNames["#ownerId"] = "ownerId";
      expressionAttributeValues[":ownerId"] = filters.ownerId;
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

// src/services/jobValidation/listJobsQueryValidator.ts
var allowedStatuses = ["pending", "processing", "completed", "failed"];
var allowedTypes = ["demo", "email"];
function validateListJobsQuery(query) {
  const rawLimit = query?.limit;
  const rawCursor = query?.cursor;
  const rawSortOrder = query?.sortOrder;
  let parsedLimit;
  let parsedCursor;
  let parsedSortOrder;
  if (rawLimit !== void 0) {
    const numericLimit = Number(rawLimit);
    if (!Number.isInteger(numericLimit) || Number.isNaN(numericLimit) || numericLimit < 1) {
      return {
        ok: false,
        message: "limit must be a positive integer"
      };
    }
    parsedLimit = numericLimit;
  }
  if (rawCursor !== void 0) {
    try {
      parsedCursor = JSON.parse(decodeURIComponent(rawCursor));
    } catch {
      return {
        ok: false,
        message: "cursor must be a valid encoded JSON object"
      };
    }
  }
  if (rawSortOrder !== void 0) {
    if (rawSortOrder !== "asc" && rawSortOrder !== "desc") {
      return {
        ok: false,
        message: "sortOrder must be either 'asc' or 'desc'"
      };
    }
    parsedSortOrder = rawSortOrder;
  }
  if (query?.status !== void 0 && !allowedStatuses.includes(query.status)) {
    return {
      ok: false,
      message: "status must be one of: pending, processing, completed, failed"
    };
  }
  if (query?.type !== void 0 && !allowedTypes.includes(query.type)) {
    return {
      ok: false,
      message: "type must be one of: demo, email"
    };
  }
  return {
    ok: true,
    data: {
      filters: {
        status: query?.status,
        type: query?.type
      },
      limit: parsedLimit,
      cursor: parsedCursor,
      sortOrder: parsedSortOrder
    }
  };
}

// src/services/auth/getCurrentUserId.ts
function getCurrentUserId(event) {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) {
    throw new Error("Authenticated user id could not be determined");
  }
  return userId;
}

// src/handlers/listJobs.ts
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
  let currentUserId;
  try {
    currentUserId = getCurrentUserId(event);
  } catch {
    return json(401, { message: "Authentication required" });
  }
  try {
    const validation = validateListJobsQuery(event.queryStringParameters);
    if (!validation.ok) {
      return json(400, { message: validation.message });
    }
    const { filters, limit, cursor, sortOrder } = validation.data;
    const result = await jobRepository.listJobs(
      {
        ...filters,
        ownerId: currentUserId
      },
      limit,
      cursor,
      sortOrder
    );
    return json(200, {
      items: result.items.map((job) => toJobResponse(job)),
      nextCursor: result.nextCursor ? encodeURIComponent(JSON.stringify(result.nextCursor)) : void 0
    });
  } catch (error) {
    console.error("Failed to list jobs", error);
    return json(500, { message: "Could not list jobs" });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=listJobs.js.map

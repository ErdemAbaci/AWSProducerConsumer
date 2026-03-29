import { jobRepository } from "../repositories/jobRepository";
import { toJobResponse } from "../mappers/jobResponseMapper";

type ApiResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

type ApiEvent = {
    queryStringParameters?: {
        status?: string;
        type?: string;
        limit?: string;
        cursor?: string;
        sortOrder?: string;
    } | null;
}

function json(statusCode: number, body: unknown): ApiResponse {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  try {
    const rawLimit = event.queryStringParameters?.limit;
    const rawCursor = event.queryStringParameters?.cursor;
    const rawSortOrder = event.queryStringParameters?.sortOrder;
    let parsedLimit: number | undefined;
    let parsedCursor: Record<string, unknown> | undefined;
    let parsedSortOrder: "asc" | "desc" | undefined;
    if (rawLimit !== undefined) {
     const numericLimit = Number(rawLimit);

     if (
      !Number.isInteger(numericLimit) ||
      Number.isNaN(numericLimit) ||
      numericLimit < 1
     ) {
     return json(400, {
      message: "limit must be a positive integer",
     });
     }
    parsedLimit = numericLimit;
    }
    if (rawCursor !== undefined){
      try{
        parsedCursor = JSON.parse(decodeURIComponent(rawCursor));
      }
      catch (error) {
        return json(400, {
        message: "cursor must be a valid encoded JSON object",
        });
      }
    
    }
    if (rawSortOrder !== undefined) {
      if (rawSortOrder !== "asc" && rawSortOrder !== "desc") {
       return json(400, {
         message: "sortOrder must be either 'asc' or 'desc'",
       });
     }

     parsedSortOrder = rawSortOrder;
    } 
    const filters = {
        status: event.queryStringParameters?.status,
        type: event.queryStringParameters?.type,
    };
    const result = await jobRepository.listJobs(filters, parsedLimit, parsedCursor, parsedSortOrder);
    
    return json(200, {
     items: result.items.map((job) => toJobResponse(job)),
     nextCursor: result.nextCursor
     ? encodeURIComponent(JSON.stringify(result.nextCursor))
     : undefined,
  });
  } catch (error) {
    console.error("Failed to list jobs", error);

    return json(500, { message: "Could not list jobs" });
  }
}
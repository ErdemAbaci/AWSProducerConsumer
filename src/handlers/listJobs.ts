import { jobRepository } from "../repositories/jobRepository";
import { toJobResponse } from "../mappers/jobResponseMapper";
import { validateListJobsQuery } from "../services/jobValidation/listJobsQueryValidator";
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
};

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
    const validation = validateListJobsQuery(event.queryStringParameters);

    if (!validation.ok) {
      return json(400, { message: validation.message });
    }

    const { filters, limit, cursor, sortOrder } = validation.data;

    const result = await jobRepository.listJobs(
      filters,
      limit,
      cursor,
      sortOrder,
    );

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
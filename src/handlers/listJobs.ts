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
    const filters = {
        status: event.queryStringParameters?.status,
        type: event.queryStringParameters?.type,
    };
    const jobs = await jobRepository.listJobs(filters);
    
    return json(
      200,
      jobs.map((job) => toJobResponse(job)),
    );
  } catch (error) {
    console.error("Failed to list jobs", error);

    return json(500, { message: "Could not list jobs" });
  }
}
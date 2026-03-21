import { jobRepository } from "../repositories/jobRepository";

type ApiEvent = {
  pathParameters?: {
    id?: string;
  } | null;
};

type ApiResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
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
  const jobId = event.pathParameters?.id;

  if (!jobId) {
    return json(400, { message: "Job id is required" });
  }

  try {
    const job = await jobRepository.getById(jobId);

    if (!job) {
      return json(404, { message: "Job not found" });
    }

    return json(200, job);
  } catch (error) {
    console.error("Failed to load job", error);

    return json(500, { message: "Could not load job" });
  }
}

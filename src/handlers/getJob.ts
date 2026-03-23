import { jobRepository } from "../repositories/jobRepository";
// Bu dosya belirli bir işi almak için kullanılır. 
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

    return json(200, {
  id: job.id,
  type: job.type,
  status: job.status,
  attemptCount: job.attemptCount,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  result: job.result,
  error: job.error,
});
  } catch (error) {
    console.error("Failed to load job", error);

    return json(500, { message: "Could not load job" });
  }
}

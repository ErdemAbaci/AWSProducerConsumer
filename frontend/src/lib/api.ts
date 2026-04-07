import { appConfig } from "../config/env";
import type {
  CreateJobInput,
  CreateJobResponse,
  JobDetail,
  JobListResponse,
  JobStatus,
  JobType,
} from "../types/job";
import { clearAuthSession, ensureFreshSession, getBearerToken } from "./auth";

type QueryParams = {
  cursor?: string;
  limit?: number;
  sortOrder?: "asc" | "desc";
  status?: JobStatus;
  type?: JobType;
};

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  query?: QueryParams;
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function buildUrl(path: string, query?: QueryParams): string {
  if (!appConfig.apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL is missing. Add it to your frontend .env file.");
  }

  const baseUrl = appConfig.apiBaseUrl.endsWith("/")
    ? appConfig.apiBaseUrl
    : `${appConfig.apiBaseUrl}/`;
  const url = new URL(path.replace(/^\//, ""), baseUrl);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const session = await ensureFreshSession();

  if (!session) {
    throw new ApiError(401, "Authentication required");
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${getBearerToken(session)}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new ApiError(
      0,
      "Network request failed before the API responded. This usually points to CORS, a blocked preflight request, or an unreachable API URL.",
      error,
    );
  }

  const payload = await parseResponse(response);

  if (response.status === 401) {
    clearAuthSession();
    throw new ApiError(401, "Your session has expired. Please sign in again.", payload);
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "Request failed";

    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}

export const apiClient = {
  listJobs(query: QueryParams): Promise<JobListResponse> {
    return request<JobListResponse>("/jobs", {
      query,
    });
  },

  getJob(id: string): Promise<JobDetail> {
    return request<JobDetail>(`/jobs/${encodeURIComponent(id)}`);
  },

  createJob(input: CreateJobInput): Promise<CreateJobResponse> {
    return request<CreateJobResponse>("/jobs", {
      method: "POST",
      body: input,
    });
  },
};

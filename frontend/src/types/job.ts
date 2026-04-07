export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type JobType = "demo" | "email";

export type JobHistoryItem = {
  eventType: "status_change";
  status: JobStatus;
  timestamp: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

export type JobSummary = {
  id: string;
  type: JobType;
  status: JobStatus;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  result?: Record<string, unknown>;
  error?: string;
  history: JobHistoryItem[];
};

export type JobDetail = JobSummary;

export type JobListResponse = {
  items: JobSummary[];
  nextCursor?: string;
};

export type DemoJobPayload = {
  [key: string]: unknown;
};

export type EmailJobPayload = {
  to: string;
  subject: string;
  body: string;
};

export type CreateJobInput =
  | {
      type: "demo";
      payload: DemoJobPayload;
    }
  | {
      type: "email";
      payload: EmailJobPayload;
    };

export type CreateJobResponse = {
  id: string;
  status: JobStatus;
};

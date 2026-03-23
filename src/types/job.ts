export type JobStatus = "pending" | "processing" | "completed" | "failed";

export type JobPayload = Record<string, unknown>;

export interface Job {
  id: string;
  status: JobStatus;
  type:string;
  payload: JobPayload;
  result?: JobPayload;
  error?: string;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
}

export interface JobMessage {
  jobId: string;
}

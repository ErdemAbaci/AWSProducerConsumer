export type JobStatus = "pending" | "processing" | "completed" | "failed";

export type JobPayload = Record<string, unknown>;

export interface Job {
  id: string;
  ownerId: string;
  status: JobStatus;
  type:string;
  payload: JobPayload;
  result?: JobPayload;
  error?: string;
  createdAt: string;
  updatedAt: string;
  history: JobHistoryItem[];
  attemptCount: number;
}

export interface JobMessage {
  jobId: string;
}

export type JobHistoryItem = {
  eventType: "status_change";
  status: string;
  timestamp: string;
  message?: string;
  metadata?: Record<string, unknown>;
}
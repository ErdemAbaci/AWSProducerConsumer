import type { Job } from "../../types/job";
import { processDemoJob } from "./demoProcessor";
import { processEmailJob } from "./emailProcessor";

export type JobProcessor = (job: Job,) => Promise<Record<string, unknown>> | Record<string, unknown>;

export const processorRegistry: Record<string, JobProcessor> = {
  demo: processDemoJob,
  email: processEmailJob,
};
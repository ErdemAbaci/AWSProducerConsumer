import type { Job } from '../types/job';

export function toJobResponse(job: Job) {
    return {
        id:job.id,
        type:job.type,
        status:job.status,
        attemptCount:job.attemptCount,
        createdAt:job.createdAt,
        updatedAt:job.updatedAt,
        history:job.history,
        result:job.result,
        error:job.error,
    };
}
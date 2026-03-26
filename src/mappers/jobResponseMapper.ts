import type {Job} from '../types/Job';

export function toJobResponse(job: Job) {
    return {
        id:job.id,
        type:job.type,
        status:job.status,
        attemptCount:job.attemptCount,
        createdAt:job.createdAt,
        updatedAt:job.updatedAt,
        result:job.result,
        error:job.error,
    };
}
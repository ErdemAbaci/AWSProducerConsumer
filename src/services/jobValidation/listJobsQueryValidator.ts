
const allowedStatuses = ["pending", "processing", "completed", "failed"] as const;
const allowedTypes = ["demo", "email"] as const;


export type ListJobsFilters = {
  status?: string;
  type?: string;
};

export type ListJobsQueryData = {
  filters: ListJobsFilters;
  limit?: number;
  cursor?: Record<string, unknown>;
  sortOrder?: "asc" | "desc";
};

export type ListJobsQueryValidationResult =
  | { ok: true; data: ListJobsQueryData }
  | { ok: false; message: string };

export function validateListJobsQuery(query?: {
  status?: string;
  type?: string;
  limit?: string;
  cursor?: string;
  sortOrder?: string;
} | null): ListJobsQueryValidationResult {
  const rawLimit = query?.limit;
  const rawCursor = query?.cursor;
  const rawSortOrder = query?.sortOrder;

  let parsedLimit: number | undefined;
  let parsedCursor: Record<string, unknown> | undefined;
  let parsedSortOrder: "asc" | "desc" | undefined;

  if (rawLimit !== undefined) {
    const numericLimit = Number(rawLimit);

    if (
      !Number.isInteger(numericLimit) ||
      Number.isNaN(numericLimit) ||
      numericLimit < 1
    ) {
      return {
        ok: false,
        message: "limit must be a positive integer",
      };
    }

    if (numericLimit > 50) {
      return {
        ok: false,
        message: "limit must be less than or equal to 50",
      };
    }

    parsedLimit = numericLimit;
  }

  if (rawCursor !== undefined) {
    try {
      parsedCursor = JSON.parse(decodeURIComponent(rawCursor));
    } catch {
      return {
        ok: false,
        message: "cursor must be a valid encoded JSON object",
      };
    }
  }

  if (rawSortOrder !== undefined) {
    if (rawSortOrder !== "asc" && rawSortOrder !== "desc") {
      return {
        ok: false,
        message: "sortOrder must be either 'asc' or 'desc'",
      };
    }

    parsedSortOrder = rawSortOrder;
  }

    if (
    query?.status !== undefined &&
    !allowedStatuses.includes(query.status as (typeof allowedStatuses)[number])
    ) {
    return {
      ok: false,
      message: "status must be one of: pending, processing, completed, failed",
    };
  }

    if (
    query?.type !== undefined &&
    !allowedTypes.includes(query.type as (typeof allowedTypes)[number])
  ) {
    return {
      ok: false,
      message: "type must be one of: demo, email",
    };
  }

  return {
    ok: true,
    data: {
      filters: {
        status: query?.status,
        type: query?.type,
      },
      limit: parsedLimit,
      cursor: parsedCursor,
      sortOrder: parsedSortOrder,
    },
  };
}
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { JobFilters } from "../components/JobFilters";
import { JobTable } from "../components/JobTable";
import { LoadingState } from "../components/LoadingState";
import { apiClient } from "../lib/api";
import { getErrorMessage } from "../lib/utils";
import type { JobStatus, JobSummary, JobType } from "../types/job";

function parseSortOrder(value: string | null): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc";
}

function parseLimit(value: string | null): number {
  const limit = Number(value);
  return Number.isInteger(limit) && limit > 0 ? limit : 10;
}

function parseStatus(value: string | null): JobStatus | undefined {
  return value === "pending" ||
    value === "processing" ||
    value === "completed" ||
    value === "failed"
    ? value
    : undefined;
}

function parseJobType(value: string | null): JobType | undefined {
  return value === "demo" || value === "email" ? value : undefined;
}

export function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const status = parseStatus(searchParams.get("status"));
  const type = parseJobType(searchParams.get("type"));
  const sortOrder = parseSortOrder(searchParams.get("sortOrder"));
  const limit = parseLimit(searchParams.get("limit"));
  const cursor = searchParams.get("cursor") || undefined;

  useEffect(() => {
    let isMounted = true;

    async function loadJobs() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.listJobs({
          status,
          type,
          sortOrder,
          limit,
          cursor,
        });

        if (!isMounted) {
          return;
        }

        setJobs(response.items);
        setNextCursor(response.nextCursor);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setJobs([]);
        setNextCursor(undefined);
        setError(getErrorMessage(loadError, "Could not load jobs."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadJobs();

    return () => {
      isMounted = false;
    };
  }, [cursor, limit, refreshIndex, sortOrder, status, type]);

  function updateSearchParams(update: (params: URLSearchParams) => void) {
    const nextParams = new URLSearchParams(searchParams);
    update(nextParams);
    setSearchParams(nextParams);
  }

  function handleFilterChange(
    key: "status" | "type" | "sortOrder" | "limit",
    value: string,
  ) {
    updateSearchParams((params) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      params.delete("cursor");
    });
  }

  function handleReset() {
    setSearchParams({
      sortOrder: "desc",
      limit: "10",
    });
  }

  function handleNextPage() {
    if (!nextCursor) {
      return;
    }

    updateSearchParams((params) => {
      params.set("cursor", nextCursor);
    });
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Jobs</p>
          <h1>Your jobs</h1>
          <p className="page-description">
            Query the existing `GET /jobs` endpoint with owner-scoped filters,
            sorting, limit, and cursor pagination.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setRefreshIndex((value) => value + 1)}
            disabled={isLoading}
          >
            Refresh
          </button>
          <Link className="button button-primary" to="/jobs/create">
            Create Job
          </Link>
        </div>
      </section>

      <JobFilters
        values={{
          status: status || "",
          type: type || "",
          sortOrder,
          limit: String(limit),
        }}
        isLoading={isLoading}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      {error ? <div className="inline-message inline-message-error">{error}</div> : null}

      {isLoading ? (
        <LoadingState label="Loading jobs..." />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No jobs found"
          description="Try different filters, or create a new demo or email job."
          action={
            <Link className="button button-primary" to="/jobs/create">
              Create a job
            </Link>
          }
        />
      ) : (
        <>
          <JobTable jobs={jobs} />

          <div className="pagination-bar">
            <p className="muted-text">
              Showing {jobs.length} job{jobs.length === 1 ? "" : "s"}.
            </p>

            <button
              type="button"
              className="button button-secondary"
              onClick={handleNextPage}
              disabled={!nextCursor}
            >
              {nextCursor ? "Next page" : "No more pages"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

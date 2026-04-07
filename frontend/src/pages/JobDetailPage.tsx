import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { JobHistoryTimeline } from "../components/JobHistoryTimeline";
import { KeyValueList } from "../components/KeyValueList";
import { LoadingState } from "../components/LoadingState";
import { StatusBadge } from "../components/StatusBadge";
import { apiClient } from "../lib/api";
import { formatDateTime, getErrorMessage } from "../lib/utils";
import type { JobDetail } from "../types/job";

function getNoticeMessage(state: unknown): string | null {
  if (
    state &&
    typeof state === "object" &&
    "notice" in state &&
    typeof state.notice === "string"
  ) {
    return state.notice;
  }

  return null;
}

export function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const notice = getNoticeMessage(location.state);

  useEffect(() => {
    if (!notice) {
      return;
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, notice]);

  useEffect(() => {
    const jobId = id;

    if (!jobId) {
      setError("Job id is missing.");
      setIsLoading(false);
      return;
    }

    const stableJobId: string = jobId;

    let isMounted = true;

    async function loadJob() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.getJob(stableJobId);

        if (isMounted) {
          setJob(response);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError, "Could not load the job."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadJob();

    return () => {
      isMounted = false;
    };
  }, [id]);

  async function refreshJob() {
    const jobId = id;

    if (!jobId) {
      return;
    }

    const stableJobId: string = jobId;

    setIsRefreshing(true);
    setError(null);

    try {
      const response = await apiClient.getJob(stableJobId);
      setJob(response);
    } catch (refreshError) {
      setError(getErrorMessage(refreshError, "Could not refresh the job."));
    } finally {
      setIsRefreshing(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading job details..." />;
  }

  if (error && !job) {
    return (
      <EmptyState
        title="Job could not be loaded"
        description={error}
        action={
          <Link className="button button-secondary" to="/jobs">
            Back to jobs
          </Link>
        }
      />
    );
  }

  if (!job) {
    return (
      <EmptyState
        title="Job not found"
        description="The requested job does not exist or is not visible to the current user."
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Job Detail</p>
          <h1 className="code-text">{job.id}</h1>
          <p className="page-description">
            Detailed view from `GET /jobs/{'{id}'}` with result, error, and history.
          </p>
        </div>

        <div className="page-actions">
          <Link className="button button-secondary" to="/jobs">
            Back to jobs
          </Link>
          <button
            type="button"
            className="button button-primary"
            onClick={() => void refreshJob()}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      {notice ? <div className="inline-message inline-message-success">{notice}</div> : null}
      {error ? <div className="inline-message inline-message-error">{error}</div> : null}

      <section className="detail-grid">
        <div className="card">
          <div className="section-heading">
            <div>
              <h2>Overview</h2>
              <p>Core metadata returned by the backend.</p>
            </div>
          </div>

          <KeyValueList
            items={[
              { label: "Status", value: <StatusBadge status={job.status} /> },
              { label: "Type", value: job.type },
              { label: "Attempts", value: job.attemptCount },
              { label: "Created", value: formatDateTime(job.createdAt) },
              { label: "Updated", value: formatDateTime(job.updatedAt) },
            ]}
          />
        </div>

        <div className="card">
          <div className="section-heading">
            <div>
              <h2>Output</h2>
              <p>Terminal state details for the selected job.</p>
            </div>
          </div>

          <div className="stack-small">
            <div>
              <p className="section-label">Result</p>
              {job.result ? (
                <pre className="json-block">{JSON.stringify(job.result, null, 2)}</pre>
              ) : (
                <p className="muted-text">No result has been recorded yet.</p>
              )}
            </div>

            <div>
              <p className="section-label">Error</p>
              {job.error ? (
                <pre className="json-block json-block-error">{job.error}</pre>
              ) : (
                <p className="muted-text">No error has been recorded.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <JobHistoryTimeline history={job.history} />
    </div>
  );
}

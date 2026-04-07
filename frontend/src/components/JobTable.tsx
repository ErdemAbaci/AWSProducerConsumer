import { Link } from "react-router-dom";
import type { JobSummary } from "../types/job";
import { formatDateTime, truncateMiddle } from "../lib/utils";
import { StatusBadge } from "./StatusBadge";

export function JobTable({ jobs }: { jobs: JobSummary[] }) {
  return (
    <div className="card table-card">
      <div className="table-wrap">
        <table className="jobs-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Created</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <span className="code-text" title={job.id}>
                    {truncateMiddle(job.id)}
                  </span>
                </td>
                <td className="table-cell-strong">{job.type}</td>
                <td>
                  <StatusBadge status={job.status} />
                </td>
                <td>{job.attemptCount}</td>
                <td>{formatDateTime(job.createdAt)}</td>
                <td>{formatDateTime(job.updatedAt)}</td>
                <td className="table-actions">
                  <Link className="table-link" to={`/jobs/${job.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

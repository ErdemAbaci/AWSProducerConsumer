import type { JobHistoryItem } from "../types/job";
import { formatDateTime } from "../lib/utils";
import { StatusBadge } from "./StatusBadge";

export function JobHistoryTimeline({
  history,
}: {
  history: JobHistoryItem[];
}) {
  const orderedHistory = [...history].sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );

  return (
    <div className="card">
      <div className="section-heading">
        <div>
          <h2>History</h2>
          <p>Status changes returned by the backend.</p>
        </div>
      </div>

      {orderedHistory.length === 0 ? (
        <p className="muted-text">No history has been recorded for this job yet.</p>
      ) : (
        <ol className="timeline">
          {orderedHistory.map((entry, index) => (
            <li key={`${entry.timestamp}-${index}`} className="timeline-item">
              <div className="timeline-dot" aria-hidden="true" />
              <div className="timeline-content">
                <div className="timeline-header">
                  <StatusBadge status={entry.status} />
                  <span className="muted-text">{formatDateTime(entry.timestamp)}</span>
                </div>
                {entry.message ? <p>{entry.message}</p> : null}
                {entry.metadata ? (
                  <pre className="json-block">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

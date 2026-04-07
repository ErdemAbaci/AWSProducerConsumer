import type { JobStatus } from "../types/job";
import { formatLabel } from "../lib/utils";

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={`status-badge status-${status}`}>
      {formatLabel(status)}
    </span>
  );
}

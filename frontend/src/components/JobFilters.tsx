type FilterKey = "status" | "type" | "sortOrder" | "limit";

type JobFiltersProps = {
  values: {
    status: string;
    type: string;
    sortOrder: "asc" | "desc";
    limit: string;
  };
  isLoading: boolean;
  onChange: (key: FilterKey, value: string) => void;
  onReset: () => void;
};

export function JobFilters({
  values,
  isLoading,
  onChange,
  onReset,
}: JobFiltersProps) {
  return (
    <section className="card filters-card">
      <div className="section-heading">
        <div>
          <h2>Filters</h2>
          <p>Adjust the list query without leaving the page.</p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={onReset}
          disabled={isLoading}
        >
          Reset
        </button>
      </div>

      <div className="filter-grid">
        <label className="field">
          <span>Status</span>
          <select
            value={values.status}
            onChange={(event) => onChange("status", event.target.value)}
            disabled={isLoading}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </label>

        <label className="field">
          <span>Type</span>
          <select
            value={values.type}
            onChange={(event) => onChange("type", event.target.value)}
            disabled={isLoading}
          >
            <option value="">All types</option>
            <option value="demo">Demo</option>
            <option value="email">Email</option>
          </select>
        </label>

        <label className="field">
          <span>Sort order</span>
          <select
            value={values.sortOrder}
            onChange={(event) => onChange("sortOrder", event.target.value)}
            disabled={isLoading}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </label>

        <label className="field">
          <span>Limit</span>
          <select
            value={values.limit}
            onChange={(event) => onChange("limit", event.target.value)}
            disabled={isLoading}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </label>
      </div>
    </section>
  );
}

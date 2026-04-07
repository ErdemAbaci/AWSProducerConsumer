import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../lib/api";
import { getErrorMessage } from "../lib/utils";
import type { CreateJobInput, JobType } from "../types/job";

function buildDemoPayload(input: string): Record<string, unknown> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error("Demo payload must be valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Demo payload must be a JSON object.");
  }

  if (Object.keys(parsed).length === 0) {
    throw new Error("Demo payload cannot be empty.");
  }

  return parsed as Record<string, unknown>;
}

export function CreateJobPage() {
  const navigate = useNavigate();
  const [jobType, setJobType] = useState<JobType>("demo");
  const [demoPayload, setDemoPayload] = useState('{\n  "task": "sample"\n}');
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: CreateJobInput =
        jobType === "demo"
          ? {
              type: "demo",
              payload: buildDemoPayload(demoPayload),
            }
          : {
              type: "email",
              payload: {
                to: emailTo.trim(),
                subject: emailSubject.trim(),
                body: emailBody.trim(),
              },
            };

      const result = await apiClient.createJob(payload);

      navigate(`/jobs/${result.id}`, {
        state: {
          notice: "Job created successfully.",
        },
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Could not create job."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Create Job</p>
          <h1>Submit a new job</h1>
          <p className="page-description">
            Use the existing `POST /jobs` endpoint to create demo or email jobs.
          </p>
        </div>
      </section>

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="type-toggle" role="tablist" aria-label="Job type">
          <button
            type="button"
            className={jobType === "demo" ? "toggle-button toggle-button-active" : "toggle-button"}
            onClick={() => setJobType("demo")}
          >
            Demo job
          </button>
          <button
            type="button"
            className={jobType === "email" ? "toggle-button toggle-button-active" : "toggle-button"}
            onClick={() => setJobType("email")}
          >
            Email job
          </button>
        </div>

        {jobType === "demo" ? (
          <label className="field">
            <span>Payload JSON</span>
            <textarea
              rows={12}
              value={demoPayload}
              onChange={(event) => setDemoPayload(event.target.value)}
              placeholder='{\n  "task": "sample"\n}'
              disabled={isSubmitting}
              required
            />
          </label>
        ) : (
          <div className="form-grid">
            <label className="field">
              <span>To</span>
              <input
                type="email"
                value={emailTo}
                onChange={(event) => setEmailTo(event.target.value)}
                placeholder="user@example.com"
                disabled={isSubmitting}
                required
              />
            </label>

            <label className="field">
              <span>Subject</span>
              <input
                type="text"
                value={emailSubject}
                onChange={(event) => setEmailSubject(event.target.value)}
                placeholder="Welcome to the platform"
                disabled={isSubmitting}
                required
              />
            </label>

            <label className="field field-full">
              <span>Body</span>
              <textarea
                rows={10}
                value={emailBody}
                onChange={(event) => setEmailBody(event.target.value)}
                placeholder="Write the email body here..."
                disabled={isSubmitting}
                required
              />
            </label>
          </div>
        )}

        {error ? <div className="inline-message inline-message-error">{error}</div> : null}

        <div className="form-actions">
          <button type="submit" className="button button-primary" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create job"}
          </button>
        </div>
      </form>
    </div>
  );
}

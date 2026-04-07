type LoadingStateProps = {
  label?: string;
  fullscreen?: boolean;
};

export function LoadingState({
  label = "Loading...",
  fullscreen = false,
}: LoadingStateProps) {
  return (
    <div className={fullscreen ? "loading-state loading-state-fullscreen" : "loading-state"}>
      <div className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

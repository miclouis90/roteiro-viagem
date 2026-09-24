export function LoadingState({ label }: { label: string }) {
  return (
    <div className="loading-preview" role="status" aria-label={label}>
      <p>{label}</p>
      <div className="skeleton-hero" aria-hidden="true" />
      <div className="skeleton-days" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} />
        ))}
      </div>
    </div>
  );
}

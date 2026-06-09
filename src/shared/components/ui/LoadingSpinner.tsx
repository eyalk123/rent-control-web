export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={`h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent ${className ?? ''}`} />
  );
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner className="h-8 w-8" />
    </div>
  );
}

/** Fills the content area and centers — keeps the spinner in the same spot as the AppShell chunk fallback. */
export function FullPageLoader() {
  return (
    <div className="h-full min-h-64 flex items-center justify-center">
      <LoadingSpinner className="h-8 w-8" />
    </div>
  );
}

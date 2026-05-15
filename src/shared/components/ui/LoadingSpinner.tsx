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

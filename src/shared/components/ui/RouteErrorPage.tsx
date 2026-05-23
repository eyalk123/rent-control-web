import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Something went wrong';
  let detail = 'An unexpected error occurred.';

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    detail = typeof error.data === 'string' ? error.data : detail;
  } else if (error instanceof Error) {
    detail = error.message;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: 'var(--color-background)' }}>
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--color-error-subtle, #fef2f2)' }}>
        <AlertTriangle size={28} style={{ color: 'var(--color-error)' }} strokeWidth={1.5} />
      </div>
      <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
      <p className="mt-2 text-sm max-w-sm" style={{ color: 'var(--color-text-secondary)' }}>{detail}</p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="h-9 px-4 rounded-[9px] text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)', background: 'var(--color-surface)' }}
        >
          Go back
        </button>
        <button
          onClick={() => navigate('/home', { replace: true })}
          className="h-9 px-4 rounded-[9px] text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-primary)' }}
        >
          Go home
        </button>
      </div>
    </div>
  );
}

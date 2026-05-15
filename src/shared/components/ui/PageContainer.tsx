interface Props {
  children: React.ReactNode;
  className?: string;
  /** Constrain content to max-w-5xl (default) or full width */
  fullWidth?: boolean;
}

export function PageContainer({ children, className = '', fullWidth }: Props) {
  return (
    <div className={`px-4 py-6 lg:px-8 lg:py-8 ${fullWidth ? '' : 'max-w-5xl mx-auto'} ${className}`}>
      {children}
    </div>
  );
}

interface Props {
  children: React.ReactNode;
  className?: string;
  /** Content max width. 'default' = max-w-5xl, 'wide' = max-w-6xl, 'full' = no constraint. */
  width?: 'default' | 'wide' | 'full';
}

const WIDTH_CLASS: Record<NonNullable<Props['width']>, string> = {
  default: 'max-w-5xl mx-auto',
  wide: 'max-w-6xl mx-auto',
  full: '',
};

export function PageContainer({ children, className = '', width = 'default' }: Props) {
  return (
    <div className={`px-4 py-6 lg:px-8 lg:py-8 ${WIDTH_CLASS[width]} ${className}`}>
      {children}
    </div>
  );
}

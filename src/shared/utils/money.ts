const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number | null | undefined): string {
  if (amount == null) return '₪0';
  return `${numberFormatter.format(amount)}₪`;
}

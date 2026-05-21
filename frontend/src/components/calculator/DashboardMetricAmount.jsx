import { formatCurrency } from '@/lib/utils';

function metricAmountSizeClass(formatted) {
  const len = String(formatted || '').length;
  if (len > 18) return 'text-sm';
  if (len > 14) return 'text-base';
  if (len > 11) return 'text-lg';
  return 'text-xl';
}

export default function DashboardMetricAmount({ value, className = '', size = 'default' }) {
  const formatted = formatCurrency(value);
  const sizeClass =
    size === 'hero'
      ? 'text-2xl sm:text-3xl'
      : metricAmountSizeClass(formatted);
  return (
    <p
      className={`font-bold font-mono tabular-nums leading-tight break-words min-w-0 ${sizeClass} ${className}`}
      title={formatted}
    >
      {formatted}
    </p>
  );
}

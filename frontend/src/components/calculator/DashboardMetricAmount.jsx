import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '@/lib/utils';

function metricAmountSizeClass(formatted) {
  const len = String(formatted || '').length;
  if (len > 18) return 'text-sm';
  if (len > 14) return 'text-base';
  if (len > 11) return 'text-lg';
  return 'text-xl';
}

export default function DashboardMetricAmount({ value, className = '', size = 'default', animate = true }) {
  const [displayValue, setDisplayValue] = useState(Number(value) || 0);
  const prevRef = useRef(Number(value) || 0);

  useEffect(() => {
    const next = Number(value) || 0;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animate || prefersReduced) {
      setDisplayValue(next);
      prevRef.current = next;
      return undefined;
    }
    const from = prevRef.current;
    const to = next;
    if (from === to) return undefined;
    const start = performance.now();
    const duration = 120;
    let frame;
    const tick = now => {
      const t = Math.min(1, (now - start) / duration);
      setDisplayValue(from + (to - from) * t);
      if (t < 1) frame = requestAnimationFrame(tick);
      else prevRef.current = to;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, animate]);

  const formatted = formatCurrency(displayValue);
  const sizeClass =
    size === 'hero'
      ? 'text-2xl sm:text-3xl'
      : metricAmountSizeClass(formatted);
  return (
    <p
      className={`font-bold font-mono tabular-nums leading-tight break-words min-w-0 ${sizeClass} ${className}`}
      title={formatCurrency(value)}
    >
      {formatted}
    </p>
  );
}

import { mapLineHealthBadge } from '@/lib/pricingHealth';
import { healthScoreTone } from '@/lib/productWorkspaceUtils';

export default function ProductHealthIndicator({ score, validation, isDarkMode, compact = false }) {
  const health = mapLineHealthBadge(validation, isDarkMode);
  const scoreTone = healthScoreTone(score, isDarkMode);

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 shrink-0 rounded-md border px-2 py-1 ${health.className}`}
        title={score != null ? `Product health score: ${score} / 100` : health.label}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0" aria-hidden />
        <span className="text-[11px] font-medium leading-none">{health.label}</span>
        {score != null && (
          <span className={`text-[11px] font-mono font-semibold tabular-nums leading-none ${scoreTone}`}>
            {score}/100
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-lg border px-3 py-1.5 ${health.className}`}
      title={score != null ? `Product health score: ${score} / 100` : health.label}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-current opacity-80 shrink-0" aria-hidden />
        <span className="text-xs font-medium">{health.label}</span>
      </div>
      {score != null ? (
        <span className={`text-xs font-mono font-semibold tabular-nums ${scoreTone}`}>{score} / 100</span>
      ) : (
        <span className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>—</span>
      )}
    </div>
  );
}

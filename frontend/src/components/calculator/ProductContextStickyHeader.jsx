import { formatCurrency, formatCurrencyCompact } from '@/lib/utils';
import { mapLineHealthBadge } from '@/lib/pricingHealth';
import { computeProductHealthScore, deriveLineValidation, healthScoreTone } from '@/lib/productWorkspaceUtils';

export default function ProductContextStickyHeader({
  productName,
  tier,
  line,
  item,
  isDarkMode,
}) {
  const validation = deriveLineValidation(line, item);
  const health = mapLineHealthBadge(validation, isDarkMode);
  const healthScore = computeProductHealthScore(line, item);
  const sellingNum = line?.selling ?? 0;
  const hasSelling = line && Number(sellingNum) > 0;
  const sellingFull = hasSelling ? formatCurrency(sellingNum, true) : '—';
  const sellingCompact = hasSelling ? formatCurrencyCompact(sellingNum, true) : '—';

  const surface = isDarkMode
    ? 'bg-neutral-950/80 border-neutral-800/80 backdrop-blur-sm'
    : 'bg-white/90 border-slate-200 backdrop-blur-sm';
  const nameClass = isDarkMode ? 'text-white' : 'text-slate-900';
  const muted = isDarkMode ? 'text-neutral-400' : 'text-slate-500';
  const sellingClass = isDarkMode ? 'text-emerald-400' : 'text-emerald-600';
  const healthTextClass = healthScore != null ? healthScoreTone(healthScore, isDarkMode) : muted;

  const healthText =
    healthScore != null ? `${health.label} · ${healthScore}` : health.label;

  return (
    <div
      className={`sticky top-0 z-20 px-3 py-2 border-b ${surface}`}
      data-testid="product-context-sticky-header"
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className={`text-sm font-semibold min-w-0 line-clamp-1 break-words ${nameClass}`}>
          {productName || 'Untitled service'}
        </span>
        {tier && (
          <span
            className={`text-[10px] font-mono font-medium uppercase tracking-wide px-2 py-0.5 rounded shrink-0 ${
              isDarkMode ? 'bg-neutral-800/80 text-neutral-400' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {String(tier).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 mt-1">
        <span
          className={`text-sm font-semibold font-mono tabular-nums ${sellingClass}`}
          title={sellingFull}
        >
          <span className="sm:hidden">{sellingCompact}</span>
          <span className="hidden sm:inline">{sellingFull}</span>
        </span>
        <span className={`text-xs font-medium tabular-nums shrink-0 ${healthTextClass}`}>
          {healthText}
        </span>
      </div>
    </div>
  );
}

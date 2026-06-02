import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DashboardMetricAmount from './DashboardMetricAmount';
import { formatCurrency } from '@/lib/utils';
import {
  derivePricingHealth,
  derivePricingSummaryDisplay,
} from '@/lib/pricingHealth';

function MetricCell({ label, value, isPercent, calculating, isDarkMode, size = 'default' }) {
  const display =
    calculating ? (
      <div className={`h-6 w-20 rounded animate-pulse ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-200'}`} />
    ) : value == null ? (
      <span className={`font-mono text-sm ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>—</span>
    ) : isPercent ? (
      <span
        className={`font-mono font-semibold tabular-nums ${
          value >= 30
            ? 'text-emerald-500'
            : value >= 20
              ? 'text-amber-500'
              : 'text-rose-500'
        } ${size === 'sm' ? 'text-sm' : 'text-base'}`}
      >
        {value.toFixed(1)}%
      </span>
    ) : (
      <DashboardMetricAmount
        value={value}
        size={size === 'sm' ? 'default' : 'default'}
        className={isDarkMode ? 'text-white' : 'text-slate-900'}
      />
    );

  return (
    <div className="min-w-0">
      <p className={`text-[10px] font-medium uppercase tracking-wide truncate ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
        {label}
      </p>
      <div className="mt-0.5">{display}</div>
    </div>
  );
}

function SummaryMetrics({ summary, calculating, isDarkMode, compact }) {
  const cols = compact
    ? 'grid grid-cols-2 gap-3'
    : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6';

  return (
    <div className={cols}>
      <MetricCell label="Total Cost" value={summary.hasResults ? summary.totalCost : null} calculating={calculating} isDarkMode={isDarkMode} />
      <MetricCell
        label="Min Selling"
        value={summary.minSelling > 0 ? summary.minSelling : summary.hasResults ? 0 : null}
        calculating={calculating}
        isDarkMode={isDarkMode}
      />
      <MetricCell label="Final Price" value={summary.hasResults ? summary.finalPrice : null} calculating={calculating} isDarkMode={isDarkMode} />
      <MetricCell
        label="Margin"
        value={summary.hasResults ? summary.marginPercent : null}
        isPercent
        calculating={calculating}
        isDarkMode={isDarkMode}
      />
      <MetricCell
        label="Contribution"
        value={summary.hasResults ? summary.contributionMargin : null}
        calculating={calculating}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

export default function StickyPricingSummary({
  results,
  calculating,
  isDarkMode,
  sheetMinSellingTotal = 0,
  sheetPriceFloorWarning,
  calcData,
  selectedProducts = [],
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pricePulse, setPricePulse] = useState(false);
  const prevPrice = useRef(results?.selling_price ?? 0);

  const customMarginCount = useMemo(
    () => (selectedProducts || []).filter(p => p.margin_source === 'custom').length,
    [selectedProducts]
  );

  const summary = useMemo(
    () => derivePricingSummaryDisplay(results, sheetMinSellingTotal),
    [results, sheetMinSellingTotal]
  );

  const health = useMemo(
    () =>
      derivePricingHealth({
        results,
        sheetMinSelling: sheetMinSellingTotal,
        sheetPriceFloorWarning,
        calcData,
        customMarginCount,
      }),
    [results, sheetMinSellingTotal, sheetPriceFloorWarning, calcData, customMarginCount]
  );

  useEffect(() => {
    const next = results?.selling_price ?? 0;
    if (next > 0 && next !== prevPrice.current) {
      prevPrice.current = next;
      setPricePulse(true);
      const t = setTimeout(() => setPricePulse(false), 600);
      return () => clearTimeout(t);
    }
    prevPrice.current = next;
    return undefined;
  }, [results?.selling_price]);

  const badgeClass = isDarkMode ? health.badge.dark : health.badge.light;

  const healthHeader = (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`text-xs font-medium shrink-0 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
        Pricing Health
      </span>
      <Badge className={`text-xs font-medium border shrink-0 ${badgeClass}`}>{health.label}</Badge>
    </div>
  );

  const cardBase = isDarkMode
    ? 'border-neutral-800/80 bg-neutral-950/85 backdrop-blur-md shadow-sm shadow-black/20'
    : 'border-slate-200/90 bg-white/95 backdrop-blur-md shadow-sm';

  return (
    <>
      {/* Desktop / tablet sticky */}
      <div
        className={`hidden md:block sticky top-[148px] z-30 mb-5 rounded-2xl border px-4 py-3 ${cardBase} ${
          pricePulse ? 'quote-price-pulse' : ''
        }`}
        data-testid="sticky-pricing-summary"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {healthHeader}
          <SummaryMetrics summary={summary} calculating={calculating} isDarkMode={isDarkMode} />
        </div>
      </div>

      {/* Mobile floating collapsible */}
      <div
        className={`md:hidden fixed bottom-20 left-4 right-4 z-40 rounded-xl border ${cardBase} ${
          pricePulse ? 'quote-price-pulse' : ''
        }`}
        data-testid="sticky-pricing-summary-mobile"
      >
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
          onClick={() => setMobileOpen(o => !o)}
        >
          <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
            <Badge className={`text-[10px] font-medium border ${badgeClass}`}>{health.label}</Badge>
            {!calculating && summary.hasResults && (
              <>
                <span className={`text-xs font-mono tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(summary.finalPrice)}
                </span>
                <span className={`text-xs font-mono ${summary.marginPercent >= 20 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {summary.marginPercent.toFixed(1)}%
                </span>
              </>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 shrink-0 transition-transform ${mobileOpen ? 'rotate-180' : ''} ${
              isDarkMode ? 'text-neutral-500' : 'text-slate-500'
            }`}
          />
        </button>
        {mobileOpen && (
          <div className={`px-3 pb-3 pt-1 border-t ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
            {healthHeader}
            <div className="mt-3">
              <SummaryMetrics summary={summary} calculating={calculating} isDarkMode={isDarkMode} compact />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

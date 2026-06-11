import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import QuoteReadiness from './QuoteReadiness';
import DashboardMetricAmount from './DashboardMetricAmount';
import { formatCurrency } from '@/lib/utils';

export default function QuoteHealthStrip({
  results,
  previewSelling,
  calculating,
  readiness,
  isDarkMode,
  sheetPriceFloorWarning,
  variant = 'full',
}) {
  const displayPrice = previewSelling ?? results?.selling_price ?? 0;
  const [pricePulse, setPricePulse] = useState(false);
  const prevPrice = useRef(displayPrice);
  const compact = variant === 'compact';

  useEffect(() => {
    const next = displayPrice;
    if (next > 0 && next !== prevPrice.current) {
      prevPrice.current = next;
      setPricePulse(true);
      const t = setTimeout(() => setPricePulse(false), 600);
      return () => clearTimeout(t);
    }
    prevPrice.current = next;
    return undefined;
  }, [displayPrice]);

  const margin = results?.contribution_margin_percent ?? 0;
  const marginColor =
    margin >= 30 ? 'text-emerald-500' : margin >= 20 ? 'text-amber-500' : 'text-rose-500';

  if (compact) {
    return (
      <div
        className={`sticky top-[73px] z-40 border-b ${
          isDarkMode ? 'bg-neutral-950/95 border-neutral-800 backdrop-blur-md' : 'bg-white/95 border-slate-200 backdrop-blur-md shadow-sm'
        } ${pricePulse ? 'quote-price-pulse' : ''}`}
        data-testid="quote-health-strip"
        data-variant="compact"
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2">
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-sm">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className={`text-xs shrink-0 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                Selling
              </span>
              {calculating ? (
                <span className={`h-5 w-24 rounded animate-pulse inline-block ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-200'}`} />
              ) : (
                <span className={`font-bold font-mono tabular-nums transition-all duration-100 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(displayPrice)}
                </span>
              )}
            </div>
            <span className={`hidden sm:block h-4 w-px ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-200'}`} />
            <div className="flex items-baseline gap-2">
              <span className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Quote margin</span>
              <span className={`font-bold font-mono tabular-nums ${marginColor}`}>{margin.toFixed(1)}%</span>
            </div>
            {results?.incentive_breakdown?.deal_size && (
              <Badge
                className={`uppercase text-[10px] font-mono border ${
                  isDarkMode ? 'bg-neutral-800 text-neutral-300 border-neutral-600' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {results.incentive_breakdown.deal_size}
              </Badge>
            )}
            {sheetPriceFloorWarning && (
              <span className={`text-xs ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                Below sheet min (O)
              </span>
            )}
            <div className="ml-auto hidden md:block text-right">
              <QuoteReadiness readiness={readiness} isDarkMode={isDarkMode} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`sticky top-[73px] z-40 border-b ${
        isDarkMode ? 'bg-neutral-950/95 border-neutral-800 backdrop-blur-md' : 'bg-white/95 border-slate-200 backdrop-blur-md shadow-sm'
      } ${pricePulse ? 'quote-price-pulse' : ''}`}
      data-testid="quote-health-strip"
      data-variant="full"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="min-w-0 flex-1 sm:flex-none">
            <p className={`text-xs font-medium ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              Selling price
            </p>
            {calculating && previewSelling == null ? (
              <div className={`h-8 w-36 mt-1 rounded animate-pulse ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-200'}`} />
            ) : (
              <DashboardMetricAmount
                value={displayPrice}
                size="hero"
                className={`transition-all duration-100 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
              />
            )}
          </div>

          <div className="hidden sm:block h-10 w-px bg-neutral-800/80" />

          <div>
            <p className={`text-xs font-medium ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              Quote margin
            </p>
            <p className={`text-lg font-bold font-mono tabular-nums ${marginColor}`}>
              {margin.toFixed(1)}%
            </p>
          </div>

          {results?.incentive_breakdown?.deal_size && (
            <Badge
              className={`uppercase text-xs font-mono border ${
                results.incentive_breakdown.deal_size === 'mega'
                  ? isDarkMode
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-blue-100 text-blue-700 border-blue-200'
                  : isDarkMode
                    ? 'bg-neutral-700 text-neutral-300 border-neutral-600'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {results.incentive_breakdown.deal_size}
            </Badge>
          )}

          <div className="flex-1 flex justify-end items-center gap-3 min-w-[120px]">
            <QuoteReadiness readiness={readiness} isDarkMode={isDarkMode} />
          </div>
        </div>

        {sheetPriceFloorWarning && (
          <p className={`text-xs mt-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
            Below sheet minimum (O): {formatCurrency(sheetPriceFloorWarning.floor)}
          </p>
        )}

        {!results && !calculating && (
          <p className={`text-xs mt-2 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
            Start with products or load a template — your quote updates live.
          </p>
        )}
      </div>
    </div>
  );
}

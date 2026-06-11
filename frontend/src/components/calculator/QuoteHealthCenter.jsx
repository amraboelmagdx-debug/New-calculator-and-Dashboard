import { Activity, TrendingDown, AlertTriangle } from 'lucide-react';
import LiveQuoteSummary from './LiveQuoteSummary';
import { formatCurrencyCompact } from '@/lib/utils';

function lineRevenue(l) {
  return Number(l.selling) || 0;
}
function lineProfit(l) {
  return (Number(l.selling) || 0) - (Number(l.cost) || 0);
}
function lineMargin(l) {
  return Number(l.margin_percent) || 0;
}

function HealthStatus({ margin, target, floorWarning, isDarkMode }) {
  let tone;
  let label;
  let Icon;
  if (floorWarning || margin < 20) {
    tone = isDarkMode ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200';
    label = floorWarning ? 'At risk — below sheet minimum' : 'At risk — low margin';
    Icon = AlertTriangle;
  } else if (margin < target) {
    tone = isDarkMode ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200';
    label = 'Watch — below target';
    Icon = Activity;
  } else {
    tone = isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = 'Healthy';
    Icon = Activity;
  }
  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 ${tone}`} data-testid="quote-health-status">
      <span className="flex items-center gap-1.5 text-[13px] font-semibold">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      <span className="text-[13px] font-mono tabular-nums">
        {margin.toFixed(1)}% / {target}%
      </span>
    </div>
  );
}

function DistributionBar({ cogs, profit, isDarkMode }) {
  const total = Math.max(cogs + profit, 0);
  if (total <= 0) return null;
  const cogsPct = (cogs / total) * 100;
  const profitPct = Math.max(0, 100 - cogsPct);
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  return (
    <div data-testid="quote-cost-profit-distribution">
      <p className={`text-[11px] uppercase tracking-wider mb-2 ${muted}`}>Cost / profit distribution</p>
      <div className={`flex h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`}>
        <div className="h-full bg-slate-400/80" style={{ width: `${cogsPct}%` }} />
        <div className="h-full bg-emerald-500" style={{ width: `${profitPct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className={muted}>COGS {formatCurrencyCompact(cogs, true)}</span>
        <span className={`font-medium ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
          Profit {formatCurrencyCompact(profit, true)}
        </span>
      </div>
    </div>
  );
}

function ContributorList({ title, items, accessor, isDarkMode, formatValue, danger }) {
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  if (!items.length) return null;
  return (
    <div>
      <p className={`text-[11px] uppercase tracking-wider mb-1.5 ${muted}`}>{title}</p>
      <div className="space-y-1.5">
        {items.map(l => (
          <div key={l.id} className="flex items-center justify-between gap-2 text-xs">
            <span className={`truncate min-w-0 ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
              {l.product_name}
            </span>
            <span
              className={`font-mono tabular-nums shrink-0 ${
                danger && l._below ? (isDarkMode ? 'text-rose-400' : 'text-rose-600') : isDarkMode ? 'text-neutral-200' : 'text-slate-800'
              }`}
            >
              {formatValue(accessor(l))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QuoteHealthCenter({
  results,
  previewSelling,
  calculating,
  isDarkMode,
  sheetPriceFloorWarning,
  calcData,
  readiness,
  productCount = 0,
}) {
  const margin = results?.contribution_margin_percent ?? 0;
  const target = Number(calcData?.target_margin_percent) || 30;
  const lines = (results?.margin_breakdown?.products || []).filter(l => l.product_name);

  const cogs = Number(results?.cogs) || 0;
  const profit = Math.max(0, (Number(results?.selling_price) || 0) - cogs);

  const topRevenue = [...lines].sort((a, b) => lineRevenue(b) - lineRevenue(a)).slice(0, 4);
  const topProfit = [...lines].sort((a, b) => lineProfit(b) - lineProfit(a)).slice(0, 4);
  const bottomMargin = [...lines]
    .sort((a, b) => lineMargin(a) - lineMargin(b))
    .slice(0, 4)
    .map(l => ({ ...l, _below: Number(l.sheet_min_margin_percent) > 0 && lineMargin(l) < Number(l.sheet_min_margin_percent) }));

  const hasLines = lines.length > 0;
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';

  return (
    <div className="space-y-5" data-testid="quote-health-center">
      {results && <HealthStatus margin={margin} target={target} floorWarning={sheetPriceFloorWarning} isDarkMode={isDarkMode} />}

      <LiveQuoteSummary
        results={results}
        previewSelling={previewSelling}
        calculating={calculating}
        isDarkMode={isDarkMode}
        sheetPriceFloorWarning={sheetPriceFloorWarning}
        calcData={calcData}
        readiness={readiness}
        productCount={productCount}
      />

      {hasLines && (
        <>
          <DistributionBar cogs={cogs} profit={profit} isDarkMode={isDarkMode} />

          <div className="grid grid-cols-2 gap-3">
            <ContributorList
              title="Top revenue"
              items={topRevenue}
              accessor={lineRevenue}
              formatValue={v => formatCurrencyCompact(v, true)}
              isDarkMode={isDarkMode}
            />
            <ContributorList
              title="Top profit"
              items={topProfit}
              accessor={lineProfit}
              formatValue={v => formatCurrencyCompact(v, true)}
              isDarkMode={isDarkMode}
            />
          </div>

          <ContributorList
            title="Bottom margin"
            items={bottomMargin}
            accessor={lineMargin}
            formatValue={v => `${v.toFixed(0)}%`}
            isDarkMode={isDarkMode}
            danger
          />
          <p className={`text-[11px] leading-relaxed ${muted}`}>
            <TrendingDown className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
            Lowest-margin services drag profitability; red values are below the sheet minimum.
          </p>
        </>
      )}
    </div>
  );
}

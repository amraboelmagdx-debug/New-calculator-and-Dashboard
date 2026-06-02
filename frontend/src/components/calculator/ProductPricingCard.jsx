import { Lock, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import DashboardMetricAmount from './DashboardMetricAmount';
import ProductPricingBreakdown from './ProductPricingBreakdown';
import { formatCurrencyCompact } from '@/lib/utils';
import { mapLineHealthBadge } from '@/lib/pricingHealth';
import { executionModeLabel } from '@/lib/pricingCostRules';

function MarginRangeBar({ value, min, target, isDarkMode }) {
  const minP = Math.min(100, Math.max(0, min || 0));
  const targetP = Math.min(100, Math.max(minP, target || 30));
  const valP = Math.min(100, Math.max(0, value || 0));
  return (
    <div className={`relative h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-200'}`}>
      <div
        className={`absolute inset-y-0 left-0 ${isDarkMode ? 'bg-amber-500/30' : 'bg-amber-200'}`}
        style={{ width: `${minP}%` }}
      />
      <div
        className={`absolute inset-y-0 ${isDarkMode ? 'bg-emerald-500/25' : 'bg-emerald-200'}`}
        style={{ left: `${minP}%`, width: `${targetP - minP}%` }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-500 border-2 border-white shadow"
        style={{ left: `calc(${valP}% - 4px)` }}
      />
    </div>
  );
}

function marginPercentColor(pct, isDarkMode) {
  if (pct >= 30) return isDarkMode ? 'text-emerald-400' : 'text-emerald-600';
  if (pct >= 20) return isDarkMode ? 'text-amber-400' : 'text-amber-600';
  return isDarkMode ? 'text-rose-400' : 'text-rose-600';
}

export default function ProductPricingCard({
  line,
  item,
  breakdown,
  isDarkMode,
  inputClass,
  target,
  minM,
  updateProductMargin,
  setSelectedProducts,
  footnote,
}) {
  const marginPct = item?.margin_percent ?? line.margin_percent ?? 0;
  const health = mapLineHealthBadge(line.validation, isDarkMode);
  const segmentLabel = `${(line.segment || '').toUpperCase()} · Qty ${line.quantity}`;

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 space-y-5 ${
        isDarkMode ? 'border-neutral-800/60 bg-neutral-950/40' : 'border-slate-200/80 bg-white'
      }`}
      data-testid="product-pricing-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className={`text-base font-semibold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {line.product_name}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] font-normal border ${
                isDarkMode ? 'border-neutral-700 text-neutral-400' : 'border-slate-200 text-slate-600'
              }`}
            >
              {segmentLabel}
            </Badge>
            {line.execution_mode && (
              <span className={`text-[10px] ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>
                {executionModeLabel(line.execution_mode)}
              </span>
            )}
          </div>
        </div>
        <Badge className={health.className}>{health.label}</Badge>
      </div>

      <div
        className={`rounded-xl p-4 ${
          isDarkMode ? 'bg-neutral-900/40' : 'bg-slate-50/80'
        }`}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <DashboardMetricAmount
              value={line.line_selling || 0}
              className={`${isDarkMode ? 'text-white' : 'text-slate-900'} text-3xl sm:text-4xl font-semibold`}
            />
            <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              Final Selling Price
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-2xl sm:text-3xl font-semibold tabular-nums ${marginPercentColor(marginPct, isDarkMode)}`}>
              {Number(marginPct).toFixed(1)}%
            </span>
            <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Margin</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center sm:text-left">
        <div>
          <p className={`text-[10px] uppercase tracking-wide ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>
            Package Cost
          </p>
          <p className={`text-xs sm:text-sm font-mono font-medium tabular-nums mt-0.5 ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
            {formatCurrencyCompact(breakdown?.basePackageCost ?? line.cost)}
          </p>
        </div>
        <div>
          <p className={`text-[10px] uppercase tracking-wide ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>
            Min Selling
          </p>
          <p className={`text-xs sm:text-sm font-mono font-medium tabular-nums mt-0.5 ${isDarkMode ? 'text-emerald-400/90' : 'text-emerald-700'}`}>
            {formatCurrencyCompact(line.sheet_min_selling)}
          </p>
        </div>
        <div>
          <p className={`text-[10px] uppercase tracking-wide ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>
            Additional
          </p>
          <p className={`text-xs sm:text-sm font-mono font-medium tabular-nums mt-0.5 ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
            {formatCurrencyCompact(breakdown?.additionalHoursCost ?? 0)}
          </p>
        </div>
      </div>

      <ProductPricingBreakdown breakdown={breakdown} isDarkMode={isDarkMode} footnote={footnote} />

      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between gap-2">
          <Label className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Margin %</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              className={`w-16 h-8 text-sm py-0 ${inputClass}`}
              value={item?.margin_percent ?? line.margin_percent}
              onChange={e => updateProductMargin(line.id, parseFloat(e.target.value) || 0, true)}
            />
            <button
              type="button"
              title={item?.locked ? 'Margin locked' : 'Margin follows sheet/global'}
              onClick={() =>
                setSelectedProducts(prev =>
                  prev.map(p => (p.id === line.id ? { ...p, locked: !p.locked } : p))
                )
              }
              className={isDarkMode ? 'text-neutral-500 hover:text-white' : 'text-slate-400 hover:text-slate-700'}
            >
              {item?.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <MarginRangeBar value={marginPct} min={minM} target={target} isDarkMode={isDarkMode} />
        <Slider
          className="py-0"
          value={[Math.min(80, Math.max(0, marginPct))]}
          min={0}
          max={80}
          step={0.5}
          onValueChange={([v]) => updateProductMargin(line.id, v, true)}
        />
      </div>
    </div>
  );
}

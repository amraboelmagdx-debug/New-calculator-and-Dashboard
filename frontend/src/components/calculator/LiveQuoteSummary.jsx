import { AlertTriangle } from 'lucide-react';
import DashboardMetricAmount from './DashboardMetricAmount';
import IntelligenceAlerts from './IntelligenceAlerts';
import QuoteReadiness from './QuoteReadiness';
import { formatCurrency } from '@/lib/utils';

function SummaryRow({ label, value, isDarkMode, bold }) {
  return (
    <div className="flex justify-between gap-2 text-[13px] min-w-0">
      <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-500'}>{label}</span>
      <span
        className={`font-mono tabular-nums text-right shrink-0 ${
          bold ? (isDarkMode ? 'text-neutral-100 font-semibold' : 'text-slate-900 font-semibold') : isDarkMode ? 'text-neutral-200' : 'text-slate-700'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function LiveQuoteSummary({
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
  const marginColor =
    margin >= 30 ? 'text-emerald-500' : margin >= 20 ? 'text-amber-500' : 'text-rose-500';

  const lines = results?.margin_breakdown?.products || [];
  const totalTeam = lines.reduce(
    (s, l) => s + (Number(l.team_cost) || Number(l.internal_cost) || 0),
    0
  );
  const vendorCost = Number(results?.vendor_cost) || 0;

  return (
    <div className="space-y-5" data-testid="live-quote-summary">
      <div>
        <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
          Selling price
        </p>
        {calculating && previewSelling == null ? (
          <div className={`h-10 w-full rounded animate-pulse ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-200'}`} />
        ) : (
          <DashboardMetricAmount
            value={previewSelling ?? results?.selling_price ?? 0}
            size="hero"
            className={`transition-all duration-100 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
          />
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className={`text-[13px] font-medium ${isDarkMode ? 'text-neutral-300' : 'text-slate-600'}`}>Quote margin</span>
          <span className={`text-lg font-bold font-mono tabular-nums ${marginColor}`}>
            {margin.toFixed(1)}%
          </span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`}>
          <div
            className={`h-full transition-all duration-500 ease-out ${
              margin >= 30 ? 'bg-emerald-500' : margin >= 20 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
          />
        </div>
      </div>

      <div
        className={`rounded-lg border px-3.5 py-3 space-y-2.5 ${
          isDarkMode ? 'border-neutral-800 bg-neutral-950/50' : 'border-slate-200 bg-slate-50/80'
        }`}
      >
        <SummaryRow label="Team cost" value={formatCurrency(totalTeam, true)} isDarkMode={isDarkMode} />
        <SummaryRow label="Vendor cost" value={formatCurrency(vendorCost, true)} isDarkMode={isDarkMode} />
        <SummaryRow
          label="Products"
          value={String(productCount)}
          isDarkMode={isDarkMode}
          bold
        />
      </div>

      {readiness && (
        <div className="flex justify-end">
          <QuoteReadiness readiness={readiness} isDarkMode={isDarkMode} />
        </div>
      )}

      <IntelligenceAlerts
        results={results}
        sheetPriceFloorWarning={sheetPriceFloorWarning}
        calcData={calcData}
        isDarkMode={isDarkMode}
        maxAlerts={3}
      />

      {results?.warnings?.length > 0 && (
        <div className="space-y-2">
          {results.warnings.slice(0, 3).map((warning, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg text-[13px] flex items-start gap-2 ${
                warning.severity === 'error'
                  ? isDarkMode
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                  : isDarkMode
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="line-clamp-3">{warning.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

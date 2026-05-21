import { formatCurrency } from '@/lib/utils';

function Row({ label, value, sub, isDarkMode, bold }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>{label}</span>
      <div className="text-right">
        <span
          className={`font-mono tabular-nums block ${
            bold
              ? isDarkMode
                ? 'text-white font-semibold'
                : 'text-slate-900 font-semibold'
              : isDarkMode
                ? 'text-neutral-300'
                : 'text-slate-700'
          }`}
        >
          {value}
        </span>
        {sub && (
          <span className={`block text-[10px] mt-0.5 ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProductPricingBreakdown({ breakdown, isDarkMode, footnote }) {
  if (!breakdown) return null;

  const marginSub = breakdown.floorApplied
    ? `Floor applied · ${breakdown.marginPercent}% target`
    : `${breakdown.marginPercent}% on base`;

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        isDarkMode ? 'border-neutral-800 bg-neutral-950/50' : 'border-slate-200 bg-white'
      }`}
      data-testid="product-pricing-breakdown"
    >
      <p className={`text-[10px] font-medium uppercase tracking-wide ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
        Pricing breakdown
      </p>
      <Row
        label="Base Package Cost"
        value={formatCurrency(breakdown.basePackageCost)}
        isDarkMode={isDarkMode}
      />
      <Row label="Included Team Scope" value={breakdown.includedTeamScope} isDarkMode={isDarkMode} />
      <Row
        label="Additional Hours Cost"
        value={formatCurrency(breakdown.additionalHoursCost)}
        sub={
          breakdown.utilizationNote
            ? 'Utilization/seconded — see Team tab'
            : breakdown.belowBaselineNote
              ? 'Below included scope — no credit; package unchanged'
              : undefined
        }
        isDarkMode={isDarkMode}
      />
      <Row
        label="Vendor Cost"
        value="—"
        sub={breakdown.vendorCostNote}
        isDarkMode={isDarkMode}
      />
      <Row
        label="Margin Applied"
        value={formatCurrency(breakdown.marginApplied)}
        sub={marginSub}
        isDarkMode={isDarkMode}
      />
      <Row
        label="Final Selling Price"
        value={formatCurrency(breakdown.finalSellingPrice)}
        isDarkMode={isDarkMode}
        bold
      />
      {footnote && (
        <p className={`text-[10px] pt-1 ${isDarkMode ? 'text-amber-400/90' : 'text-amber-700'}`}>{footnote}</p>
      )}
    </div>
  );
}

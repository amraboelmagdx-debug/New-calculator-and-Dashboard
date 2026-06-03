import { Users, Building2, ShieldAlert, Percent } from 'lucide-react';
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils';
import {
  computeProductHealthScore,
  deriveLineValidation,
  resolveTeamCost,
} from '@/lib/productWorkspaceUtils';
import ProductHealthIndicator from './ProductHealthIndicator';

export default function ProductEconomicsBar({
  line,
  item,
  teamMembers,
  roles,
  standardMonthlyHours,
  marginPercent,
  isDarkMode,
}) {
  const dash = '—';
  const validation = deriveLineValidation(line, item);
  const healthScore = computeProductHealthScore(line, item);

  const fmtMoney = (value, hasLine) => {
    if (!hasLine) return { mobile: dash, desktop: dash, full: undefined };
    const n = Number(value) || 0;
    return {
      mobile: formatCurrencyCompact(n, true),
      desktop: formatCurrency(n, true),
      full: formatCurrency(n, true),
    };
  };

  const hasLine = Boolean(line);
  const productCost = fmtMoney(line?.cost ?? 0, hasLine);
  const teamCostNum = resolveTeamCost(line, teamMembers, roles, standardMonthlyHours);
  const teamCost = fmtMoney(teamCostNum, hasLine || teamCostNum > 0);
  const vendorCost = fmtMoney(line?.vendor_cost ?? 0, hasLine);
  const selling = fmtMoney(line?.selling ?? 0, hasLine);

  const riskMult =
    line?.risk_multiplier != null ? `${Number(line.risk_multiplier).toFixed(2)}x` : dash;
  const marginText =
    line?.margin_percent != null
      ? `${Math.round(line.margin_percent)}%`
      : marginPercent != null
        ? `${Math.round(marginPercent)}%`
        : dash;

  const labelClass = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const groupLabelClass = isDarkMode ? 'text-neutral-600' : 'text-slate-400';
  const valueClass = isDarkMode ? 'text-neutral-100' : 'text-slate-800';
  const sellingClass = isDarkMode ? 'text-emerald-400' : 'text-emerald-600';
  const dividerClass = isDarkMode ? 'border-neutral-800/60' : 'border-slate-200';

  const CurrencyValue = ({ values, accent, large = false }) => (
    <span
      className={`font-semibold tabular-nums ${
        large ? 'text-2xl sm:text-3xl' : 'text-sm sm:text-base'
      } ${accent || valueClass}`}
      title={values.full}
    >
      <span className="sm:hidden">{values.mobile}</span>
      <span className="hidden sm:inline">{values.desktop}</span>
    </span>
  );

  const Stat = ({ icon: Icon, label, values }) => (
    <div className="flex flex-col gap-1 min-w-0">
      <span className={`text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 ${labelClass}`}>
        {Icon && <Icon className="w-2.5 h-2.5 shrink-0" />}
        {label}
      </span>
      <CurrencyValue values={values} />
    </div>
  );

  const PlainStat = ({ icon: Icon, label, value }) => (
    <div className="flex flex-col gap-1 min-w-0">
      <span className={`text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 ${labelClass}`}>
        {Icon && <Icon className="w-2.5 h-2.5 shrink-0" />}
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );

  return (
    <div
      className={`rounded-xl px-4 py-4 space-y-5 ${
        isDarkMode ? 'bg-neutral-900/50 border border-neutral-800' : 'bg-slate-50/90 border border-slate-200'
      }`}
      data-testid="product-price-readout"
    >
      {/* Hero: Selling Price */}
      <div>
        <span className={`text-[10px] font-medium uppercase tracking-wider ${labelClass}`}>
          Selling Price
        </span>
        <div className="mt-1">
          <CurrencyValue values={selling} accent={sellingClass} large />
        </div>
      </div>

      {/* Cost breakdown */}
      <div className={`pt-4 border-t border-dashed ${dividerClass} space-y-3`}>
        <p className={`text-[10px] font-medium uppercase tracking-wider ${groupLabelClass}`}>
          Cost breakdown
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
          <Stat label="Total Cost" values={productCost} />
          <Stat icon={Users} label="Team Cost" values={teamCost} />
          <Stat icon={Building2} label="Vendor Cost" values={vendorCost} />
        </div>
      </div>

      {/* Business controls */}
      <div className={`pt-4 border-t ${dividerClass}`}>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          <PlainStat icon={ShieldAlert} label="Risk" value={riskMult} />
          <PlainStat icon={Percent} label="Product Margin" value={marginText} />
        </div>
      </div>

      {/* Health footer */}
      <div className={`pt-4 border-t ${dividerClass} flex justify-end`}>
        <ProductHealthIndicator score={healthScore} validation={validation} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}

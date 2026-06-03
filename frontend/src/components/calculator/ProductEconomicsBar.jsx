import { Users, Building2, ShieldAlert, Percent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { mapLineHealthBadge } from '@/lib/pricingHealth';
import {
  computeProductHealthScore,
  deriveLineValidation,
  healthScoreTone,
  resolveTeamCost,
} from '@/lib/productWorkspaceUtils';

export default function ProductEconomicsBar({
  line,
  item,
  teamMembers,
  roles,
  standardMonthlyHours,
  vendorCount,
  marginPercent,
  isDarkMode,
}) {
  const dash = '—';
  const validation = deriveLineValidation(line, item);
  const health = mapLineHealthBadge(validation, isDarkMode);
  const healthScore = computeProductHealthScore(line, item);

  const productCost = line ? formatCurrency(line.cost ?? 0, false) : dash;
  const teamCostNum = resolveTeamCost(line, teamMembers, roles, standardMonthlyHours);
  const teamCost = line || teamCostNum > 0 ? formatCurrency(teamCostNum, false) : dash;
  const vendorCost = line ? formatCurrency(line.vendor_cost ?? 0, false) : dash;
  const riskMult =
    line?.risk_multiplier != null ? `${Number(line.risk_multiplier).toFixed(2)}x` : dash;
  const marginText =
    line?.margin_percent != null
      ? `${Math.round(line.margin_percent)}%`
      : marginPercent != null
        ? `${Math.round(marginPercent)}%`
        : dash;
  const selling = line ? formatCurrency(line.selling ?? 0, false) : dash;

  const labelClass = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const valueClass = isDarkMode ? 'text-neutral-100' : 'text-slate-800';
  const sellingClass = isDarkMode ? 'text-emerald-400' : 'text-emerald-600';

  const Stat = ({ icon: Icon, label, value, accent, large = false }) => (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className={`text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 ${labelClass}`}>
        {Icon && <Icon className="w-2.5 h-2.5 shrink-0" />}
        {label}
      </span>
      <span
        className={`font-semibold tabular-nums truncate ${
          large ? 'text-xl sm:text-2xl' : 'text-sm sm:text-base'
        } ${accent || valueClass}`}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div
      className={`rounded-xl px-4 py-4 ${
        isDarkMode ? 'bg-neutral-900/50 border border-neutral-800' : 'bg-slate-50/90 border border-slate-200'
      }`}
      data-testid="product-price-readout"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <p className={`text-[10px] font-medium uppercase tracking-wider ${labelClass}`}>
          Product economics
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {healthScore != null && (
            <span
              className={`text-xs font-mono font-semibold tabular-nums ${healthScoreTone(healthScore, isDarkMode)}`}
              title="Rule-based product health score"
            >
              Score {healthScore}
            </span>
          )}
          <Badge className={health.className}>{health.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-3 items-end">
        <Stat label="Cost" value={productCost} />
        <Stat icon={Users} label="Team Cost" value={teamCost} />
        <Stat icon={Building2} label="Vendor Cost" value={vendorCost} />
        <Stat icon={Building2} label="Vendors" value={String(vendorCount ?? 0)} />
        <Stat icon={ShieldAlert} label="Risk" value={riskMult} />
        <Stat icon={Percent} label="Margin" value={marginText} />
        <div className="col-span-2 sm:col-span-2 lg:col-span-2 min-w-0">
          <Stat label="Selling Price" value={selling} accent={sellingClass} large />
        </div>
      </div>
    </div>
  );
}

import { Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrencyCompact } from '@/lib/utils';
import {
  resolveTeamCost,
  computeProductHealthScore,
  deriveLineValidation,
  healthScoreTone,
} from '@/lib/productWorkspaceUtils';
import { mapLineHealthBadge } from '@/lib/pricingHealth';
import ProductPortfolioTabIcons from './ProductPortfolioTabIcons';

function marginTone(margin, minMargin, isDarkMode) {
  if (minMargin > 0 && margin < minMargin) return isDarkMode ? 'text-rose-400' : 'text-rose-600';
  if (minMargin > 0 && margin < minMargin + 5) return isDarkMode ? 'text-amber-400' : 'text-amber-600';
  return isDarkMode ? 'text-emerald-400' : 'text-emerald-600';
}

export default function ProductCardSummary({
  item,
  line,
  teamMembers,
  vendors,
  roles,
  standardMonthlyHours,
  isDarkMode,
  openSection,
  onTabChange,
  onEdit,
  onRemove,
  showInsights,
  riskActive,
}) {
  const validation = deriveLineValidation(line, item);
  const healthBadge = mapLineHealthBadge(validation, isDarkMode);
  const healthScore = computeProductHealthScore(line, item);
  const margin = Number(line?.margin_percent ?? item?.margin_percent) || 0;
  const minMargin = Number(line?.sheet_min_margin_percent) || 0;
  const selling = line?.selling;
  const teamCost = resolveTeamCost(line, teamMembers, roles, standardMonthlyHours);
  const roleCount = teamMembers.length;
  const vendorCount = (vendors || []).length;
  const vendorCost = Number(line?.vendor_cost) || 0;

  const marginArrow =
    minMargin > 0 && margin < minMargin ? (
      <ArrowDown className="w-3 h-3 inline shrink-0" aria-hidden />
    ) : minMargin > 0 && margin >= minMargin ? (
      <ArrowUp className="w-3 h-3 inline shrink-0 opacity-60" aria-hidden />
    ) : null;

  const healthShort =
    healthScore != null
      ? `${healthBadge.label.split(' ')[0]}·${healthScore}`
      : healthBadge.label;

  const vendorSignal =
    vendorCount === 0 && vendorCost <= 0
      ? 'No vendors'
      : `${vendorCount} vendor${vendorCount !== 1 ? 's' : ''}`;

  const tierQty = !item.is_standalone && item.size ? item.size.toUpperCase() : 'CUSTOM';
  const sep = isDarkMode ? 'text-neutral-700' : 'text-slate-300';

  return (
    <div
      className="product-portfolio-row__inner flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0"
      data-testid="product-card-summary"
    >
      <div className="flex items-center gap-1.5 min-w-0 sm:max-w-[28%] shrink-0">
        <h3
          className={`text-sm font-semibold min-w-0 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
          title={item.product_name || 'Untitled service'}
        >
          {item.product_name || 'Untitled service'}
        </h3>
        <span className={`text-[10px] font-mono shrink-0 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
          {tierQty}·Q{item.quantity}
        </span>
      </div>

      <div
        className={`flex flex-1 flex-wrap sm:flex-nowrap items-center gap-x-1.5 gap-y-0 text-[11px] sm:text-xs tabular-nums min-w-0 ${
          isDarkMode ? 'text-neutral-400' : 'text-slate-600'
        }`}
        data-testid="product-portfolio-scan-metrics"
      >
        <span
          className={`font-semibold text-sm shrink-0 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}
          data-testid="product-price-readout"
        >
          {selling != null ? formatCurrencyCompact(selling, true) : '—'}
        </span>
        <span className={`hidden sm:inline ${sep}`}>|</span>
        <span className={`shrink-0 ${marginTone(margin, minMargin, isDarkMode)}`}>
          {line ? `${Math.round(margin)}%` : '—%'}
          {marginArrow}
        </span>
        <span className={`hidden sm:inline ${sep}`}>|</span>
        <span className={`shrink-0 ${healthScoreTone(healthScore, isDarkMode)}`}>{healthShort}</span>
        <span className={`hidden sm:inline ${sep}`}>|</span>
        <span className="shrink-0 whitespace-nowrap">
          Team {teamCost > 0 ? formatCurrencyCompact(teamCost, true) : '—'}
          {roleCount > 0 && <span className="hidden md:inline">·{roleCount}r</span>}
        </span>
        <span className={`hidden sm:inline ${sep}`}>|</span>
        <span className="shrink-0 whitespace-nowrap">{vendorSignal}</span>
      </div>

      <div className="flex items-center gap-0.5 shrink-0 sm:ml-auto">
        <ProductPortfolioTabIcons
          activeTab={openSection}
          onTabChange={onTabChange}
          isDarkMode={isDarkMode}
          showInsights={showInsights}
          riskActive={riskActive}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className={`h-7 w-7 p-0 ${isDarkMode ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-500 hover:text-slate-800'}`}
          title="Edit service"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className={`h-7 w-7 p-0 ${isDarkMode ? 'text-neutral-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}
          title="Remove service"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

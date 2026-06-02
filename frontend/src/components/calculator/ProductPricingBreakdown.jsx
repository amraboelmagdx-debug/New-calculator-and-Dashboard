import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency } from '@/lib/utils';
import IncludedTeamScope from './IncludedTeamScope';

function DetailRow({ label, value, sub, isDarkMode }) {
  return (
    <div className="flex justify-between gap-4 text-xs">
      <span className={`shrink-0 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>{label}</span>
      <div className="text-right min-w-0">
        <span className={`font-mono tabular-nums block ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
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
  const [open, setOpen] = useState(false);

  if (!breakdown) return null;

  const marginSub = breakdown.floorApplied
    ? `Sheet floor applied · ${breakdown.marginPercent}% target`
    : `${breakdown.marginPercent}% on package cost`;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger
        className={`flex w-full items-center justify-between gap-2 py-2 text-xs font-medium ${
          isDarkMode
            ? 'text-neutral-400 hover:text-neutral-200'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        data-testid="pricing-details-trigger"
      >
        <span>Pricing Details</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={`pt-1 pb-2 space-y-2.5 border-t mt-1 ${
          isDarkMode ? 'border-neutral-800/80' : 'border-slate-200'
        }`}
        data-testid="product-pricing-breakdown"
      >
        <DetailRow
          label="Base Package Cost"
          value={formatCurrency(breakdown.basePackageCost)}
          isDarkMode={isDarkMode}
        />
        <div>
          <p className={`text-xs mb-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Included Team</p>
          <IncludedTeamScope includedTeam={breakdown.includedTeam} isDarkMode={isDarkMode} />
        </div>
        <DetailRow
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
        <DetailRow label="Vendor Cost" value="—" sub={breakdown.vendorCostNote} isDarkMode={isDarkMode} />
        <DetailRow
          label="Margin Applied"
          value={formatCurrency(breakdown.marginApplied)}
          sub={marginSub}
          isDarkMode={isDarkMode}
        />
        {breakdown.floorApplied && (
          <DetailRow label="Floor Applied" value="Yes" isDarkMode={isDarkMode} />
        )}
        {footnote && (
          <p className={`text-[10px] pt-1 ${isDarkMode ? 'text-amber-400/90' : 'text-amber-700'}`}>{footnote}</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

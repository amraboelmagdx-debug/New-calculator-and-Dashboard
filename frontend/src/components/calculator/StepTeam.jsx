import { Users, Building2, ShieldAlert, Percent, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import QuoteEmptyState from './QuoteEmptyState';

// Quote-level rollup dashboard.
// Editing happens in the Products tab (ProductWorkspaceCard). This is the
// aggregated, read-only visibility layer: per-product Team Cost / Vendor Cost /
// Risk Multiplier / Margin % / Selling Price, plus grand totals.

function StatCell({ label, value, icon: Icon, accent, isDarkMode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className={`text-[10px] uppercase tracking-wider flex items-center gap-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
        {Icon && <Icon className="w-2.5 h-2.5" />}
        {label}
      </span>
      <span className={`text-xs font-semibold tabular-nums truncate ${accent || (isDarkMode ? 'text-neutral-200' : 'text-slate-800')}`}>
        {value}
      </span>
    </div>
  );
}

function ProductRollupCard({ item, line, isDarkMode }) {
  const teamMembers = item.team_members || [];
  const vendors = item.vendors || [];
  const teamCost = line ? (line.team_cost ?? line.internal_cost ?? 0) : null;
  const vendorCost = line ? (line.vendor_cost ?? 0) : null;
  const riskMult = line?.risk_multiplier;
  const marginPct = line?.margin_percent ?? item.margin_percent;
  const selling = line?.selling;

  const dash = '—';
  const sellingAccent = isDarkMode ? 'text-emerald-400' : 'text-emerald-600';

  return (
    <div className={`rounded-xl border ${isDarkMode ? 'border-neutral-800 bg-neutral-950/50' : 'border-slate-200 bg-white'}`}>
      <div className="px-3 pt-3 pb-2 flex items-center gap-2 flex-wrap">
        <span className={`text-sm font-semibold flex-1 min-w-0 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {item.product_name || 'Untitled service'}
        </span>
        {item.is_standalone && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isDarkMode ? 'border-violet-500/40 text-violet-400' : 'border-violet-200 text-violet-700'}`}>
            Custom
          </span>
        )}
        {!item.is_standalone && item.size && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${isDarkMode ? 'border-neutral-700 text-neutral-400' : 'border-slate-200 text-slate-500'}`}>
            {item.size.toUpperCase()}
          </span>
        )}
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isDarkMode ? 'border-neutral-700 text-neutral-400' : 'border-slate-200 text-slate-500'}`}>
          ×{item.quantity}
        </span>
      </div>

      {/* 5-value rollup */}
      <div className={`mx-3 mb-2 grid grid-cols-5 gap-2 px-2.5 py-2 rounded-lg border ${isDarkMode ? 'border-neutral-800 bg-neutral-900/40' : 'border-slate-200 bg-slate-50/60'}`}>
        <StatCell label="Team" icon={Users} value={teamCost != null ? formatCurrency(teamCost) : dash} isDarkMode={isDarkMode} />
        <StatCell label="Vendor" icon={Building2} value={vendorCost != null ? formatCurrency(vendorCost) : dash} isDarkMode={isDarkMode} />
        <StatCell label="Risk" icon={ShieldAlert} value={riskMult != null ? `${Number(riskMult).toFixed(2)}x` : dash} isDarkMode={isDarkMode} />
        <StatCell label="Margin" icon={Percent} value={marginPct != null ? `${Math.round(marginPct)}%` : dash} isDarkMode={isDarkMode} />
        <StatCell label="Selling" value={selling != null ? formatCurrency(selling) : dash} accent={sellingAccent} isDarkMode={isDarkMode} />
      </div>

      {/* Roles roster (read-only) */}
      {teamMembers.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {teamMembers.map((m, i) => {
            const hours = Math.round((Number(m.hours) || 0) * (Number(m.quantity) || 1) * 10) / 10;
            return (
              <span
                key={m.id || i}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border ${
                  isDarkMode ? 'border-neutral-700 bg-neutral-900 text-neutral-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <Users className="w-2.5 h-2.5 shrink-0" />
                {m.role_name || 'Role'}
                {hours > 0 && <span className={`font-mono ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>{hours}h</span>}
              </span>
            );
          })}
        </div>
      )}
      {vendors.length > 0 && (
        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
          {vendors.map((v, i) => (
            <span
              key={v.id || i}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border ${
                isDarkMode ? 'border-amber-500/30 bg-amber-500/5 text-amber-400' : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              <Building2 className="w-2.5 h-2.5 shrink-0" />
              {v.service_name || 'Vendor'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StepTeam({
  embedded = false,
  isDarkMode,
  selectedProducts = [],
  results,
  // accepted but unused (kept for prop compatibility with ScopeWorkspace)
  // eslint-disable-next-line no-unused-vars
  activeProductFilter,
  // eslint-disable-next-line no-unused-vars
  onClearProductFilter,
}) {
  const lineBreakdown = results?.margin_breakdown?.products || [];
  const lineById = new Map(lineBreakdown.map(l => [l.id, l]));

  const products = selectedProducts.filter(p => p.product_name);

  // Grand totals
  const totalTeam = lineBreakdown.reduce((s, l) => s + (l.team_cost ?? l.internal_cost ?? 0), 0);
  const totalVendor = lineBreakdown.reduce((s, l) => s + (l.vendor_cost ?? 0), 0);
  const totalSelling = results?.selling_price ?? lineBreakdown.reduce((s, l) => s + (l.selling ?? 0), 0);
  const contributionPct = results?.contribution_margin_percent;

  const sellingAccent = isDarkMode ? 'text-emerald-400' : 'text-emerald-600';

  const body = (
    <>
      <div className={`flex items-start gap-2 mb-3 p-2.5 rounded-lg border ${isDarkMode ? 'border-neutral-800 bg-neutral-900/40 text-neutral-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <p className="text-[11px]">
          This is the quote rollup. Add or edit team, vendors, risk, and margin inside each product in the <span className="font-medium">Products</span> tab.
        </p>
      </div>

      {products.length === 0 ? (
        <QuoteEmptyState
          title="No products yet"
          description="Add a service in the Products tab to build the quote."
          compact
          isDarkMode={isDarkMode}
        />
      ) : (
        <>
          {/* Grand totals */}
          <div className={`mb-3 grid grid-cols-4 gap-2 px-3 py-2.5 rounded-xl border ${isDarkMode ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-indigo-100 bg-indigo-50/60'}`}>
            <StatCell label="Total team" icon={Users} value={formatCurrency(totalTeam)} isDarkMode={isDarkMode} />
            <StatCell label="Total vendor" icon={Building2} value={formatCurrency(totalVendor)} isDarkMode={isDarkMode} />
            <StatCell label="Contribution" icon={Percent} value={contributionPct != null ? `${Math.round(contributionPct)}%` : '—'} isDarkMode={isDarkMode} />
            <StatCell label="Quote selling" value={formatCurrency(totalSelling)} accent={sellingAccent} isDarkMode={isDarkMode} />
          </div>

          <div className="space-y-3">
            {products.map(item => (
              <ProductRollupCard key={item.id} item={item} line={lineById.get(item.id)} isDarkMode={isDarkMode} />
            ))}
          </div>
        </>
      )}
    </>
  );

  if (embedded) {
    return (
      <div id="team" data-testid="team-rollup-embedded">
        {body}
      </div>
    );
  }

  return (
    <section id="team" className="animate-fade-in quote-panel-enter" data-testid="team-rollup">
      <div className={isDarkMode ? 'dark-card rounded-xl p-6' : 'bg-white border border-slate-200 rounded-xl p-6 shadow-sm'}>
        {body}
      </div>
    </section>
  );
}

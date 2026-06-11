import { Users, Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { buildQuoteTeamAnalytics } from '@/lib/quoteTeamAnalytics';
import { shortDeptLabel } from '@/lib/productWorkspaceUtils';
import QuoteEmptyState from './QuoteEmptyState';
import WorkspaceAnalysisBanner from './WorkspaceAnalysisBanner';

function ProgressRow({ label, value, percent, isDarkMode }) {
  const trackBg = isDarkMode ? 'bg-neutral-800' : 'bg-slate-200';
  const fillBg = isDarkMode ? 'bg-indigo-500/70' : 'bg-indigo-500';
  const pct = Math.min(100, Math.max(0, Number(percent) || 0));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`truncate ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>{label}</span>
        <span className={`font-mono tabular-nums shrink-0 ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
          {value}
          {pct > 0 && <span className="ml-1.5">{pct}%</span>}
        </span>
      </div>
      <div className={`h-1.5 rounded-full overflow-hidden ${trackBg}`}>
        <div className={`h-full rounded-full ${fillBg}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function QuoteTeamDashboard({
  isDarkMode,
  selectedProducts = [],
  results,
  roles = [],
  standardMonthlyHours = 160,
  compact = false,
}) {
  const analytics = buildQuoteTeamAnalytics(selectedProducts, results, roles, standardMonthlyHours);
  const {
    totalTeamCost, totalHours, roleCount,
    topRoles, productShares, laborConcentration, productCount,
    departmentBreakdown = [],
  } = analytics;

  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const card = isDarkMode ? 'border-neutral-800 bg-neutral-950/50' : 'border-slate-200 bg-white';

  if (productCount === 0) {
    return (
      <div data-testid="quote-team-dashboard">
        {!compact && (
          <WorkspaceAnalysisBanner
            isDarkMode={isDarkMode}
            message="Editing happens in the Products tab — this view is for analysis only."
          />
        )}
        <QuoteEmptyState
          title="No products yet"
          description="Add a service in the Products tab to build the quote."
          compact
          isDarkMode={isDarkMode}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${compact ? 'space-y-3' : ''}`} data-testid="quote-team-dashboard">
      {!compact && (
        <WorkspaceAnalysisBanner
          isDarkMode={isDarkMode}
          message="Editing happens in the Products tab — this view is for analysis only."
        />
      )}

      <div className={`grid grid-cols-3 gap-3 p-3 rounded-xl border ${card}`}>
        <div>
          <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Total team cost</p>
          <p className={`text-lg font-semibold tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {formatCurrency(totalTeamCost, true)}
          </p>
        </div>
        <div>
          <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Total hours</p>
          <p className={`text-lg font-semibold tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {totalHours}
          </p>
        </div>
        <div>
          <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Distinct roles</p>
          <p className={`text-lg font-semibold tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {roleCount}
          </p>
        </div>
      </div>

      {laborConcentration >= 50 && (
        <p className={`text-xs ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
          Labor concentration: top product carries {laborConcentration}% of team cost
        </p>
      )}

      {topRoles.length > 0 && (
        <div className={`rounded-xl border p-3 space-y-3 ${card}`}>
          <h4 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${muted}`}>
            <Users className="w-3.5 h-3.5" />
            Top contributors
          </h4>
          {topRoles.map(r => (
            <ProgressRow
              key={r.name}
              label={r.name}
              value={formatCurrency(r.cost, true)}
              percent={r.percent}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      )}

      {departmentBreakdown.length > 1 && (
        <div className={`rounded-xl border p-3 space-y-3 ${card}`}>
          <h4 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${muted}`}>
            <Building2 className="w-3.5 h-3.5" />
            Department breakdown
          </h4>
          {departmentBreakdown.map(d => (
            <div key={d.name} className="space-y-1">
              <ProgressRow
                label={shortDeptLabel(d.name)}
                value={formatCurrency(d.cost, true)}
                percent={d.percent}
                isDarkMode={isDarkMode}
              />
              <span className={`text-[10px] ${muted}`}>
                {d.roleCount} role{d.roleCount !== 1 ? 's' : ''} · {Math.round(d.hours)}h
              </span>
            </div>
          ))}
        </div>
      )}

      {productShares.length > 0 && (
        <div className={`rounded-xl border p-3 space-y-3 ${card}`}>
          <h4 className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Product contribution</h4>
          {productShares.map(p => (
            <div key={p.id} className="space-y-1">
              <ProgressRow
                label={p.name}
                value={formatCurrency(p.teamCost, true)}
                percent={p.percent}
                isDarkMode={isDarkMode}
              />
              <button
                type="button"
                className={`text-[10px] underline-offset-2 hover:underline ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}
                onClick={() => {
                  const el = document.getElementById(`product-${p.id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Jump to product
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

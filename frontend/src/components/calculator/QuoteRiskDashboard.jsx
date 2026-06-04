import { ShieldAlert } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { buildQuoteRiskAnalytics } from '@/lib/quoteRiskAnalytics';
import { healthScoreTone } from '@/lib/productWorkspaceUtils';
import QuoteEmptyState from './QuoteEmptyState';
import WorkspaceAnalysisBanner from './WorkspaceAnalysisBanner';

export default function QuoteRiskDashboard({ isDarkMode, selectedProducts = [], results }) {
  const analytics = buildQuoteRiskAnalytics(selectedProducts, results);
  const {
    quoteRiskScore,
    quoteRiskLabel,
    riskDistribution,
    highestRiskProducts,
    riskContribution,
    riskSellingImpactTotal,
    internalRiskMultiplier,
    totalRiskMultiplier,
    productCount,
  } = analytics;

  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const card = isDarkMode ? 'border-neutral-800 bg-neutral-950/50' : 'border-slate-200 bg-white';

  if (productCount === 0) {
    return (
      <div data-testid="quote-risk-dashboard">
        <WorkspaceAnalysisBanner
          isDarkMode={isDarkMode}
          message="Product risk is edited in the Products tab — this view is for quote-level analysis only."
        />
        <QuoteEmptyState
          title="No products yet"
          description="Add a service in the Products tab to see risk analysis."
          compact
          isDarkMode={isDarkMode}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="quote-risk-dashboard">
      <WorkspaceAnalysisBanner
        isDarkMode={isDarkMode}
        message="Product risk is edited in the Products tab — this view is for quote-level analysis only."
      />

      <div className={`flex flex-wrap items-center gap-4 p-3 rounded-xl border ${card}`}>
        <div>
          <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Quote risk score</p>
          <p className={`text-xl font-semibold ${healthScoreTone(quoteRiskScore, isDarkMode)}`}>
            {quoteRiskLabel}
            {quoteRiskScore != null && (
              <span className={`text-sm font-normal ml-2 ${muted}`}>{quoteRiskScore}</span>
            )}
          </p>
        </div>
        <div>
          <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Risk selling impact</p>
          <p className={`text-lg font-semibold tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {formatCurrency(riskSellingImpactTotal, true)}
          </p>
        </div>
      </div>

      <div className={`rounded-xl border p-3 ${card}`}>
        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${muted}`}>Risk distribution</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(riskDistribution).map(([band, count]) => (
            <span
              key={band}
              className={`text-xs px-2 py-1 rounded border ${
                isDarkMode ? 'border-neutral-700 text-neutral-300' : 'border-slate-200 text-slate-600'
              }`}
            >
              {band}: {count}
            </span>
          ))}
        </div>
      </div>

      {(internalRiskMultiplier != null || totalRiskMultiplier != null) && (
        <div className={`text-xs ${muted}`}>
          {internalRiskMultiplier != null && (
            <span>Internal risk multiplier: {Number(internalRiskMultiplier).toFixed(2)}x</span>
          )}
          {totalRiskMultiplier != null && (
            <span className="ml-3">Total risk multiplier: {Number(totalRiskMultiplier).toFixed(2)}x</span>
          )}
        </div>
      )}

      {highestRiskProducts.length > 0 && (
        <div className={`rounded-xl border p-3 space-y-2 ${card}`}>
          <h4 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${muted}`}>
            <ShieldAlert className="w-3.5 h-3.5" />
            Highest risk products
          </h4>
          <ul className="space-y-2">
            {highestRiskProducts.map(p => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className={isDarkMode ? 'text-neutral-200' : 'text-slate-800'}>
                  {p.name}
                  {p.tier && (
                    <span className={`ml-1.5 font-mono ${muted}`}>{String(p.tier).toUpperCase()}</span>
                  )}
                </span>
                <span className={`font-mono tabular-nums ${muted}`}>
                  {Number(p.riskMultiplier).toFixed(2)}x · {formatCurrency(p.riskSellingImpact, true)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {riskContribution.length > 0 && (
        <div className={`rounded-xl border p-3 space-y-2 ${card}`}>
          <h4 className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Risk contribution</h4>
          {riskContribution.map(p => (
            <div key={p.id} className="flex justify-between text-xs">
              <span className={`truncate ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>{p.name}</span>
              <span className={`font-mono shrink-0 ${muted}`}>{p.impactPercent}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

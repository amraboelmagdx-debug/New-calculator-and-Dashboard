import { useState, useMemo } from 'react';
import { ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrencyCompact } from '@/lib/utils';
import { buildQuoteRiskAnalytics } from '@/lib/quoteRiskAnalytics';
import { healthScoreTone } from '@/lib/productWorkspaceUtils';
import QuoteEmptyState from './QuoteEmptyState';
import WorkspaceAnalysisBanner from './WorkspaceAnalysisBanner';

const RISK_MULT = { none: 1.0, low: 1.05, medium: 1.15, high: 1.30 };
const RISK_FACTORS = ['complexity', 'rush', 'execution'];

function riskLevelColor(level, isDarkMode) {
  if (level === 'high')   return isDarkMode ? 'text-rose-400'    : 'text-rose-600';
  if (level === 'medium') return isDarkMode ? 'text-amber-400'   : 'text-amber-600';
  if (level === 'low')    return isDarkMode ? 'text-emerald-400' : 'text-emerald-600';
  return isDarkMode ? 'text-neutral-500' : 'text-slate-400';
}

function riskBarColor(multiplier) {
  if (multiplier >= 1.2) return '#ef4444';
  if (multiplier >= 1.1) return '#f59e0b';
  return '#10b981';
}

function riskBadgeTone(multiplier, isDarkMode) {
  if (multiplier >= 1.2) return isDarkMode ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'    : 'bg-rose-50 border-rose-200 text-rose-700';
  if (multiplier >= 1.1) return isDarkMode ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'  : 'bg-amber-50 border-amber-200 text-amber-700';
  return isDarkMode ? 'bg-neutral-800 border-neutral-700 text-neutral-400' : 'bg-slate-50 border-slate-200 text-slate-500';
}

export default function QuoteRiskDashboard({
  isDarkMode,
  selectedProducts = [],
  results,
  calcData,
  compact = false,
}) {
  const [expandedServices, setExpandedServices] = useState(() => new Set(['__all__']));

  const isExpanded = id => expandedServices.has('__all__') || expandedServices.has(id);
  const toggleService = id => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      next.delete('__all__');
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const analytics = buildQuoteRiskAnalytics(selectedProducts, results);
  const {
    quoteRiskScore,
    quoteRiskLabel,
    riskDistribution,
    riskSellingImpactTotal,
    internalRiskMultiplier,
    totalRiskMultiplier,
    productCount,
  } = analytics;

  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const card = isDarkMode ? 'border-neutral-800 bg-neutral-950/50' : 'border-slate-200 bg-white';
  const subCard = isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-50 border-slate-200';

  const internalRisk = calcData?.internal_risk || {};
  const vendorRisk   = calcData?.vendor_risk   || {};

  // Derived per-service data
  const enrichedProducts = useMemo(() => {
    const lines = results?.margin_breakdown?.products || [];
    return (selectedProducts || [])
      .map(p => {
        const line = lines.find(l => l.id === p.id) || {};
        const mult = Number(line.risk_multiplier) || 1.0;
        const cost = Number(line.cost) || 0;
        const teamCost = Number(line.team_cost) || 0;
        const vendorCost = Number(line.vendor_cost) || 0;
        const totalTracked = teamCost + vendorCost;
        const teamPct = totalTracked > 0 ? Math.round(teamCost / totalTracked * 100) : 0;
        const vendPct = totalTracked > 0 ? Math.round(vendorCost / totalTracked * 100) : 0;
        return {
          id: p.id,
          name: p.product_name || p.name || '',
          tier: p.size || '',
          isAddon: !!p.is_addon,
          teamCost,
          vendorCost,
          totalTracked,
          teamPct,
          vendPct,
          multiplier: mult,
          riskImpact: mult > 1 ? cost * (mult - 1) : 0,
        };
      })
      .filter(p => p.name)
      .sort((a, b) => b.multiplier - a.multiplier);
  }, [selectedProducts, results]);

  if (productCount === 0) {
    return (
      <div data-testid="quote-risk-dashboard">
        {!compact && (
          <WorkspaceAnalysisBanner
            isDarkMode={isDarkMode}
            message="Product risk is edited in the Products tab — this view is for quote-level analysis only."
          />
        )}
        <QuoteEmptyState
          title="No products yet"
          description="Add a service in the Products tab to see risk analysis."
          compact
          isDarkMode={isDarkMode}
        />
      </div>
    );
  }

  // Combined internal risk multiplier (from factors)
  const internalCombined = RISK_FACTORS.reduce((acc, f) => acc * RISK_MULT[internalRisk[f] || 'none'], 1);
  const vendorCombined   = RISK_FACTORS.reduce((acc, f) => acc * RISK_MULT[vendorRisk[f]   || 'none'], 1);
  const hasAnyRiskFactors = internalCombined > 1 || vendorCombined > 1;

  // Distribution bands
  const distBands = Object.entries(riskDistribution || {});

  return (
    <div className={`space-y-4 ${compact ? 'space-y-3' : ''}`} data-testid="quote-risk-dashboard">
      {!compact && (
        <WorkspaceAnalysisBanner
          isDarkMode={isDarkMode}
          message="Product risk is edited in the Products tab — this view is for quote-level analysis only."
        />
      )}

      {/* Score card */}
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
          <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Selling impact</p>
          <p className={`text-lg font-semibold tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {formatCurrencyCompact(riskSellingImpactTotal, true)}
          </p>
        </div>
        {(internalRiskMultiplier != null || totalRiskMultiplier != null) && (
          <div className="ml-auto text-right">
            {internalRiskMultiplier != null && (
              <p className={`text-[11px] ${muted}`}>
                Internal{' '}
                <span className={`font-mono font-semibold ${isDarkMode ? 'text-neutral-300' : 'text-slate-600'}`}>
                  {Number(internalRiskMultiplier).toFixed(2)}x
                </span>
              </p>
            )}
            {totalRiskMultiplier != null && (
              <p className={`text-[11px] ${muted}`}>
                Blended{' '}
                <span className={`font-mono font-semibold ${isDarkMode ? 'text-neutral-300' : 'text-slate-600'}`}>
                  {Number(totalRiskMultiplier).toFixed(2)}x
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Internal vs Vendor risk factor comparison */}
      {hasAnyRiskFactors && (
        <div className={`rounded-xl border p-3 ${card}`}>
          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${muted}`}>
            <ShieldAlert className="w-3.5 h-3.5" />
            Risk factor comparison
          </h4>
          <div className={`grid grid-cols-2 gap-3 rounded-lg border p-3 ${subCard}`}>
            {[
              { label: 'Internal', riskObj: internalRisk, color: 'text-indigo-400', borderColor: isDarkMode ? 'border-neutral-800' : 'border-slate-200', combined: internalCombined },
              { label: 'Vendor',   riskObj: vendorRisk,   color: 'text-amber-400',  borderColor: isDarkMode ? 'border-neutral-800' : 'border-slate-200', combined: vendorCombined },
            ].map(side => (
              <div key={side.label}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${side.color}`}>
                  {side.label}
                </p>
                {RISK_FACTORS.map(f => {
                  const level = side.riskObj[f] || 'none';
                  return (
                    <div key={f} className="flex items-center justify-between text-xs mb-1.5">
                      <span className={`capitalize ${muted}`}>{f}</span>
                      <span className={`font-semibold text-[11px] ${riskLevelColor(level, isDarkMode)}`}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </span>
                    </div>
                  );
                })}
                <div className={`mt-2 pt-2 border-t text-[11px] font-mono font-bold ${side.color} ${side.borderColor}`}
                  style={{ borderTopColor: isDarkMode ? '#262626' : '#e2e8f0' }}>
                  {side.combined.toFixed(2)}x combined
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-service breakdown (sorted by multiplier) */}
      {enrichedProducts.length > 0 && (
        <div className={`rounded-xl border ${card}`}>
          <div className={`px-3 py-2 border-b ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
            <h4 className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>
              Risk by service
            </h4>
          </div>
          <div className="divide-y divide-transparent">
            {enrichedProducts.map(p => {
              const expanded = isExpanded(p.id);
              return (
                <div key={p.id} className={isDarkMode ? 'border-b border-neutral-800/60 last:border-0' : 'border-b border-slate-100 last:border-0'}>
                  {/* Row header */}
                  <button
                    type="button"
                    onClick={() => toggleService(p.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                      isDarkMode ? 'hover:bg-neutral-900/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    {expanded
                      ? <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${muted}`} />
                      : <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${muted}`} />
                    }
                    <span className={`flex-1 text-xs truncate ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
                      {p.isAddon && (
                        <span className={`mr-1.5 text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded ${
                          isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          Add-on
                        </span>
                      )}
                      {p.name}
                      {p.tier && (
                        <span className={`ml-1.5 font-mono text-[10px] ${muted}`}>
                          {String(p.tier).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className={`text-[11px] font-mono font-semibold shrink-0 px-2 py-0.5 rounded border ${riskBadgeTone(p.multiplier, isDarkMode)}`}>
                      {p.multiplier.toFixed(2)}x
                    </span>
                    {p.riskImpact > 0 && (
                      <span className={`text-[10px] font-mono shrink-0 ${muted}`}>
                        +{formatCurrencyCompact(p.riskImpact, true)}
                      </span>
                    )}
                  </button>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className={`mx-3 mb-2.5 rounded-lg border p-2.5 space-y-2 ${subCard}`}>
                      {p.totalTracked > 0 ? (
                        <>
                          {/* Team cost bar */}
                          {p.teamCost > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className={`${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} font-semibold`}>Team</span>
                                <span className={`font-mono ${muted}`}>
                                  {formatCurrencyCompact(p.teamCost, true)} · {p.teamPct}%
                                </span>
                              </div>
                              <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                                <div className="h-full rounded-full bg-indigo-500/70" style={{ width: `${p.teamPct}%` }} />
                              </div>
                            </div>
                          )}
                          {/* Vendor cost bar */}
                          {p.vendorCost > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className={`${isDarkMode ? 'text-amber-400' : 'text-amber-600'} font-semibold`}>Vendor</span>
                                <span className={`font-mono ${muted}`}>
                                  {formatCurrencyCompact(p.vendorCost, true)} · {p.vendPct}%
                                </span>
                              </div>
                              <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                                <div className="h-full rounded-full bg-amber-500/70" style={{ width: `${p.vendPct}%` }} />
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className={`text-[10px] ${muted}`}>No cost breakdown available — calculate the quote to see details.</p>
                      )}

                      {/* Risk premium row */}
                      {p.riskImpact > 0 && (
                        <div className={`pt-1.5 border-t flex items-center justify-between text-[10px] ${isDarkMode ? 'border-neutral-700' : 'border-slate-200'}`}>
                          <span className={muted}>Risk premium on cost</span>
                          <span className={`font-mono font-semibold ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>
                            +{formatCurrencyCompact(p.riskImpact, true)}
                          </span>
                        </div>
                      )}

                      {/* Multiplier mini-bar */}
                      <div className={`pt-1.5 border-t ${isDarkMode ? 'border-neutral-700' : 'border-slate-200'}`}>
                        <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(0, (p.multiplier - 1) * 250))}%`,
                              backgroundColor: riskBarColor(p.multiplier),
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Distribution bands */}
      {distBands.length > 0 && (
        <div className={`rounded-xl border p-3 ${card}`}>
          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${muted}`}>Distribution</h4>
          <div className="flex flex-wrap gap-2">
            {distBands.map(([band, count]) => (
              <span
                key={band}
                className={`text-xs px-2.5 py-1 rounded-lg border font-mono ${
                  isDarkMode ? 'border-neutral-700 text-neutral-300' : 'border-slate-200 text-slate-600'
                }`}
              >
                {band}: <span className="font-bold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

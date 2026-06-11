import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, Users, Package } from 'lucide-react';
import { formatCurrencyCompact } from '@/lib/utils';
import { buildProductLines, computeClientPreview } from '@/lib/marginEngine';
import QuoteEmptyState from './QuoteEmptyState';

function marginColor(pct, isDarkMode) {
  if (pct >= 30) return isDarkMode ? 'text-emerald-400' : 'text-emerald-600';
  if (pct >= 20) return isDarkMode ? 'text-amber-400'  : 'text-amber-600';
  return isDarkMode ? 'text-rose-400' : 'text-rose-600';
}

function marginBarColor(pct, below) {
  if (below)   return 'bg-rose-500';
  if (pct >= 30) return 'bg-emerald-500';
  return 'bg-amber-500';
}

// Normalize selling field: API results use `selling`, local build uses `line_selling`
function getLineSelling(line) {
  return line.selling ?? line.line_selling ?? 0;
}

export default function QuoteMarginView({
  isDarkMode,
  selectedProducts = [],
  calcData,
  results,
  findCatalogProduct,
  getSegmentPayload,
}) {
  const [expandedLines, setExpandedLines] = useState(new Set());

  const toggle = id => setExpandedLines(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Prefer API results (always populated after calculation) over local build
  const apiLines = results?.margin_breakdown?.products || [];
  const canBuild = typeof findCatalogProduct === 'function' && typeof getSegmentPayload === 'function';
  const builtLines =
    apiLines.length === 0 && canBuild
      ? buildProductLines(selectedProducts, findCatalogProduct, getSegmentPayload, calcData)
      : [];
  const lines = apiLines.length > 0 ? apiLines : builtLines;

  const preview = computeClientPreview(builtLines, calcData, results);
  const target = preview.target;

  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const card = isDarkMode ? 'border-neutral-800 bg-neutral-950/50' : 'border-slate-200 bg-white';
  const subCard = isDarkMode ? 'bg-neutral-900/50 border-neutral-800' : 'bg-slate-50 border-slate-200';
  const border = isDarkMode ? 'border-neutral-700' : 'border-slate-200';

  // Enriched lines with internal vs vendor breakdown
  const enrichedLines = useMemo(() => lines.map(line => {
    const selling = getLineSelling(line);
    const vendorRevenue = Number(line.vendor_revenue) || 0;
    const internalSell = selling - vendorRevenue;
    const internalCost = Number(line.internal_cost) || Number(line.team_cost) || 0;
    const internalMarginPct = internalSell > 1
      ? (internalSell - internalCost) / internalSell * 100
      : null;
    const vendorCost = Number(line.vendor_cost) || 0;
    const vendorMarkupPct = vendorCost > 0
      ? (vendorRevenue - vendorCost) / vendorCost * 100
      : null;
    const blendedPct = Number(line.margin_percent) || 0;
    const min = Number(line.sheet_min_margin_percent) || 0;
    const srcLine = selectedProducts.find(p => p.id === line.id);
    const tier = srcLine?.size || '';
    return {
      ...line,
      tier,
      isAddon: !!srcLine?.is_addon,
      selling,
      internalSell,
      internalCost,
      internalMarginPct,
      vendorCost,
      vendorRevenue,
      vendorMarkupPct,
      blendedPct,
      min,
      below: min > 0 && blendedPct < min,
      hasVendors: vendorRevenue > 0,
    };
  }), [lines, selectedProducts]);

  // Summary counts
  const aboveTarget = enrichedLines.filter(l => l.blendedPct >= (target || 30)).length;
  const belowMin = enrichedLines.filter(l => l.below).length;

  if (lines.length === 0) {
    return (
      <div data-testid="quote-margin-view">
        <QuoteEmptyState
          title="No priced lines yet"
          description="Add a product in Portfolio to see margin distribution. Edit margins on each product's Margin tab."
          compact
          isDarkMode={isDarkMode}
        />
      </div>
    );
  }

  // Use API margin when available; fall back to local preview computation
  const displayMargin = results?.contribution_margin_percent ?? preview.apiMargin;
  const vsTarget = displayMargin - (target || 30);

  return (
    <div className="space-y-3" data-testid="quote-margin-view">

      {/* Summary header */}
      <div className={`rounded-xl border p-3 ${card}`}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${muted}`}>Quote margin</p>
            <p className={`text-xl font-semibold tabular-nums ${marginColor(displayMargin, isDarkMode)}`}>
              {displayMargin.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${muted}`}>vs Target</p>
            <p className={`text-xl font-semibold tabular-nums ${vsTarget >= 0
              ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')
              : (isDarkMode ? 'text-rose-400' : 'text-rose-600')
            }`}>
              {vsTarget >= 0 ? '+' : ''}{vsTarget.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className={`flex gap-3 pt-2.5 border-t ${isDarkMode ? 'border-neutral-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full bg-emerald-500 shrink-0`} />
            <span className={`text-[10px] ${muted}`}>
              <span className={`font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>{aboveTarget}</span> above target
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${belowMin > 0 ? 'bg-rose-500' : isDarkMode ? 'bg-neutral-700' : 'bg-slate-300'} shrink-0`} />
            <span className={`text-[10px] ${muted}`}>
              <span className={`font-semibold ${belowMin > 0 ? (isDarkMode ? 'text-rose-400' : 'text-rose-600') : (isDarkMode ? 'text-neutral-200' : 'text-slate-800')}`}>{belowMin}</span> below min
            </span>
          </div>
        </div>
      </div>

      {preview.gapToTarget > 0 && (
        <p className={`text-xs ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
          {preview.gapToTarget.toFixed(1)}% below target
        </p>
      )}

      {/* Per-service expandable rows */}
      <div className={`rounded-xl border overflow-hidden ${card}`}>
        {enrichedLines.map((line, idx) => {
          const expanded = expandedLines.has(line.id);
          return (
            <div key={line.id} className={idx > 0 ? (isDarkMode ? 'border-t border-neutral-800' : 'border-t border-slate-100') : ''}>
              {/* Row header — clickable */}
              <button
                type="button"
                onClick={() => toggle(line.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                  isDarkMode ? 'hover:bg-neutral-900/60' : 'hover:bg-slate-50'
                }`}
              >
                {expanded
                  ? <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${muted}`} />
                  : <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${muted}`} />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {line.isAddon && (
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded shrink-0 ${
                        isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        Add-on
                      </span>
                    )}
                    <p className={`text-xs truncate ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
                      {line.product_name}
                    </p>
                    {line.tier && (
                      <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
                        isDarkMode ? 'border-neutral-700 text-neutral-500' : 'border-slate-200 text-slate-500'
                      }`}>
                        {String(line.tier).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className={`mt-1.5 h-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                    <div
                      className={`h-full rounded-full transition-all ${marginBarColor(line.blendedPct, line.below)}`}
                      style={{ width: `${Math.min(100, Math.max(0, line.blendedPct))}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={`text-sm font-mono font-semibold tabular-nums ${marginColor(line.blendedPct, isDarkMode)}`}>
                    {line.blendedPct.toFixed(1)}%{line.below ? ' ↓' : ''}
                  </span>
                  <span className={`text-[10px] font-mono ${muted}`}>
                    {formatCurrencyCompact(line.selling, true)}
                  </span>
                </div>
              </button>

              {/* Expanded: internal + vendor breakdown */}
              {expanded && (
                <div className={`mx-3 mb-3 space-y-2 rounded-lg border p-2.5 ${subCard}`}>

                  {/* Internal team section */}
                  <div className={`rounded-lg border p-2 ${isDarkMode ? 'border-neutral-700/60 bg-neutral-950/40' : 'border-slate-200 bg-white'}`}>
                    <div className={`flex items-center gap-1.5 mb-2 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      <Users className="w-3 h-3" />
                      Internal team
                    </div>
                    {line.internalCost > 0 || line.internalSell > 0 ? (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className={muted}>Cost</span>
                        <span className={`font-mono font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
                          {formatCurrencyCompact(line.internalCost, true)}
                        </span>
                        <span className={muted}>→ Sell</span>
                        <span className={`font-mono font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
                          {formatCurrencyCompact(line.internalSell, true)}
                        </span>
                        {line.internalMarginPct != null && (
                          <>
                            <span className={muted}>→ Margin</span>
                            <span className={`font-mono font-semibold ${marginColor(line.internalMarginPct, isDarkMode)}`}>
                              {line.internalMarginPct.toFixed(1)}%
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className={`text-xs ${muted}`}>No internal cost data yet</p>
                    )}
                  </div>

                  {/* Vendor section — only shown when vendors exist */}
                  {line.hasVendors && (
                    <div className={`rounded-lg border p-2 ${isDarkMode ? 'border-neutral-700/60 bg-neutral-950/40' : 'border-slate-200 bg-white'}`}>
                      <div className={`flex items-center gap-1.5 mb-2 text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        <Package className="w-3 h-3" />
                        Vendors
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className={muted}>Cost</span>
                        <span className={`font-mono font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
                          {formatCurrencyCompact(line.vendorCost, true)}
                        </span>
                        <span className={muted}>→ Revenue</span>
                        <span className={`font-mono font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
                          {formatCurrencyCompact(line.vendorRevenue, true)}
                        </span>
                        {line.vendorMarkupPct != null && (
                          <>
                            <span className={muted}>→ Markup</span>
                            <span className={`font-mono font-semibold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                              {line.vendorMarkupPct.toFixed(1)}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Blended summary row */}
                  <div className={`flex items-center justify-between pt-1.5 border-t text-xs ${border}`}>
                    <div className={`flex items-center gap-1 ${muted}`}>
                      <TrendingUp className="w-3 h-3" />
                      Blended margin
                    </div>
                    <span className={`font-mono font-bold ${marginColor(line.blendedPct, isDarkMode)}`}>
                      {line.blendedPct.toFixed(1)}%
                      {line.min > 0 && (
                        <span className={`ml-1.5 font-normal text-[10px] ${muted}`}>
                          min {line.min}%
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className={`text-[11px] ${muted}`}>
        Read-only. Adjust line margins on each product&rsquo;s Margin tab, or set quote policy in Quote controls.
      </p>
    </div>
  );
}

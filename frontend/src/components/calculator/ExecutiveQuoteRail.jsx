import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, ChevronRight, Save, Settings2 } from 'lucide-react';
import DashboardMetricAmount from './DashboardMetricAmount';
import QuoteEmptyState from './QuoteEmptyState';
import IntelligenceAlerts from './IntelligenceAlerts';
import QuoteHealthCenter from './QuoteHealthCenter';
import QuoteTeamDashboard from './QuoteTeamDashboard';
import QuoteRiskDashboard from './QuoteRiskDashboard';
import QuoteControlsDrawer from './QuoteControlsDrawer';
import QuoteMarginView from './QuoteMarginView';
import { formatCurrency } from '@/lib/utils';

const RAIL_TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'team', label: 'Team' },
  { id: 'risk', label: 'Risk' },
  { id: 'margin', label: 'Margin' },
  { id: 'cogs', label: 'COGS' },
];

export default function ExecutiveQuoteRail({
  results,
  previewSelling,
  calculating,
  isDarkMode,
  sheetPriceFloorWarning,
  calcData,
  exportPdfSlot,
  onSaveTemplate,
  onGoToScope,
  className = '',
  readiness,
  productCount = 0,
  selectedProducts = [],
  roles = [],
  standardMonthlyHours = 160,
  projectInfo,
  setProjectInfo,
  paymentTerms = [],
  setPaymentTerms,
  setCalcData,
  onOpenQuoteSettings,
  setSelectedProducts,
  findCatalogProduct,
  getSegmentPayload,
}) {
  const [activeTab, setActiveTab] = useState('summary');
  const [controlsOpen, setControlsOpen] = useState(false);
  const [cogsOpen, setCogsOpen] = useState(false);
  const [deductionsOpen, setDeductionsOpen] = useState(false);
  const [marginStackOpen, setMarginStackOpen] = useState(false);

  const margin = results?.contribution_margin_percent ?? 0;
  const marginColor =
    margin >= 30 ? 'text-emerald-500' : margin >= 20 ? 'text-amber-500' : 'text-rose-500';

  const tabBtn = id =>
    `flex-1 min-w-0 py-2 px-1 text-xs rounded-md transition-colors font-medium ${
      activeTab === id
        ? isDarkMode
          ? 'bg-neutral-800 text-white'
          : 'bg-white text-slate-900 shadow-sm'
        : isDarkMode
          ? 'text-neutral-500 hover:text-neutral-300'
          : 'text-slate-500 hover:text-slate-800'
    }`;

  return (
    <>
      <div
        className={`h-full flex flex-col overflow-y-auto rounded-2xl border quote-panel-enter p-4 shadow-md ${
          isDarkMode ? 'bg-neutral-900 border-neutral-800 shadow-black/30' : 'bg-white border-slate-200 shadow-slate-200/70'
        } ${className}`}
        data-testid="executive-quote-rail"
        data-variant="executive"
      >
        <p className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
          Executive quote
        </p>

        <div
          className={`flex gap-0.5 p-0.5 rounded-lg mb-4 ${isDarkMode ? 'bg-neutral-950' : 'bg-slate-100'}`}
          role="tablist"
        >
          {RAIL_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              data-rail-tab={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={tabBtn(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {!results && !calculating ? (
            <QuoteEmptyState
              title="Your quote will appear here"
              description="Add products in Portfolio to see live pricing."
              actionLabel="Go to Portfolio"
              onAction={onGoToScope}
              isDarkMode={isDarkMode}
            />
          ) : activeTab === 'summary' ? (
            <div className="space-y-3">
              <QuoteHealthCenter
                results={results}
                previewSelling={previewSelling}
                calculating={calculating}
                isDarkMode={isDarkMode}
                sheetPriceFloorWarning={sheetPriceFloorWarning}
                calcData={calcData}
                readiness={readiness}
                productCount={productCount}
              />
              {results?.margin_breakdown?.mode === 'granular' && (
                <Collapsible open={marginStackOpen} onOpenChange={setMarginStackOpen}>
                  <CollapsibleTrigger
                    className={`flex w-full items-center justify-between py-2.5 text-[13px] font-medium ${
                      isDarkMode ? 'text-neutral-300' : 'text-slate-700'
                    }`}
                  >
                    Margin breakdown
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${marginStackOpen ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1.5 pt-1 text-xs">
                    <RailRow
                      label="Products"
                      value={formatCurrency(results.margin_breakdown.products_selling || 0)}
                      isDarkMode={isDarkMode}
                    />
                    <RailRow
                      label="Internal"
                      value={formatCurrency(results.margin_breakdown.internal?.selling || 0)}
                      isDarkMode={isDarkMode}
                    />
                    <RailRow
                      label="Vendors"
                      value={formatCurrency(results.margin_breakdown.vendors?.selling || 0)}
                      isDarkMode={isDarkMode}
                    />
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          ) : activeTab === 'team' ? (
            <QuoteTeamDashboard
              isDarkMode={isDarkMode}
              selectedProducts={selectedProducts}
              results={results}
              roles={roles}
              standardMonthlyHours={standardMonthlyHours}
              compact
            />
          ) : activeTab === 'risk' ? (
            <QuoteRiskDashboard
              isDarkMode={isDarkMode}
              selectedProducts={selectedProducts}
              results={results}
              calcData={calcData}
              compact
            />
          ) : activeTab === 'margin' ? (
            <QuoteMarginView
              isDarkMode={isDarkMode}
              selectedProducts={selectedProducts}
              calcData={calcData}
              results={results}
              findCatalogProduct={findCatalogProduct}
              getSegmentPayload={getSegmentPayload}
            />
          ) : (
            <CogsDashboard
              results={results}
              calculating={calculating}
              isDarkMode={isDarkMode}
              sheetPriceFloorWarning={sheetPriceFloorWarning}
              calcData={calcData}
            />
          )}
        </div>

        <div className={`mt-auto pt-4 border-t space-y-2 shrink-0 ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
          {setCalcData && (
            <Button
              variant="outline"
              className={`w-full gap-2 text-sm ${isDarkMode ? 'border-neutral-700' : ''}`}
              onClick={() => setControlsOpen(true)}
              data-testid="quote-controls-open"
            >
              <Settings2 className="w-4 h-4" />
              Quote controls
            </Button>
          )}
          {onSaveTemplate && (
            <Button
              variant="outline"
              className={`w-full gap-2 ${isDarkMode ? 'border-neutral-700' : ''}`}
              onClick={onSaveTemplate}
            >
              <Save className="w-4 h-4" />
              Save as template
            </Button>
          )}
        </div>
      </div>

      {setCalcData && (
        <QuoteControlsDrawer
          open={controlsOpen}
          onOpenChange={setControlsOpen}
          isDarkMode={isDarkMode}
          calcData={calcData}
          setCalcData={setCalcData}
          projectInfo={projectInfo}
          setProjectInfo={setProjectInfo}
          paymentTerms={paymentTerms}
          setPaymentTerms={setPaymentTerms}
          onOpenQuoteSettings={onOpenQuoteSettings}
          selectedProducts={selectedProducts}
          setSelectedProducts={setSelectedProducts}
          findCatalogProduct={findCatalogProduct}
          getSegmentPayload={getSegmentPayload}
          results={results}
        />
      )}
    </>
  );
}

function CogsDashboard({ results, calculating, isDarkMode, sheetPriceFloorWarning, calcData }) {
  const [serviceExpanded, setServiceExpanded] = useState(false);
  const [deductionsOpen, setDeductionsOpen] = useState(false);

  const selling   = results?.selling_price || 0;
  const labor     = results?.total_labor_cost    ?? results?.internal_labor_cost ?? 0;
  const vendor    = results?.total_vendor_cost   ?? results?.vendor_cost         ?? 0;
  const overhead  = results?.total_overhead_cost ?? results?.overhead_cost       ?? 0;
  const cogs      = results?.cogs || 0;
  const margin    = results?.contribution_margin_percent ?? 0;
  const marginColor = margin >= 30 ? 'text-emerald-500' : margin >= 20 ? 'text-amber-500' : 'text-rose-500';
  const profit    = selling - cogs;

  const salesRep  = results?.incentive_breakdown?.sales_rep?.capped_value  || results?.sales_incentive || 0;
  const salesMgr  = results?.incentive_breakdown?.sales_manager?.capped_value || 0;
  const totalDeductions = salesRep + salesMgr + (results?.financing_cost || 0);

  const products  = results?.margin_breakdown?.products || [];

  // Composition bar segments
  const safe = selling > 0 ? selling : 1;
  const segments = [
    { label: 'Labor',    pct: (labor   / safe) * 100, color: 'bg-indigo-500'  },
    { label: 'Vendor',   pct: (vendor  / safe) * 100, color: 'bg-amber-500'   },
    { label: 'Overhead', pct: (overhead/ safe) * 100, color: 'bg-violet-500'  },
    { label: 'Deduct.',  pct: (totalDeductions / safe) * 100, color: 'bg-rose-500' },
    { label: 'Profit',   pct: Math.max(0, (profit - totalDeductions) / safe * 100), color: 'bg-emerald-500' },
  ].filter(s => s.pct > 0.1);

  const card  = isDarkMode ? 'bg-neutral-800/60 border-neutral-700' : 'bg-slate-50 border-slate-200';
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-400';
  const text  = isDarkMode ? 'text-neutral-200' : 'text-slate-700';
  const divider = isDarkMode ? 'border-neutral-800' : 'border-slate-100';

  if (!results && !calculating) return null;

  return (
    <div className="space-y-3">
      {/* Selling + margin header */}
      <div className={`rounded-xl border p-3 ${card}`}>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${muted}`}>Selling price</p>
            {calculating ? (
              <div className={`h-6 w-32 rounded animate-pulse ${isDarkMode ? 'bg-neutral-700' : 'bg-slate-200'}`} />
            ) : (
              <DashboardMetricAmount value={selling} size="lg" className={isDarkMode ? 'text-white' : 'text-slate-900'} />
            )}
          </div>
          <div className="text-right">
            <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${muted}`}>Contribution</p>
            <span className={`text-lg font-bold font-mono tabular-nums ${marginColor}`}>{margin.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Composition bar */}
      {!calculating && selling > 0 && (
        <div className={`rounded-xl border p-3 space-y-2 ${card}`}>
          <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Cost composition</p>
          <div className="flex h-3 rounded-full overflow-hidden gap-px">
            {segments.map(s => (
              <div key={s.label} className={`${s.color} opacity-80`} style={{ width: `${s.pct}%` }} title={`${s.label} ${s.pct.toFixed(1)}%`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {segments.map(s => (
              <div key={s.label} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.color}`} />
                <span className={`text-[10px] ${muted}`}>{s.label}</span>
                <span className={`text-[10px] font-mono font-semibold ${text}`}>{s.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost breakdown */}
      <div className={`rounded-xl border divide-y ${card} ${divider}`}>
        <CostRow label="Internal labor" value={labor}   pct={labor   / safe * 100} color="bg-indigo-500" isDarkMode={isDarkMode} calculating={calculating} />
        <CostRow label="Vendor cost"    value={vendor}  pct={vendor  / safe * 100} color="bg-amber-500"  isDarkMode={isDarkMode} calculating={calculating} />
        <CostRow label="Overhead"       value={overhead}pct={overhead/ safe * 100} color="bg-violet-500" isDarkMode={isDarkMode} calculating={calculating} />
        {/* Total COGS row */}
        <div className={`flex items-center justify-between px-3 py-2.5 ${isDarkMode ? 'bg-neutral-900/60' : 'bg-slate-100/80'}`}>
          <span className={`text-[12px] font-semibold ${text}`}>Total COGS</span>
          <span className={`font-mono font-bold text-[13px] tabular-nums ${text}`}>{formatCurrency(cogs)}</span>
        </div>
      </div>

      {/* Per-service breakdown */}
      {products.length > 0 && (
        <div className={`rounded-xl border overflow-hidden ${card}`}>
          <button
            type="button"
            onClick={() => setServiceExpanded(v => !v)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-[12px] font-medium transition-colors ${
              isDarkMode ? 'hover:bg-neutral-800' : 'hover:bg-slate-100'
            } ${text}`}
          >
            <span>Per-service breakdown</span>
            <div className="flex items-center gap-1">
              <span className={`text-[10px] font-mono ${muted}`}>{products.length} services</span>
              {serviceExpanded
                ? <ChevronDown className="w-3.5 h-3.5" />
                : <ChevronRight className="w-3.5 h-3.5" />}
            </div>
          </button>
          {serviceExpanded && (
            <div className={`border-t divide-y ${divider}`}>
              {products.map(p => {
                const pSell = p.selling || 0;
                const pVendor = p.vendor_cost || 0;
                const pOverhead = p.overhead_cost || 0;
                // product_owned lines carry team_cost; legacy/catalog lines only
                // have a bundled `cost` — treat that as internal labor (production).
                const pLabor = p.team_cost != null
                  ? p.team_cost
                  : Math.max(0, (p.cost || 0) - pVendor - pOverhead);
                const pCost = pLabor + pVendor + pOverhead;
                const pMargin = pSell > 0 ? ((pSell - pCost) / pSell * 100) : 0;
                const pMarginColor = pMargin >= 30 ? 'text-emerald-500' : pMargin >= 20 ? 'text-amber-500' : 'text-rose-500';
                return (
                  <div key={p.id} className="px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-semibold truncate ${text}`}>
                        {p.product_name || p.name}
                        {p.segment && <span className={`ml-1.5 text-[9px] uppercase tracking-wider font-normal ${muted}`}>{p.segment}</span>}
                      </span>
                      <span className={`font-mono text-[11px] font-bold tabular-nums shrink-0 ${pMarginColor}`}>
                        {pMargin.toFixed(0)}%
                      </span>
                    </div>
                    <div className={`grid grid-cols-3 gap-1 text-[10px] ${muted}`}>
                      <div>
                        <span>Labor</span>
                        <p className={`font-mono font-semibold ${text}`}>{formatCurrency(pLabor)}</p>
                      </div>
                      <div>
                        <span>Vendor</span>
                        <p className={`font-mono font-semibold ${text}`}>{formatCurrency(pVendor)}</p>
                      </div>
                      <div>
                        <span>Sell</span>
                        <p className={`font-mono font-semibold ${text}`}>{formatCurrency(pSell)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Deductions */}
      {totalDeductions > 0 && (
        <Collapsible open={deductionsOpen} onOpenChange={setDeductionsOpen}>
          <CollapsibleTrigger className={`flex w-full items-center justify-between py-2 text-[12px] font-medium ${text}`}>
            <span>Deductions</span>
            <div className="flex items-center gap-1.5">
              <span className={`font-mono text-[11px] text-rose-500`}>-{formatCurrency(totalDeductions)}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${deductionsOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1.5">
            {salesRep > 0 && <RailRow label="Sales rep"     value={`-${formatCurrency(salesRep)}`} isDarkMode={isDarkMode} negative />}
            {salesMgr > 0 && <RailRow label="Sales manager" value={`-${formatCurrency(salesMgr)}`} isDarkMode={isDarkMode} negative />}
            {(results?.financing_cost || 0) > 0 && (
              <RailRow label="Financing" value={`-${formatCurrency(results.financing_cost)}`} isDarkMode={isDarkMode} negative />
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Net profit */}
      {!calculating && selling > 0 && (
        <div className={`rounded-xl border p-3 flex items-center justify-between ${
          isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <span className={`text-[12px] font-medium ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Net profit</span>
          <span className={`font-mono font-bold text-[13px] tabular-nums ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
            {formatCurrency(Math.max(0, profit - totalDeductions))}
          </span>
        </div>
      )}

      {/* Warnings */}
      {results?.warnings?.length > 0 && (
        <div className="space-y-1.5">
          {results.warnings.slice(0, 2).map((w, i) => (
            <div key={i} className={`p-2.5 rounded-lg text-[12px] flex items-start gap-2 ${
              w.severity === 'error'
                ? isDarkMode ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200'
                : isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CostRow({ label, value, pct, color, isDarkMode, calculating }) {
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-400';
  const text  = isDarkMode ? 'text-neutral-200' : 'text-slate-700';
  return (
    <div className="px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-[12px] ${text}`}>{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono ${muted}`}>{pct.toFixed(1)}%</span>
          {calculating
            ? <div className={`h-4 w-20 rounded animate-pulse ${isDarkMode ? 'bg-neutral-700' : 'bg-slate-200'}`} />
            : <span className={`font-mono font-semibold text-[13px] tabular-nums ${text}`}>{formatCurrency(value)}</span>
          }
        </div>
      </div>
      {!calculating && pct > 0 && (
        <div className={`h-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`}>
          <div className={`h-full rounded-full ${color} opacity-70`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
    </div>
  );
}

function RailRow({ label, value, isDarkMode, bold, negative }) {
  return (
    <div className="flex justify-between gap-2 text-[13px] min-w-0">
      <span className={`shrink-0 ${bold ? 'font-semibold' : ''} ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
        {label}
      </span>
      <span
        className={`font-mono text-right tabular-nums ${negative ? 'text-rose-500' : isDarkMode ? 'text-white' : 'text-slate-900'}`}
      >
        {value}
      </span>
    </div>
  );
}

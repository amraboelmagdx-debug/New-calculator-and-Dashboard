import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, Save, Settings2 } from 'lucide-react';
import DashboardMetricAmount from './DashboardMetricAmount';
import QuoteEmptyState from './QuoteEmptyState';
import IntelligenceAlerts from './IntelligenceAlerts';
import LiveQuoteSummary from './LiveQuoteSummary';
import QuoteTeamDashboard from './QuoteTeamDashboard';
import QuoteRiskDashboard from './QuoteRiskDashboard';
import QuoteControlsDrawer from './QuoteControlsDrawer';
import { formatCurrency } from '@/lib/utils';

const RAIL_TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'team', label: 'Team' },
  { id: 'risk', label: 'Risk' },
  { id: 'cogs', label: 'COGS' },
];

export default function ExecutiveQuoteRail({
  results,
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
  setCalcData,
  onOpenQuoteSettings,
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
    `flex-1 min-w-0 py-1.5 px-1 text-[11px] rounded-md transition-colors font-medium ${
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
        <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>
          Executive quote
        </p>

        <div
          className={`flex gap-0.5 p-0.5 rounded-lg mb-3 ${isDarkMode ? 'bg-neutral-950' : 'bg-slate-100'}`}
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
              <LiveQuoteSummary
                results={results}
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
                    className={`flex w-full items-center justify-between py-2 text-xs font-medium ${
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
              compact
            />
          ) : (
            <div className="space-y-3">
              <div>
                <p className={`text-xs mb-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Selling price</p>
                {calculating ? (
                  <div className={`h-8 w-full rounded animate-pulse ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-200'}`} />
                ) : (
                  <DashboardMetricAmount
                    value={results?.selling_price || 0}
                    size="lg"
                    className={isDarkMode ? 'text-white' : 'text-slate-900'}
                  />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Contribution margin</span>
                <span className={`text-sm font-bold font-mono ${marginColor}`}>{margin.toFixed(1)}%</span>
              </div>
              <IntelligenceAlerts
                results={results}
                sheetPriceFloorWarning={sheetPriceFloorWarning}
                calcData={calcData}
                isDarkMode={isDarkMode}
                maxAlerts={2}
              />
              <Collapsible open={cogsOpen} onOpenChange={setCogsOpen}>
                <CollapsibleTrigger
                  className={`flex w-full items-center justify-between py-2 text-xs font-medium ${
                    isDarkMode ? 'text-neutral-300' : 'text-slate-700'
                  }`}
                >
                  Cost breakdown
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${cogsOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1.5 pt-1">
                  <RailRow label="Internal labor" value={formatCurrency(results?.internal_labor_cost || 0)} isDarkMode={isDarkMode} />
                  <RailRow label="Vendor cost" value={formatCurrency(results?.vendor_cost || 0)} isDarkMode={isDarkMode} />
                  <RailRow label="Overhead" value={formatCurrency(results?.overhead_cost || 0)} isDarkMode={isDarkMode} />
                  <RailRow label="Total COGS" value={formatCurrency(results?.cogs || 0)} isDarkMode={isDarkMode} bold />
                </CollapsibleContent>
              </Collapsible>
              <Collapsible open={deductionsOpen} onOpenChange={setDeductionsOpen}>
                <CollapsibleTrigger
                  className={`flex w-full items-center justify-between py-2 text-xs font-medium ${
                    isDarkMode ? 'text-neutral-300' : 'text-slate-700'
                  }`}
                >
                  Deductions
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${deductionsOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1.5 pt-1">
                  {results?.incentive_breakdown ? (
                    <>
                      <RailRow
                        label="Sales rep"
                        value={`-${formatCurrency(results.incentive_breakdown.sales_rep.capped_value)}`}
                        isDarkMode={isDarkMode}
                        negative
                      />
                      <RailRow
                        label="Sales manager"
                        value={`-${formatCurrency(results.incentive_breakdown.sales_manager.capped_value)}`}
                        isDarkMode={isDarkMode}
                        negative
                      />
                    </>
                  ) : (
                    <RailRow
                      label="Sales incentive"
                      value={`-${formatCurrency(results?.sales_incentive || 0)}`}
                      isDarkMode={isDarkMode}
                      negative
                    />
                  )}
                  {results?.financing_cost > 0 && (
                    <RailRow
                      label="Financing"
                      value={`-${formatCurrency(results.financing_cost)}`}
                      isDarkMode={isDarkMode}
                      negative
                    />
                  )}
                </CollapsibleContent>
              </Collapsible>
              {results?.warnings?.length > 0 && (
                <div className="space-y-2">
                  {results.warnings.slice(0, 2).map((warning, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg text-xs flex items-start gap-2 ${
                        warning.severity === 'error'
                          ? isDarkMode
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                          : isDarkMode
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span className="line-clamp-3">{warning.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
          {exportPdfSlot}
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
          onOpenQuoteSettings={onOpenQuoteSettings}
        />
      )}
    </>
  );
}

function RailRow({ label, value, isDarkMode, bold, negative }) {
  return (
    <div className="flex justify-between gap-2 text-xs min-w-0">
      <span className={`shrink-0 ${bold ? 'font-medium' : ''} ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
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

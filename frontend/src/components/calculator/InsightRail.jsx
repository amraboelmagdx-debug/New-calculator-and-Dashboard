import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, Save } from 'lucide-react';
import DashboardMetricAmount from './DashboardMetricAmount';
import QuoteEmptyState from './QuoteEmptyState';
import IntelligenceAlerts from './IntelligenceAlerts';
import LiveQuoteSummary from './LiveQuoteSummary';
import { formatCurrency } from '@/lib/utils';

export default function InsightRail({
  results,
  calculating,
  isDarkMode,
  sheetPriceFloorWarning,
  calcData,
  exportPdfSlot,
  onSaveTemplate,
  onGoToScope,
  className = '',
  variant = 'full',
  readiness,
  productCount = 0,
}) {
  const [cogsOpen, setCogsOpen] = useState(false);
  const [deductionsOpen, setDeductionsOpen] = useState(false);
  const [marginStackOpen, setMarginStackOpen] = useState(true);
  const liveQuote = variant === 'liveQuote';
  const slim = variant === 'slim';
  const compactPadding = liveQuote || slim;

  const margin = results?.contribution_margin_percent ?? 0;
  const marginColor =
    margin >= 30 ? 'text-emerald-500' : margin >= 20 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div
      className={`h-full flex flex-col overflow-y-auto rounded-2xl border quote-panel-enter ${
        compactPadding ? 'p-4 shadow-md' : 'p-6 shadow-xl'
      } ${
        isDarkMode ? 'bg-neutral-900 border-neutral-800 shadow-black/30' : 'bg-white border-slate-200 shadow-slate-200/70'
      } ${className}`}
      data-testid="dashboard"
      data-variant={variant}
    >
      {!results && !calculating ? (
        <QuoteEmptyState
          title="Your quote will appear here"
          description="Add products or team members in Scope to see live pricing."
          actionLabel="Go to Scope"
          onAction={onGoToScope}
          isDarkMode={isDarkMode}
        />
      ) : liveQuote ? (
        <LiveQuoteSummary
          results={results}
          calculating={calculating}
          isDarkMode={isDarkMode}
          sheetPriceFloorWarning={sheetPriceFloorWarning}
          calcData={calcData}
          readiness={readiness}
          productCount={productCount}
        />
      ) : slim ? (
        <LiveQuoteSummary
          results={results}
          calculating={calculating}
          isDarkMode={isDarkMode}
          sheetPriceFloorWarning={sheetPriceFloorWarning}
          calcData={calcData}
          readiness={readiness}
          productCount={productCount}
        />
      ) : (
        <>
          <div className="mb-4">
            <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              Selling price
            </p>
            {calculating ? (
              <div className={`h-10 w-full rounded animate-pulse ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-200'}`} />
            ) : (
              <DashboardMetricAmount
                value={results?.selling_price || 0}
                size="hero"
                className={isDarkMode ? 'text-white' : 'text-slate-900'}
              />
            )}
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                Contribution margin
              </span>
              <span className={`text-lg font-bold font-mono ${marginColor}`} data-testid="margin-percent">
                {margin.toFixed(1)}%
              </span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`}>
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  margin >= 30 ? 'bg-emerald-500' : margin >= 20 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
              />
            </div>
          </div>

          <div className="mb-2">
            <p className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Net profit</p>
            <DashboardMetricAmount
              value={results?.contribution_margin || 0}
              className={results?.contribution_margin >= 0 ? 'text-emerald-500' : 'text-rose-500'}
            />
          </div>

          <IntelligenceAlerts
            results={results}
            sheetPriceFloorWarning={sheetPriceFloorWarning}
            calcData={calcData}
            isDarkMode={isDarkMode}
          />

          {results?.margin_breakdown?.mode === 'granular' && (
            <Collapsible open={marginStackOpen} onOpenChange={setMarginStackOpen} className="mb-3">
              <CollapsibleTrigger
                className={`flex w-full items-center justify-between py-2 text-sm font-medium ${
                  isDarkMode ? 'text-neutral-300' : 'text-slate-700'
                }`}
              >
                Margin breakdown
                <ChevronDown className={`w-4 h-4 transition-transform ${marginStackOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-1 text-sm">
                <Row
                  label="Products"
                  value={formatCurrency(results.margin_breakdown.products_selling || 0)}
                  isDarkMode={isDarkMode}
                />
                <Row
                  label="Internal"
                  value={formatCurrency(results.margin_breakdown.internal?.selling || 0)}
                  isDarkMode={isDarkMode}
                />
                <Row
                  label="Vendors"
                  value={formatCurrency(results.margin_breakdown.vendors?.selling || 0)}
                  isDarkMode={isDarkMode}
                />
              </CollapsibleContent>
            </Collapsible>
          )}

          <Collapsible open={cogsOpen} onOpenChange={setCogsOpen} className="mb-3">
            <CollapsibleTrigger className={`flex w-full items-center justify-between py-2 text-sm font-medium ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
              Cost breakdown
              <ChevronDown className={`w-4 h-4 transition-transform ${cogsOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1">
              <Row label="Internal labor" value={formatCurrency(results?.internal_labor_cost || 0)} isDarkMode={isDarkMode} />
              <Row label="Vendor cost" value={formatCurrency(results?.vendor_cost || 0)} isDarkMode={isDarkMode} />
              <Row label="Overhead" value={formatCurrency(results?.overhead_cost || 0)} isDarkMode={isDarkMode} />
              <Row label="Total COGS" value={formatCurrency(results?.cogs || 0)} isDarkMode={isDarkMode} bold />
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={deductionsOpen} onOpenChange={setDeductionsOpen} className="mb-4">
            <CollapsibleTrigger className={`flex w-full items-center justify-between py-2 text-sm font-medium ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
              Deductions
              <ChevronDown className={`w-4 h-4 transition-transform ${deductionsOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1">
              {results?.incentive_breakdown ? (
                <>
                  <Row label="Sales rep" value={`-${formatCurrency(results.incentive_breakdown.sales_rep.capped_value)}`} isDarkMode={isDarkMode} negative />
                  <Row label="Sales manager" value={`-${formatCurrency(results.incentive_breakdown.sales_manager.capped_value)}`} isDarkMode={isDarkMode} negative />
                </>
              ) : (
                <Row label="Sales incentive" value={`-${formatCurrency(results?.sales_incentive || 0)}`} isDarkMode={isDarkMode} negative />
              )}
              {results?.financing_cost > 0 && (
                <Row label="Financing" value={`-${formatCurrency(results.financing_cost)}`} isDarkMode={isDarkMode} negative />
              )}
            </CollapsibleContent>
          </Collapsible>

          {results?.warnings?.length > 0 && (
            <div className="space-y-2 mb-4">
              {results.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                    warning.severity === 'error'
                      ? isDarkMode
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                      : isDarkMode
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className={`mt-auto pt-4 border-t space-y-2 ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
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
  );
}

function Row({ label, value, isDarkMode, bold, negative }) {
  return (
    <div className="flex justify-between gap-2 text-sm min-w-0">
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

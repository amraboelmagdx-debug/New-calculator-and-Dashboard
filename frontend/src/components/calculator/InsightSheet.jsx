import { useState } from 'react';
import { ChevronUp, X } from 'lucide-react';
import InsightRail from './InsightRail';
import { formatCurrency } from '@/lib/utils';

export default function InsightSheet({
  open,
  onOpenChange,
  results,
  calculating,
  isDarkMode,
  sheetPriceFloorWarning,
  calcData,
  exportPdfSlot,
  onSaveTemplate,
  onGoToScope,
  variant = 'full',
}) {
  const margin = results?.contribution_margin_percent ?? 0;
  const pillLabel = results
    ? `${formatCurrency(results.selling_price)} · ${margin.toFixed(0)}% margin`
    : 'Tap for quote insights';

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={`lg:hidden fixed left-4 right-4 z-40 flex items-center justify-between gap-2 px-4 py-3 rounded-full shadow-lg border transition-transform active:scale-[0.98] ${
          isDarkMode
            ? 'bg-neutral-900 border-neutral-700 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
        data-testid="insight-pill"
      >
        <span className="text-sm font-semibold font-mono tabular-nums truncate">{pillLabel}</span>
        <ChevronUp className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => onOpenChange(false)}
          aria-hidden
        />
      )}

      <div
        className={`lg:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
        style={{ maxHeight: '70vh' }}
      >
        <div className={`rounded-t-2xl overflow-hidden h-full ${isDarkMode ? 'bg-neutral-950' : 'bg-white'}`}>
          <div className="flex justify-center py-2">
            <div className={`w-10 h-1 rounded-full ${isDarkMode ? 'bg-neutral-700' : 'bg-slate-300'}`} />
          </div>
          <button
            type="button"
            className={`absolute top-3 right-3 p-2 rounded-lg ${isDarkMode ? 'hover:bg-neutral-800' : 'hover:bg-slate-100'}`}
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="h-[calc(70vh-2rem)] overflow-hidden">
            <InsightRail
              results={results}
              calculating={calculating}
              isDarkMode={isDarkMode}
              sheetPriceFloorWarning={sheetPriceFloorWarning}
              calcData={calcData}
              exportPdfSlot={exportPdfSlot}
              onSaveTemplate={onSaveTemplate}
              onGoToScope={onGoToScope}
              variant={variant}
              className="rounded-none border-0 shadow-none h-full"
            />
          </div>
        </div>
      </div>
    </>
  );
}

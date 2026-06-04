import { BarChart3 } from 'lucide-react';
import { formatCurrencyCompact } from '@/lib/utils';
import { buildProductLines, computeClientPreview } from '@/lib/marginEngine';
import QuoteEmptyState from './QuoteEmptyState';

function marginColor(pct, isDarkMode) {
  if (pct >= 30) return isDarkMode ? 'text-emerald-400' : 'text-emerald-600';
  if (pct >= 20) return isDarkMode ? 'text-amber-400' : 'text-amber-600';
  return isDarkMode ? 'text-rose-400' : 'text-rose-600';
}

export default function QuoteMarginView({
  isDarkMode,
  selectedProducts = [],
  calcData,
  results,
  findCatalogProduct,
  getSegmentPayload,
}) {
  const canBuild = typeof findCatalogProduct === 'function' && typeof getSegmentPayload === 'function';
  const lines = canBuild
    ? buildProductLines(selectedProducts, findCatalogProduct, getSegmentPayload, calcData)
    : [];
  const preview = computeClientPreview(lines, calcData, results);
  const target = preview.target;

  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const card = isDarkMode ? 'border-neutral-800 bg-neutral-950/50' : 'border-slate-200 bg-white';

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

  return (
    <div className="space-y-3" data-testid="quote-margin-view">
      <div className={`grid grid-cols-2 gap-3 p-3 rounded-xl border ${card}`}>
        <div>
          <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Quote margin</p>
          <p className={`text-lg font-semibold tabular-nums ${marginColor(preview.apiMargin, isDarkMode)}`}>
            {preview.apiMargin.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Target</p>
          <p className={`text-lg font-semibold tabular-nums ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
            {target}%
          </p>
        </div>
      </div>

      {preview.gapToTarget > 0 && (
        <p className={`text-xs ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
          {preview.gapToTarget.toFixed(1)}% below target
        </p>
      )}
      {preview.invalidLines > 0 && (
        <p className={`text-xs ${isDarkMode ? 'text-rose-400' : 'text-rose-700'}`}>
          {preview.invalidLines} line(s) need margin attention
        </p>
      )}

      <div className={`rounded-xl border divide-y ${card} ${isDarkMode ? 'divide-neutral-800' : 'divide-slate-100'}`}>
        {lines.map(line => {
          const pct = Number(line.margin_percent) || 0;
          const min = Number(line.sheet_min_margin_percent) || 0;
          const belowMin = min > 0 && pct < min;
          return (
            <div key={line.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className={`text-xs truncate ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
                  {line.product_name}
                </p>
                <p className={`text-[10px] ${muted}`}>
                  {formatCurrencyCompact(line.line_selling || 0, true)}
                  {min > 0 && <span className="ml-1.5">min {min}%</span>}
                </p>
              </div>
              <span className={`text-sm font-mono font-semibold tabular-nums shrink-0 ${marginColor(pct, isDarkMode)}`}>
                {pct.toFixed(1)}%{belowMin ? ' !' : ''}
              </span>
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

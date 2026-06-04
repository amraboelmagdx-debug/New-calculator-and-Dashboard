import { formatCurrencyCompact } from '@/lib/utils';
import { deriveLineValidation } from '@/lib/productWorkspaceUtils';

export default function ProductsCommandStrip({ isDarkMode, selectedProducts = [], results, inline = false }) {
  const lines = results?.margin_breakdown?.products || [];
  const lineById = new Map(lines.map(l => [l.id, l]));
  const products = (selectedProducts || []).filter(p => p.product_name);

  const totalTeam = lines.reduce((s, l) => s + (Number(l.team_cost) || Number(l.internal_cost) || 0), 0);
  const selling = results?.selling_price;
  const quoteMargin = results?.contribution_margin_percent;

  let needsReview = 0;
  for (const item of products) {
    const line = lineById.get(item.id);
    const v = deriveLineValidation(line, item);
    if (v.status !== 'ok') needsReview += 1;
  }

  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const val = isDarkMode ? 'text-neutral-200' : 'text-slate-800';

  return (
    <div
      className={`products-command-strip flex flex-wrap items-center justify-end gap-x-2.5 gap-y-0 text-[11px] tabular-nums shrink-0 min-w-0 ${
        inline ? 'products-command-strip--inline py-0 mb-0 border-0' : 'py-2 px-1 text-xs mb-2 border-b'
      } ${!inline && (isDarkMode ? 'border-neutral-800' : 'border-slate-100')}`}
      data-testid="products-command-strip"
    >
      <span className={muted}>
        <span className={`font-semibold ${val}`}>
          {selling != null ? formatCurrencyCompact(selling, true) : '—'}
        </span>{' '}
        selling
      </span>
      <span className={muted}>
        <span className={`font-semibold ${val}`}>
          {quoteMargin != null ? `${Math.round(quoteMargin)}%` : '—'}
        </span>{' '}
        margin
      </span>
      <span className={muted}>
        <span className={`font-semibold ${val}`}>{formatCurrencyCompact(totalTeam, true)}</span> team
      </span>
      <span className={muted}>
        <span className={`font-semibold ${val}`}>{products.length}</span> products
      </span>
      {needsReview > 0 && (
        <span className={isDarkMode ? 'text-amber-400' : 'text-amber-700'}>
          {needsReview} review
        </span>
      )}
    </div>
  );
}

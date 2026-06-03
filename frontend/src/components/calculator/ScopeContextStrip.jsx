import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

function formatSyncedAt(iso) {
  if (!iso) return 'Not synced';
  try {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return 'Unknown';
  }
}

export default function ScopeContextStrip({
  isDarkMode,
  productsPricingLoading,
  productsPricingSyncedAt,
  productsPricingStale = false,
  productCount = 0,
  teamCount = 0,
  sheetPriceFloorWarning,
  readiness,
  onRefresh,
}) {
  const ageStale = productsPricingSyncedAt
    ? Date.now() - new Date(productsPricingSyncedAt).getTime() > 24 * 60 * 60 * 1000
    : true;
  const stale = productsPricingStale || ageStale;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-xs rounded-lg px-3 py-2 ${
        isDarkMode ? 'bg-neutral-900/80 border border-neutral-800' : 'bg-slate-50 border border-slate-200'
      }`}
      data-testid="scope-context-strip"
    >
      <span className={`font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Scope</span>
      <span className={`inline-flex items-center gap-1 ${stale ? 'text-amber-500' : 'text-emerald-500'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${stale ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        Sync · {formatSyncedAt(productsPricingSyncedAt)}
      </span>
      <span className={isDarkMode ? 'text-neutral-600' : 'text-slate-300'}>·</span>
      <span className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>
        {productCount} product{productCount !== 1 ? 's' : ''}
      </span>
      <span className={isDarkMode ? 'text-neutral-600' : 'text-slate-300'}>·</span>
      <span className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>
        {teamCount} team
      </span>
      {readiness != null && (
        <>
          <span className={isDarkMode ? 'text-neutral-600' : 'text-slate-300'}>·</span>
          <span className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>{readiness.percent}% ready</span>
        </>
      )}
      {sheetPriceFloorWarning && (
        <span
          className={`inline-flex items-center gap-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}
          title={`Below sheet minimum (O): ${formatCurrency(sheetPriceFloorWarning.floor)}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Below sheet min
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 ml-auto"
        disabled={productsPricingLoading}
        onClick={onRefresh}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${productsPricingLoading ? 'animate-spin' : ''}`} />
        Sync data
      </Button>
    </div>
  );
}

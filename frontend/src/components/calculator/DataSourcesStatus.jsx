import { RefreshCw } from 'lucide-react';

function formatLoadedAt(iso) {
  if (!iso) return 'Not loaded';
  try {
    const d = new Date(iso);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
  } catch {
    return 'Unknown';
  }
}

export default function DataSourcesStatus({
  isDarkMode,
  productsPricingSyncedAt,
  productsPricingStale = false,
  rolesCount,
  onRefresh,
  isLoading = false,
}) {
  const ageStale = productsPricingSyncedAt
    ? Date.now() - new Date(productsPricingSyncedAt).getTime() > 24 * 60 * 60 * 1000
    : true;
  const stale = productsPricingStale || ageStale;

  const content = (
    <>
      <span className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>Data</span>
      <span className={`inline-flex items-center gap-1 ${stale ? 'text-amber-500' : 'text-emerald-500'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${stale ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        Products · {formatLoadedAt(productsPricingSyncedAt)}
      </span>
      <span className={isDarkMode ? 'text-neutral-600' : 'text-slate-400'}>·</span>
      <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>{rolesCount} roles</span>
      {onRefresh && (
        <RefreshCw
          className={`w-3 h-3 ml-0.5 transition-opacity ${
            isLoading ? 'animate-spin opacity-100' : 'opacity-40 group-hover:opacity-80'
          } ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}
        />
      )}
    </>
  );

  const baseClass = `flex flex-wrap items-center gap-2 text-xs rounded-lg px-3 py-2 mb-4 ${
    isDarkMode ? 'bg-neutral-900/60 border border-neutral-800' : 'bg-slate-50 border border-slate-200'
  }`;

  if (onRefresh) {
    return (
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        title="Refresh from Google Sheets"
        data-testid="data-sources-status"
        className={`group ${baseClass} cursor-pointer hover:border-indigo-500/40 transition-colors disabled:cursor-not-allowed`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={baseClass} data-testid="data-sources-status">
      {content}
    </div>
  );
}

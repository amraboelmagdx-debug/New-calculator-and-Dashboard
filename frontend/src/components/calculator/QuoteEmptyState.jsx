import { Button } from '@/components/ui/button';

export default function QuoteEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  isDarkMode,
  compact = false,
}) {
  return (
    <div
      className={`rounded-xl border border-dashed text-center ${
        compact ? 'p-4' : 'p-8'
      } ${isDarkMode ? 'border-neutral-700 bg-neutral-900/40' : 'border-slate-200 bg-slate-50'}`}
    >
      <p className={`font-medium ${compact ? 'text-sm' : 'text-base'} ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
        {title}
      </p>
      {description && (
        <p className={`mt-1 ${compact ? 'text-xs' : 'text-sm'} ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="outline"
          size="sm"
          className={`mt-3 ${isDarkMode ? 'border-neutral-600' : ''}`}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

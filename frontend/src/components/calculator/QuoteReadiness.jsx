export default function QuoteReadiness({ readiness, isDarkMode }) {
  const { percent, remaining } = readiness;
  return (
    <div className="text-right" data-testid="quote-readiness">
      <p className={`text-xs font-medium ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
        Quote ready
      </p>
      <p className={`text-sm font-semibold tabular-nums ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
        {percent}%
      </p>
      {remaining.length > 0 && (
        <p className={`text-[10px] ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>
          {remaining.length} step{remaining.length > 1 ? 's' : ''} left
        </p>
      )}
    </div>
  );
}

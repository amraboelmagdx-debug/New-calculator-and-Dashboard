import { Input } from '@/components/ui/input';

function MarginRangeBar({ value, min, isDarkMode }) {
  const minP = Math.min(100, Math.max(0, min || 0));
  const valP = Math.min(100, Math.max(0, value || 0));
  return (
    <div className={`relative h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-200'}`}>
      <div
        className={`absolute inset-y-0 left-0 ${isDarkMode ? 'bg-amber-500/40' : 'bg-amber-300'}`}
        style={{ width: `${minP}%` }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white shadow"
        style={{ left: `calc(${valP}% - 5px)` }}
      />
    </div>
  );
}

export default function MarginTabPanel({ item, segmentPayload, line, isDarkMode, onSetMargin }) {
  const sheetMin = Number(segmentPayload?.minimum_margin_percent || line?.sheet_min_margin_percent) || 0;
  const current = item.margin_percent != null ? item.margin_percent : (sheetMin || 30);
  const delta = sheetMin > 0 ? Math.round((current - sheetMin) * 10) / 10 : null;
  const inputClass = isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-300';
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const border = isDarkMode ? 'border-neutral-800' : 'border-slate-200';

  const deltaClass =
    delta != null && delta < 0
      ? isDarkMode ? 'text-rose-400' : 'text-rose-600'
      : isDarkMode ? 'text-emerald-400' : 'text-emerald-600';

  return (
    <div className="pt-3 space-y-4" data-testid="margin-tab-panel">
      <div className={`rounded-lg border p-4 space-y-3 ${border} ${isDarkMode ? 'bg-neutral-900/30' : 'bg-white'}`}>
        <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
          <div>
            <p className={`text-[10px] font-medium uppercase tracking-wider ${muted}`}>Minimum</p>
            <p className={`text-lg font-semibold tabular-nums ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
              {sheetMin > 0 ? `${sheetMin}%` : '—'}
            </p>
          </div>
          <div>
            <p className={`text-[10px] font-medium uppercase tracking-wider ${muted}`}>Product margin</p>
            <p className={`text-lg font-semibold tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {Math.round(current)}%
            </p>
          </div>
          <div>
            <p className={`text-[10px] font-medium uppercase tracking-wider ${muted}`}>vs minimum</p>
            <p className={`text-lg font-semibold tabular-nums ${deltaClass}`}>
              {delta != null ? (delta >= 0 ? `+${delta}%` : `${delta}%`) : '—'}
            </p>
          </div>
        </div>
        {sheetMin > 0 && <MarginRangeBar value={current} min={sheetMin} isDarkMode={isDarkMode} />}
      </div>

      <div className="flex items-end gap-3">
        <div className="w-[120px]">
          <label className={`text-[10px] ${muted}`}>Margin %</label>
          <Input
            type="number"
            min="0"
            max="99"
            value={current}
            onChange={e => onSetMargin(Math.max(0, Math.min(99, parseFloat(e.target.value) || 0)))}
            className={`h-9 mt-1 ${inputClass}`}
          />
        </div>
        {sheetMin > 0 && current < sheetMin && (
          <p className={`text-[11px] pb-2 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>
            Below sheet minimum ({sheetMin}%)
          </p>
        )}
      </div>
    </div>
  );
}

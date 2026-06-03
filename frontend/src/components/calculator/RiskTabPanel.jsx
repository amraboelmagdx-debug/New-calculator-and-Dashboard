import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { computeRiskSellingImpact } from '@/lib/productWorkspaceUtils';

const RISK_LEVELS = ['none', 'low', 'medium', 'high'];

function RiskEditor({ risk, isDarkMode, onSetRisk }) {
  const mode = risk.risk_mode || 'default';
  const selectClass = isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-300';

  const modeBtn = (value, label) => (
    <button
      type="button"
      onClick={() => onSetRisk({ risk_mode: value })}
      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
        mode === value
          ? isDarkMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          : isDarkMode ? 'text-neutral-400 border-neutral-700 hover:text-neutral-200' : 'text-slate-500 border-slate-200 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
          Risk mode
        </span>
        {modeBtn('default', 'Factors')}
        {modeBtn('custom', 'Custom x')}
      </div>

      {mode === 'custom' ? (
        <div className="w-[160px]">
          <label className={`text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>Custom multiplier</label>
          <Input
            type="number"
            min="1"
            step="0.05"
            value={risk.custom_multiplier || 1}
            onChange={e => onSetRisk({ custom_multiplier: Math.max(0, parseFloat(e.target.value) || 0) })}
            className={`h-9 mt-1 ${selectClass}`}
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {['complexity', 'rush', 'execution'].map(factor => (
            <div key={factor}>
              <label className={`text-[10px] capitalize ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>{factor}</label>
              <Select value={risk[factor] || 'none'} onValueChange={value => onSetRisk({ [factor]: value })}>
                <SelectTrigger className={`h-9 ${selectClass}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                  {RISK_LEVELS.map(level => (
                    <SelectItem key={level} value={level} className="capitalize">{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RiskTabPanel({ risk, line, item, isDarkMode, onSetRisk }) {
  const mult = Number(line?.risk_multiplier) || 1;
  const impact = computeRiskSellingImpact(line, item?.margin_percent);
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const border = isDarkMode ? 'border-neutral-800' : 'border-slate-200';

  const chip = (label, value) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border capitalize ${
        isDarkMode ? 'border-neutral-700 bg-neutral-900/50 text-neutral-300' : 'border-slate-200 bg-white text-slate-600'
      }`}
    >
      <span className={muted}>{label}</span>
      <span className="font-medium">{value || 'none'}</span>
    </span>
  );

  return (
    <div className="pt-3 space-y-4" data-testid="risk-tab-panel">
      <div className={`rounded-lg border p-4 space-y-3 ${border} ${isDarkMode ? 'bg-neutral-900/30' : 'bg-white'}`}>
        <div className="flex flex-wrap gap-2">
          {chip('Complexity', risk.complexity)}
          {chip('Rush', risk.rush)}
          {chip('Execution', risk.execution)}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`text-[10px] font-medium uppercase tracking-wider ${muted}`}>Risk multiplier</p>
            <p className={`text-2xl font-bold tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {mult.toFixed(2)}x
            </p>
          </div>
          {impact > 0 && (
            <div className="text-right">
              <p className={`text-[10px] font-medium uppercase tracking-wider ${muted}`}>Impact on selling price</p>
              <p className={`text-lg font-semibold tabular-nums ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                + {formatCurrency(impact, false)}
              </p>
            </div>
          )}
        </div>
      </div>
      <RiskEditor risk={risk} isDarkMode={isDarkMode} onSetRisk={onSetRisk} />
    </div>
  );
}

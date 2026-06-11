import { ShieldAlert, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { computeRiskSellingImpact } from '@/lib/productWorkspaceUtils';

const RISK_LEVELS = ['none', 'low', 'medium', 'high'];
const RISK_MULT = { none: 1.0, low: 1.05, medium: 1.15, high: 1.3 };
const FACTORS = ['complexity', 'rush', 'execution'];
const LEVEL_TONE = {
  none: 'text-neutral-400',
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-rose-400',
};

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
  const adjusted = Number(line?.selling) || 0;
  const base = adjusted > 0 ? adjusted - impact : 0;
  const hasRisk = mult > 1 && impact > 0;
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const border = isDarkMode ? 'border-neutral-800' : 'border-slate-200';
  const card = isDarkMode ? 'bg-neutral-900/40 border-neutral-700/60' : 'bg-slate-50 border-slate-200';
  const isCustom = (risk.risk_mode || 'default') === 'custom';

  // Financial chain cell: label + SAR value
  const chainCell = (label, value, tone) => (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className={`text-[9px] font-semibold uppercase tracking-wider ${muted}`}>{label}</span>
      <span className={`text-sm sm:text-base font-bold font-mono tabular-nums leading-tight ${tone}`}>{value}</span>
    </div>
  );

  return (
    <div className="pt-3 space-y-4" data-testid="risk-tab-panel">
      {/* ── Financial impact panel ── */}
      <div className={`rounded-xl border p-4 space-y-3.5 ${card}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${
            hasRisk ? (isDarkMode ? 'text-amber-400' : 'text-amber-700') : muted
          }`}>
            <ShieldAlert className="w-3.5 h-3.5" />
            Risk impact
          </span>
          <span className={`text-2xl font-extrabold tabular-nums ${
            mult > 1.2 ? 'text-rose-400' : mult > 1 ? 'text-amber-400' : isDarkMode ? 'text-neutral-300' : 'text-slate-700'
          }`}>
            {mult.toFixed(2)}x
          </span>
        </div>

        {/* Base → Premium → Adjusted chain */}
        {adjusted > 0 ? (
          <div className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 ${
            isDarkMode ? 'bg-neutral-950/50 border-neutral-800' : 'bg-white border-slate-200'
          }`}>
            {chainCell('Base price', formatCurrency(base, false), isDarkMode ? 'text-neutral-300' : 'text-slate-700')}
            <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${muted}`} />
            {chainCell(
              'Risk premium',
              hasRisk ? `+${formatCurrency(impact, false)}` : '—',
              hasRisk ? (isDarkMode ? 'text-amber-400' : 'text-amber-600') : muted
            )}
            <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${muted}`} />
            {chainCell('Adjusted price', formatCurrency(adjusted, false), isDarkMode ? 'text-emerald-400' : 'text-emerald-600')}
          </div>
        ) : (
          <p className={`text-xs ${muted}`}>Add a team to this service to see the risk premium in SAR.</p>
        )}

        {/* Per-factor contribution */}
        {!isCustom && (
          <div className="space-y-1.5">
            {FACTORS.map(f => {
              const level = risk[f] || 'none';
              const lm = RISK_MULT[level] || 1;
              return (
                <div key={f} className="flex items-center justify-between text-xs">
                  <span className={`capitalize ${muted}`}>{f}</span>
                  <span className="flex items-center gap-2">
                    <span className={`font-semibold capitalize ${LEVEL_TONE[level]}`}>{level}</span>
                    <span className={`font-mono tabular-nums text-[11px] w-12 text-right ${lm > 1 ? (isDarkMode ? 'text-neutral-300' : 'text-slate-600') : muted}`}>
                      ×{lm.toFixed(2)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RiskEditor risk={risk} isDarkMode={isDarkMode} onSetRisk={onSetRisk} />
    </div>
  );
}

import { Shield } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ScopeRiskPanel({ calcData, setCalcData, isDarkMode, compact = false }) {
  const risk = calcData?.internal_risk || { complexity: 'none', rush: 'none', execution: 'none' };
  const activeCount = [risk.complexity, risk.rush, risk.execution].filter(r => r !== 'none').length;

  return (
    <div className="space-y-4" data-testid="scope-risk-panel">
      {!compact && (
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'
          }`}
        >
          <Shield className={`w-4 h-4 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`} />
        </div>
        <div>
          <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Internal risk factors
          </h3>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
            Quote-level adjustments for complexity, rush, and execution. These apply to the whole deal, not
            individual team rows.
          </p>
          {activeCount > 0 && (
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
              {activeCount} factor{activeCount !== 1 ? 's' : ''} active
            </p>
          )}
        </div>
      </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {['complexity', 'rush', 'execution'].map(factor => (
          <div key={factor}>
            <Label className={`text-xs capitalize ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              {factor}
            </Label>
            <Select
              value={risk[factor] || 'none'}
              onValueChange={v =>
                setCalcData(p => ({
                  ...p,
                  internal_risk: { ...p.internal_risk, [factor]: v },
                }))
              }
            >
              <SelectTrigger
                className={`mt-1 text-sm ${
                  isDarkMode
                    ? 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                {['none', 'low', 'medium', 'high'].map(level => (
                  <SelectItem
                    key={level}
                    value={level}
                    className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

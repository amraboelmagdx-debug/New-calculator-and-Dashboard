import { useState } from 'react';
import { Shield } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FACTORS = ['complexity', 'rush', 'execution'];
const LEVELS = ['none', 'low', 'medium', 'high'];

const TARGETS = [
  { key: 'internal', label: 'Internal' },
  { key: 'both',     label: 'Both' },
  { key: 'vendors',  label: 'Vendors' },
];

export default function ScopeRiskPanel({ calcData, setCalcData, isDarkMode, compact = false }) {
  const [applyTo, setApplyTo] = useState('internal');

  const internalRisk = calcData?.internal_risk || { complexity: 'none', rush: 'none', execution: 'none' };
  const vendorRisk   = calcData?.vendor_risk   || { complexity: 'none', rush: 'none', execution: 'none' };

  // Display values come from the selected scope (for 'both', show the synced/internal values)
  const displayRisk = applyTo === 'vendors' ? vendorRisk : internalRisk;

  const activeInternal = FACTORS.filter(f => internalRisk[f] !== 'none').length;
  const activeVendor   = FACTORS.filter(f => vendorRisk[f]   !== 'none').length;

  const handleApplyToChange = (target) => {
    if (target === 'both') {
      // Immediate sync: unify both profiles to the max level of each factor
      setCalcData(prev => {
        const ir = prev.internal_risk || {};
        const vr = prev.vendor_risk   || {};
        const synced = {};
        FACTORS.forEach(f => {
          const iLevel = LEVELS.indexOf(ir[f] || 'none');
          const vLevel = LEVELS.indexOf(vr[f] || 'none');
          synced[f] = LEVELS[Math.max(iLevel, vLevel)];
        });
        return { ...prev, internal_risk: synced, vendor_risk: { ...synced } };
      });
    }
    setApplyTo(target);
  };

  const handleChange = (factor, value) => {
    setCalcData(prev => {
      const next = { ...prev };
      if (applyTo === 'internal' || applyTo === 'both') {
        next.internal_risk = { ...(prev.internal_risk || {}), [factor]: value };
      }
      if (applyTo === 'vendors' || applyTo === 'both') {
        next.vendor_risk = { ...(prev.vendor_risk || {}), [factor]: value };
      }
      return next;
    });
  };

  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';

  return (
    <div className="space-y-3" data-testid="scope-risk-panel">
      {!compact && (
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'
          }`}>
            <Shield className={`w-4 h-4 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`} />
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Quote risk factors
            </h3>
            <p className={`text-xs mt-0.5 ${muted}`}>
              Applies to the whole deal. Use "Apply to" to control Internal, Vendors, or both.
            </p>
          </div>
        </div>
      )}

      {/* Apply-to segmented control */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] uppercase tracking-wider shrink-0 ${muted}`}>Apply to</span>
        <div className={`flex rounded-lg p-0.5 gap-0.5 ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`}>
          {TARGETS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleApplyToChange(t.key)}
              className={`h-6 px-2.5 text-[10px] font-semibold rounded-md transition-all ${
                applyTo === t.key
                  ? isDarkMode
                    ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                    : 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                  : isDarkMode
                    ? 'text-neutral-400 hover:text-neutral-200'
                    : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Active counts */}
        {(activeInternal > 0 || activeVendor > 0) && (
          <div className={`flex items-center gap-1.5 ml-auto text-[10px] ${muted}`}>
            {activeInternal > 0 && (
              <span className={`px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                Int {activeInternal}
              </span>
            )}
            {activeVendor > 0 && (
              <span className={`px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                Vnd {activeVendor}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FACTORS.map(factor => (
          <div key={factor}>
            <Label className={`text-xs capitalize ${muted}`}>{factor}</Label>
            <Select
              value={displayRisk[factor] || 'none'}
              onValueChange={v => handleChange(factor, v)}
            >
              <SelectTrigger className={`mt-1 text-sm ${
                isDarkMode
                  ? 'bg-neutral-950 border-neutral-800 text-neutral-300'
                  : 'bg-white border-slate-300 text-slate-700'
              }`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                {LEVELS.map(level => (
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

            {/* Show mismatch hint when both are active and differ */}
            {applyTo !== 'both' && internalRisk[factor] !== vendorRisk[factor] &&
              internalRisk[factor] !== 'none' && vendorRisk[factor] !== 'none' && (
              <p className={`text-[9px] mt-0.5 ${muted}`}>
                Int: {internalRisk[factor]} · Vnd: {vendorRisk[factor]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

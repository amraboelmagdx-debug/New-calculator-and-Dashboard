import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { formatCurrencyCompact } from '@/lib/utils';
import { sellingFromCostAndMargin } from '@/lib/marginEngine';

export default function MarginTabPanel({ item, segmentPayload, line, isDarkMode, onSetMargin, onMarginPreview }) {
  const sheetMin = Number(segmentPayload?.minimum_margin_percent || line?.sheet_min_margin_percent) || 0;
  const current = item.margin_percent != null ? item.margin_percent : sheetMin || 30;

  const sliderMin = 0;
  const sliderMax = 90;
  const sliderStep = 0.5;

  const [localMargin, setLocalMargin] = useState(current);

  useEffect(() => { setLocalMargin(current); }, [current]);

  const riskMult = Number(line?.risk_multiplier) || 1;
  const baseCost = Number(line?.cost) || 0;
  const previewSelling = baseCost > 0 ? sellingFromCostAndMargin(baseCost * riskMult, localMargin) : null;
  const lineSelling = line?.selling != null ? Number(line.selling) : null;
  const displaySelling = previewSelling ?? lineSelling;
  const profitAmt = displaySelling != null && baseCost > 0 ? displaySelling - baseCost * riskMult : null;

  // Effective margin: (selling - original COGS) / selling — differs from applied when risk ≠ 1
  const effectiveMargin = displaySelling != null && baseCost > 0 && displaySelling > 0
    ? (1 - baseCost / displaySelling) * 100
    : null;
  const showEffective = riskMult !== 1 && effectiveMargin != null;

  const delta = sheetMin > 0 ? Math.round((localMargin - sheetMin) * 10) / 10 : null;
  const belowMin = sheetMin > 0 && localMargin < sheetMin;

  // Part C: no debounce — call onSetMargin directly on every change
  // Calculator's own 300ms debounce handles API throttling
  const commit = (val) => {
    const clamped = Math.max(0, Math.min(99, Math.round(val * 10) / 10));
    onSetMargin(clamped);
  };

  const handleChange = ([v]) => {
    setLocalMargin(v);
    commit(v);
    onMarginPreview?.(v); // instant rail preview (no debounce)
  };
  const handleCommit = ([v]) => {
    setLocalMargin(v);
    commit(v);
    onMarginPreview?.(v);
  };

  const thumbPercent = ((localMargin - sliderMin) / (sliderMax - sliderMin)) * 100;
  const displayRounded = Math.round(localMargin * 10) / 10;

  // Color tokens
  const accent = belowMin
    ? 'text-rose-400'
    : isDarkMode ? 'text-indigo-300' : 'text-indigo-600';

  const trackFill = belowMin
    ? isDarkMode
      ? '[&_[role=slider]]:border-rose-400 [&_[role=slider]]:bg-rose-500 [&_.bg-primary]:bg-rose-500/80'
      : '[&_[role=slider]]:border-rose-300 [&_[role=slider]]:bg-rose-500 [&_.bg-primary]:bg-rose-400'
    : isDarkMode
      ? '[&_[role=slider]]:bg-indigo-400 [&_.bg-primary]:bg-indigo-500/80'
      : '[&_[role=slider]]:bg-indigo-600 [&_.bg-primary]:bg-indigo-500';

  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-400';
  const subtle = isDarkMode ? 'text-neutral-400' : 'text-slate-500';
  const card = isDarkMode ? 'bg-neutral-800/70 border-neutral-700/60' : 'bg-slate-50 border-slate-200';
  const divider = isDarkMode ? 'bg-neutral-700' : 'bg-slate-200';

  return (
    <div className="space-y-3 pt-1 pb-2" data-testid="margin-tab-panel">

      {/* ── Compact metrics row ── */}
      <div className={`grid grid-cols-3 divide-x rounded-xl border overflow-hidden ${card} ${
        isDarkMode ? 'divide-neutral-700' : 'divide-slate-200'
      }`}>

        {/* Cell 1 — Margin */}
        <div className="flex flex-col items-center justify-center py-3 px-2 gap-0.5">
          <span className={`text-[10px] font-semibold uppercase tracking-widest ${muted}`}>
            {showEffective ? 'Applied' : 'Margin'}
          </span>
          <span className={`text-2xl font-extrabold tabular-nums leading-tight transition-all duration-100 ${
            belowMin ? 'text-rose-400' : isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            {displayRounded}%
          </span>
          {showEffective ? (
            <span className={`text-[10px] tabular-nums ${muted}`}>
              ≈<strong className={isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}>
                {(effectiveMargin ?? 0).toFixed(1)}%
              </strong>{' '}effective
            </span>
          ) : sheetMin > 0 ? (
            <span className={`text-[10px] ${muted}`}>
              Min <strong className={isDarkMode ? 'text-neutral-300' : 'text-slate-600'}>{sheetMin}%</strong>
            </span>
          ) : null}
        </div>

        {/* Cell 2 — Delta + status */}
        <div className="flex flex-col items-center justify-center py-3 px-2 gap-1">
          {belowMin ? (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span className="text-[10px] font-semibold text-rose-400 text-center leading-tight">
                {Math.abs(delta ?? 0)}% below min
              </span>
            </>
          ) : delta != null ? (
            <>
              <span className={`text-xl font-extrabold tabular-nums ${
                delta > 0 ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-neutral-400' : 'text-slate-400')
              }`}>
                {delta >= 0 ? '+' : ''}{delta}%
              </span>
              <span className={`text-[10px] ${muted}`}>vs min</span>
            </>
          ) : (
            <span className={`text-[11px] ${muted}`}>No min set</span>
          )}
        </div>

        {/* Cell 3 — Client price */}
        <div className="flex flex-col items-center justify-center py-3 px-2 gap-0.5">
          <span className={`text-[10px] font-semibold uppercase tracking-widest ${muted}`}>Client Price</span>
          <span className={`text-2xl font-extrabold tabular-nums leading-tight transition-all duration-100 ${
            isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
          }`}>
            {displaySelling != null ? formatCurrencyCompact(displaySelling, true) : '—'}
          </span>
          {profitAmt != null && (
            <span className={`text-[10px] tabular-nums ${
              profitAmt >= 0
                ? isDarkMode ? 'text-emerald-500' : 'text-emerald-600'
                : isDarkMode ? 'text-rose-400' : 'text-rose-600'
            }`}>
              {profitAmt >= 0 ? '+' : ''}{formatCurrencyCompact(profitAmt, true)}
            </span>
          )}
        </div>
      </div>

      {/* ── Needs approval banner ── */}
      {belowMin && (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] ${
          isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold uppercase tracking-wide">Needs approval</span>
          <span className={isDarkMode ? 'text-rose-400/80' : 'text-rose-600/90'}>
            below the {sheetMin}% minimum — flagged in Review
          </span>
        </div>
      )}

      {/* ── Slider ── */}
      <div className={`rounded-xl border px-4 py-3 space-y-2 ${card}`}>
        {/* Thumb label */}
        <div className="relative pt-4">
          <div
            className={`pointer-events-none absolute top-0 z-10 px-2 py-px rounded-full text-[10px] font-bold tabular-nums transition-all duration-75 shadow-sm ${
              belowMin
                ? isDarkMode ? 'bg-rose-500/30 text-rose-200 ring-1 ring-rose-500/40' : 'bg-rose-100 text-rose-800 ring-1 ring-rose-200'
                : isDarkMode ? 'bg-indigo-500/30 text-indigo-200 ring-1 ring-indigo-500/40' : 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200'
            }`}
            style={{ left: `clamp(10px, calc(${thumbPercent}% - 16px), calc(100% - 40px))` }}
          >
            {displayRounded}%
          </div>

          <Slider
            value={[localMargin]}
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            onValueChange={handleChange}
            onValueCommit={handleCommit}
            className={trackFill}
            aria-label="Product margin percent"
          />

          {sheetMin > 0 && (
            <div
              className={`absolute top-[calc(50%+8px)] w-0.5 h-3 -translate-x-1/2 pointer-events-none rounded-full ${
                isDarkMode ? 'bg-amber-400/80' : 'bg-amber-500'
              }`}
              style={{ left: `${((sheetMin - sliderMin) / (sliderMax - sliderMin)) * 100}%` }}
              title={`Minimum ${sheetMin}%`}
            />
          )}
        </div>

        {/* Scale */}
        <div className={`flex justify-between text-[10px] tabular-nums px-0.5 ${muted}`}>
          <span>0%</span>
          <span>30%</span>
          <span>60%</span>
          <span>90%</span>
        </div>
      </div>

      {/* ── COGS footer ── */}
      {baseCost > 0 && (
        <div className={`flex items-center justify-between px-1 text-[11px] ${subtle}`}>
          <span>Cost base (×{riskMult} risk)</span>
          <span className="tabular-nums font-semibold">
            COGS {formatCurrencyCompact(baseCost * riskMult, true)}
          </span>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { formatCurrencyCompact } from '@/lib/utils';
import { sellingFromCostAndMargin } from '@/lib/marginEngine';

export default function MarginTabPanel({ item, segmentPayload, line, isDarkMode, onSetMargin }) {
  const sheetMin = Number(segmentPayload?.minimum_margin_percent || line?.sheet_min_margin_percent) || 0;
  const current = item.margin_percent != null ? item.margin_percent : sheetMin || 30;
  const delta = sheetMin > 0 ? Math.round((current - sheetMin) * 10) / 10 : null;
  const belowMin = sheetMin > 0 && current < sheetMin;

  const sliderMin = 0;
  const sliderMax = 90;
  const sliderStep = 0.5;

  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState(null);
  const displayMargin = draft != null ? draft : current;

  const riskMult = Number(line?.risk_multiplier) || 1;
  const baseCost = Number(line?.cost) || 0;
  const previewSelling =
    baseCost > 0 ? sellingFromCostAndMargin(baseCost * riskMult, displayMargin) : null;
  const lineSelling = line?.selling != null ? Number(line.selling) : null;
  const showSelling = dragging && previewSelling != null ? previewSelling : lineSelling;

  const deltaClass =
    delta != null && delta < 0
      ? isDarkMode
        ? 'text-rose-400'
        : 'text-rose-600'
      : isDarkMode
        ? 'text-emerald-400'
        : 'text-emerald-600';

  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const trackFill = belowMin
    ? isDarkMode
      ? '[&_[role=slider]]:border-rose-400 [&_[role=slider]]:bg-rose-500 [&_.bg-primary]:bg-rose-500/80'
      : '[&_[role=slider]]:border-rose-300 [&_[role=slider]]:bg-rose-500 [&_.bg-primary]:bg-rose-400'
    : isDarkMode
      ? '[&_[role=slider]]:bg-indigo-400 [&_.bg-primary]:bg-indigo-500/80'
      : '[&_[role=slider]]:bg-indigo-600 [&_.bg-primary]:bg-indigo-500';

  const commitMargin = val => {
    const clamped = Math.max(0, Math.min(99, Math.round(val * 10) / 10));
    onSetMargin(clamped);
    setDraft(null);
  };

  const thumbPercent = ((displayMargin - sliderMin) / (sliderMax - sliderMin)) * 100;
  const displayRounded = Math.round(displayMargin * 10) / 10;

  return (
    <div className="pt-2 space-y-2" data-testid="margin-tab-panel">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tabular-nums transition-colors ${
                belowMin
                  ? isDarkMode
                    ? 'text-rose-400'
                    : 'text-rose-600'
                  : isDarkMode
                    ? 'text-white'
                    : 'text-slate-900'
              }`}
            >
              {displayRounded}%
            </span>
            {belowMin && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  isDarkMode
                    ? 'bg-rose-500/15 text-rose-300'
                    : 'bg-rose-50 text-rose-700'
                }`}
                role="status"
              >
                <AlertTriangle className="w-3 h-3" />
                Below min {sheetMin}%
              </span>
            )}
          </div>
          <div className={`flex gap-3 text-[11px] tabular-nums ${muted}`}>
            <span>
              Min <strong className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>{sheetMin > 0 ? `${sheetMin}%` : '—'}</strong>
            </span>
            <span>
              Δ{' '}
              <strong className={deltaClass}>
                {delta != null ? (delta >= 0 ? `+${delta}%` : `${delta}%`) : '—'}
              </strong>
            </span>
            {showSelling != null && (
              <span className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>
                {dragging ? 'Preview ' : ''}
                <strong>{formatCurrencyCompact(showSelling, true)}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="relative pt-4 pb-0.5">
          <div
            className={`pointer-events-none absolute top-0 z-10 px-1.5 py-px rounded text-[10px] font-bold tabular-nums transition-all duration-75 ${
              belowMin
                ? isDarkMode
                  ? 'bg-rose-500/25 text-rose-200'
                  : 'bg-rose-100 text-rose-800'
                : isDarkMode
                  ? 'bg-indigo-500/25 text-indigo-200'
                  : 'bg-indigo-100 text-indigo-800'
            }`}
            style={{
              left: `clamp(8px, calc(${thumbPercent}% - 14px), calc(100% - 36px))`,
            }}
          >
            {displayRounded}%
          </div>
          <Slider
            value={[displayMargin]}
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            onValueChange={([v]) => setDraft(v)}
            onValueCommit={([v]) => {
              commitMargin(v);
              setDragging(false);
            }}
            onPointerDown={() => setDragging(true)}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
            className={`${trackFill}`}
            aria-label="Product margin percent"
          />
          {sheetMin > 0 && (
            <div
              className={`absolute top-[calc(50%+6px)] w-px h-2.5 -translate-x-1/2 pointer-events-none ${
                isDarkMode ? 'bg-amber-500/70' : 'bg-amber-500'
              }`}
              style={{ left: `${((sheetMin - sliderMin) / (sliderMax - sliderMin)) * 100}%` }}
              title={`Sheet minimum ${sheetMin}%`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

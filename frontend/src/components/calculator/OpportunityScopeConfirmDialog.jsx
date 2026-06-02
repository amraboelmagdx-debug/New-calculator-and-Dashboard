import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function rowKey(item) {
  return `${item.index}:${item.catalog_product_name}`;
}

function clampQty(value) {
  const n = Math.floor(Number(value));
  return Math.max(1, Number.isFinite(n) ? n : 1);
}

export default function OpportunityScopeConfirmDialog({
  open,
  onOpenChange,
  scopeItems = [],
  isDarkMode,
  onConfirm,
  onSkip,
}) {
  const matched = useMemo(() => scopeItems.filter(i => i.matched && i.catalog_product_name), [scopeItems]);
  const unmatched = useMemo(() => scopeItems.filter(i => !i.matched), [scopeItems]);

  const [selected, setSelected] = useState(() => new Set());
  const [quantities, setQuantities] = useState(() => ({}));

  useEffect(() => {
    if (open) {
      const keys = matched.map(rowKey);
      setSelected(new Set(keys));
      const initial = {};
      matched.forEach(item => {
        initial[rowKey(item)] = 1;
      });
      setQuantities(initial);
    }
  }, [open, matched]);

  const selectedCount = useMemo(
    () => matched.filter(item => selected.has(rowKey(item))).length,
    [matched, selected]
  );

  const toggle = key => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const setQty = (key, value) => {
    setQuantities(prev => ({ ...prev, [key]: clampQty(value) }));
  };

  const handleConfirm = () => {
    const aggregated = new Map();
    matched.forEach(item => {
      const key = rowKey(item);
      if (!selected.has(key)) return;
      const qty = clampQty(quantities[key]);
      const name = item.catalog_product_name;
      aggregated.set(name, (aggregated.get(name) || 0) + qty);
    });
    const entries = [...aggregated.entries()].map(([product_name, quantity]) => ({
      product_name,
      quantity,
    }));
    onConfirm?.(entries);
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSkip?.();
    onOpenChange(false);
  };

  const inputClass = isDarkMode
    ? 'bg-neutral-950 border-neutral-800 text-white h-8 w-16 font-mono'
    : 'bg-white border-slate-300 text-slate-900 h-8 w-16 font-mono';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-200'
        }
        data-testid="opportunity-scope-confirm-dialog"
      >
        <DialogHeader>
          <DialogTitle>Add products from opportunity scope?</DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-neutral-400' : 'text-slate-500'}>
            Matched catalog services from BDsMastersheet. Unmatched lines stay on the project step for reference.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto space-y-2 py-2">
          {matched.map(item => {
            const key = rowKey(item);
            const isChecked = selected.has(key);
            const sheetLabel = item.label || item.raw;
            return (
              <div
                key={key}
                className={`rounded-lg border p-3 ${
                  isDarkMode ? 'border-neutral-800' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggle(key)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {sheetLabel}
                    </p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                      → {item.catalog_product_name}
                    </p>
                    <p
                      className={`text-[11px] mt-1.5 ${
                        isDarkMode ? 'text-emerald-400/90' : 'text-emerald-700'
                      }`}
                    >
                      Matched → {item.catalog_product_name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Label
                      className={`text-[10px] uppercase tracking-wide ${
                        isDarkMode ? 'text-neutral-600' : 'text-slate-400'
                      }`}
                    >
                      Qty
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      disabled={!isChecked}
                      value={quantities[key] ?? 1}
                      onChange={e => setQty(key, e.target.value)}
                      className={inputClass}
                      data-testid={`scope-qty-${item.index}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {unmatched.map(item => (
            <div
              key={`unmatched-${item.index}`}
              className={`flex items-start justify-between gap-3 rounded-lg border p-3 opacity-70 ${
                isDarkMode ? 'border-neutral-800 bg-neutral-900/20' : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="min-w-0">
                <p className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                  {item.label || item.raw}
                </p>
              </div>
              <span
                className={`text-[11px] shrink-0 ${
                  isDarkMode ? 'text-neutral-600' : 'text-slate-400'
                }`}
              >
                No Catalog Match
              </span>
            </div>
          ))}
        </div>

        <div
          className={`flex flex-wrap gap-x-6 gap-y-1 text-xs py-2 border-t ${
            isDarkMode ? 'border-neutral-800 text-neutral-500' : 'border-slate-200 text-slate-500'
          }`}
          data-testid="scope-confirm-summary"
        >
          <span>Matched products: {matched.length}</span>
          <span>Selected products: {selectedCount}</span>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="ghost" onClick={handleSkip}>
            Skip & continue
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={selectedCount === 0}>
            Add selected & continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

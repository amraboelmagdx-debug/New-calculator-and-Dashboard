import { useEffect, useMemo, useState } from 'react';
import { Plus, Copy, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import {
  scopeRowKey,
  getCatalogTierKeys,
  buildInitialTierPlan,
  validateTierPlan,
  buildScopeImportPlan,
  defaultScopeRowAction,
  summarizeScopeImport,
  getTierSheetHints,
  estimateCardTeamHours,
  estimateCardMinRevenue,
  normalizeTierKey,
} from '@/lib/opportunityScope';

const MATCHED_ACTIONS = [
  { value: 'catalog', label: 'Match Catalog' },
  { value: 'standalone', label: 'Import as Standalone' },
  { value: 'ignore', label: 'Ignore' },
];
const UNMATCHED_ACTIONS = [
  { value: 'standalone', label: 'Import as Standalone' },
  { value: 'ignore', label: 'Ignore' },
];

function RowActionSelect({ value, onChange, options, isDarkMode }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={`h-8 w-[170px] text-xs shrink-0 ${
          isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-200' : 'bg-white border-slate-300 text-slate-700'
        }`}
        data-testid="scope-row-action"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function clampQty(value) {
  const n = Math.floor(Number(value));
  return Math.max(1, Number.isFinite(n) ? n : 1);
}

function TierRowEditor({
  row,
  rowIndex,
  availableTiers,
  singleTier,
  usedTiers,
  getSegmentPayload,
  catalogProduct,
  isDarkMode,
  isChecked,
  canRemove,
  onTierChange,
  onQtyChange,
  onRemove,
}) {
  const tier = singleTier ? availableTiers[0] : row.tier;
  const tierOptions = availableTiers.filter(
    t => normalizeTierKey(t) === normalizeTierKey(tier) || !usedTiers.has(normalizeTierKey(t))
  );
  const seg = tier ? getSegmentPayload?.(catalogProduct, tier) : null;
  const hints = seg ? getTierSheetHints(seg, row.quantity) : null;

  const inputClass = isDarkMode
    ? 'bg-neutral-950 border-neutral-800 text-white h-8 font-mono'
    : 'bg-white border-slate-300 text-slate-900 h-8 font-mono';
  const selectClass = isDarkMode
    ? 'bg-neutral-950 border-neutral-800 text-white h-8'
    : 'bg-white border-slate-300 text-slate-900 h-8';
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-400';

  return (
    <div className="space-y-1.5">
      <div className="flex items-end gap-2 flex-wrap">
        <div className="w-[110px] min-w-[90px]">
          <Label className={`text-[10px] uppercase tracking-wide ${muted}`}>Tier</Label>
          {singleTier ? (
            <Badge
              variant="outline"
              className={`mt-1 block text-center font-mono text-[10px] ${
                isDarkMode ? 'border-neutral-700 text-neutral-300' : 'border-slate-200 text-slate-600'
              }`}
            >
              {String(availableTiers[0]).toUpperCase()}
            </Badge>
          ) : (
            <Select
              value={row.tier || undefined}
              onValueChange={onTierChange}
              disabled={!isChecked}
            >
              <SelectTrigger className={selectClass}>
                <SelectValue placeholder="Pick tier" />
              </SelectTrigger>
              <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white'}>
                {tierOptions.map(t => (
                  <SelectItem key={t} value={t}>
                    {t.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="w-[56px]">
          <Label className={`text-[10px] uppercase tracking-wide ${muted}`}>Qty</Label>
          <Input
            type="number"
            min={1}
            step={1}
            disabled={!isChecked}
            value={row.quantity ?? 1}
            onChange={e => onQtyChange(clampQty(e.target.value))}
            className={`${inputClass} w-full`}
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <Label className={`text-[10px] uppercase tracking-wide ${muted}`}>Est. Min Revenue</Label>
          <p className={`text-xs font-semibold font-mono h-8 flex items-center ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
            {hints ? formatCurrency(hints.estMinRevenue) : '—'}
          </p>
        </div>
        {!singleTier && canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!isChecked}
            onClick={onRemove}
            className={`h-8 w-8 p-0 mb-0.5 ${isDarkMode ? 'text-neutral-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      {hints && tier && (
        <p className={`text-[10px] ${muted}`}>
          Min Margin {hints.minMarginPercent}% · Team {hints.teamHours}h
        </p>
      )}
    </div>
  );
}

export default function OpportunityScopeConfirmDialog({
  open,
  onOpenChange,
  scopeItems = [],
  isDarkMode,
  onConfirm,
  onSkip,
  findCatalogProduct,
  getSegmentPayload,
  selectedProducts = [],
}) {
  const matched = useMemo(() => scopeItems.filter(i => i.matched && i.catalog_product_name), [scopeItems]);
  const unmatched = useMemo(() => scopeItems.filter(i => !i.matched), [scopeItems]);

  const [rowActions, setRowActions] = useState({});
  const [tierPlans, setTierPlans] = useState({});

  useEffect(() => {
    if (open) {
      const actions = {};
      const initial = {};
      scopeItems.forEach(item => {
        const key = scopeRowKey(item);
        actions[key] = defaultScopeRowAction(item);
        if (item.matched && item.catalog_product_name) {
          const catalogProduct = findCatalogProduct?.(item.catalog_product_name);
          initial[key] = buildInitialTierPlan(item, catalogProduct);
        }
      });
      setRowActions(actions);
      setTierPlans(initial);
    }
  }, [open, scopeItems, findCatalogProduct]);

  const importResult = useMemo(() => {
    return buildScopeImportPlan(scopeItems, tierPlans, rowActions, {
      findCatalogProduct,
      getSegmentPayload,
      existingProducts: selectedProducts,
    });
  }, [scopeItems, tierPlans, rowActions, findCatalogProduct, getSegmentPayload, selectedProducts]);

  const footerSummary = useMemo(() => {
    return summarizeScopeImport(
      importResult.entries,
      importResult.previewRows,
      importResult.skippedLines,
      getSegmentPayload,
      findCatalogProduct
    );
  }, [importResult, getSegmentPayload, findCatalogProduct]);

  const lineValidation = useMemo(() => {
    const map = {};
    matched.forEach(item => {
      const key = scopeRowKey(item);
      const catalogProduct = findCatalogProduct?.(item.catalog_product_name);
      const tiers = getCatalogTierKeys(catalogProduct);
      map[key] = validateTierPlan(tierPlans[key] || [], tiers, { singleTier: tiers.length === 1 });
    });
    return map;
  }, [matched, tierPlans, findCatalogProduct]);

  const setAction = (key, value) => setRowActions(prev => ({ ...prev, [key]: value }));

  const updateTierPlan = (key, updater) => {
    setTierPlans(prev => ({
      ...prev,
      [key]: updater(prev[key] || [{ tier: '', quantity: 1 }]),
    }));
  };

  const handleConfirm = () => {
    if (!importResult.entries.length) return;
    onConfirm?.(importResult.entries, {
      skippedLines: importResult.skippedLines,
      previewRows: importResult.previewRows,
      validLineCount: importResult.validLineCount,
      invalidLineCount: importResult.invalidLineCount,
      standaloneCount: importResult.standaloneCount,
    });
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSkip?.();
    onOpenChange(false);
  };

  const canConfirm = importResult.entries.length > 0;
  const sectionHeader = isDarkMode ? 'text-neutral-400' : 'text-slate-500';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-3xl ${isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-200'}`}
        data-testid="opportunity-scope-confirm-dialog"
      >
        <DialogHeader>
          <DialogTitle>Add products from opportunity scope?</DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-neutral-400' : 'text-slate-500'}>
            Choose how each scope line is imported: match it to a catalog service, bring it in as a standalone line, or
            ignore it.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[48vh] overflow-y-auto space-y-4 py-2">
          {matched.length > 0 && (
            <div className="space-y-2">
              <p className={`text-[11px] font-semibold uppercase tracking-wider px-0.5 ${sectionHeader}`}>
                Matched ({matched.length})
              </p>
              {matched.map(item => {
                const key = scopeRowKey(item);
                const action = rowActions[key] || defaultScopeRowAction(item);
                const isCatalog = action === 'catalog';
                const sheetLabel = item.label || item.raw;
                const catalogProduct = findCatalogProduct?.(item.catalog_product_name);
                const availableTiers = getCatalogTierKeys(catalogProduct);
                const singleTier = availableTiers.length === 1;
                const rows = tierPlans[key] || [{ tier: '', quantity: 1 }];
                const validation = lineValidation[key];
                const showWarning = isCatalog && validation && !validation.valid;

                return (
                  <div
                    key={key}
                    className={`rounded-lg border p-3 space-y-2 ${
                      action === 'ignore' ? 'opacity-60' : ''
                    } ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {sheetLabel}
                        </p>
                        <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                          → {item.catalog_product_name}
                          <Badge
                            variant="outline"
                            className={`text-[9px] ${isDarkMode ? 'border-emerald-500/30 text-emerald-300' : 'border-emerald-200 text-emerald-700'}`}
                          >
                            Matched
                          </Badge>
                        </p>
                      </div>
                      <RowActionSelect
                        value={action}
                        onChange={v => setAction(key, v)}
                        options={MATCHED_ACTIONS}
                        isDarkMode={isDarkMode}
                      />
                    </div>

                    {isCatalog && (
                      <div className="space-y-2 pt-1">
                        <div className="space-y-2">
                          {rows.map((row, rowIndex) => {
                            const usedTiers = new Set(
                              rows
                                .filter((_, i) => i !== rowIndex)
                                .map(r => normalizeTierKey(r.tier))
                                .filter(Boolean)
                            );
                            return (
                              <TierRowEditor
                                key={rowIndex}
                                row={row}
                                rowIndex={rowIndex}
                                availableTiers={availableTiers}
                                singleTier={singleTier}
                                usedTiers={usedTiers}
                                getSegmentPayload={getSegmentPayload}
                                catalogProduct={catalogProduct}
                                isDarkMode={isDarkMode}
                                isChecked
                                canRemove={rows.length > 1}
                                onTierChange={value =>
                                  updateTierPlan(key, prev =>
                                    prev.map((r, i) => (i === rowIndex ? { ...r, tier: value } : r))
                                  )
                                }
                                onQtyChange={value =>
                                  updateTierPlan(key, prev =>
                                    prev.map((r, i) => (i === rowIndex ? { ...r, quantity: value } : r))
                                  )
                                }
                                onRemove={() =>
                                  updateTierPlan(key, prev =>
                                    prev.length > 1 ? prev.filter((_, i) => i !== rowIndex) : prev
                                  )
                                }
                              />
                            );
                          })}
                        </div>

                        {!singleTier && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={
                                isDarkMode
                                  ? 'h-7 text-xs border-neutral-700 text-neutral-200'
                                  : 'h-7 text-xs border-slate-300'
                              }
                              onClick={() => updateTierPlan(key, prev => [...prev, { tier: '', quantity: 1 }])}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add tier
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={`h-7 text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}
                              onClick={() =>
                                updateTierPlan(key, prev => {
                                  const last = prev[prev.length - 1] || { tier: '', quantity: 1 };
                                  return [...prev, { ...last, tier: '' }];
                                })
                              }
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Duplicate row
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={`h-7 text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}
                              onClick={() => updateTierPlan(key, () => [{ tier: '', quantity: 1 }])}
                            >
                              Clear tiers
                            </Button>
                          </div>
                        )}

                        <p className={`text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                          Total Team Hours: {estimateCardTeamHours(rows, getSegmentPayload, catalogProduct)}h
                          {' · '}
                          Est. Min Revenue: {formatCurrency(estimateCardMinRevenue(rows, getSegmentPayload, catalogProduct))}
                        </p>

                        {showWarning && (
                          <p className={`text-[11px] ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                            {validation.errors.join(' · ')} — this line will be skipped on import
                          </p>
                        )}
                      </div>
                    )}

                    {action === 'standalone' && (
                      <p className={`text-[11px] pt-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                        Imported as a standalone line. Add team or vendors on its portfolio card.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {unmatched.length > 0 && (
            <div className="space-y-2">
              <p className={`text-[11px] font-semibold uppercase tracking-wider px-0.5 ${sectionHeader}`}>
                Not in catalog ({unmatched.length})
              </p>
              {unmatched.map(item => {
                const key = scopeRowKey(item);
                const action = rowActions[key] || 'standalone';
                return (
                  <div
                    key={`unmatched-${item.index}`}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                      action === 'ignore' ? 'opacity-60' : ''
                    } ${isDarkMode ? 'border-neutral-800 bg-neutral-900/20' : 'border-slate-200 bg-slate-50/50'}`}
                  >
                    <p className={`text-sm min-w-0 truncate ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                      {item.label || item.raw}
                    </p>
                    <RowActionSelect
                      value={action}
                      onChange={v => setAction(key, v)}
                      options={UNMATCHED_ACTIONS}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {importResult.previewRows.length > 0 && (
          <div
            className={`rounded-lg border p-3 space-y-2 ${
              isDarkMode ? 'border-neutral-800 bg-neutral-950/40' : 'border-slate-200 bg-slate-50/80'
            }`}
            data-testid="scope-import-preview"
          >
            <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
              Will Create
            </p>
            <ul className={`text-xs space-y-1 ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
              {importResult.previewRows.map((row, i) => (
                <li key={i} className="font-mono">
                  {row.detail}
                </li>
              ))}
            </ul>
            {importResult.skippedLines.length > 0 && (
              <p className={`text-[11px] ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                {importResult.skippedLines.length} selected line
                {importResult.skippedLines.length === 1 ? '' : 's'} skipped until fixed.
              </p>
            )}
          </div>
        )}

        <div
          className={`flex flex-wrap gap-x-4 gap-y-1 text-xs py-2 border-t ${
            isDarkMode ? 'border-neutral-800 text-neutral-500' : 'border-slate-200 text-slate-500'
          }`}
          data-testid="scope-confirm-summary"
        >
          <span>Matched: {matched.length}</span>
          <span>Standalone: {importResult.standaloneCount}</span>
          <span>Ignored: {importResult.ignoredCount}</span>
          <span>Rows: {footerSummary.rowCount}</span>
          <span>Team: {footerSummary.totalTeamHours}h</span>
          <span>Est. Min Revenue: {formatCurrency(footerSummary.totalMinRevenue)}</span>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="ghost" onClick={handleSkip}>
            Skip & continue
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
            Add selected & continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

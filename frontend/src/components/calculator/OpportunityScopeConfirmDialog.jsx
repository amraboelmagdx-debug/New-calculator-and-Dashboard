import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Check, Briefcase, Ban, AlertCircle } from 'lucide-react';
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
  { value: 'catalog', label: 'Catalog', icon: Check },
  { value: 'standalone', label: 'Standalone', icon: Briefcase },
  { value: 'ignore', label: 'Skip', icon: Ban },
];
const UNMATCHED_ACTIONS = [
  { value: 'standalone', label: 'Standalone', icon: Briefcase },
  { value: 'ignore', label: 'Skip', icon: Ban },
];

function clampQty(value) {
  const n = Math.floor(Number(value));
  return Math.max(1, Number.isFinite(n) ? n : 1);
}

function normalizeLabel(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function labelsLookSame(a, b) {
  const na = normalizeLabel(a);
  const nb = normalizeLabel(b);
  return na.length > 0 && na === nb;
}

/** Full-width segmented control — matches Add Service dialog pattern */
function RowActionToggle({ value, onChange, options, isDarkMode }) {
  const track = isDarkMode ? 'bg-neutral-950 border border-neutral-800' : 'bg-slate-100 border border-slate-200';

  return (
    <div
      className={`flex gap-0.5 p-0.5 rounded-lg w-full ${track}`}
      role="group"
      data-testid="scope-row-action"
    >
      {options.map(({ value: optValue, label, icon: Icon }) => {
        const on = value === optValue;
        const activeCatalog = on && optValue === 'catalog';
        const activeIgnore = on && optValue === 'ignore';
        let activeClass = isDarkMode ? 'bg-neutral-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm';
        if (activeCatalog) activeClass = isDarkMode ? 'bg-indigo-500/25 text-indigo-200 shadow-sm' : 'bg-indigo-600 text-white shadow-sm';
        if (activeIgnore) activeClass = isDarkMode ? 'bg-neutral-800/80 text-neutral-500' : 'bg-slate-200 text-slate-500';

        return (
          <button
            key={optValue}
            type="button"
            onClick={() => onChange(optValue)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              on ? activeClass : isDarkMode ? 'text-neutral-500 hover:text-neutral-300' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function TierPills({ tiers, value, usedTiers, onChange, isDarkMode }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tiers.map(t => {
        const key = normalizeTierKey(t);
        const taken = usedTiers.has(key) && normalizeTierKey(value) !== key;
        const active = normalizeTierKey(value) === key;
        return (
          <button
            key={t}
            type="button"
            disabled={taken}
            onClick={() => onChange(t)}
            className={`h-7 min-w-[2.5rem] px-2 rounded-md text-[11px] font-semibold font-mono uppercase transition-colors ${
              taken
                ? isDarkMode
                  ? 'opacity-30 cursor-not-allowed text-neutral-600'
                  : 'opacity-30 cursor-not-allowed text-slate-400'
                : active
                  ? isDarkMode
                    ? 'bg-indigo-500 text-white'
                    : 'bg-indigo-600 text-white'
                  : isDarkMode
                    ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function TierConfigStrip({
  row,
  availableTiers,
  singleTier,
  usedTiers,
  getSegmentPayload,
  catalogProduct,
  isDarkMode,
  canRemove,
  invalid,
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
  const usePills = !singleTier && availableTiers.length > 0 && availableTiers.length <= 5;

  const strip = isDarkMode
    ? `rounded-lg border p-2 flex flex-wrap items-center gap-2 ${
        invalid ? 'border-amber-500/40 bg-amber-500/5' : 'border-neutral-800 bg-neutral-950/80'
      }`
    : `rounded-lg border p-2 flex flex-wrap items-center gap-2 ${
        invalid ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-slate-50'
      }`;

  const qtyWrap = isDarkMode
    ? 'flex items-center gap-1.5 h-7 rounded-md border border-neutral-600 bg-neutral-800 px-2 shrink-0'
    : 'flex items-center gap-1.5 h-7 rounded-md border border-slate-300 bg-white px-2 shrink-0';
  const qtyLabel = isDarkMode ? 'text-neutral-400' : 'text-slate-500';
  const qtyInput = isDarkMode
    ? 'h-6 w-10 min-w-[2.5rem] border-0 bg-transparent p-0 text-xs font-semibold font-mono text-white text-center shadow-none focus-visible:ring-0'
    : 'h-6 w-10 min-w-[2.5rem] border-0 bg-transparent p-0 text-xs font-semibold font-mono text-slate-900 text-center shadow-none focus-visible:ring-0';

  return (
    <div className={strip}>
      {singleTier ? (
        <span
          className={`h-7 inline-flex items-center px-2 rounded-md text-[11px] font-mono font-semibold uppercase ${
            isDarkMode ? 'bg-neutral-800 text-neutral-200' : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          {String(availableTiers[0])}
        </span>
      ) : usePills ? (
        <TierPills tiers={tierOptions} value={row.tier} usedTiers={usedTiers} onChange={onTierChange} isDarkMode={isDarkMode} />
      ) : (
        <Select value={row.tier || undefined} onValueChange={onTierChange}>
          <SelectTrigger
            className={`h-7 w-[5.5rem] text-xs ${isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-300'}`}
          >
            <SelectValue placeholder="Tier" />
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

      <div className={qtyWrap}>
        <span className={`text-[10px] font-medium uppercase tracking-wide ${qtyLabel}`}>Qty</span>
        <Input
          type="number"
          min={1}
          step={1}
          value={row.quantity ?? 1}
          onChange={e => onQtyChange(clampQty(e.target.value))}
          className={qtyInput}
          aria-label="Quantity"
        />
      </div>

      {hints && (
        <span className={`text-[11px] font-mono tabular-nums ml-auto ${isDarkMode ? 'text-emerald-400/90' : 'text-emerald-700'}`}>
          {formatCurrency(hints.estMinRevenue)}
        </span>
      )}

      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className={`h-7 w-7 p-0 shrink-0 ${isDarkMode ? 'text-neutral-600 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

function ScopeRowCard({
  sheetLabel,
  catalogName,
  matched,
  action,
  isCatalog,
  isDarkMode,
  actionOptions,
  onActionChange,
  children,
}) {
  const ignored = action === 'ignore';
  const card = isDarkMode
    ? `rounded-xl border transition-colors ${ignored ? 'border-neutral-800/60 bg-neutral-900/30 opacity-55' : 'border-neutral-800 bg-neutral-900/50'}`
    : `rounded-xl border transition-colors ${ignored ? 'border-slate-200/60 bg-slate-50/40 opacity-55' : 'border-slate-200 bg-white'}`;

  const showCatalogSubtitle = matched && catalogName && !labelsLookSame(sheetLabel, catalogName);
  const showCatalogMatchHint = matched && catalogName && labelsLookSame(sheetLabel, catalogName);

  return (
    <div className={`p-3 space-y-2.5 ${card}`}>
      <div className="space-y-1 min-w-0" dir="auto">
        <div className="flex items-start gap-2 min-w-0">
          <p className={`text-[13px] font-semibold leading-snug min-w-0 flex-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {sheetLabel}
          </p>
          {showCatalogMatchHint && (
            <span
              className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                isDarkMode ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              Matched
            </span>
          )}
        </div>
        {showCatalogSubtitle && (
          <p className={`text-[11px] truncate ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
            → {catalogName}
          </p>
        )}
      </div>

      <RowActionToggle value={action} onChange={onActionChange} options={actionOptions} isDarkMode={isDarkMode} />

      {!ignored && isCatalog && children}
      {!ignored && action === 'standalone' && (
        <p className={`text-[11px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
          Custom line — add team on the portfolio card.
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
  const sectionLabel = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const previewVisible = importResult.previewRows.slice(0, 3);
  const previewMore = Math.max(0, importResult.previewRows.length - 3);

  const summaryLine = [
    footerSummary.rowCount > 0 && `${footerSummary.rowCount} to import`,
    importResult.standaloneCount > 0 && `${importResult.standaloneCount} standalone`,
    importResult.ignoredCount > 0 && `${importResult.ignoredCount} skipped`,
    footerSummary.totalMinRevenue > 0 && `min ${formatCurrency(footerSummary.totalMinRevenue)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`gap-0 p-0 overflow-hidden max-w-lg sm:max-w-xl ${
          isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200'
        }`}
        data-testid="opportunity-scope-confirm-dialog"
      >
        <DialogHeader className={`px-5 pt-5 pb-3 space-y-1 ${isDarkMode ? '' : ''}`}>
          <DialogTitle className="text-base font-semibold tracking-tight">Import scope lines</DialogTitle>
          <DialogDescription className={`text-xs leading-relaxed ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
            Choose catalog match, standalone, or skip for each line.
          </DialogDescription>
        </DialogHeader>

        <div className={`max-h-[min(52vh,420px)] overflow-y-auto px-5 pb-3 space-y-4`}>
          {matched.length > 0 && (
            <section className="space-y-2">
              <h3 className={`text-[10px] font-semibold uppercase tracking-widest ${sectionLabel}`}>
                Matched · {matched.length}
              </h3>
              <div className="space-y-2">
                {matched.map(item => {
                  const key = scopeRowKey(item);
                  const action = rowActions[key] || defaultScopeRowAction(item);
                  const isCatalog = action === 'catalog';
                  const catalogProduct = findCatalogProduct?.(item.catalog_product_name);
                  const availableTiers = getCatalogTierKeys(catalogProduct);
                  const singleTier = availableTiers.length === 1;
                  const rows = tierPlans[key] || [{ tier: '', quantity: 1 }];
                  const validation = lineValidation[key];
                  const invalid = isCatalog && validation && !validation.valid;
                  const teamH = estimateCardTeamHours(rows, getSegmentPayload, catalogProduct);
                  const minRev = estimateCardMinRevenue(rows, getSegmentPayload, catalogProduct);

                  return (
                    <ScopeRowCard
                      key={key}
                      sheetLabel={item.label || item.raw}
                      catalogName={item.catalog_product_name}
                      matched
                      action={action}
                      isCatalog={isCatalog}
                      isDarkMode={isDarkMode}
                      actionOptions={MATCHED_ACTIONS}
                      onActionChange={v => setAction(key, v)}
                    >
                      <div className="space-y-1.5">
                        {rows.map((row, rowIndex) => {
                          const usedTiers = new Set(
                            rows
                              .filter((_, i) => i !== rowIndex)
                              .map(r => normalizeTierKey(r.tier))
                              .filter(Boolean)
                          );
                          return (
                            <TierConfigStrip
                              key={rowIndex}
                              row={row}
                              availableTiers={availableTiers}
                              singleTier={singleTier}
                              usedTiers={usedTiers}
                              getSegmentPayload={getSegmentPayload}
                              catalogProduct={catalogProduct}
                              isDarkMode={isDarkMode}
                              canRemove={rows.length > 1}
                              invalid={invalid && !row.tier}
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

                        {!singleTier && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={`h-7 w-full text-xs gap-1 ${
                              isDarkMode
                                ? 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
                                : 'text-slate-500 hover:bg-slate-100'
                            }`}
                            onClick={() => updateTierPlan(key, prev => [...prev, { tier: '', quantity: 1 }])}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add another tier
                          </Button>
                        )}

                        {invalid && (
                          <p
                            className={`flex items-center gap-1 text-[11px] ${
                              isDarkMode ? 'text-amber-400' : 'text-amber-700'
                            }`}
                          >
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {validation.errors[0]}
                          </p>
                        )}

                        {(teamH > 0 || minRev > 0) && !invalid && (
                          <p className={`text-[10px] tabular-nums ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>
                            {teamH > 0 && `${teamH}h team`}
                            {teamH > 0 && minRev > 0 && ' · '}
                            {minRev > 0 && `sheet min ${formatCurrency(minRev)}`}
                          </p>
                        )}
                      </div>
                    </ScopeRowCard>
                  );
                })}
              </div>
            </section>
          )}

          {unmatched.length > 0 && (
            <section className="space-y-2">
              <h3 className={`text-[10px] font-semibold uppercase tracking-widest ${sectionLabel}`}>
                Not in catalog · {unmatched.length}
              </h3>
              <div className="space-y-2">
                {unmatched.map(item => {
                  const key = scopeRowKey(item);
                  const action = rowActions[key] || 'standalone';
                  return (
                    <ScopeRowCard
                      key={`unmatched-${item.index}`}
                      sheetLabel={item.label || item.raw}
                      action={action}
                      isDarkMode={isDarkMode}
                      actionOptions={UNMATCHED_ACTIONS}
                      onActionChange={v => setAction(key, v)}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {(importResult.previewRows.length > 0 || summaryLine) && (
          <div
            className={`mx-5 mb-3 rounded-lg px-3 py-2 text-[11px] ${
              isDarkMode ? 'bg-neutral-950 border border-neutral-800 text-neutral-400' : 'bg-slate-50 border border-slate-200 text-slate-600'
            }`}
            data-testid="scope-confirm-summary"
          >
            {summaryLine && <p className="font-medium mb-1">{summaryLine}</p>}
            {previewVisible.length > 0 && (
              <div data-testid="scope-import-preview">
                <ul className="space-y-0.5 font-mono text-[10px] opacity-90">
                  {previewVisible.map((row, i) => (
                    <li key={i} className="truncate">
                      {row.detail}
                    </li>
                  ))}
                  {previewMore > 0 && <li className="opacity-60">+{previewMore} more</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter
          className={`px-5 py-4 gap-2 sm:gap-2 border-t ${
            isDarkMode ? 'border-neutral-800 bg-neutral-950/50' : 'border-slate-200 bg-slate-50/80'
          }`}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className={isDarkMode ? 'text-neutral-400 hover:text-white' : ''}
          >
            Cancel
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleSkip} className={isDarkMode ? 'text-neutral-400' : ''}>
            Skip all
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`ml-auto font-semibold ${
              isDarkMode ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            Import {footerSummary.rowCount > 0 ? `(${footerSummary.rowCount})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

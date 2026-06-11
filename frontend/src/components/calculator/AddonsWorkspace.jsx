import { useMemo, useState, useCallback } from 'react';
import { Puzzle, Plus, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyCompact } from '@/lib/utils';
import {
  listAddonsForFamily,
  getProductFamily,
  isAddonProduct,
  getCatalogTierKeys,
  resolveTierForProduct,
} from '@/lib/opportunityScope';
import { getPortfolioCardUi, closePanel } from '@/lib/portfolioCardUi';
import ProductWorkspaceCard from './ProductWorkspaceCard';

export default function AddonsWorkspace({
  isDarkMode,
  selectedProducts = [],
  setSelectedProducts,
  onAddAddon,
  filteredProductsCatalog = [],
  findCatalogProduct,
  getSegmentPayload,
  roles = [],
  calcData,
  results,
  standardMonthlyHours = 160,
  buildProductTeam,
  refreshRoles,
  onMarginPreview,
}) {
  // ─── Theme tokens ──────────────────────────────────────────────────────────
  const card = isDarkMode
    ? 'bg-neutral-900/50 border-neutral-800'
    : 'bg-white border-slate-200';
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-400';
  const inputClass = isDarkMode
    ? 'bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 focus:border-indigo-500'
    : '';
  const sectionDivider = isDarkMode ? 'border-neutral-800' : 'border-slate-100';

  // ─── Derived data ──────────────────────────────────────────────────────────
  const addonLines = useMemo(
    () => selectedProducts.filter(p => p.is_addon),
    [selectedProducts]
  );
  const linkedAddons = useMemo(
    () => addonLines.filter(p => p.parent_id),
    [addonLines]
  );
  const unlinkedAddons = useMemo(
    () => addonLines.filter(p => !p.parent_id),
    [addonLines]
  );

  // Parent services (non-addon, non-vendor-only)
  const parentServices = useMemo(
    () => selectedProducts.filter(p => p.product_name && !p.vendor_only && !p.is_addon),
    [selectedProducts]
  );

  // Add-ons grouped by parent_id
  const addonsByParent = useMemo(() => {
    const map = {};
    linkedAddons.forEach(a => {
      (map[a.parent_id] ||= []).push(a);
    });
    return map;
  }, [linkedAddons]);

  // Orphan linked add-ons (parent no longer present) are folded into the
  // Standalone section so no add-on is ever hidden.
  const parentIdSet = useMemo(() => new Set(parentServices.map(p => p.id)), [parentServices]);
  const orphanAddons = useMemo(
    () => linkedAddons.filter(a => !parentIdSet.has(a.parent_id)),
    [linkedAddons, parentIdSet]
  );
  const standaloneAddons = useMemo(
    () => [...unlinkedAddons, ...orphanAddons],
    [unlinkedAddons, orphanAddons]
  );
  const linkedToParentCount = addonLines.length - standaloneAddons.length;
  const allAddonsCatalog = useMemo(
    () => (filteredProductsCatalog || []).filter(p => isAddonProduct(p)),
    [filteredProductsCatalog]
  );

  // Pricing data from API results keyed by add-on id
  const addonPricing = useMemo(() => {
    const lines = results?.margin_breakdown?.products || [];
    const map = {};
    addonLines.forEach(a => {
      const line = lines.find(l => l.id === a.id);
      if (line) {
        map[a.id] = {
          selling: Number(line.selling ?? 0),
          cost: Number(line.team_cost ?? line.internal_cost ?? line.cost ?? 0),
          margin: Number(line.margin_percent ?? 0),
        };
      }
    });
    return map;
  }, [addonLines, results]);

  const totalAddonSelling = useMemo(
    () => Object.values(addonPricing).reduce((s, d) => s + d.selling, 0),
    [addonPricing]
  );
  const totalAddonCost = useMemo(
    () => Object.values(addonPricing).reduce((s, d) => s + d.cost, 0),
    [addonPricing]
  );
  const addonBlendedMargin =
    totalAddonSelling > 0
      ? ((totalAddonSelling - totalAddonCost) / totalAddonSelling) * 100
      : 0;
  const quoteContributionPct =
    (results?.selling_price || 0) > 0
      ? (totalAddonSelling / results.selling_price) * 100
      : 0;

  // ─── Add-on card UI state ──────────────────────────────────────────────────
  const [addonUi, setAddonUi] = useState({});

  const toggleAddonCardOpen = useCallback((id) => {
    setAddonUi(prev => {
      const cur = getPortfolioCardUi(prev, id);
      return { ...prev, [id]: cur.panel ? closePanel(cur) : { ...cur, panel: 'team' } };
    });
  }, []);

  const setAddonCardPanel = useCallback((id, panel) => {
    setAddonUi(prev => {
      const cur = getPortfolioCardUi(prev, id);
      if (panel == null) return { ...prev, [id]: closePanel(cur) };
      return { ...prev, [id]: { panel, teamEditorsOpen: panel === 'team' ? cur.teamEditorsOpen : false } };
    });
  }, []);

  const setAddonTeamEditorsOpen = useCallback((id, open) => {
    setAddonUi(prev => ({ ...prev, [id]: { ...getPortfolioCardUi(prev, id), teamEditorsOpen: open } }));
  }, []);

  // ─── Add-on mutations ──────────────────────────────────────────────────────
  const changeAddonItem = useCallback((id, field, value) => {
    setSelectedProducts(prev => prev.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  }, [setSelectedProducts]);

  const changeAddonItemFields = useCallback((id, patch) => {
    setSelectedProducts(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  }, [setSelectedProducts]);

  const removeAddon = useCallback((id) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id));
    setAddonUi(prev => { const next = { ...prev }; delete next[id]; return next; });
  }, [setSelectedProducts]);

  // ─── Dialog state ──────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogParentId, setDialogParentId] = useState(null); // null = unlinked
  const [dialogName, setDialogName] = useState('');
  const [dialogTier, setDialogTier] = useState('');

  const openLinkedDialog = (parentLineId) => {
    setDialogParentId(parentLineId);
    setDialogName('');
    setDialogTier('');
    setDialogOpen(true);
  };

  const openUnlinkedDialog = () => {
    setDialogParentId(null);
    setDialogName('');
    setDialogTier('');
    setDialogOpen(true);
  };

  // Catalog choices for the dialog
  const dialogChoices = useMemo(() => {
    if (dialogParentId === null) {
      // Unlinked: all add-ons in catalog
      return (filteredProductsCatalog || []).filter(p => isAddonProduct(p));
    }
    const parent = selectedProducts.find(p => p.id === dialogParentId);
    if (!parent) return [];
    const product = findCatalogProduct?.(parent.product_name);
    const family = getProductFamily(product);
    return listAddonsForFamily(filteredProductsCatalog, family);
  }, [dialogParentId, selectedProducts, findCatalogProduct, filteredProductsCatalog]);

  const dialogTierKeys = useMemo(() => {
    const product = dialogName ? findCatalogProduct?.(dialogName) : null;
    return getCatalogTierKeys(product);
  }, [dialogName, findCatalogProduct]);

  // Parent line label for dialog header
  const dialogParentLabel = useMemo(() => {
    if (dialogParentId === null) return null;
    const parent = selectedProducts.find(p => p.id === dialogParentId);
    if (!parent) return null;
    const tier = parent.size ? ` · ${String(parent.size).toUpperCase()}` : '';
    return `${parent.product_name}${tier}`;
  }, [dialogParentId, selectedProducts]);

  const commitAddAddon = () => {
    if (!dialogName || !onAddAddon) return;
    const product = findCatalogProduct?.(dialogName);
    const tier = dialogTier || resolveTierForProduct(product, 'standard');
    onAddAddon(dialogParentId, dialogName, tier);
    setDialogOpen(false);
  };

  // ─── Renderers ─────────────────────────────────────────────────────────────

  // Clean add-on row — renders ProductWorkspaceCard directly (its own summary
  // strip already shows selling · margin · health · team), exactly like the
  // Portfolio step. No redundant outer pricing strip or double border.
  const renderAddonCard = (addonLine, addonCatalog) => {
    const ui = getPortfolioCardUi(addonUi, addonLine.id);
    return (
      <ProductWorkspaceCard
        key={addonLine.id}
        item={addonLine}
        isDarkMode={isDarkMode}
        filteredProductsCatalog={addonCatalog}
        findCatalogProduct={findCatalogProduct}
        getSegmentPayload={getSegmentPayload}
        onChangeItem={changeAddonItem}
        onChangeItemFields={changeAddonItemFields}
        onRemove={() => removeAddon(addonLine.id)}
        roles={roles}
        calcData={calcData}
        results={results}
        standardMonthlyHours={standardMonthlyHours}
        buildProductTeam={buildProductTeam}
        refreshRoles={refreshRoles}
        openSection={ui.panel}
        teamEditorsOpen={ui.teamEditorsOpen}
        onToggleCardOpen={() => toggleAddonCardOpen(addonLine.id)}
        onOpenSectionChange={panel => setAddonCardPanel(addonLine.id, panel)}
        onTeamEditorsOpenChange={open => setAddonTeamEditorsOpen(addonLine.id, open)}
        onMarginPreview={onMarginPreview}
      />
    );
  };

  // Reusable "Add add-on" action button for a service group.
  const addAddonButton = (parentId, family, canAdd) => (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => openLinkedDialog(parentId)}
      disabled={!canAdd}
      title={canAdd ? `Add ${family} add-on` : 'No add-ons available in this category'}
      className={`h-7 px-2.5 text-xs gap-1 shrink-0 ${
        isDarkMode ? 'text-indigo-300 hover:bg-indigo-500/15' : 'text-indigo-600 hover:bg-indigo-50'
      } disabled:opacity-40`}
    >
      <Plus className="w-3 h-3" />Add add-on
    </Button>
  );

  // Compact one-liner for a service with no add-ons yet (mirrors the Resources
  // empty-section row) — keeps the workspace flat and scannable.
  const renderEmptyGroup = (parentLine, family, canAdd) => (
    <div
      key={parentLine.id}
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${card}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-neutral-700' : 'bg-slate-300'}`} />
        <span className={`text-sm font-medium truncate ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
          {parentLine.product_name}
          {parentLine.size && (
            <span className={`ml-1.5 text-[10px] font-mono uppercase ${muted}`}>{String(parentLine.size).toUpperCase()}</span>
          )}
        </span>
        {family && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${
            isDarkMode ? 'border-neutral-700 text-neutral-500' : 'border-slate-200 text-slate-400'
          }`}>
            {family}
          </span>
        )}
        <span className={`text-[11px] ${muted}`}>· no add-ons</span>
      </div>
      {addAddonButton(parentLine.id, family, canAdd)}
    </div>
  );

  const renderServiceGroup = (parentLine) => {
    const addons = addonsByParent[parentLine.id] || [];
    const product = findCatalogProduct?.(parentLine.product_name);
    const family = getProductFamily(product);
    const addonCatalog = listAddonsForFamily(filteredProductsCatalog, family);
    const canAdd = !!onAddAddon && addonCatalog.length > 0;

    if (addons.length === 0) {
      return renderEmptyGroup(parentLine, family, canAdd);
    }

    const groupSelling = addons.reduce((s, a) => s + (addonPricing[a.id]?.selling || 0), 0);

    return (
      <div key={parentLine.id} className={`rounded-xl border overflow-hidden ${card}`}>
        {/* Group header */}
        <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${sectionDivider} ${
          isDarkMode ? 'bg-neutral-900/60' : 'bg-slate-50'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${isDarkMode ? 'bg-indigo-400' : 'bg-indigo-500'}`} />
            <span className={`text-sm font-semibold truncate ${isDarkMode ? 'text-neutral-100' : 'text-slate-800'}`}>
              {parentLine.product_name}
              {parentLine.size && (
                <span className={`ml-1.5 text-[10px] font-mono uppercase ${muted}`}>{String(parentLine.size).toUpperCase()}</span>
              )}
            </span>
            {family && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${
                isDarkMode
                  ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10'
                  : 'border-indigo-200 text-indigo-600 bg-indigo-50'
              }`}>
                {family}
              </span>
            )}
            <span className={`text-[11px] ${muted}`}>({addons.length})</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {groupSelling > 0 && (
              <span className={`text-sm font-mono font-semibold tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                {formatCurrencyCompact(groupSelling, true)}
              </span>
            )}
            {addAddonButton(parentLine.id, family, canAdd)}
          </div>
        </div>

        {/* Clean add-on rows */}
        <div className="p-3 space-y-1">
          {addons.map(a => renderAddonCard(a, addonCatalog))}
        </div>
      </div>
    );
  };

  // ─── Main render ───────────────────────────────────────────────────────────
  const kpiTiles = [
    { label: 'Add-ons', value: String(addonLines.length), sub: `${linkedToParentCount} linked · ${standaloneAddons.length} standalone` },
    {
      label: 'Total selling',
      value: totalAddonSelling > 0 ? formatCurrencyCompact(totalAddonSelling, true) : '—',
      sub: totalAddonSelling > 0 ? 'SAR' : 'no data yet',
    },
    {
      label: 'Avg margin',
      value: totalAddonSelling > 0 ? `${addonBlendedMargin.toFixed(0)}%` : '—',
      accent: addonBlendedMargin > 0 && addonBlendedMargin < 25,
    },
    {
      label: '% of quote',
      value: quoteContributionPct > 0 ? `${quoteContributionPct.toFixed(1)}%` : '—',
      sub: quoteContributionPct > 0 ? 'add-on uplift' : 'no results yet',
    },
  ];

  return (
    <div className="pb-28 md:pb-0">
      {/* ── Add Add-on Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`sm:max-w-sm ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : ''}>
              {dialogParentId ? 'Add Linked Add-on' : 'Add Standalone Add-on'}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-neutral-500' : ''}>
              {dialogParentId
                ? `Attach an add-on from the same category as "${dialogParentLabel}".`
                : 'Add a standalone add-on not linked to any specific service.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Add-on picker */}
            <div>
              <Label className={`text-xs ${muted}`}>
                {dialogParentId ? 'Add-on (category-filtered)' : 'Add-on'}
              </Label>
              {dialogChoices.length === 0 ? (
                <p className={`mt-1.5 text-xs ${muted}`}>
                  {dialogParentId
                    ? 'No add-ons available for this service\'s category.'
                    : 'No add-ons found in the catalog.'}
                </p>
              ) : (
                <Select
                  value={dialogName}
                  onValueChange={val => { setDialogName(val); setDialogTier(''); }}
                >
                  <SelectTrigger className={`mt-1.5 ${inputClass}`}>
                    <SelectValue placeholder="Select an add-on" />
                  </SelectTrigger>
                  <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                    {dialogChoices.map(p => {
                      const name = p.product_name || p.service_name;
                      return <SelectItem key={name} value={name}>{name}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Tier picker */}
            {dialogName && dialogTierKeys.length > 0 && (
              <div>
                <Label className={`text-xs ${muted}`}>Tier</Label>
                <Select value={dialogTier || dialogTierKeys[0]} onValueChange={setDialogTier}>
                  <SelectTrigger className={`mt-1.5 ${inputClass}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                    {dialogTierKeys.map(t => (
                      <SelectItem key={t} value={t}>{String(t).toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className={`flex-1 ${isDarkMode ? 'border-neutral-700 text-neutral-300' : ''}`}
              >
                Cancel
              </Button>
              <Button
                onClick={commitAddAddon}
                disabled={!dialogName}
                className={`flex-1 ${isDarkMode ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                Add add-on →
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <section id="addons" className="animate-fade-in quote-panel-enter">
        <Card
          className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'}
          data-testid="addons-section"
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                  <Puzzle className={`w-5 h-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                </div>
                <div>
                  <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Add-ons
                    <Badge
                      variant="outline"
                      className={`ml-2 text-[10px] font-normal ${isDarkMode ? 'border-neutral-700 text-neutral-400' : 'border-slate-300 text-slate-400'}`}
                    >
                      Optional
                    </Badge>
                  </CardTitle>
                  <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>
                    Attach optional add-on services to parent services, or add standalone add-ons.
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={openUnlinkedDialog}
                variant="ghost"
                className={`gap-1.5 ${isDarkMode ? 'border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/15' : 'border border-indigo-200 text-indigo-700 hover:bg-indigo-50'}`}
              >
                <Plus className="w-4 h-4" />
                Add standalone
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* KPI tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {kpiTiles.map(t => (
                <div key={t.label} className={`rounded-xl border p-3 ${card} ${
                  t.accent ? (isDarkMode ? 'border-amber-500/30' : 'border-amber-200') : ''
                }`}>
                  <p className={`text-[10px] uppercase tracking-wider ${muted}`}>{t.label}</p>
                  <p className={`text-base font-semibold tabular-nums ${
                    t.accent
                      ? isDarkMode ? 'text-amber-400' : 'text-amber-600'
                      : isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>{t.value}</p>
                  {t.sub && <p className={`text-[10px] ${muted}`}>{t.sub}</p>}
                </div>
              ))}
            </div>

            {/* Contribution bar — only when we have results */}
            {quoteContributionPct > 0 && (
              <div className={`rounded-xl border p-3 space-y-2 ${card}`}>
                <p className={`text-[10px] uppercase tracking-wider font-semibold ${muted}`}>
                  Add-ons contribution to quote
                </p>
                <div className="flex h-3 rounded-full overflow-hidden gap-px">
                  <div
                    className={`${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-500'} transition-all`}
                    style={{ width: `${Math.min(100, quoteContributionPct)}%` }}
                    title={`Add-ons ${quoteContributionPct.toFixed(1)}%`}
                  />
                  <div
                    className={`flex-1 ${isDarkMode ? 'bg-neutral-700' : 'bg-slate-100'}`}
                    title={`Services ${(100 - quoteContributionPct).toFixed(1)}%`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className={muted}>Add-ons</span>
                    <span className={`font-mono font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      {quoteContributionPct.toFixed(1)}% · {formatCurrencyCompact(totalAddonSelling, true)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isDarkMode ? 'bg-neutral-700' : 'bg-slate-200'}`} />
                    <span className={muted}>Services</span>
                    <span className={`font-mono font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      {(100 - quoteContributionPct).toFixed(1)}% · {formatCurrencyCompact((results?.selling_price || 0) - totalAddonSelling, true)}
                    </span>
                  </div>
                </div>

                {/* Per-add-on margin mini-bars */}
                {addonLines.length > 0 && Object.keys(addonPricing).length > 0 && (
                  <div className={`mt-3 pt-3 border-t space-y-2 ${sectionDivider}`}>
                    <p className={`text-[10px] uppercase tracking-wider font-semibold ${muted}`}>
                      Per add-on margin
                    </p>
                    {addonLines.map(a => {
                      const p = addonPricing[a.id];
                      if (!p || p.selling === 0) return null;
                      return (
                        <div key={a.id} className="space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] truncate ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                              {a.product_name}
                              {a.size && <span className={`ml-1 text-[9px] font-mono uppercase ${muted}`}>{a.size}</span>}
                            </span>
                            <span className={`text-[11px] font-mono font-semibold shrink-0 tabular-nums ${
                              p.margin >= 30
                                ? isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                                : isDarkMode ? 'text-amber-400' : 'text-amber-600'
                            }`}>
                              {p.margin.toFixed(0)}%
                            </span>
                          </div>
                          <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                            <div
                              className={`h-full rounded-full ${p.margin >= 30 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(100, Math.max(0, p.margin))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* No services state */}
            {parentServices.length === 0 ? (
              <div className={`text-center py-12 rounded-xl border border-dashed ${
                isDarkMode ? 'border-neutral-800 text-neutral-500' : 'border-slate-200 text-slate-500'
              }`}>
                <Puzzle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm mb-1">No services in your portfolio yet.</p>
                <p className="text-xs">Add services in the Portfolio step, then come back to attach add-ons.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* ── By service ───────────────────────────────────────────── */}
                <div className="space-y-2.5">
                  <p className={`text-[10px] uppercase tracking-widest font-semibold ${muted}`}>By service</p>
                  <div className="space-y-2.5">
                    {parentServices.map(renderServiceGroup)}
                  </div>
                </div>

                {/* ── Standalone add-ons (incl. orphans) ───────────────────── */}
                <div className="space-y-2.5">
                  <p className={`text-[10px] uppercase tracking-widest font-semibold ${muted}`}>Standalone</p>
                  <div className={`rounded-xl border overflow-hidden ${card}`}>
                    {/* Standalone header */}
                    <div className={`flex items-center justify-between gap-3 px-4 py-3 ${
                      standaloneAddons.length > 0 ? `border-b ${sectionDivider}` : ''
                    } ${isDarkMode ? 'bg-neutral-900/60' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className={`text-[9px] ${
                          isDarkMode ? 'border-violet-500/30 text-violet-300' : 'border-violet-200 text-violet-700'
                        }`}>
                          Standalone
                        </Badge>
                        <span className={`text-xs ${muted}`}>
                          {standaloneAddons.length > 0
                            ? `${standaloneAddons.length} add-on${standaloneAddons.length !== 1 ? 's' : ''} not linked to a service`
                            : 'Add-ons not linked to any specific service'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {standaloneAddons.length > 0 && (
                          <span className={`text-sm font-mono font-semibold tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            {formatCurrencyCompact(
                              standaloneAddons.reduce((s, a) => s + (addonPricing[a.id]?.selling || 0), 0),
                              true
                            )}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={openUnlinkedDialog}
                          className={`h-7 px-2.5 text-xs gap-1 shrink-0 ${
                            isDarkMode
                              ? 'text-violet-300 hover:bg-violet-500/15'
                              : 'text-violet-700 hover:bg-violet-50'
                          }`}
                        >
                          <Plus className="w-3 h-3" />Add standalone
                        </Button>
                      </div>
                    </div>

                    {/* Standalone add-on rows or compact empty state */}
                    {standaloneAddons.length > 0 ? (
                      <div className="p-3 space-y-1">
                        {standaloneAddons.map(a => renderAddonCard(a, allAddonsCatalog))}
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 px-4 py-3 ${muted}`}>
                        <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                        <p className="text-[11px]">
                          No standalone add-ons yet. Use &ldquo;Add standalone&rdquo; for an add-on not tied to a specific service.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <p className={`text-[11px] ${muted}`}>
              Linked add-ons are category-matched to their parent service. Standalone add-ons can be any add-on from the catalog. All add-ons are fully priced lines with their own team, risk, and margin.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

import { useMemo, useState } from 'react';
import {
  Target,
  Lock,
  Unlock,
  Layers,
  Package,
  Users,
  Truck,
  BarChart3,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import PricingGuidelinesPanel from '@/components/PricingGuidelinesPanel';
import StepContinueFooter from './StepContinueFooter';
import { formatCurrency } from '@/lib/utils';
import {
  MARGIN_MODES,
  applyMarginModeToCalcData,
  buildProductLines,
  buildProductLinePricingBreakdown,
  createRoleMatcher,
  getDealComposition,
  computeClientPreview,
  getPrimaryGuidelineCategory,
} from '@/lib/marginEngine';
import { EXECUTION_HYBRID } from '@/lib/pricingCostRules';
import ProductPricingBreakdown from './ProductPricingBreakdown';
import { executionModeLabel } from '@/lib/pricingCostRules';

const MODES = [
  { id: MARGIN_MODES.UNIFIED, label: 'Unified' },
  { id: MARGIN_MODES.SPLIT, label: 'Split' },
  { id: MARGIN_MODES.GRANULAR, label: 'Per-line' },
];

function statusBadgeClass(tone, isDarkMode) {
  if (tone === 'emerald') {
    return isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
  if (tone === 'amber') {
    return isDarkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-200';
  }
  if (tone === 'rose') {
    return isDarkMode ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-800 border-rose-200';
  }
  return isDarkMode ? 'bg-neutral-800 text-neutral-400 border-neutral-700' : 'bg-slate-100 text-slate-600 border-slate-200';
}

function MarginRangeBar({ value, min, target, isDarkMode }) {
  const minP = Math.min(100, Math.max(0, min || 0));
  const targetP = Math.min(100, Math.max(minP, target || 30));
  const valP = Math.min(100, Math.max(0, value || 0));
  return (
    <div className={`relative h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-200'}`}>
      <div
        className={`absolute inset-y-0 left-0 ${isDarkMode ? 'bg-amber-500/30' : 'bg-amber-200'}`}
        style={{ width: `${minP}%` }}
      />
      <div
        className={`absolute inset-y-0 ${isDarkMode ? 'bg-emerald-500/25' : 'bg-emerald-200'}`}
        style={{ left: `${minP}%`, width: `${targetP - minP}%` }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white shadow"
        style={{ left: `calc(${valP}% - 5px)` }}
      />
    </div>
  );
}

export default function MarginControlCenter({
  isDarkMode,
  calcData,
  setCalcData,
  selectedProducts,
  setSelectedProducts,
  findCatalogProduct,
  getSegmentPayload,
  roles = [],
  results,
  onContinueToReview,
}) {
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const marginMode = calcData.margin_mode || MARGIN_MODES.UNIFIED;

  const productLines = useMemo(
    () => buildProductLines(selectedProducts, findCatalogProduct, getSegmentPayload, calcData),
    [selectedProducts, calcData, findCatalogProduct, getSegmentPayload]
  );

  const composition = useMemo(
    () => getDealComposition(selectedProducts, calcData, findCatalogProduct, getSegmentPayload),
    [selectedProducts, calcData, findCatalogProduct, getSegmentPayload]
  );

  const preview = useMemo(
    () => computeClientPreview(productLines, calcData, results),
    [productLines, calcData, results]
  );

  const matchRoleByName = useMemo(() => createRoleMatcher(roles), [roles]);

  const hybridProductLineCount = useMemo(() => {
    return productLines.filter(l => l.execution_mode === EXECUTION_HYBRID).length;
  }, [productLines]);

  const guidelineCategory = useMemo(
    () => getPrimaryGuidelineCategory(selectedProducts, findCatalogProduct),
    [selectedProducts, findCatalogProduct]
  );

  const dealSizeValue = results?.selling_price || preview.productSelling || 0;
  const breakdown = results?.margin_breakdown;

  const setMode = mode => {
    setCalcData(prev => applyMarginModeToCalcData(prev, mode));
  };

  const updateProductMargin = (id, marginPercent, locked = true) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, margin_percent: marginPercent, margin_source: 'custom', locked }
          : p
      )
    );
  };

  const applySheetMinimums = () => {
    setSelectedProducts(prev =>
      prev.map(p => {
        if (!p.product_name || !p.size) return p;
        const product = findCatalogProduct(p.product_name);
        const seg = getSegmentPayload(product, p.size);
        const min = Number(seg?.minimum_margin_percent) || 0;
        return min > 0
          ? { ...p, margin_percent: min, margin_source: 'sheet', locked: false }
          : p;
      })
    );
  };

  const syncFromGlobalTarget = () => {
    const target = Number(calcData.target_margin_percent) || 30;
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product_name && p.size
          ? { ...p, margin_percent: target, margin_source: 'global', locked: false }
          : p
      )
    );
  };

  const inputClass = isDarkMode
    ? 'bg-neutral-950 border-neutral-800 text-white font-mono'
    : 'bg-white border-slate-300 text-slate-900 font-mono';

  return (
    <section id="pricing" className="animate-fade-in quote-panel-enter" data-testid="margin-control-center">
      <Card className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'
              }`}
            >
              <Target className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Margin control center
              </CardTitle>
              <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>
                {composition.hint}
              </CardDescription>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div
              className={`flex flex-wrap gap-1 p-1 rounded-lg ${
                isDarkMode ? 'bg-neutral-900' : 'bg-slate-100'
              }`}
            >
              <button
                type="button"
                onClick={() => setMode(MARGIN_MODES.UNIFIED)}
                className={`flex-1 min-w-[80px] py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  marginMode === MARGIN_MODES.UNIFIED
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDarkMode
                      ? 'text-neutral-400 hover:text-neutral-200'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
                data-testid="margin-mode-unified"
              >
                Unified
              </button>
            </div>
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger
                className={`flex w-full items-center justify-between py-1.5 text-xs font-medium ${
                  isDarkMode ? 'text-neutral-400' : 'text-slate-600'
                }`}
              >
                Advanced pricing (Split / Per-line)
                <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div
                  className={`flex flex-wrap gap-1 p-1 rounded-lg ${
                    isDarkMode ? 'bg-neutral-900' : 'bg-slate-100'
                  }`}
                >
                  {[MODES[1], MODES[2]].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={`flex-1 min-w-[80px] py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                        marginMode === m.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : isDarkMode
                            ? 'text-neutral-400 hover:text-neutral-200'
                            : 'text-slate-600 hover:text-slate-900'
                      }`}
                      data-testid={`margin-mode-${m.id}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {composition.hasProducts && marginMode !== MARGIN_MODES.GRANULAR && (
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                    Sheet products need <strong>Per-line</strong> mode to price each row in the API total.
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Collapsible open={guidelinesOpen} onOpenChange={setGuidelinesOpen}>
            <CollapsibleTrigger
              className={`flex w-full items-center justify-between py-2 text-sm font-medium ${
                isDarkMode ? 'text-neutral-300' : 'text-slate-700'
              }`}
            >
              Pricing guidelines
              <ChevronDown className={`w-4 h-4 transition-transform ${guidelinesOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <PricingGuidelinesPanel
                currentMargin={results?.contribution_margin_percent ?? 0}
                dealSize={dealSizeValue}
                category={guidelineCategory}
              />
            </CollapsibleContent>
          </Collapsible>

          {(composition.hasHybridMode || composition.isHybrid) && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-xs border ${
                isDarkMode
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {composition.hasHybridMode
                  ? 'Hybrid rows: Total Cost is the included package. Synced team is for scope — only hours above the sheet baseline add labor cost.'
                  : 'Mixed deal: use Per-line for sheet products; review team and vendor buckets in Summary.'}
              </span>
            </div>
          )}

          <Tabs defaultValue={composition.hasProducts ? 'products' : composition.hasTeam ? 'internal' : 'summary'}>
            <TabsList
              className={`w-full grid grid-cols-4 h-auto ${
                isDarkMode ? 'bg-neutral-900' : 'bg-slate-100'
              }`}
            >
              <TabsTrigger value="products" className="text-xs gap-1 py-2" disabled={!composition.hasProducts}>
                <Package className="w-3.5 h-3.5" />
                Products
              </TabsTrigger>
              <TabsTrigger value="internal" className="text-xs gap-1 py-2">
                <Users className="w-3.5 h-3.5" />
                Internal
              </TabsTrigger>
              <TabsTrigger value="vendors" className="text-xs gap-1 py-2" disabled={!composition.hasVendors}>
                <Truck className="w-3.5 h-3.5" />
                Vendors
              </TabsTrigger>
              <TabsTrigger value="summary" className="text-xs gap-1 py-2">
                <BarChart3 className="w-3.5 h-3.5" />
                Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="mt-4 space-y-3">
              {marginMode !== MARGIN_MODES.GRANULAR && (
                <p className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                  Switch to <strong>Per-line</strong> mode to price each catalog row with its own margin in the API total.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={applySheetMinimums}>
                  Apply sheet minimums
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={syncFromGlobalTarget}>
                  Sync from target {calcData.target_margin_percent}%
                </Button>
              </div>
              {productLines.length === 0 ? (
                <p className={`text-sm py-6 text-center ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                  Add products in Scope to configure per-line margins.
                </p>
              ) : (
                <div className="space-y-3">
                  {productLines.map(line => {
                    const item = selectedProducts.find(p => p.id === line.id);
                    const target = Number(calcData.target_margin_percent) || 30;
                    const minM = line.sheet_min_margin_percent || 0;
                    return (
                      <div
                        key={line.id}
                        className={`rounded-xl border p-4 space-y-3 ${
                          isDarkMode ? 'border-neutral-700 bg-neutral-900/50' : 'border-slate-200 bg-slate-50/80'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {line.product_name}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                              {line.segment?.toUpperCase()} · Qty {line.quantity}
                              {line.execution_mode && (
                                <> · {executionModeLabel(line.execution_mode)}</>
                              )}
                            </p>
                            {line.cost_basis_description && (
                              <p className={`text-xs mt-1 ${isDarkMode ? 'text-neutral-600' : 'text-slate-500'}`}>
                                {line.cost_basis_description}
                              </p>
                            )}
                          </div>
                          <Badge className={`text-xs border ${statusBadgeClass(line.validation?.tone, isDarkMode)}`}>
                            {line.validation?.label}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>Cost (J)</p>
                            <p className={`font-mono font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {formatCurrency(line.cost)}
                            </p>
                          </div>
                          <div>
                            <p className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>Min margin</p>
                            <p className={`font-mono ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                              {minM > 0 ? `${minM}%` : '—'}
                            </p>
                          </div>
                          <div>
                            <p className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>Min selling (O)</p>
                            <p className={`font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              {formatCurrency(line.sheet_min_selling)}
                            </p>
                          </div>
                          <div>
                            <p className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>Line price</p>
                            <p className={`font-mono font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {formatCurrency(line.line_selling)}
                            </p>
                          </div>
                        </div>
                        <ProductPricingBreakdown
                          isDarkMode={isDarkMode}
                          breakdown={buildProductLinePricingBreakdown(
                            line,
                            getSegmentPayload(findCatalogProduct(line.product_name), line.segment),
                            calcData,
                            matchRoleByName
                          )}
                          footnote={
                            hybridProductLineCount > 1 && line.execution_mode === EXECUTION_HYBRID
                              ? 'Multiple hybrid lines may share roles — extra labor is consolidated on the Team tab.'
                              : null
                          }
                        />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Label className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                              Margin %
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                className={`w-16 h-8 text-sm ${inputClass}`}
                                value={item?.margin_percent ?? line.margin_percent}
                                onChange={e =>
                                  updateProductMargin(line.id, parseFloat(e.target.value) || 0, true)
                                }
                              />
                              <button
                                type="button"
                                title={item?.locked ? 'Margin locked' : 'Margin follows sheet/global'}
                                onClick={() =>
                                  setSelectedProducts(prev =>
                                    prev.map(p =>
                                      p.id === line.id ? { ...p, locked: !p.locked } : p
                                    )
                                  )
                                }
                                className={isDarkMode ? 'text-neutral-500 hover:text-white' : 'text-slate-400 hover:text-slate-700'}
                              >
                                {item?.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <MarginRangeBar
                            value={item?.margin_percent ?? line.margin_percent}
                            min={minM}
                            target={target}
                            isDarkMode={isDarkMode}
                          />
                          <Slider
                            value={[Math.min(80, Math.max(0, item?.margin_percent ?? line.margin_percent))]}
                            min={0}
                            max={80}
                            step={0.5}
                            onValueChange={([v]) => updateProductMargin(line.id, v, true)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="internal" className="mt-4 space-y-4">
              {marginMode === MARGIN_MODES.UNIFIED && (
                <div>
                  <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                    Target margin % (quote-level)
                  </Label>
                  <Input
                    type="number"
                    value={calcData.target_margin_percent}
                    onChange={e =>
                      setCalcData(p => ({ ...p, target_margin_percent: parseFloat(e.target.value) || 0 }))
                    }
                    className={`mt-1.5 max-w-xs ${inputClass}`}
                    data-testid="target-margin-input"
                  />
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                    Applies to internal labor + overhead in unified pricing.
                  </p>
                </div>
              )}
              {marginMode === MARGIN_MODES.SPLIT && (
                <div>
                  <Label className={`text-sm flex items-center gap-2 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Internal margin %
                  </Label>
                  <Input
                    type="number"
                    value={calcData.internal_margin_percent}
                    onChange={e =>
                      setCalcData(p => ({ ...p, internal_margin_percent: parseFloat(e.target.value) || 0 }))
                    }
                    className={`mt-1.5 max-w-xs ${inputClass}`}
                    data-testid="internal-margin-input"
                  />
                </div>
              )}
              {marginMode === MARGIN_MODES.GRANULAR && (
                <div>
                  <Label className={`text-sm flex items-center gap-2 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Internal bucket margin %
                  </Label>
                  <Input
                    type="number"
                    value={calcData.internal_margin_percent}
                    onChange={e =>
                      setCalcData(p => ({ ...p, internal_margin_percent: parseFloat(e.target.value) || 0 }))
                    }
                    className={`mt-1.5 max-w-xs ${inputClass}`}
                  />
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                    Team + overhead bucket on top of per-product revenue.
                  </p>
                </div>
              )}
              {results && (
                <div className={`p-3 rounded-lg text-sm ${isDarkMode ? 'bg-neutral-900' : 'bg-slate-50'}`}>
                  <p className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Internal labor (COGS)</p>
                  <p className={`font-mono font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {formatCurrency(results.internal_labor_cost)}
                  </p>
                  {breakdown?.internal?.margin_achieved != null && (
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                      Achieved: {breakdown.internal.margin_achieved.toFixed(1)}%
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="vendors" className="mt-4 space-y-3">
              {!composition.hasVendors ? (
                <p className={`text-sm py-4 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                  No vendors — add vendors above or use vendor margin in Split mode.
                </p>
              ) : (
                <>
                  {(marginMode === MARGIN_MODES.SPLIT || marginMode === MARGIN_MODES.GRANULAR) && (
                    <div>
                      <Label className={`text-sm flex items-center gap-2 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        Vendor margin % (when no row markup)
                      </Label>
                      <Input
                        type="number"
                        value={calcData.vendor_margin_percent}
                        onChange={e =>
                          setCalcData(p => ({ ...p, vendor_margin_percent: parseFloat(e.target.value) || 0 }))
                        }
                        className={`mt-1.5 max-w-xs ${inputClass}`}
                        data-testid="vendor-margin-input"
                      />
                    </div>
                  )}
                  <p className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                    Per-vendor markup is set in each vendor row. Markup overrides vendor margin % when &gt; 0.
                  </p>
                  {calcData.vendors.map((v, i) => {
                    const cost = (v.unit_cost || v.cost || 0) * (v.quantity || 1);
                    const markup = v.markup_percent || 0;
                    const client = cost * (1 + markup / 100);
                    return (
                      <div
                        key={v.id || i}
                        className={`flex justify-between items-center py-2 px-3 rounded-lg text-sm ${
                          isDarkMode ? 'bg-neutral-900' : 'bg-slate-50'
                        }`}
                      >
                        <span className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>
                          {v.service_name || `Vendor ${i + 1}`}
                        </span>
                        <span className={`font-mono text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                          {markup}% → {formatCurrency(client)}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </TabsContent>

            <TabsContent value="summary" className="mt-4 space-y-4">
              <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-neutral-700' : 'border-slate-200'}`}>
                <p className={`text-xs font-medium mb-3 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                  Price stack
                </p>
                {breakdown?.mode === 'granular' ? (
                  <div className="space-y-2 text-sm">
                    <StackRow
                      label="Products"
                      value={breakdown.products_selling}
                      isDarkMode={isDarkMode}
                      color="violet"
                    />
                    <StackRow
                      label="Internal"
                      value={breakdown.internal?.selling}
                      isDarkMode={isDarkMode}
                      color="blue"
                    />
                    <StackRow
                      label="Vendors"
                      value={breakdown.vendors?.selling}
                      isDarkMode={isDarkMode}
                      color="amber"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {preview.productSelling > 0 && (
                      <StackRow label="Products (preview)" value={preview.productSelling} isDarkMode={isDarkMode} color="violet" />
                    )}
                    <StackRow
                      label="API selling price"
                      value={preview.apiSelling}
                      isDarkMode={isDarkMode}
                      color="emerald"
                      bold
                    />
                  </div>
                )}
                <div className={`mt-4 pt-3 border-t flex justify-between ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
                  <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Contribution margin</span>
                  <span className={`font-mono font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {preview.apiMargin.toFixed(1)}%
                  </span>
                </div>
                {preview.gapToTarget > 0 && (
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                    {preview.gapToTarget.toFixed(1)}% below target ({preview.target}%)
                  </p>
                )}
                {preview.invalidLines > 0 && (
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-rose-400' : 'text-rose-700'}`}>
                    {preview.invalidLines} product line(s) need margin attention
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Layers className={`w-4 h-4 ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`} />
                <span className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>
                  Mode: <span className="font-medium capitalize">{marginMode}</span>
                  {marginMode === MARGIN_MODES.GRANULAR && productLines.length > 0 && (
                    <> · {productLines.length} catalog lines</>
                  )}
                </span>
              </div>
            </TabsContent>
          </Tabs>

          {onContinueToReview && (
            <StepContinueFooter label="Continue to Review" onContinue={onContinueToReview} isDarkMode={isDarkMode} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function StackRow({ label, value, isDarkMode, color, bold }) {
  const colors = {
    violet: isDarkMode ? 'text-violet-400' : 'text-violet-700',
    blue: isDarkMode ? 'text-blue-400' : 'text-blue-700',
    amber: isDarkMode ? 'text-amber-400' : 'text-amber-700',
    emerald: isDarkMode ? 'text-emerald-400' : 'text-emerald-700',
  };
  return (
    <div className="flex justify-between gap-2">
      <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>{label}</span>
      <span className={`font-mono tabular-nums ${bold ? 'font-semibold' : ''} ${colors[color] || ''}`}>
        {formatCurrency(value || 0)}
      </span>
    </div>
  );
}

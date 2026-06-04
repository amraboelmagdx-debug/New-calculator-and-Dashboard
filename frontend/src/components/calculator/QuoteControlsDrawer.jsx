import { Shield, Target, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import ScopeRiskPanel from './ScopeRiskPanel';
import PricingGuidelinesPanel from '@/components/PricingGuidelinesPanel';
import {
  MARGIN_MODES,
  getDealComposition,
  getPrimaryGuidelineCategory,
} from '@/lib/marginEngine';

export default function QuoteControlsDrawer({
  open,
  onOpenChange,
  isDarkMode,
  calcData,
  setCalcData,
  projectInfo,
  setProjectInfo,
  paymentTerms = [],
  onOpenQuoteSettings,
  selectedProducts = [],
  setSelectedProducts,
  findCatalogProduct,
  getSegmentPayload,
  results,
}) {
  const hasQuoteVendors = (calcData?.vendors?.length || 0) > 0;
  const vendorRiskActive =
    calcData?.vendor_risk &&
    [calcData.vendor_risk.complexity, calcData.vendor_risk.rush, calcData.vendor_risk.execution].filter(
      r => r !== 'none'
    ).length > 0;

  const composition =
    findCatalogProduct && getSegmentPayload
      ? getDealComposition(selectedProducts, calcData, findCatalogProduct, getSegmentPayload)
      : { hasProducts: (selectedProducts || []).some(p => p.product_name && p.size) };
  const hasProducts = composition.hasProducts;
  const target = Number(calcData?.target_margin_percent) || 30;
  const splitOn = calcData?.margin_mode === MARGIN_MODES.SPLIT;

  const guidelineCategory =
    findCatalogProduct ? getPrimaryGuidelineCategory(selectedProducts, findCatalogProduct) : 'general';

  const inputClass = isDarkMode
    ? 'bg-neutral-900 border-neutral-800 text-white font-mono'
    : 'bg-white border-slate-300 text-slate-900 font-mono';
  const sectionBorder = isDarkMode ? 'border-neutral-800' : 'border-slate-200';
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';

  const applySheetMinimums = () => {
    if (!setSelectedProducts) return;
    setSelectedProducts(prev =>
      prev.map(p => {
        if (!p.product_name || !p.size) return p;
        const product = findCatalogProduct?.(p.product_name);
        const seg = getSegmentPayload?.(product, p.size);
        const min = Number(seg?.minimum_margin_percent) || 0;
        return min > 0 ? { ...p, margin_percent: min, margin_source: 'sheet', locked: false } : p;
      })
    );
  };

  const syncFromTarget = () => {
    if (!setSelectedProducts) return;
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product_name && p.size
          ? { ...p, margin_percent: target, margin_source: 'global', locked: false }
          : p
      )
    );
  };

  const setSplit = on => {
    setCalcData(prev => ({
      ...prev,
      margin_mode: on ? MARGIN_MODES.SPLIT : MARGIN_MODES.UNIFIED,
      use_split_margins: on,
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`w-full sm:max-w-md overflow-y-auto ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : ''}`}
        data-testid="quote-controls-drawer"
      >
        <SheetHeader>
          <SheetTitle className={isDarkMode ? 'text-white' : ''}>Quote controls</SheetTitle>
          <SheetDescription className={isDarkMode ? 'text-neutral-500' : ''}>
            Deal-level settings that affect the whole quote. Edit each product's team, vendors, risk, and margin on its
            portfolio row.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className={`rounded-xl border p-4 ${sectionBorder}`} data-testid="quote-controls-margin-policy">
            <p className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
              <Target className="w-4 h-4" />
              Margin policy
            </p>

            <div>
              <Label className={`text-xs ${muted}`}>Quote target margin %</Label>
              <Input
                type="number"
                value={calcData?.target_margin_percent ?? 30}
                onChange={e => setCalcData(p => ({ ...p, target_margin_percent: parseFloat(e.target.value) || 0 }))}
                className={`mt-1.5 ${inputClass}`}
                data-testid="quote-target-margin-input"
              />
              <p className={`text-[11px] mt-1.5 ${muted}`}>
                Default margin for product lines and the &ldquo;sync&rdquo; action below.
              </p>
            </div>

            {hasProducts && setSelectedProducts && (
              <div className="mt-4">
                <p className={`text-[11px] uppercase tracking-wider mb-2 ${muted}`}>Apply to all product lines</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applySheetMinimums}
                    className={isDarkMode ? 'border-neutral-700' : ''}
                    data-testid="bulk-apply-sheet-min"
                  >
                    Apply sheet minimums
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={syncFromTarget}
                    className={isDarkMode ? 'border-neutral-700' : ''}
                    data-testid="bulk-sync-target"
                  >
                    Sync from target {target}%
                  </Button>
                </div>
                <p className={`text-[11px] mt-2 ${muted}`}>
                  Fine-tune individual lines on each portfolio card&rsquo;s Margin tab.
                </p>
              </div>
            )}

            <Collapsible className="mt-4">
              <CollapsibleTrigger
                className={`flex w-full items-center justify-between py-1.5 text-xs font-medium ${
                  isDarkMode ? 'text-neutral-400' : 'text-slate-600'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Advanced
                </span>
                <ChevronDown className="w-4 h-4 transition-transform [[data-state=open]_&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-3">
                {hasProducts ? (
                  <p className={`text-[11px] ${muted}`}>
                    Product quotes price each catalog line automatically; the line margins above drive the total.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label className={`text-sm ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                          Split internal vs vendor margins
                        </Label>
                        <p className={`text-[11px] ${muted}`}>Apply separate margins to labor and vendor costs.</p>
                      </div>
                      <Switch checked={splitOn} onCheckedChange={setSplit} data-testid="margin-split-toggle" />
                    </div>
                    {splitOn ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className={`text-xs ${muted}`}>Internal margin %</Label>
                          <Input
                            type="number"
                            value={calcData?.internal_margin_percent ?? 30}
                            onChange={e =>
                              setCalcData(p => ({ ...p, internal_margin_percent: parseFloat(e.target.value) || 0 }))
                            }
                            className={`mt-1.5 ${inputClass}`}
                          />
                        </div>
                        <div>
                          <Label className={`text-xs ${muted}`}>Vendor margin %</Label>
                          <Input
                            type="number"
                            value={calcData?.vendor_margin_percent ?? 15}
                            onChange={e =>
                              setCalcData(p => ({ ...p, vendor_margin_percent: parseFloat(e.target.value) || 0 }))
                            }
                            className={`mt-1.5 ${inputClass}`}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className={`text-[11px] ${muted}`}>
                        Unified mode applies the quote target margin to internal labor and overhead.
                      </p>
                    )}
                  </>
                )}
                <Collapsible>
                  <CollapsibleTrigger
                    className={`flex w-full items-center justify-between py-1.5 text-xs font-medium ${
                      isDarkMode ? 'text-neutral-400' : 'text-slate-600'
                    }`}
                  >
                    Pricing guidelines
                    <ChevronDown className="w-4 h-4 transition-transform [[data-state=open]_&]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <PricingGuidelinesPanel
                      currentMargin={results?.contribution_margin_percent ?? 0}
                      dealSize={results?.selling_price ?? 0}
                      category={guidelineCategory}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div data-testid="quote-controls-payment-terms">
            <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Payment terms</Label>
            <Select
              value={projectInfo?.payment_term_id || ''}
              onValueChange={v => setProjectInfo?.(p => ({ ...p, payment_term_id: v }))}
            >
              <SelectTrigger
                className={`mt-1.5 ${
                  isDarkMode
                    ? 'bg-neutral-900 border-neutral-800 text-white'
                    : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                <SelectValue placeholder="Select payment terms" />
              </SelectTrigger>
              <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                {paymentTerms.map(term => (
                  <SelectItem
                    key={term.id}
                    value={term.id}
                    className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}
                  >
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>
              Affects financing cost on the calculated price.
            </p>
          </div>

          <div
            className={`rounded-xl border p-4 ${sectionBorder}`}
            data-testid="quote-controls-internal-risk"
          >
            <p className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
              <Shield className="w-4 h-4" />
              Quote risk factors
            </p>
            <ScopeRiskPanel isDarkMode={isDarkMode} calcData={calcData} setCalcData={setCalcData} compact />
          </div>

          {(hasQuoteVendors || vendorRiskActive) && (
            <Collapsible defaultOpen={hasQuoteVendors} className={`rounded-xl border ${sectionBorder}`}>
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium ${
                  isDarkMode ? 'text-neutral-200' : 'text-slate-800'
                }`}
              >
                <span>Vendor risk factors</span>
                <Badge className={`text-xs ${isDarkMode ? 'badge-neutral' : 'bg-slate-100 text-slate-600'}`}>
                  {vendorRiskActive ? 'Active' : 'None'}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <p className={`text-xs mb-3 ${muted}`}>
                  Applies to quote-level deal vendors. Product vendors are configured per service row.
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {['complexity', 'rush', 'execution'].map(factor => (
                    <div key={factor}>
                      <Label className={`text-xs capitalize ${muted}`}>{factor}</Label>
                      <Select
                        value={calcData.vendor_risk[factor]}
                        onValueChange={v =>
                          setCalcData(p => ({
                            ...p,
                            vendor_risk: { ...p.vendor_risk, [factor]: v },
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
              </CollapsibleContent>
            </Collapsible>
          )}

          {onOpenQuoteSettings && (
            <div className={`pt-4 border-t ${sectionBorder}`}>
              <p className={`text-xs mb-3 ${muted}`}>
                Manage every vendor and link each to a service in the Resources workspace.
              </p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  onOpenQuoteSettings();
                }}
                data-testid="quote-controls-open-settings"
              >
                Manage resources
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

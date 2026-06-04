import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
}) {
  const hasQuoteVendors = (calcData?.vendors?.length || 0) > 0;
  const vendorRiskActive =
    calcData?.vendor_risk &&
    [calcData.vendor_risk.complexity, calcData.vendor_risk.rush, calcData.vendor_risk.execution].filter(
      r => r !== 'none'
    ).length > 0;

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
            Deal-level settings that affect the whole quote. Edit product team, vendors, and margin on each portfolio row.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
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
            className={`rounded-xl border p-4 ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}
            data-testid="quote-controls-internal-risk"
          >
            <p className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
              <Shield className="w-4 h-4" />
              Quote risk factors
            </p>
            <ScopeRiskPanel isDarkMode={isDarkMode} calcData={calcData} setCalcData={setCalcData} compact />
          </div>

          {(hasQuoteVendors || vendorRiskActive) && (
            <Collapsible defaultOpen={hasQuoteVendors} className={`rounded-xl border ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
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
                <p className={`text-xs mb-3 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                  Applies to quote-level deal vendors. Product vendors are configured per service row.
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {['complexity', 'rush', 'execution'].map(factor => (
                    <div key={factor}>
                      <Label className={`text-xs capitalize ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                        {factor}
                      </Label>
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
            <div className={`pt-4 border-t ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
              <p className={`text-xs mb-3 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                Deal pass-through vendors and bulk margin tools remain on the Quote settings step until a later migration phase.
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
                Open quote settings
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { Truck, Target, Shield, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import VendorRow from '@/components/VendorRow';
import StepContinueFooter from './StepContinueFooter';

export default function StepEconomics({
  isDarkMode,
  calcData,
  setCalcData,
  vendorServices,
  addVendor,
  updateVendor,
  removeVendor,
  refreshVendorServices,
  showVendors,
  showPricing,
  onContinueToReview,
}) {
  return (
    <>
      {showVendors && (
        <section id="vendors" className="animate-fade-in quote-panel-enter">
          <Card
            className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'}
            data-testid="vendor-section"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50'
                    }`}
                  >
                    <Truck className={`w-5 h-5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Vendors</CardTitle>
                    <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>
                      External services and costs
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={addVendor}
                  className={`font-semibold shadow-sm ${
                    isDarkMode ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300' : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                  data-testid="add-vendor-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add vendor
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {calcData.vendors.length === 0 ? (
                <div className={`text-center py-12 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No vendors added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {calcData.vendors.map((vendor, index) => (
                    <VendorRow
                      key={vendor.id}
                      vendor={vendor}
                      index={index}
                      vendorServices={vendorServices}
                      onUpdate={(field, value) => updateVendor(index, field, value)}
                      onRemove={() => removeVendor(index)}
                      onServicesRefresh={refreshVendorServices}
                      darkMode={isDarkMode}
                    />
                  ))}
                </div>
              )}
              {calcData.vendors.length > 0 && (
                <Collapsible className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
                  <CollapsibleTrigger
                    className={`flex items-center justify-between w-full py-2 text-sm ${
                      isDarkMode ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>Vendor risk factors</span>
                    </div>
                    <Badge className={`text-xs ${isDarkMode ? 'badge-neutral' : 'bg-slate-100 text-slate-600'}`}>
                      {calcData.vendor_risk.complexity === 'none' &&
                      calcData.vendor_risk.rush === 'none' &&
                      calcData.vendor_risk.execution === 'none'
                        ? 'None'
                        : `${[calcData.vendor_risk.complexity, calcData.vendor_risk.rush, calcData.vendor_risk.execution].filter(r => r !== 'none').length} factors`}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="grid grid-cols-3 gap-4">
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
            </CardContent>
          </Card>
        </section>
      )}

      {showPricing && (
        <section id="pricing" className="animate-fade-in quote-panel-enter">
          <Card
            className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'}
            data-testid="pricing-section"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'
                  }`}
                >
                  <Target className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Margins & risk
                  </CardTitle>
                  <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>
                    Configure margins and pricing strategy
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`flex items-center justify-between p-4 rounded-lg mb-4 ${
                  isDarkMode ? 'bg-neutral-800/50' : 'bg-slate-50 border border-slate-200'
                }`}
              >
                <div>
                  <Label className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Split margins</Label>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                    Separate margins for internal vs vendor costs
                  </p>
                </div>
                <Switch
                  checked={calcData.use_split_margins}
                  onCheckedChange={checked => setCalcData(p => ({ ...p, use_split_margins: checked }))}
                  data-testid="split-margins-toggle"
                />
              </div>

              {calcData.use_split_margins ? (
                <div className="grid grid-cols-2 gap-4">
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
                      className={`mt-1.5 font-mono ${
                        isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      data-testid="internal-margin-input"
                    />
                  </div>
                  <div>
                    <Label className={`text-sm flex items-center gap-2 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      Vendor margin %
                    </Label>
                    <Input
                      type="number"
                      value={calcData.vendor_margin_percent}
                      onChange={e =>
                        setCalcData(p => ({ ...p, vendor_margin_percent: parseFloat(e.target.value) || 0 }))
                      }
                      className={`mt-1.5 font-mono ${
                        isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      data-testid="vendor-margin-input"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Target margin %</Label>
                  <Input
                    type="number"
                    value={calcData.target_margin_percent}
                    onChange={e =>
                      setCalcData(p => ({ ...p, target_margin_percent: parseFloat(e.target.value) || 0 }))
                    }
                    className={`mt-1.5 font-mono max-w-xs ${
                      isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                    data-testid="target-margin-input"
                  />
                </div>
              )}
              {onContinueToReview && (
                <StepContinueFooter label="Continue to Review" onContinue={onContinueToReview} isDarkMode={isDarkMode} />
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </>
  );
}

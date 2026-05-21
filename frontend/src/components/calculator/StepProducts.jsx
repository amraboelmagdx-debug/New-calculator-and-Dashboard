import { LayoutTemplate, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServicePricingDetail from '@/components/ServicePricingDetail';
import QuoteEmptyState from './QuoteEmptyState';
import StepContinueFooter from './StepContinueFooter';

export default function StepProducts({
  isDarkMode,
  productsPricingSyncedAt,
  productsPricingLoading,
  loadProductsPricingCatalog,
  selectedSection,
  setSelectedSection,
  sectionOptions,
  selectedProducts,
  setSelectedProducts,
  handleApplyProducts,
  findCatalogProduct,
  getSegmentPayload,
  filteredProductsCatalog,
  onContinue,
}) {
  const showEmpty = productsPricingLoading === false && filteredProductsCatalog.length === 0;

  return (
    <section id="products" className="animate-fade-in quote-panel-enter">
      <Card className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isDarkMode ? 'bg-violet-500/10' : 'bg-violet-50'
                }`}
              >
                <LayoutTemplate className={`w-5 h-5 ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`} />
              </div>
              <div>
                <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Products pricing builder
                </CardTitle>
                <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>
                  Select service, segment, and quantity. Refresh syncs Full-DB-V1 from Google Sheet.
                </CardDescription>
                {productsPricingSyncedAt && (
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
                    Last synced: {new Date(productsPricingSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => loadProductsPricingCatalog(true)}
              disabled={productsPricingLoading}
              className={
                isDarkMode
                  ? 'border-neutral-700 text-neutral-200 hover:bg-neutral-800'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }
            >
              Refresh sheet
            </Button>
          </div>
        </CardHeader>

        <div
          className={`flex flex-wrap items-center gap-2 px-6 pb-4 border-b ${
            isDarkMode ? 'border-neutral-800' : 'border-slate-200'
          }`}
          data-testid="products-pricing-toolbar"
        >
          <div className="w-full sm:w-[260px]">
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger
                className={
                  isDarkMode ? 'border-neutral-700 bg-neutral-900 text-neutral-100' : 'border-slate-300 bg-white text-slate-700'
                }
              >
                <SelectValue placeholder="Filter by family" />
              </SelectTrigger>
              <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                {sectionOptions.map(section => (
                  <SelectItem key={section} value={section}>
                    {section === 'all' ? 'All service families' : section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              setSelectedProducts(prev => [
                ...prev,
                { id: `pp-${Date.now()}-${prev.length}`, product_name: '', size: 'tiny', quantity: 1 },
              ])
            }
            className={
              isDarkMode
                ? 'border-neutral-700 text-neutral-200 hover:bg-neutral-800'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Add product
          </Button>
          <Button
            onClick={handleApplyProducts}
            disabled={productsPricingLoading || filteredProductsCatalog.length === 0}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            Apply to team
          </Button>
        </div>

        <CardContent className="space-y-3 pt-4">
          {showEmpty ? (
            <QuoteEmptyState
              title="Pick a service from your catalog"
              description="Connect pricing data or load a saved template to get started."
              actionLabel="Refresh sheet"
              onAction={() => loadProductsPricingCatalog(true)}
              isDarkMode={isDarkMode}
            />
          ) : (
            selectedProducts.map(item => {
              const product = findCatalogProduct(item.product_name);
              const segmentKeys = Object.keys(product?.segments || product?.sizes || {});
              const segmentPayload = getSegmentPayload(product, item.size);
              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-12 gap-3 rounded-lg border p-3 ${
                    isDarkMode ? 'border-neutral-700 bg-neutral-900/40' : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div className="col-span-5">
                    <Label className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Service name</Label>
                    <Select
                      value={item.product_name}
                      onValueChange={value => {
                        const p = findCatalogProduct(value);
                        const firstSeg = Object.keys(p?.segments || p?.sizes || {})[0] || 'standard';
                        setSelectedProducts(prev =>
                          prev.map(row =>
                            row.id === item.id ? { ...row, product_name: value, size: firstSeg } : row
                          )
                        );
                      }}
                    >
                      <SelectTrigger
                        className={`mt-1 ${
                          isDarkMode ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                        {filteredProductsCatalog.map(productItem => {
                          const name = productItem.service_name || productItem.product_name;
                          const fam = productItem.service_family || productItem.section_name || 'General';
                          return (
                            <SelectItem key={`${fam}-${name}`} value={name}>
                              {name} ({fam})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Segment</Label>
                    <Select
                      value={item.size}
                      onValueChange={value =>
                        setSelectedProducts(prev => prev.map(p => (p.id === item.id ? { ...p, size: value } : p)))
                      }
                    >
                      <SelectTrigger
                        className={`mt-1 ${
                          isDarkMode ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                        {(segmentKeys.length ? segmentKeys : ['tiny', 'standard', 'big', 'mega']).map(size => (
                          <SelectItem key={size} value={size}>
                            {size.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e =>
                        setSelectedProducts(prev =>
                          prev.map(p =>
                            p.id === item.id ? { ...p, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) } : p
                          )
                        )
                      }
                      className={`mt-1 ${
                        isDarkMode ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>
                  <div className="col-span-2 flex items-end justify-end">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setSelectedProducts(prev => (prev.length === 1 ? prev : prev.filter(p => p.id !== item.id)))
                      }
                      className={isDarkMode ? 'text-neutral-400 hover:text-red-400' : 'text-slate-500 hover:text-red-600'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {item.product_name && item.size && (
                    <ServicePricingDetail
                      segmentData={segmentPayload}
                      quantity={item.quantity}
                      isDarkMode={isDarkMode}
                    />
                  )}
                </div>
              );
            })
          )}
          {onContinue && <StepContinueFooter label="Continue to Economics" onContinue={onContinue} isDarkMode={isDarkMode} />}
        </CardContent>
      </Card>
    </section>
  );
}

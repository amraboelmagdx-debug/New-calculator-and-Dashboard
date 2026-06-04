import { useEffect, useRef } from 'react';
import { Plus, Briefcase, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ProductWorkspaceCard from './ProductWorkspaceCard';
import QuoteEmptyState from './QuoteEmptyState';

export default function StepProducts({
  embedded = false,
  isDarkMode,
  productsPricingLoading,
  selectedSection,
  setSelectedSection,
  sectionOptions,
  selectedProducts,
  setSelectedProducts,
  findCatalogProduct,
  getSegmentPayload,
  filteredProductsCatalog,
  loadProductsPricingCatalog,
  roles,
  calcData,
  results,
  standardMonthlyHours,
  buildProductTeam,
  refreshRoles,
  vendorServices,
}) {
  const catalogReloadAttempted = useRef(false);
  const showEmpty = productsPricingLoading === false && filteredProductsCatalog.length === 0;
  useEffect(() => {
    if (catalogReloadAttempted.current || productsPricingLoading) return;
    if (filteredProductsCatalog.length === 0 && loadProductsPricingCatalog) {
      catalogReloadAttempted.current = true;
      loadProductsPricingCatalog(true);
    }
  }, [productsPricingLoading, filteredProductsCatalog.length, loadProductsPricingCatalog]);

  const blankProduct = isStandalone => ({
    id: `pp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    product_name: '',
    size: 'standard',
    quantity: 1,
    team_members: [],
    vendors: [],
    risk: { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0, risk_mode: 'default' },
    margin_percent: null,
    margin_source: null,
    is_standalone: isStandalone,
  });

  const addCatalogProduct = () => {
    setSelectedProducts(prev => [...prev, blankProduct(false)]);
  };

  const addStandaloneService = () => {
    setSelectedProducts(prev => [...prev, blankProduct(true)]);
  };

  const handleChangeItem = (id, field, value) => {
    setSelectedProducts(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleChangeItemFields = (id, patch) => {
    setSelectedProducts(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleRemoveItem = id => {
    setSelectedProducts(prev => (prev.length === 1 ? prev : prev.filter(p => p.id !== id)));
  };

  const selectTriggerClass = isDarkMode
    ? 'h-8 text-xs border-neutral-700 bg-neutral-950 text-neutral-200'
    : 'h-8 text-xs border-slate-300 bg-white text-slate-700';

  const toolbar = (
    <div
      className={`flex items-center gap-2 min-h-8 ${embedded ? 'mb-2' : 'px-6 pb-4 border-b'} ${
        !embedded && (isDarkMode ? 'border-neutral-800' : 'border-slate-200')
      }`}
      data-testid="products-pricing-toolbar"
    >
      <div className="flex items-center gap-2 shrink-0">
        <Select value={selectedSection} onValueChange={setSelectedSection}>
          <SelectTrigger className={`${selectTriggerClass} min-w-[140px] max-w-[200px] w-[160px]`}>
            <SelectValue placeholder="Filter by family" />
          </SelectTrigger>
          <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
            {sectionOptions.map(section => (
              <SelectItem key={section} value={section}>
                {section === 'all' ? 'All families' : section}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 text-xs px-2.5 ${
                isDarkMode
                  ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add service
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
            <DropdownMenuItem
              onClick={addCatalogProduct}
              className={isDarkMode ? 'text-neutral-200 hover:bg-neutral-800 cursor-pointer' : 'text-slate-700 hover:bg-slate-50 cursor-pointer'}
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              From catalog
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={addStandaloneService}
              className={isDarkMode ? 'text-neutral-200 hover:bg-neutral-800 cursor-pointer' : 'text-slate-700 hover:bg-slate-50 cursor-pointer'}
            >
              <Briefcase className="w-3.5 h-3.5 mr-2" />
              Standalone service
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const cards = (
    <div className="space-y-1">
      {showEmpty ? (
        <QuoteEmptyState
          title="Pick a service from your catalog"
          description="Connect pricing data or load a saved template to get started."
          isDarkMode={isDarkMode}
        />
      ) : (
        selectedProducts.map(item => (
          <ProductWorkspaceCard
            key={item.id}
            item={item}
            isDarkMode={isDarkMode}
            filteredProductsCatalog={filteredProductsCatalog}
            findCatalogProduct={findCatalogProduct}
            getSegmentPayload={getSegmentPayload}
            onChangeItem={handleChangeItem}
            onChangeItemFields={handleChangeItemFields}
            onRemove={() => handleRemoveItem(item.id)}
            roles={roles || []}
            calcData={calcData}
            results={results}
            standardMonthlyHours={standardMonthlyHours}
            buildProductTeam={buildProductTeam}
            refreshRoles={refreshRoles}
            vendorServices={vendorServices}
          />
        ))
      )}
    </div>
  );

  if (embedded) {
    return (
      <div id="products" data-testid="products-section-embedded">
        {toolbar}
        {cards}
      </div>
    );
  }

  return (
    <section id="products" className="animate-fade-in quote-panel-enter">
      <Card className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Products pricing builder
          </CardTitle>
          <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>
            Select service, segment, and quantity.
          </CardDescription>
        </CardHeader>
        {toolbar}
        <CardContent className="pt-4">{cards}</CardContent>
      </Card>
    </section>
  );
}

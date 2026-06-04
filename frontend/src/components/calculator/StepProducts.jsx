import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ProductWorkspaceCard from './ProductWorkspaceCard';
import QuoteEmptyState from './QuoteEmptyState';
import AddServiceDialog from './AddServiceDialog';
import { getRecentServices, recordRecentService } from '@/lib/recentServices';
import { resolveTierForProduct } from '@/lib/opportunityScope';

const isBlankRow = row => !row.is_standalone && !row.product_name && (row.team_members || []).length === 0;

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
  scopeTemplates = [],
  onAddTemplateProducts,
}) {
  const catalogReloadAttempted = useRef(false);
  const [addOpen, setAddOpen] = useState(false);
  const [recentServices, setRecentServices] = useState(() => getRecentServices());
  const visibleProducts = selectedProducts.filter(p => !p.vendor_only);
  const showEmpty = !visibleProducts.length;
  useEffect(() => {
    if (catalogReloadAttempted.current || productsPricingLoading) return;
    if (filteredProductsCatalog.length === 0 && loadProductsPricingCatalog) {
      catalogReloadAttempted.current = true;
      loadProductsPricingCatalog(true);
    }
  }, [productsPricingLoading, filteredProductsCatalog.length, loadProductsPricingCatalog]);

  const newRow = patch => ({
    id: `pp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    product_name: '',
    size: 'standard',
    quantity: 1,
    team_members: [],
    vendors: [],
    risk: { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0, risk_mode: 'default' },
    margin_percent: null,
    margin_source: null,
    is_standalone: false,
    ...patch,
  });

  const appendRow = row => setSelectedProducts(prev => [...prev.filter(p => !isBlankRow(p)), row]);

  const addFromCatalog = serviceName => {
    const product = findCatalogProduct?.(serviceName);
    const tier = resolveTierForProduct(product, 'standard');
    const { members } = buildProductTeam?.(serviceName, tier, 1) || { members: [] };
    appendRow(
      newRow({
        product_name: serviceName,
        size: tier,
        team_members: members,
        team_source: 'sheet',
        team_edited: false,
        team_qty_basis: 1,
      })
    );
    setRecentServices(recordRecentService(serviceName));
  };

  const addStandaloneService = () => {
    appendRow(newRow({ is_standalone: true }));
  };

  const handleChangeItem = (id, field, value) => {
    setSelectedProducts(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleChangeItemFields = (id, patch) => {
    setSelectedProducts(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleRemoveItem = id => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id));
  };

  const productCount = visibleProducts.filter(p => p.is_standalone || p.product_name).length;

  const toolbar = (
    <div
      className={`flex items-center justify-between gap-2 min-h-8 ${embedded ? 'mb-2' : 'px-6 pb-4 border-b'} ${
        !embedded && (isDarkMode ? 'border-neutral-800' : 'border-slate-200')
      }`}
      data-testid="products-pricing-toolbar"
    >
      <span className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
        {productCount} service{productCount === 1 ? '' : 's'}
      </span>
      <Button
        size="sm"
        onClick={() => setAddOpen(true)}
        className={`h-8 text-xs px-3 font-semibold ${
          isDarkMode ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
        data-testid="add-service-btn"
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Add service
      </Button>
    </div>
  );

  const cards = (
    <div className="space-y-1">
      {showEmpty ? (
        <QuoteEmptyState
          title="No services yet"
          description="Click Add service to pick from your catalog, reuse a template, or build a standalone line."
          actionLabel="Add service"
          onAction={() => setAddOpen(true)}
          isDarkMode={isDarkMode}
        />
      ) : (
        visibleProducts.map(item => (
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
          />
        ))
      )}
    </div>
  );

  const addServiceDialog = (
    <AddServiceDialog
      open={addOpen}
      onOpenChange={setAddOpen}
      isDarkMode={isDarkMode}
      filteredProductsCatalog={filteredProductsCatalog}
      selectedSection={selectedSection}
      setSelectedSection={setSelectedSection}
      sectionOptions={sectionOptions}
      recentServices={recentServices}
      onSelectCatalog={addFromCatalog}
      onSelectStandalone={addStandaloneService}
      scopeTemplates={scopeTemplates}
      onSelectTemplate={onAddTemplateProducts}
    />
  );

  if (embedded) {
    return (
      <div id="products" data-testid="products-section-embedded">
        {toolbar}
        {cards}
        {addServiceDialog}
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
      {addServiceDialog}
    </section>
  );
}

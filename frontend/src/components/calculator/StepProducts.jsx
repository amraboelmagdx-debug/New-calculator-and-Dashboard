import { useEffect, useRef, useState } from 'react';
import { Plus, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ProductWorkspaceCard from './ProductWorkspaceCard';
import QuoteEmptyState from './QuoteEmptyState';
import AddServiceDialog from './AddServiceDialog';
import { getRecentServices, recordRecentService } from '@/lib/recentServices';
import { resolveTierForProduct } from '@/lib/opportunityScope';
import {
  getPortfolioCardUi,
  syncPortfolioUiForIds,
  isPortfolioFullyCollapsed,
  isPortfolioFullyExpandedSummary,
  collapseCardUi,
  expandCardUiSummary,
  closePanel,
} from '@/lib/portfolioCardUi';

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
  const [portfolioUi, setPortfolioUi] = useState({});
  const visibleProducts = selectedProducts.filter(p => !p.vendor_only);
  const visibleIdsKey = visibleProducts
    .map(p => p.id)
    .sort()
    .join('|');

  useEffect(() => {
    const ids = visibleIdsKey ? visibleIdsKey.split('|') : [];
    setPortfolioUi(prev => syncPortfolioUiForIds(prev, ids));
  }, [visibleIdsKey]);
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
  const allCollapsed = productCount > 0 && isPortfolioFullyCollapsed(portfolioUi, visibleProducts);
  const allExpandedSummary =
    productCount > 0 && isPortfolioFullyExpandedSummary(portfolioUi, visibleProducts);

  const collapseAll = () => {
    setPortfolioUi(prev => {
      const next = { ...prev };
      visibleProducts.forEach(p => {
        next[p.id] = collapseCardUi();
      });
      return next;
    });
  };

  const expandAll = () => {
    setPortfolioUi(prev => {
      const next = { ...prev };
      visibleProducts.forEach(p => {
        next[p.id] = expandCardUiSummary();
      });
      return next;
    });
  };

  const toggleCardOpen = id => {
    setPortfolioUi(prev => {
      const cur = getPortfolioCardUi(prev, id);
      if (!cur.isOpen) {
        return { ...prev, [id]: { ...cur, isOpen: true } };
      }
      return { ...prev, [id]: collapseCardUi() };
    });
  };

  const setCardPanel = (id, panel) => {
    setPortfolioUi(prev => {
      const cur = getPortfolioCardUi(prev, id);
      if (panel == null) {
        return { ...prev, [id]: closePanel({ ...cur, isOpen: true }) };
      }
      return {
        ...prev,
        [id]: {
          isOpen: true,
          panel,
          teamEditorsOpen: panel === 'team' ? cur.teamEditorsOpen : false,
        },
      };
    });
  };

  const setTeamEditorsOpen = (id, teamEditorsOpen) => {
    setPortfolioUi(prev => {
      const cur = getPortfolioCardUi(prev, id);
      return { ...prev, [id]: { ...cur, teamEditorsOpen } };
    });
  };

  const toolbar = (
    <div
      className={`flex items-center justify-between gap-2 min-h-8 ${embedded ? 'mb-2' : 'px-6 pb-4 border-b'} ${
        !embedded && (isDarkMode ? 'border-neutral-800' : 'border-slate-200')
      }`}
      data-testid="products-pricing-toolbar"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
          {productCount} service{productCount === 1 ? '' : 's'}
        </span>
        {productCount > 0 && (
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={allExpandedSummary}
              onClick={expandAll}
              className={`h-7 px-2 text-[11px] ${
                isDarkMode ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Show full metrics on every service (no Team/Risk panels)"
              data-testid="portfolio-expand-all"
            >
              <ChevronsUpDown className="w-3.5 h-3.5 mr-1" />
              Expand rows
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={allCollapsed}
              onClick={collapseAll}
              className={`h-7 px-2 text-[11px] ${
                isDarkMode ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Collapse every service row and close all panels"
              data-testid="portfolio-collapse-all"
            >
              <ChevronsDownUp className="w-3.5 h-3.5 mr-1" />
              Collapse rows
            </Button>
          </div>
        )}
      </div>
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
        visibleProducts.map(item => {
          const ui = getPortfolioCardUi(portfolioUi, item.id);
          return (
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
              isOpen={ui.isOpen}
              openSection={ui.panel}
              teamEditorsOpen={ui.teamEditorsOpen}
              onToggleCardOpen={() => toggleCardOpen(item.id)}
              onOpenSectionChange={panel => setCardPanel(item.id, panel)}
              onTeamEditorsOpenChange={open => setTeamEditorsOpen(item.id, open)}
            />
          );
        })
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

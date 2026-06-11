import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Plus, Trash2, Settings, FileText, ChevronDown, ChevronRight,
  Users, Truck, AlertTriangle, TrendingUp, DollarSign, Clock,
  Briefcase, User, Building2, CreditCard, Target, Shield, Zap,
  LayoutTemplate, Calculator as CalcIcon, Download, Sun, Moon, Save, BarChart3, Pencil
} from 'lucide-react';

import {
  getRoles,
  getVendorServices,
  getVendorGroupTemplates,
  saveVendorGroupTemplate,
  deleteVendorGroupTemplate,
  getProductTemplates,
  getScopeTemplates,
  createScopeTemplate,
  updateScopeTemplate,
  deleteScopeTemplate,
  getPaymentTerms,
  getRiskMultipliers,
  calculateSimple,
  setAdminPassword,
  getThemeSettings,
  getHRConfig,
  fetchProductsPricing,
  lookupOpportunityById,
  quickCreateVendorService,
  deleteVendorService,
} from '@/lib/api';
import {
  enrichScopeItemsWithCatalog,
  parseScopeText,
  findExistingProductIndex,
  normalizeTierKeyOrDefault,
  resolveCatalogProduct,
  resolveSegmentPayload,
  resolveTierForProduct,
  getSegmentPayload as getCatalogSegmentPayload,
} from '@/lib/opportunityScope';

import VendorRow from '@/components/VendorRow';
import ExportPDF from '@/components/ExportPDF';
import ExportCenter from '@/components/ExportCenter';
import QuoteHealthStrip from '@/components/calculator/QuoteHealthStrip';
import InsightRail from '@/components/calculator/InsightRail';
import InsightSheet from '@/components/calculator/InsightSheet';
import DealStepper from '@/components/calculator/DealStepper';
import BottomNav from '@/components/calculator/BottomNav';
import TemplatePanel from '@/components/calculator/TemplatePanel';
import DataSourcesStatus from '@/components/calculator/DataSourcesStatus';
import StepFrame from '@/components/calculator/StepFrame';
import OpportunityScopeConfirmDialog from '@/components/calculator/OpportunityScopeConfirmDialog';
import StepCompose from '@/components/calculator/StepCompose';
import ResourcesWorkspace from '@/components/calculator/ResourcesWorkspace';
import AddonsWorkspace from '@/components/calculator/AddonsWorkspace';
import StepReview from '@/components/calculator/StepReview';
import { DEAL_STEPS, dealStepToPrimarySection, sectionIdToDealStep } from '@/components/calculator/quoteSteps';
import { useQuoteWorkflow } from '@/hooks/useQuoteCalculator';
import {
  formatCurrency,
  getStandardMonthlyHours,
  utilizationFromHours,
} from '@/lib/utils';
import {
  buildProductOwnedLinesForApi,
  MARGIN_MODES,
  shouldAutoSyncTeamFromSegment,
  normalizeExecutionMode,
  EXECUTION_HYBRID,
  sellingFromCostAndMargin,
} from '@/lib/marginEngine';
import { buildSheetTeamMembers } from '@/lib/roleMatching';
import { collectPreferredVendors } from '@/lib/vendorRegistry';

function createOpportunityProductRow(product_name, size, quantity, entryIdx, isStandalone = false) {
  return {
    id: `pp-opp-${Date.now()}-${entryIdx}-${Math.random().toString(36).slice(2, 6)}`,
    product_name,
    size: normalizeTierKeyOrDefault(size),
    quantity: Math.max(1, Math.floor(Number(quantity)) || 1),
    team_members: [],
    vendors: [],
    risk: { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0, risk_mode: 'default' },
    margin_percent: null,
    margin_source: null,
    is_standalone: isStandalone,
    source: 'opportunity',
  };
}

function applyScopeEntriesToProducts(prev, entries) {
  let addedRows = 0;
  let mergedRows = 0;
  const next = prev.map(row => ({ ...row }));

  entries.forEach(({ product_name, size, quantity, is_standalone }, entryIdx) => {
    if (!product_name) return;
    const qty = Math.max(1, Math.floor(Number(quantity)) || 1);
    const tier = normalizeTierKeyOrDefault(size);
    if (is_standalone) {
      next.push(createOpportunityProductRow(product_name, tier, qty, entryIdx, true));
      addedRows += 1;
      return;
    }
    const existingIdx = findExistingProductIndex(next, product_name, tier);
    if (existingIdx >= 0) {
      const existing = next[existingIdx];
      const current = Math.max(1, Number(existing.quantity) || 1);
      next[existingIdx] = {
        ...existing,
        quantity: current + qty,
      };
      mergedRows += 1;
    } else {
      next.push(createOpportunityProductRow(product_name, tier, qty, entryIdx));
      addedRows += 1;
    }
  });

  return { next, addedRows, mergedRows };
}

const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || '';

export default function Calculator() {
  const navigate = useNavigate();
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Data states
  const [roles, setRoles] = useState([]);
  const [vendorServices, setVendorServices] = useState([]);
  const [scopeTemplates, setScopeTemplates] = useState([]);
  const [productsPricingCatalog, setProductsPricingCatalog] = useState([]);
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productsPricingLoading, setProductsPricingLoading] = useState(false);
  const [productsPricingSyncedAt, setProductsPricingSyncedAt] = useState(null);
  const [productsPricingStale, setProductsPricingStale] = useState(false);
  const [sheetPriceFloorWarning, setSheetPriceFloorWarning] = useState(null);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [themeSettings, setThemeSettings] = useState({ company_name: 'ZAN', logo_url: '' });
  const [hrConfig, setHrConfig] = useState({
    weeks_per_month: 4,
    work_days_per_week: 5,
    hours_per_work_day: 8,
  });
  const standardMonthlyHours = useMemo(
    () => getStandardMonthlyHours(hrConfig),
    [hrConfig.weeks_per_month, hrConfig.work_days_per_week, hrConfig.hours_per_work_day]
  );
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  
  // Project Info
  const [projectInfo, setProjectInfo] = useState({
    opportunity_id: '',
    client_name: '',
    project_name: '',
    sales_owner: '',
    opportunity_source: '',
    payment_term_id: '',
    opportunity_scope_raw: '',
    opportunity_scope_items: [],
    opportunity_loaded: false,
  });
  const [opportunityLoading, setOpportunityLoading] = useState(false);
  const [opportunityLoadError, setOpportunityLoadError] = useState('');
  const [opportunityLoadSuccess, setOpportunityLoadSuccess] = useState('');
  const [scopeConfirmOpen, setScopeConfirmOpen] = useState(false);

  // Calculator Data
  const [calcData, setCalcData] = useState({
    team_members: [],
    vendors: [],
    target_margin_percent: 30,
    internal_margin_percent: 30,
    vendor_margin_percent: 15,
    use_split_margins: false,
    margin_mode: 'unified',
    internal_risk: { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0 },
    vendor_risk: { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0 },
    client_type: 'new',
    lead_source: 'direct'
  });
  
  const [results, setResults] = useState(null);
  const [previewSelling, setPreviewSelling] = useState(null);
  const belowFloorToastRef = useRef(false); // de-dupe the below-floor approval toast across recalcs
  const [activeDealStep, setActiveDealStep] = useState('frame');
  const [expandAllSections, setExpandAllSections] = useState(false);
  const [mobileInsightOpen, setMobileInsightOpen] = useState(false);
  const [isLg, setIsLg] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );

  const quoteCtx = useMemo(
    () => ({ projectInfo, selectedProducts, calcData, results }),
    [projectInfo, selectedProducts, calcData, results]
  );
  const { readiness, stepCompletion } = useQuoteWorkflow(quoteCtx);

  // Aggregate team + vendors from all products for export
  // (product-scoped team/vendors live on selectedProducts[], not on global calcData)
  const exportData = useMemo(() => {
    const productTeam = (selectedProducts || []).flatMap(p =>
      (p.team_members || []).map(tm => ({ ...tm, _product: p.product_name }))
    );
    const productVendors = (selectedProducts || []).flatMap(p =>
      (p.vendors || []).map(v => ({ ...v, _product: p.product_name }))
    );
    const allTeam = [...(calcData.team_members || []), ...productTeam];
    const allVendors = [...(calcData.vendors || []), ...productVendors];
    if (allTeam.length === 0 && allVendors.length === 0) return calcData;
    return { ...calcData, team_members: allTeam, vendors: allVendors };
  }, [selectedProducts, calcData]);

  // Save Template Dialog State
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateDialogMode, setTemplateDialogMode] = useState('create'); // 'create' | 'edit'
  const [activeTemplateId, setActiveTemplateId] = useState('');
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [preferredVendors, setPreferredVendors] = useState([]);
  const [vendorGroupTemplates, setVendorGroupTemplates] = useState([]);

  const hasTemplateSaveContent =
    calcData.team_members.length > 0 ||
    calcData.vendors.length > 0 ||
    selectedProducts.some(p => p.product_name && p.size);

  const buildTemplatePayload = () => {
    const savedPricingProducts = selectedProducts.filter(p => p.product_name && p.size);
    return {
      name: newTemplateName.trim(),
      description: newTemplateDescription.trim(),
      scope_type: 'standard',
      default_products: [],
      default_roles: calcData.team_members.map(tm => ({
        role_id: tm.role_id,
        role_name: tm.role_name,
        default_hours: tm.hours,
        hourly_rate: tm.hourly_rate
      })),
      default_vendors: calcData.vendors.map(v => ({
        service_name: v.service_name,
        default_markup: v.markup_percent
      })),
      default_pricing_products: savedPricingProducts.map(p => ({
        id: p.id,
        product_name: p.product_name,
        size: p.size,
        quantity: p.quantity,
        margin_percent: p.margin_percent,
        margin_source: p.margin_source,
        locked: p.locked,
        is_standalone: !!p.is_standalone,
        vendor_only: !!p.vendor_only,
        team_members: p.team_members || [],
        team_source: p.team_source,
        team_edited: p.team_edited,
        vendors: (p.vendors || []).map(v => ({
          id: v.id,
          preset_id: v.preset_id ?? null,
          service_id: v.service_id ?? '',
          service_name: v.service_name ?? '',
          cost: Number(v.cost) || 0,
          quantity: Number(v.quantity) || 1,
          markup_percent: Number(v.markup_percent) || 0,
          is_group: !!v.is_group,
          sub_items: (v.sub_items || []).map(si => ({
            id: si.id,
            name: si.name ?? '',
            cost: Number(si.cost) || 0,
            quantity: Number(si.quantity) || 1,
            unit: si.unit ?? '',
            markup_percent: Number(si.markup_percent) || 0,
          })),
          ...(v.risk ? { risk: v.risk } : {}),
        })),
        risk: p.risk || null,
      })),
      preferred_vendors: collectPreferredVendors(selectedProducts),
      margin_mode: calcData.margin_mode || 'unified',
      target_margin_percent: calcData.target_margin_percent,
      internal_margin_percent: calcData.internal_margin_percent,
      vendor_margin_percent: calcData.vendor_margin_percent,
      use_split_margins: calcData.use_split_margins,
    };
  };

  const openCreateTemplateDialog = () => {
    setTemplateDialogMode('create');
    setNewTemplateName('');
    setNewTemplateDescription('');
    setSaveTemplateDialogOpen(true);
  };

  const openEditTemplateDialog = () => {
    const template = scopeTemplates.find(t => t.id === activeTemplateId);
    if (!template) {
      toast.error('اختر قالباً أولاً');
      return;
    }
    setTemplateDialogMode('edit');
    setNewTemplateName(template.name || '');
    setNewTemplateDescription(template.description || '');
    setSaveTemplateDialogOpen(true);
  };

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesResult, vendorsData, scopesData, termsData, themeData, hrData, vendorGroupTplData] = await Promise.all([
        getRoles(true),
        getVendorServices(),
        getScopeTemplates(),
        getPaymentTerms(),
        getThemeSettings().catch(() => ({ company_name: 'ZAN', logo_url: '' })),
        getHRConfig().catch(() => ({
          weeks_per_month: 4,
          work_days_per_week: 5,
          hours_per_work_day: 8,
        })),
        getVendorGroupTemplates().catch(() => []),
      ]);

      const rolesList = Array.isArray(rolesResult) ? rolesResult : rolesResult.roles;
      setRoles(rolesList || []);
      if (!Array.isArray(rolesResult) && rolesResult.stale) {
        toast.warning(rolesResult.warning || 'Roles data may be stale — refresh from Admin when available.');
      }
      setVendorServices(vendorsData);
      setVendorGroupTemplates(Array.isArray(vendorGroupTplData) ? vendorGroupTplData : []);
      setScopeTemplates(scopesData);
      setPaymentTerms(termsData);
      setThemeSettings(themeData);
      setHrConfig({
        weeks_per_month: hrData.weeks_per_month ?? 4,
        work_days_per_week: hrData.work_days_per_week ?? 5,
        hours_per_work_day: hrData.hours_per_work_day ?? 8,
      });
      await loadProductsPricingCatalog();
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadProductsPricingCatalog = async (forceRefresh = false) => {
    try {
      setProductsPricingLoading(true);
      const result = await fetchProductsPricing(forceRefresh);
      if (result?.status === 'success' || result?.status === 'stale') {
        setProductsPricingCatalog(result.data || []);
        setProductsPricingSyncedAt(result.synced_at || new Date().toISOString());
        setProductsPricingStale(result.status === 'stale');
        if (result.status === 'stale') {
          toast.warning(result?.message || 'Using cached pricing — sheet sync failed');
        } else if (forceRefresh) {
          const synced = result.synced ?? result.count ?? result.data?.length ?? 0;
          toast.success(`Synced ${synced} service groups from Google Sheet`);
        }
      } else {
        if (!productsPricingCatalog?.length) {
          setProductsPricingCatalog([]);
        }
        if (forceRefresh) {
          toast.error(result?.message || 'Failed to sync products pricing');
        }
      }
    } catch {
      if (!productsPricingCatalog?.length) {
        setProductsPricingCatalog([]);
      }
      if (forceRefresh) toast.error('Failed to refresh sheet');
    } finally {
      setProductsPricingLoading(false);
    }
  };

  const catalogLookupOptions = useMemo(
    () => (selectedSection !== 'all' ? { familyHint: selectedSection } : {}),
    [selectedSection]
  );

  const findCatalogProduct = useCallback(
    (serviceName) =>
      resolveCatalogProduct(productsPricingCatalog, serviceName, catalogLookupOptions),
    [productsPricingCatalog, catalogLookupOptions]
  );

  const getSegmentPayload = useCallback(
    (product, segment) => getCatalogSegmentPayload(product, segment),
    []
  );

  const getSheetMinimumTotal = useCallback(() => {
    let sum = 0;
    selectedProducts.forEach(item => {
      if (!item.product_name || !item.size) return;
      const product = findCatalogProduct(item.product_name);
      const seg = getSegmentPayload(product, item.size);
      if (!seg) return;
      const qty = Number(item.quantity) || 1;
      sum += (Number(seg.base_minimum_selling_price) || 0) * qty;
    });
    return sum;
  }, [selectedProducts, findCatalogProduct, getSegmentPayload]);

  const sheetMinSellingTotal = useMemo(
    () => getSheetMinimumTotal(),
    [getSheetMinimumTotal]
  );

  // Scoped: build suggested team members for ONE product (used by ProductWorkspaceCard
  // on service select). Returns members tagged source:'sheet', fully editable after.
  const buildProductTeam = useCallback((productName, size, quantity) => {
    const product = findCatalogProduct(productName);
    if (!product) {
      return { members: [], error: 'service_not_found', resolvedTier: null };
    }

    const { segment: seg, resolvedTierKey } = resolveSegmentPayload(product, size);
    if (!seg) {
      return { members: [], error: 'tier_not_found', resolvedTier: null };
    }
    if (!shouldAutoSyncTeamFromSegment(seg)) {
      return { members: [], error: 'all_in_package', resolvedTier: resolvedTierKey };
    }

    const mode = normalizeExecutionMode(seg.execution_mode, seg);
    const roleList = seg?.internal_roles?.length
      ? seg.internal_roles
      : (product?.sizes?.[resolvedTierKey] || []);
    if (!roleList.length) {
      return { members: [], error: 'no_roles', resolvedTier: resolvedTierKey };
    }

    const qty = Number(quantity) || 1;
    const isHybrid = mode === EXECUTION_HYBRID;
    const { members, unmatchedRoles, sheetRoleCount } = buildSheetTeamMembers(roleList, roles, {
      quantity: qty,
      hybridMode: isHybrid,
      hybridContext: EXECUTION_HYBRID,
      utilizationFromHours: h => utilizationFromHours(h, standardMonthlyHours),
    });

    if (!members.length) {
      return {
        members: [],
        error: 'no_roles',
        resolvedTier: resolvedTierKey,
        unmatchedRoles,
        sheetRoleCount: 0,
      };
    }

    const linkedCount = members.filter(m => m.hr_linked).length;
    if (linkedCount === 0) {
      return {
        members,
        error: 'roles_unmatched',
        resolvedTier: resolvedTierKey,
        unmatchedRoles,
        sheetRoleCount,
      };
    }

    return {
      members,
      error: null,
      resolvedTier: resolvedTierKey,
      unmatchedRoles,
      sheetRoleCount,
    };
  }, [findCatalogProduct, roles, standardMonthlyHours]);

  // Add an add-on as a child product line under a parent service. An add-on is a
  // full priced line (own team / tier / risk / margin) tagged with parent_id so the
  // UI can nest it and analytics/exports can group it. It is inserted immediately
  // after its parent so the portfolio order stays readable.
  const handleAddAddon = useCallback((parentLineId, addonName, tier) => {
    const product = findCatalogProduct(addonName);
    const resolvedTier = tier || resolveTierForProduct(product, 'standard');
    const { members } = buildProductTeam(addonName, resolvedTier, 1) || { members: [] };
    const addonRow = {
      id: `pp-addon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      product_name: addonName,
      size: resolvedTier,
      quantity: 1,
      team_members: members,
      team_source: 'sheet',
      team_edited: false,
      team_qty_basis: 1,
      vendors: [],
      risk: { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0, risk_mode: 'default' },
      margin_percent: null,
      margin_source: null,
      is_standalone: false,
      is_addon: true,
      parent_id: parentLineId || null,
    };
    setSelectedProducts(prev => {
      if (!parentLineId) {
        // Unlinked / standalone — append to end
        return [...prev, addonRow];
      }
      const idx = prev.findIndex(p => p.id === parentLineId);
      if (idx < 0) return [...prev, addonRow];
      // Insert after the parent and any add-ons it already has, so siblings stay grouped.
      let insertAt = idx + 1;
      while (insertAt < prev.length && prev[insertAt].parent_id === parentLineId) insertAt += 1;
      return [...prev.slice(0, insertAt), addonRow, ...prev.slice(insertAt)];
    });
  }, [findCatalogProduct, buildProductTeam]);

  const validProductCount = useMemo(
    () =>
      selectedProducts.filter(
        p => !p.vendor_only && !p.is_addon && p.product_name && p.size && (Number(p.quantity) || 0) > 0
      ).length,
    [selectedProducts]
  );

  const productTeamMemberCount = useMemo(
    () =>
      selectedProducts.reduce(
        (sum, p) => sum + (Array.isArray(p.team_members) ? p.team_members.length : 0),
        0
      ),
    [selectedProducts]
  );

  const sectionOptions = ['all', ...Array.from(new Set((productsPricingCatalog || []).map(
    p => p.service_family || p.section_name || 'General'
  )))];
  const filteredProductsCatalog = selectedSection === 'all'
    ? productsPricingCatalog
    : productsPricingCatalog.filter(
        p => (p.service_family || p.section_name || 'General') === selectedSection
      );

  const handleUpdateProductRisk = useCallback((productId, riskField, value) => {
    setSelectedProducts(prev =>
      prev.map(item =>
        item.id === productId
          ? { ...item, risk: { ...(item.risk || { complexity: 'none', rush: 'none', execution: 'none' }), [riskField]: value } }
          : item
      )
    );
  }, []);

  // Calculate pricing
  const handleCalculate = useCallback(async () => {
    // Product-owned model: each product carries its own team / vendors / risk / margin.
    const productOwnedLines = buildProductOwnedLinesForApi(
      selectedProducts,
      findCatalogProduct,
      getSegmentPayload,
      calcData
    );
    const hasProductLines = productOwnedLines.length > 0;
    const hasLaborOrVendors =
      calcData.team_members.length > 0 || calcData.vendors.length > 0;

    if (!hasLaborOrVendors && !hasProductLines) {
      setResults(null);
      return;
    }

    setCalculating(true);
    try {
      const payload = {
        ...calcData,
        // Product-owned quotes price per line via granular mode; the global team/vendor
        // buckets are emptied so totals roll up purely from the lines (no double-count).
        margin_mode: hasProductLines ? MARGIN_MODES.GRANULAR : (calcData.margin_mode || MARGIN_MODES.UNIFIED),
        product_lines: hasProductLines ? productOwnedLines : [],
        team_members: hasProductLines ? [] : calcData.team_members,
        vendors: hasProductLines ? [] : calcData.vendors,
      };
      const result = await calculateSimple(payload);
      
      // Add financing cost if payment term selected
      if (projectInfo.payment_term_id) {
        const term = paymentTerms.find(t => t.id === projectInfo.payment_term_id);
        const uncoveredPercent = term?.uncovered_percent ?? Math.max(0, 100 - (term?.advance_percent ?? 0));
        if (term && uncoveredPercent > 0) {
          const sellingPrice = result.selling_price;
          const uncoveredAmount = sellingPrice * (uncoveredPercent / 100);
          const rawInterestRate = term.interest_rate ?? 0.08;
          const annualInterestRate = rawInterestRate > 1 ? rawInterestRate / 100 : rawInterestRate;
          const days = term.days_to_payment ?? term.payment_days ?? 30;
          const financingCost = uncoveredAmount * annualInterestRate * (days / 365);
          result.financing_cost = Math.round(financingCost * 100) / 100;
          result.contribution_margin -= financingCost;
          result.contribution_margin_percent = (result.contribution_margin / result.selling_price * 100);
        }
      }
      
      setResults(result);
      setPreviewSelling(null); // clear local preview — real result is now in

      const sheetFloor = getSheetMinimumTotal();
      // Only a deliberate margin reduction can price below the floor now (risk is additive).
      const approvalLines = (result.margin_breakdown?.products || []).filter(p => p.needs_approval);
      if (sheetFloor > 0 && result.selling_price < sheetFloor) {
        setSheetPriceFloorWarning({
          selling: result.selling_price,
          floor: sheetFloor,
          gap: sheetFloor - result.selling_price,
        });
        // Toast once on entering the below-floor state — the header badge + Review approvals
        // section keep it visible afterwards, so we don't re-toast on every recalc.
        if (approvalLines.length > 0 && !belowFloorToastRef.current) {
          const names = approvalLines.map(p => p.product_name).filter(Boolean).join('، ');
          toast.warning(
            `${approvalLines.length} ${approvalLines.length === 1 ? 'service is' : 'services are'} priced below the floor — needs approval${names ? `: ${names}` : ''}`
          );
        }
        belowFloorToastRef.current = true;
      } else {
        setSheetPriceFloorWarning(null);
        belowFloorToastRef.current = false;
      }
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Calculation failed');
      setSheetPriceFloorWarning(null);
    } finally {
      setCalculating(false);
    }
  }, [calcData, projectInfo.payment_term_id, paymentTerms, selectedProducts, productsPricingCatalog]);

  // Instant local preview when a product's margin slider moves (before API responds)
  const handleMarginPreview = useCallback((productId, newMargin) => {
    if (!results) return;
    const lines = results.margin_breakdown?.products || [];
    const targetLine = lines.find(l => l.id === productId);
    if (!targetLine) return;
    // Additive risk model: margin applies to internal (labor+overhead) only; vendor revenue is
    // additive; service risk is a premium on top; the margin slider = custom margin (no floor clamp).
    const riskMult = Number(targetLine.risk_multiplier) || 1;
    const globalMult = Number(results.margin_breakdown?.global_risk_multiplier) || 1;
    const vendorRev = Number(targetLine.vendor_revenue) || 0;
    const internalCost = targetLine.internal_cost != null
      ? Number(targetLine.internal_cost)
      : Math.max(0, (Number(targetLine.cost) || 0) - (Number(targetLine.vendor_cost) || 0));
    const newInternalSellNoRisk = sellingFromCostAndMargin(internalCost, newMargin);
    const oldInternalSellNoRisk = sellingFromCostAndMargin(internalCost, Number(targetLine.margin_percent) || 0);
    const newProductSelling = newInternalSellNoRisk + vendorRev + newInternalSellNoRisk * (riskMult - 1);
    const oldProductSelling = Number(targetLine.selling) || 0;
    // Global Quote-Controls risk premium scales with each line's internal selling.
    const globalDelta = (newInternalSellNoRisk - oldInternalSellNoRisk) * (globalMult - 1);
    const currentTotal = Number(results.selling_price) || 0;
    setPreviewSelling(currentTotal - oldProductSelling + newProductSelling + globalDelta);
  }, [results]);

  // Auto-calculate on data change
  useEffect(() => {
    const timer = setTimeout(() => {
      handleCalculate();
    }, 300);
    return () => clearTimeout(timer);
  }, [handleCalculate]);

  // Deal-level vendors (calcData.vendors) are retained for backward compatibility only.
  // Vendors are now managed per product line via the Resources workspace.

  // Restore saved pricing products (team/vendors/risk/margin) from a template payload.
  const restorePricingProducts = useCallback(
    (pricingProducts, { regenerateIds = false } = {}) =>
      (pricingProducts || []).map((p, idx) => {
        const base = {
          id: regenerateIds || !p.id ? `pp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}` : p.id,
          product_name: p.product_name || '',
          size: p.size || 'standard',
          quantity: Math.max(1, Number(p.quantity) || 1),
          margin_percent: p.margin_percent ?? null,
          margin_source: p.margin_source ?? null,
          locked: p.locked,
          is_standalone: !!p.is_standalone,
          vendor_only: !!p.vendor_only,
          vendors: Array.isArray(p.vendors) ? p.vendors.map(v => ({ ...v })) : [],
          risk: p.risk || { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0, risk_mode: 'default' },
        };
        if (Array.isArray(p.team_members) && p.team_members.length) {
          base.team_members = p.team_members.map(tm => ({ ...tm }));
          base.team_source = p.team_source || 'manual';
          base.team_edited = p.team_edited ?? true;
          base.team_qty_basis = p.team_qty_basis ?? base.quantity;
        } else if (!base.is_standalone && base.product_name) {
          const { members } = buildProductTeam(base.product_name, base.size, base.quantity);
          base.team_members = members;
          base.team_source = 'sheet';
          base.team_edited = false;
          base.team_qty_basis = base.quantity;
        } else {
          base.team_members = [];
        }
        return base;
      }),
    [buildProductTeam]
  );

  // Append a template's products (with team/vendors/risk) to the current quote.
  const addScopeTemplateProducts = useCallback(
    (templateId) => {
      const template = scopeTemplates.find(t => t.id === templateId);
      if (!template) return;
      const pricingProducts = template.default_pricing_products || [];
      if (!pricingProducts.length) {
        toast.info('This template has no products to add');
        return;
      }
      const restored = restorePricingProducts(pricingProducts, { regenerateIds: true });
      setSelectedProducts(prev => [...prev.filter(p => p.is_standalone || p.product_name), ...restored]);
      toast.success(`Added ${restored.length} product${restored.length === 1 ? '' : 's'} from ${template.name}`);
    },
    [scopeTemplates, restorePricingProducts]
  );

  // Load scope template
  const loadScopeTemplate = async (templateId) => {
    const template = scopeTemplates.find(t => t.id === templateId);
    if (!template) return;
    setActiveTemplateId(templateId);

    try {
      let newTeamMembers = [];

      // Helper function to find best matching role
      const findBestMatchingRole = (roleRef) => {
        // First try exact ID match
        let role = roles.find(r => r.id === roleRef.role_id);
        if (role) return role;
        
        // Then try exact name match
        if (roleRef.role_name) {
          role = roles.find(r => r.name === roleRef.role_name);
          if (role) return role;
          
          // Try partial name match (case insensitive)
          role = roles.find(r => 
            r.name?.toLowerCase().includes(roleRef.role_name.toLowerCase()) ||
            roleRef.role_name.toLowerCase().includes(r.name?.toLowerCase() || '')
          );
          if (role) return role;
        }
        
        return null;
      };

      // Check if template has direct default_roles (new format from "Save as Template")
      if (template.default_roles && template.default_roles.length > 0) {
        newTeamMembers = template.default_roles.map(roleRef => {
          const role = findBestMatchingRole(roleRef);
          return {
            id: `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role_id: role?.id || '',
            role_name: role?.name || roleRef.role_name || '',
            hours: roleRef.default_hours || roleRef.hours || 0,
            hourly_rate: role?.hourly_rate || roleRef.hourly_rate || 0,
            monthly_salary: role?.total_monthly_cost || role?.monthly_salary || 0,
            utilization_percent: 0,
            duration_months: 1,
            calc_mode: 'hours',
            employee_type: 'internal'
          };
        }).filter(tm => tm.role_id); // Only include if we found a matching role
      } 
      // Otherwise resolve from default_products (legacy format)
      else if (template.default_products && template.default_products.length > 0) {
        const productTemplates = await getProductTemplates();
        const resolvedProducts = template.default_products
          .map(productId => productTemplates.find(p => p.id === productId))
          .filter(Boolean);

        // Build a map of old role IDs to find matching roles by position/type
        const roleMapping = {
          'role-1': roles.find(r => r.name?.includes('Creative Director') || r.name?.includes('مدير إبداعي')),
          'role-2': roles.find(r => r.name?.includes('Art Director') || r.name?.includes('مدير فني')),
          'role-3': roles.find(r => r.name?.includes('Designer') || r.name?.includes('مصمم')),
          'role-4': roles.find(r => r.name?.includes('Copywriter') || r.name?.includes('كاتب')),
          'role-5': roles.find(r => r.name?.includes('Senior') && r.name?.includes('Creative')),
          'role-6': roles.find(r => r.name?.includes('Account') || r.name?.includes('حساب')),
        };

        newTeamMembers = resolvedProducts.flatMap(product => 
          (product.default_roles || []).map(roleRef => {
            // Match the legacy role id to a live role by name. If nothing
            // matches, omit the line rather than guessing — a silently
            // mis-assigned role would corrupt the quote's pricing.
            const role = roleMapping[roleRef.role_id];
            if (!role) return null;
            
            return {
              id: `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role_id: role.id,
              role_name: role.name,
              hours: roleRef.default_hours || 0,
              hourly_rate: role.hourly_rate || 0,
              monthly_salary: role.total_monthly_cost || role.monthly_salary || 0,
              utilization_percent: 0,
              duration_months: 1,
              calc_mode: 'hours',
              employee_type: 'internal'
            };
          }).filter(Boolean)
        );
      }

      // Add default vendors from template
      const newVendors = (template.default_vendors || []).map(vendor => ({
        id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        service_name: vendor.service_name || '',
        service_id: '',
        cost: 0,
        markup_percent: vendor.default_markup || 15,
        risk: { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0 }
      }));

      const pricingProducts = template.default_pricing_products || [];
      if (newTeamMembers.length === 0 && newVendors.length === 0 && pricingProducts.length === 0) {
        toast.info('لم يتم العثور على وظائف مطابقة في هذا القالب');
        return;
      }

      if (pricingProducts.length > 0) {
        const restored = restorePricingProducts(pricingProducts);
        setSelectedProducts(restored);
        const firstName = restored.find(p => !p.vendor_only)?.product_name;
        if (firstName) {
          const catProduct = findCatalogProduct(firstName);
          const family = catProduct?.service_family || catProduct?.section_name;
          if (family) setSelectedSection(family);
        }
      }

      setCalcData(prev => ({
        ...prev,
        team_members: pricingProducts.length > 0
          ? (newTeamMembers.length > 0 ? newTeamMembers : [])
          : [...prev.team_members, ...newTeamMembers],
        vendors: [...prev.vendors, ...newVendors],
        margin_mode: template.margin_mode || prev.margin_mode || 'unified',
        target_margin_percent: template.target_margin_percent ?? prev.target_margin_percent,
        internal_margin_percent: template.internal_margin_percent ?? prev.internal_margin_percent,
        vendor_margin_percent: template.vendor_margin_percent ?? prev.vendor_margin_percent,
        use_split_margins: template.use_split_margins ?? prev.use_split_margins,
      }));

      // Surface preferred vendors so ResourcesWorkspace can suggest them
      if (template.preferred_vendors?.length) {
        setPreferredVendors(template.preferred_vendors);
      }

      const parts = [];
      if (pricingProducts.length > 0) parts.push(`${pricingProducts.length} منتج`);
      if (newTeamMembers.length > 0) parts.push(`${newTeamMembers.length} وظيفة`);
      toast.success(`تم تحميل القالب: ${template.name} (${parts.join('، ')})`);
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('فشل تحميل القالب');
    }
  };

  // ─── Vendor Group Template handlers ──────────────────────────────────────
  const handleSaveVendorTemplate = async (payload) => {
    try {
      const saved = await saveVendorGroupTemplate(payload);
      setVendorGroupTemplates(prev => [...prev, saved]);
      toast.success(`Vendor template "${payload.name}" saved`);
    } catch (error) {
      console.error('Error saving vendor template:', error);
      toast.error('Failed to save vendor template');
      throw error;
    }
  };

  const handleDeleteVendorTemplate = async (id) => {
    try {
      await deleteVendorGroupTemplate(id);
      setVendorGroupTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Vendor template deleted');
    } catch (error) {
      console.error('Error deleting vendor template:', error);
      toast.error('Failed to delete vendor template');
    }
  };

  const handleQuickCreateVendorService = async (name) => {
    try {
      const created = await quickCreateVendorService({ name });
      // Refresh vendor services list so the new service appears in presets
      const refreshed = await getVendorServices();
      setVendorServices(Array.isArray(refreshed) ? refreshed : []);
      toast.success(`Vendor service "${name}" created`);
      return created;
    } catch (error) {
      console.error('Error creating vendor service:', error);
      toast.error('Failed to create vendor service');
      throw error;
    }
  };

  const handleDeleteVendorService = async (id, name) => {
    try {
      setAdminPassword(ADMIN_PASSWORD);
      await deleteVendorService(id);
      const refreshed = await getVendorServices();
      setVendorServices(Array.isArray(refreshed) ? refreshed : []);
      toast.success(`Removed "${name || 'vendor'}" from catalog`);
    } catch (error) {
      console.error('Error deleting vendor service:', error);
      toast.error('Failed to remove vendor from catalog');
    }
  };

  // Save current configuration as new template
  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('يرجى إدخال اسم القالب');
      return;
    }
    if (!hasTemplateSaveContent) {
      toast.error('يرجى إضافة فريق أو موردين أو منتجات قبل حفظ القالب');
      return;
    }

    setSavingTemplate(true);
    try {
      setAdminPassword(ADMIN_PASSWORD);
      const templateData = buildTemplatePayload();
      const isEdit = templateDialogMode === 'edit' && activeTemplateId;

      if (isEdit) {
        await updateScopeTemplate(activeTemplateId, templateData);
      } else {
        const created = await createScopeTemplate(templateData);
        if (created?.id) setActiveTemplateId(created.id);
      }

      const updatedTemplates = await getScopeTemplates();
      setScopeTemplates(updatedTemplates);

      setSaveTemplateDialogOpen(false);
      setNewTemplateName('');
      setNewTemplateDescription('');

      toast.success(isEdit ? `تم تحديث القالب: ${templateData.name}` : `تم حفظ القالب: ${templateData.name}`);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(templateDialogMode === 'edit' ? 'فشل تحديث القالب' : 'فشل حفظ القالب');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!activeTemplateId) return;
    const template = scopeTemplates.find(t => t.id === activeTemplateId);
    setDeletingTemplate(true);
    try {
      setAdminPassword(ADMIN_PASSWORD);
      await deleteScopeTemplate(activeTemplateId);
      const updatedTemplates = await getScopeTemplates();
      setScopeTemplates(updatedTemplates);
      setActiveTemplateId('');
      setDeleteTemplateDialogOpen(false);
      toast.success(`تم حذف القالب: ${template?.name || ''}`);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('فشل حذف القالب');
    } finally {
      setDeletingTemplate(false);
    }
  };

  // Refresh roles from Google Sheets (via /roles when sheets enabled)
  const refreshRoles = async (forceRefresh = true) => {
    try {
      const result = await getRoles(forceRefresh);
      const rolesList = Array.isArray(result) ? result : result.roles;
      setRoles(rolesList || []);
      if (!Array.isArray(result) && result.stale) {
        toast.warning(result.warning || 'Roles data may be stale.');
      } else {
        toast.success(`Refreshed ${rolesList?.length ?? 0} roles`);
      }
    } catch {
      toast.error('Failed to refresh roles');
    }
  };

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsLg(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!projectInfo.opportunity_loaded || !projectInfo.opportunity_scope_raw) return;
    if (!productsPricingCatalog.length) return;
    setProjectInfo(prev => {
      const enriched = enrichScopeItemsWithCatalog(
        parseScopeText(prev.opportunity_scope_raw),
        productsPricingCatalog
      );
      const same =
        enriched.length === prev.opportunity_scope_items.length &&
        enriched.every(
          (item, i) =>
            item.matched === prev.opportunity_scope_items[i]?.matched &&
            item.catalog_product_name === prev.opportunity_scope_items[i]?.catalog_product_name
        );
      if (same) return prev;
      return { ...prev, opportunity_scope_items: enriched };
    });
  }, [productsPricingCatalog, projectInfo.opportunity_loaded, projectInfo.opportunity_scope_raw]);

  const handleLoadOpportunity = useCallback(async () => {
    const id = (projectInfo.opportunity_id || '').trim();
    if (!id) return;
    setOpportunityLoading(true);
    setOpportunityLoadError('');
    setOpportunityLoadSuccess('');
    try {
      const data = await lookupOpportunityById(id);
      const scopeItems = enrichScopeItemsWithCatalog(
        data.scope_items || [],
        productsPricingCatalog
      );
      setProjectInfo(prev => ({
        ...prev,
        opportunity_id: data.opportunity_id || id,
        client_name: data.client_name || '',
        project_name: data.project_name || '',
        sales_owner: data.sales_owner || '',
        opportunity_source: data.opportunity_source || '',
        opportunity_scope_raw: data.scope_raw || '',
        opportunity_scope_items: scopeItems,
        opportunity_loaded: true,
      }));
      if (data.lead_source === 'referral' || data.lead_source === 'direct') {
        setCalcData(prev => ({ ...prev, lead_source: data.lead_source }));
      }
      const matchedCount = scopeItems.filter(i => i.matched).length;
      setOpportunityLoadSuccess(
        `Loaded ${data.opportunity_id}${matchedCount ? ` · ${matchedCount} scope line(s) matched catalog` : ''}`
      );
      toast.success('Opportunity loaded from sheet');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === 'string'
          ? detail
          : err.response?.status === 404
            ? `Opportunity not found: ${id}`
            : 'Failed to load opportunity from sheet';
      setOpportunityLoadError(message);
      setProjectInfo(prev => ({
        ...prev,
        opportunity_loaded: false,
        opportunity_source: '',
        opportunity_scope_raw: '',
        opportunity_scope_items: [],
      }));
      toast.error(message);
    } finally {
      setOpportunityLoading(false);
    }
  }, [projectInfo.opportunity_id, productsPricingCatalog]);

  const mergeScopeProductsIntoSelection = useCallback(
    entries => {
      if (!entries?.length) return { addedRows: 0, mergedRows: 0 };

      let result = { addedRows: 0, mergedRows: 0 };
      setSelectedProducts(prev => {
        const applied = applyScopeEntriesToProducts(prev, entries);
        const next = applied.next.map(row => {
          if (row.is_standalone || !row.product_name) return row;
          const touched = entries.some(
            e =>
              e.product_name === row.product_name &&
              normalizeTierKeyOrDefault(e.size) === normalizeTierKeyOrDefault(row.size)
          );
          if (!touched) return row;
          const { members } = buildProductTeam(row.product_name, row.size, row.quantity);
          return {
            ...row,
            team_members: members,
            team_edited: false,
            team_source: 'sheet',
            team_qty_basis: row.quantity,
          };
        });
        result = applied;
        return next;
      });
      return result;
    },
    [buildProductTeam]
  );

  const goToDealStep = useCallback((stepId) => {
    setActiveDealStep(stepId);
    if (stepId === 'insight') {
      setMobileInsightOpen(true);
      return;
    }
    const targetId =
      stepId === 'review'
        ? 'review'
        : stepId === 'compose'
          ? 'scope'
          : dealStepToPrimarySection(stepId);
    requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const proceedToComposeStep = useCallback(() => {
    goToDealStep('compose');
  }, [goToDealStep]);

  const handleContinueFromFrame = useCallback(() => {
    const matched = (projectInfo.opportunity_scope_items || []).filter(
      i => i.matched && i.catalog_product_name
    );
    if (projectInfo.opportunity_loaded && matched.length > 0) {
      setScopeConfirmOpen(true);
      return;
    }
    proceedToComposeStep();
  }, [projectInfo.opportunity_loaded, projectInfo.opportunity_scope_items, proceedToComposeStep]);

  const handleScopeConfirmAdd = useCallback(
    (entries, meta) => {
      const { addedRows, mergedRows } = mergeScopeProductsIntoSelection(entries);
      if (addedRows > 0 || mergedRows > 0) {
        const parts = [];
        if (addedRows > 0) {
          parts.push(`added ${addedRows} product${addedRows === 1 ? '' : 's'}`);
        }
        if (mergedRows > 0) {
          parts.push(`updated quantity on ${mergedRows} existing row${mergedRows === 1 ? '' : 's'}`);
        }
        toast.success(parts.join(', '));
      }
      if (meta?.skippedLines?.length) {
        toast.warning(
          `${meta.skippedLines.length} scope line${meta.skippedLines.length === 1 ? '' : 's'} skipped — fix tiers and re-import if needed`
        );
      }
      proceedToComposeStep();
    },
    [mergeScopeProductsIntoSelection, proceedToComposeStep]
  );

  const isSectionVisible = useCallback(
    (sectionId) => {
      if (sectionId === 'vendors') {
        return activeDealStep === 'economics';
      }
      if (sectionId === 'pricing') {
        return false;
      }
      if (expandAllSections) return true;
      if (sectionId === 'review') return activeDealStep === 'review';
      if (sectionId === 'products' || sectionId === 'team') {
        return activeDealStep === 'compose';
      }
      const step = DEAL_STEPS.find(s => s.sectionIds.includes(sectionId));
      if (!step || step.id !== activeDealStep) return false;
      return true;
    },
    [expandAllSections, activeDealStep]
  );

  const showScopeWorkspace = activeDealStep === 'compose' || expandAllSections;
  const healthStripVariant = activeDealStep === 'compose' ? 'compact' : 'full';

  useEffect(() => {
    const sectionIds = ['project', 'scope', 'vendors', 'pricing', 'review'];
    const elements = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target?.id;
        if (id) {
          setActiveDealStep(id === 'scope' ? 'compose' : sectionIdToDealStep(id));
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.25, 0.5] }
    );
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [expandAllSections]);

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= 4) {
        e.preventDefault();
        goToDealStep(DEAL_STEPS[idx - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToDealStep]);

  const handleBottomNav = (tabId) => {
    if (tabId === 'insight') {
      setMobileInsightOpen(true);
      return;
    }
    if (tabId === 'more') {
      setExpandAllSections(prev => {
        toast.info(prev ? 'Focused step view' : 'Showing all sections');
        return !prev;
      });
      return;
    }
    goToDealStep(tabId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-neutral-700 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-neutral-950' : 'light-theme bg-slate-100'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 px-6 py-4 ${isDarkMode ? 'glass-header' : 'bg-white border-b border-slate-200 shadow-sm'}`} data-testid="header">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={themeSettings.logo_url || '/icons/Icon.png'}
              alt="ZAN Logo"
              className="w-10 h-10 rounded-xl object-cover"
              onError={(e) => { e.target.src = '/icons/Icon.png'; }}
            />
            <div>
              <h1 className={`text-lg font-bold whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
                ZAN Agency
              </h1>
              <p className={`text-xs whitespace-nowrap ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Pricing Command Center</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`${isDarkMode ? 'text-neutral-300 hover:text-white hover:bg-neutral-800' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'}`}
              data-testid="theme-toggle"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            
            <ExportPDF
              data={exportData}
              results={results}
              projectInfo={projectInfo}
              themeSettings={themeSettings}
              isDarkMode={isDarkMode}
              selectedProducts={selectedProducts}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className={`${isDarkMode ? 'text-neutral-300 hover:text-white hover:bg-neutral-800' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'}`}
              onClick={() => navigate('/sales-dashboard')}
              data-testid="sales-dashboard-btn"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Sales Dashboard
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`${isDarkMode ? 'text-neutral-300 hover:text-white hover:bg-neutral-800' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'}`}
              onClick={() => navigate('/admin')}
              data-testid="admin-btn"
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin
            </Button>
          </div>
        </div>
      </header>

      <QuoteHealthStrip
        results={results}
        previewSelling={previewSelling}
        calculating={calculating}
        readiness={readiness}
        isDarkMode={isDarkMode}
        sheetPriceFloorWarning={sheetPriceFloorWarning}
        variant={healthStripVariant}
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4">
        <DealStepper
          horizontal
          activeStep={activeDealStep}
          onStepClick={goToDealStep}
          stepCompletion={stepCompletion}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Main Layout */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[240px_1fr_360px] gap-6 p-4 sm:p-6 pb-32 lg:pb-6">
        <div className="hidden lg:block space-y-3">
          <DealStepper
            activeStep={activeDealStep}
            onStepClick={goToDealStep}
            stepCompletion={stepCompletion}
            isDarkMode={isDarkMode}
          />
          <TemplatePanel
            isDarkMode={isDarkMode}
            scopeTemplates={scopeTemplates}
            activeTemplateId={activeTemplateId}
            onLoadTemplate={loadScopeTemplate}
            onOpenEdit={openEditTemplateDialog}
            onOpenDelete={() => setDeleteTemplateDialogOpen(true)}
            onOpenCreate={openCreateTemplateDialog}
            hasTemplateSaveContent={hasTemplateSaveContent}
          />
        </div>

        <main className="space-y-6 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {activeDealStep !== 'compose' && (
              <DataSourcesStatus
                isDarkMode={isDarkMode}
                productsPricingSyncedAt={productsPricingSyncedAt}
                productsPricingStale={productsPricingStale}
                rolesCount={roles.length}
                isLoading={productsPricingLoading}
                onRefresh={async () => {
                  await loadProductsPricingCatalog(true);
                  await refreshRoles(true);
                }}
              />
            )}
            <div className={`flex items-center gap-2 ${activeDealStep === 'compose' ? 'ml-auto' : ''}`}>
              <Label className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                Show all sections
              </Label>
              <Switch
                checked={expandAllSections}
                onCheckedChange={setExpandAllSections}
                data-testid="expand-all-sections"
              />
            </div>
          </div>

          {isSectionVisible('project') && (
            <>
              <StepFrame
                isDarkMode={isDarkMode}
                projectInfo={projectInfo}
                setProjectInfo={setProjectInfo}
                calcData={calcData}
                setCalcData={setCalcData}
                onContinue={handleContinueFromFrame}
                onLoadOpportunity={handleLoadOpportunity}
                opportunityLoading={opportunityLoading}
                opportunityLoadError={opportunityLoadError}
                opportunityLoadSuccess={opportunityLoadSuccess}
              />
              <OpportunityScopeConfirmDialog
                open={scopeConfirmOpen}
                onOpenChange={setScopeConfirmOpen}
                scopeItems={projectInfo.opportunity_scope_items}
                isDarkMode={isDarkMode}
                onConfirm={handleScopeConfirmAdd}
                onSkip={proceedToComposeStep}
                findCatalogProduct={findCatalogProduct}
                getSegmentPayload={getSegmentPayload}
                selectedProducts={selectedProducts}
              />
            </>
          )}

          {showScopeWorkspace && (
            <StepCompose
              isDarkMode={isDarkMode}
              expandAllSections={expandAllSections}
              contextStripProps={{
                isDarkMode,
                productsPricingSyncedAt,
                productsPricingStale,
                productCount: validProductCount,
                teamCount: productTeamMemberCount,
                sheetPriceFloorWarning,
                readiness,
              }}
              productsProps={{
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
                scopeTemplates,
                onAddTemplateProducts: addScopeTemplateProducts,
                onMarginPreview: handleMarginPreview,
              }}
            />
          )}
          {isSectionVisible('vendors') && (
            <ResourcesWorkspace
              isDarkMode={isDarkMode}
              selectedProducts={selectedProducts}
              setSelectedProducts={setSelectedProducts}
              vendorServices={vendorServices}
              preferredVendors={preferredVendors}
              vendorGroupTemplates={vendorGroupTemplates}
              onSaveVendorTemplate={handleSaveVendorTemplate}
              onDeleteVendorTemplate={handleDeleteVendorTemplate}
              onQuickCreateVendorService={handleQuickCreateVendorService}
              onDeleteVendorService={handleDeleteVendorService}
            />
          )}
          {isSectionVisible('addons') && (
            <AddonsWorkspace
              isDarkMode={isDarkMode}
              selectedProducts={selectedProducts}
              setSelectedProducts={setSelectedProducts}
              onAddAddon={handleAddAddon}
              filteredProductsCatalog={filteredProductsCatalog}
              findCatalogProduct={findCatalogProduct}
              getSegmentPayload={getSegmentPayload}
              roles={roles}
              calcData={calcData}
              results={results}
              standardMonthlyHours={standardMonthlyHours}
              buildProductTeam={buildProductTeam}
              refreshRoles={refreshRoles}
              onMarginPreview={handleMarginPreview}
            />
          )}
          {isSectionVisible('review') && (
            <StepReview
              isDarkMode={isDarkMode}
              stepCompletion={stepCompletion}
              results={results}
              selectedProducts={selectedProducts}
              calcData={calcData}
              onGoToScope={() => goToDealStep('compose')}
              onSaveTemplate={openCreateTemplateDialog}
              hasTemplateSaveContent={hasTemplateSaveContent}
              exportPdfSlot={
                <ExportCenter
                  projectInfo={projectInfo}
                  selectedProducts={selectedProducts}
                  results={results}
                  themeSettings={themeSettings}
                  paymentTerms={paymentTerms}
                  isDarkMode={isDarkMode}
                  findCatalogProduct={findCatalogProduct}
                  getSegmentPayload={getSegmentPayload}
                />
              }
            />
          )}
        </main>

        <aside className="hidden lg:block sticky top-[140px] h-[calc(100vh-9rem)] min-h-0">
          <InsightRail
            className="h-full"
            results={results}
            previewSelling={previewSelling}
            calculating={calculating}
            isDarkMode={isDarkMode}
            sheetPriceFloorWarning={sheetPriceFloorWarning}
            calcData={calcData}
            setCalcData={setCalcData}
            readiness={readiness}
            productCount={validProductCount}
            selectedProducts={selectedProducts}
            roles={roles}
            standardMonthlyHours={standardMonthlyHours}
            projectInfo={projectInfo}
            setProjectInfo={setProjectInfo}
            paymentTerms={paymentTerms}
            setPaymentTerms={setPaymentTerms}
            onOpenQuoteSettings={() => goToDealStep('economics')}
            setSelectedProducts={setSelectedProducts}
            findCatalogProduct={findCatalogProduct}
            getSegmentPayload={getSegmentPayload}
            onGoToScope={() => goToDealStep('compose')}
            onSaveTemplate={openCreateTemplateDialog}
            exportPdfSlot={
              <ExportPDF
                data={exportData}
                results={results}
                projectInfo={projectInfo}
                themeSettings={themeSettings}
                isDarkMode={isDarkMode}
                selectedProducts={selectedProducts}
              />
            }
          />
        </aside>

      </div>

      <InsightSheet
        open={mobileInsightOpen}
        onOpenChange={setMobileInsightOpen}
        results={results}
        previewSelling={previewSelling}
        calculating={calculating}
        isDarkMode={isDarkMode}
        sheetPriceFloorWarning={sheetPriceFloorWarning}
        calcData={calcData}
        readiness={readiness}
        productCount={validProductCount}
        onGoToScope={() => goToDealStep('compose')}
        onSaveTemplate={openCreateTemplateDialog}
        exportPdfSlot={
          <ExportPDF
            data={calcData}
            results={results}
            projectInfo={projectInfo}
            themeSettings={themeSettings}
            isDarkMode={isDarkMode}
          />
        }
        setCalcData={setCalcData}
        selectedProducts={selectedProducts}
        roles={roles}
        standardMonthlyHours={standardMonthlyHours}
        projectInfo={projectInfo}
        setProjectInfo={setProjectInfo}
        paymentTerms={paymentTerms}
        onOpenQuoteSettings={() => goToDealStep('economics')}
        setSelectedProducts={setSelectedProducts}
        findCatalogProduct={findCatalogProduct}
        getSegmentPayload={getSegmentPayload}
      />

      <BottomNav
        activeTab={
          mobileInsightOpen
            ? 'insight'
            : expandAllSections
              ? 'more'
              : ['frame', 'compose', 'economics'].includes(activeDealStep)
                ? activeDealStep
                : 'more'
        }
        onTabChange={handleBottomNav}
        isDarkMode={isDarkMode}
      />

      {/* Save / Update Template Dialog */}
      <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
        <DialogContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-200'}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : 'text-slate-900'}>
              {templateDialogMode === 'edit' ? 'Update Template' : 'Save as Template'}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-neutral-400' : 'text-slate-500'}>
              {templateDialogMode === 'edit'
                ? 'Overwrite the selected template with the current calculator configuration'
                : 'Save current team, vendors, and products as a reusable template'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>Template Name *</Label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Campaign Production"
                className={isDarkMode ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-slate-300'}
                data-testid="template-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>Description</Label>
              <Input
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="Brief description of this template"
                className={isDarkMode ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-slate-300'}
                data-testid="template-desc-input"
              />
            </div>
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-50'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                This template will include:
              </p>
              <ul className={`text-sm mt-2 space-y-1 ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                <li>• {selectedProducts.filter(p => p.product_name && p.size).length} pricing product row(s)</li>
                <li>• {calcData.team_members.length} team member(s)</li>
                <li>• {calcData.vendors.length} vendor(s)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveTemplateDialogOpen(false)}
              className={isDarkMode ? 'border-neutral-700 text-neutral-300' : ''}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={savingTemplate || !newTemplateName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              data-testid="save-template-confirm-btn"
            >
              {savingTemplate
                ? (templateDialogMode === 'edit' ? 'Updating...' : 'Saving...')
                : (templateDialogMode === 'edit' ? 'Update Template' : 'Save Template')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTemplateDialogOpen} onOpenChange={setDeleteTemplateDialogOpen}>
        <DialogContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-200'}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : 'text-slate-900'}>Delete Template</DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-neutral-400' : 'text-slate-500'}>
              Delete &quot;{scopeTemplates.find(t => t.id === activeTemplateId)?.name || 'this template'}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTemplateDialogOpen(false)}
              className={isDarkMode ? 'border-neutral-700 text-neutral-300' : ''}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteTemplate}
              disabled={deletingTemplate}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              data-testid="delete-template-confirm-btn"
            >
              {deletingTemplate ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

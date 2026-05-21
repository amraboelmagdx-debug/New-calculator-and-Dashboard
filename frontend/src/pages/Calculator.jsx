import { useState, useEffect, useCallback, useMemo } from 'react';
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
  getProductTemplates, 
  getScopeTemplates,
  createScopeTemplate,
  updateScopeTemplate,
  deleteScopeTemplate,
  getPaymentTerms,
  getRiskMultipliers,
  calculateSimple, 
  seedDatabase,
  setAdminPassword,
  getThemeSettings,
  getHRConfig,
  fetchProductsPricing
} from '@/lib/api';

import DepartmentRolePicker from '@/components/DepartmentRolePicker';
import ServicePricingDetail from '@/components/ServicePricingDetail';

import TeamMemberRow from '@/components/TeamMemberRow';
import VendorRow from '@/components/VendorRow';
import ExportPDF from '@/components/ExportPDF';
import QuoteHealthStrip from '@/components/calculator/QuoteHealthStrip';
import InsightRail from '@/components/calculator/InsightRail';
import InsightSheet from '@/components/calculator/InsightSheet';
import DealStepper from '@/components/calculator/DealStepper';
import BottomNav from '@/components/calculator/BottomNav';
import TemplatePanel from '@/components/calculator/TemplatePanel';
import DataSourcesStatus from '@/components/calculator/DataSourcesStatus';
import StepFrame from '@/components/calculator/StepFrame';
import StepCompose from '@/components/calculator/StepCompose';
import StepEconomics from '@/components/calculator/StepEconomics';
import StepReview from '@/components/calculator/StepReview';
import { DEAL_STEPS, dealStepToPrimarySection, sectionIdToDealStep } from '@/components/calculator/quoteSteps';
import { useQuoteWorkflow } from '@/hooks/useQuoteCalculator';
import {
  formatCurrency,
  getStandardMonthlyHours,
  hoursFromUtilization,
  utilizationFromHours,
} from '@/lib/utils';
import {
  buildProductLines,
  buildProductLinesForApi,
  MARGIN_MODES,
  shouldAutoSyncTeamFromSegment,
  normalizeExecutionMode,
  EXECUTION_HYBRID,
} from '@/lib/marginEngine';

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
  const [selectedProducts, setSelectedProducts] = useState([{ id: `pp-${Date.now()}`, product_name: '', size: 'tiny', quantity: 1 }]);
  const [productsPricingLoading, setProductsPricingLoading] = useState(false);
  const [productsPricingSyncedAt, setProductsPricingSyncedAt] = useState(null);
  const [productsPricingStale, setProductsPricingStale] = useState(false);
  const [sheetPriceFloorWarning, setSheetPriceFloorWarning] = useState(null);
  const [applyProductsDialogOpen, setApplyProductsDialogOpen] = useState(false);
  const [pendingTeamMembers, setPendingTeamMembers] = useState([]);
  /** When 'replace', team hours stay in sync with product qty/selection changes */
  const [productsTeamLink, setProductsTeamLink] = useState(null);
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
    client_name: '',
    project_name: '',
    sales_owner: '',
    payment_term_id: ''
  });

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
  const [activeDealStep, setActiveDealStep] = useState('frame');
  const [expandAllSections, setExpandAllSections] = useState(false);
  const [mobileInsightOpen, setMobileInsightOpen] = useState(false);
  const [composeSubTab, setComposeSubTab] = useState('products');
  const [isLg, setIsLg] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );

  const quoteCtx = useMemo(
    () => ({ projectInfo, selectedProducts, calcData, results }),
    [projectInfo, selectedProducts, calcData, results]
  );
  const { readiness, stepCompletion } = useQuoteWorkflow(quoteCtx);
  
  // Save Template Dialog State
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateDialogMode, setTemplateDialogMode] = useState('create'); // 'create' | 'edit'
  const [activeTemplateId, setActiveTemplateId] = useState('');
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

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
      })),
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
      const [rolesData, vendorsData, scopesData, termsData, themeData, hrData] = await Promise.all([
        getRoles(),
        getVendorServices(),
        getScopeTemplates(),
        getPaymentTerms(),
        getThemeSettings().catch(() => ({ company_name: 'ZAN', logo_url: '' })),
        getHRConfig().catch(() => ({
          weeks_per_month: 4,
          work_days_per_week: 5,
          hours_per_work_day: 8,
        })),
      ]);
      
      setRoles(rolesData);
      setVendorServices(vendorsData);
      setScopeTemplates(scopesData);
      setPaymentTerms(termsData);
      setThemeSettings(themeData);
      setHrConfig({
        weeks_per_month: hrData.weeks_per_month ?? 4,
        work_days_per_week: hrData.work_days_per_week ?? 5,
        hours_per_work_day: hrData.hours_per_work_day ?? 8,
      });
      await loadProductsPricingCatalog();

      if (rolesData.length === 0) {
        toast.info('Seeding sample data...', { duration: 2000 });
        setAdminPassword('Amr123');
        await seedDatabase();
        loadData();
      }
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

  const findCatalogProduct = (serviceName) => {
    return productsPricingCatalog.find(
      p => p.service_name === serviceName || p.product_name === serviceName
    );
  };

  const getSegmentPayload = (product, segment) => {
    if (!product || !segment) return null;
    return product.segments?.[segment] || null;
  };

  const getSheetMinimumTotal = () => {
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
  };

  const normalizeRoleName = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

  const findRoleMatch = (sheetRoleName) => {
    const target = normalizeRoleName(sheetRoleName);
    const targetCore = target.split(' - ')[0].trim();
    return roles.find(role => {
      const roleName = normalizeRoleName(role.name);
      const roleCore = roleName.split(' - ')[0].trim();
      return roleName === target || roleCore === targetCore || roleName.includes(targetCore) || target.includes(roleCore);
    });
  };

  const buildTeamMembersFromProducts = useCallback((existingMembers = []) => {
    const validSelections = selectedProducts.filter(item => item.product_name && item.size && (item.quantity || 0) > 0);
    const roleHoursMap = new Map();
    const existingByRoleId = new Map(
      (existingMembers || []).filter(tm => tm.role_id).map(tm => [tm.role_id, tm])
    );

    validSelections.forEach(item => {
      const product = findCatalogProduct(item.product_name);
      const seg = getSegmentPayload(product, item.size);
      if (!seg || !shouldAutoSyncTeamFromSegment(seg)) return;

      const mode = normalizeExecutionMode(seg.execution_mode, seg);
      const roleList = seg?.internal_roles?.length
        ? seg.internal_roles
        : (product?.sizes?.[item.size] || []);
      if (!roleList.length) return;
      const qty = Number(item.quantity) || 1;
      roleList.forEach(roleItem => {
        const key = normalizeRoleName(roleItem.role_name);
        const prev = roleHoursMap.get(key) || {
          role_name: roleItem.role_name,
          hours: 0,
          baseline_hours: 0,
          isHybrid: false,
        };
        const roleHours = (Number(roleItem.hours) || 0) * qty;
        prev.hours += roleHours;
        if (mode === EXECUTION_HYBRID) {
          prev.baseline_hours += roleHours;
          prev.isHybrid = true;
        }
        roleHoursMap.set(key, prev);
      });
    });

    const unmatched = [];
    const members = [...roleHoursMap.values()].map(roleData => {
      const matched = findRoleMatch(roleData.role_name);
      if (!matched) {
        unmatched.push(roleData.role_name);
        return null;
      }
      const hours = Math.round(roleData.hours * 100) / 100;
      const baselineHours = Math.round((roleData.baseline_hours || 0) * 100) / 100;
      const prior = existingByRoleId.get(matched.id);
      return {
        id: prior?.id || `tm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role_id: matched.id,
        role_name: matched.name,
        hours,
        baseline_hours: baselineHours,
        labor_charge_context: roleData.isHybrid ? EXECUTION_HYBRID : 'resource',
        hourly_rate: matched.hourly_rate || 0,
        monthly_salary: matched.monthly_salary || 0,
        utilization_percent: utilizationFromHours(hours, standardMonthlyHours),
        duration_months: prior?.duration_months ?? 1,
        calc_mode: prior?.calc_mode || 'hours',
        employee_type: prior?.employee_type || 'internal',
        quantity: 1,
      };
    }).filter(Boolean);

    return { members, unmatched };
  }, [selectedProducts, productsPricingCatalog, roles, standardMonthlyHours]);

  const hasValidProductSelections = selectedProducts.some(
    item => item.product_name && item.size && (Number(item.quantity) || 0) > 0
  );

  const hasSyncableProductSelections = useMemo(() => {
    return selectedProducts.some(item => {
      if (!item.product_name || !item.size || (Number(item.quantity) || 0) <= 0) return false;
      const product = findCatalogProduct(item.product_name);
      const seg = getSegmentPayload(product, item.size);
      return seg && shouldAutoSyncTeamFromSegment(seg);
    });
  }, [selectedProducts, productsPricingCatalog]);

  // Auto-sync team from resource/hybrid products only (all-in: no labor double-count)
  useEffect(() => {
    if (!hasValidProductSelections || !hasSyncableProductSelections) return;

    const timer = setTimeout(() => {
      setProductsTeamLink('replace');
      setCalcData(prev => {
        const { members } = buildTeamMembersFromProducts(prev.team_members);
        if (members.length === 0) return prev;

        const sameHours =
          prev.team_members.length === members.length &&
          members.every(m =>
            prev.team_members.some(tm => tm.role_id === m.role_id && tm.hours === m.hours)
          );
        if (sameHours) return prev;
        return { ...prev, team_members: members };
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedProducts, hasValidProductSelections, hasSyncableProductSelections, buildTeamMembersFromProducts]);

  const sectionOptions = ['all', ...Array.from(new Set((productsPricingCatalog || []).map(
    p => p.service_family || p.section_name || 'General'
  )))];
  const filteredProductsCatalog = selectedSection === 'all'
    ? productsPricingCatalog
    : productsPricingCatalog.filter(
        p => (p.service_family || p.section_name || 'General') === selectedSection
      );

  const applyGeneratedTeam = (mode, generatedMembers) => {
    setCalcData(prev => ({
      ...prev,
      team_members: mode === 'replace'
        ? generatedMembers
        : [...prev.team_members, ...generatedMembers]
    }));
  };

  const handleApplyProducts = () => {
    const { members, unmatched } = buildTeamMembersFromProducts();
    if (members.length === 0) {
      toast.error('No matching roles were found for selected products.');
      return;
    }
    if (unmatched.length > 0) {
      toast.warning(`${unmatched.length} roles were not matched and were skipped.`);
    }
    setPendingTeamMembers(members);
    setApplyProductsDialogOpen(true);
  };

  // Calculate pricing
  const handleCalculate = useCallback(async () => {
    const productLines = buildProductLines(
      selectedProducts,
      findCatalogProduct,
      getSegmentPayload,
      calcData
    );
    const marginMode = calcData.margin_mode || MARGIN_MODES.UNIFIED;
    const hasGranularProducts =
      marginMode === MARGIN_MODES.GRANULAR && productLines.length > 0;
    const hasLaborOrVendors =
      calcData.team_members.length > 0 || calcData.vendors.length > 0;

    if (!hasLaborOrVendors && !hasGranularProducts) {
      setResults(null);
      return;
    }

    setCalculating(true);
    try {
      const payload = {
        ...calcData,
        margin_mode: marginMode,
        product_lines: hasGranularProducts ? buildProductLinesForApi(productLines) : [],
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

      const sheetFloor = getSheetMinimumTotal();
      if (sheetFloor > 0 && result.selling_price < sheetFloor) {
        setSheetPriceFloorWarning({
          selling: result.selling_price,
          floor: sheetFloor,
          gap: sheetFloor - result.selling_price,
        });
        toast.warning(
          `Calculated price (${formatCurrency(result.selling_price)}) is below sheet minimum (${formatCurrency(sheetFloor)})`
        );
      } else {
        setSheetPriceFloorWarning(null);
      }
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Calculation failed');
      setSheetPriceFloorWarning(null);
    } finally {
      setCalculating(false);
    }
  }, [calcData, projectInfo.payment_term_id, paymentTerms, selectedProducts, productsPricingCatalog]);

  // Auto-calculate on data change
  useEffect(() => {
    const timer = setTimeout(() => {
      handleCalculate();
    }, 300);
    return () => clearTimeout(timer);
  }, [handleCalculate]);

  // Team member functions
  const addTeamMember = () => {
    setProductsTeamLink(null);
    setCalcData(prev => ({
      ...prev,
      team_members: [...prev.team_members, {
        id: `tm-${Date.now()}`,
        role_id: '',
        role_name: '',
        hours: 0,
        hourly_rate: 0,
        monthly_salary: 0,
        utilization_percent: 0,
        duration_months: 1,
        calc_mode: 'hours',
        employee_type: 'internal'
      }]
    }));
  };

  const updateTeamMember = (index, field, value) => {
    if (field === 'hours' || field === 'role_id' || field === 'utilization_percent') {
      setProductsTeamLink(null);
    }
    setCalcData(prev => {
      const updated = [...prev.team_members];
      const member = { ...updated[index], [field]: value };

      if (field === 'role_id' && value) {
        const role = roles.find(r => r.id === value);
        if (role) {
          member.role_name = role.name;
          member.hourly_rate = role.hourly_rate || 0;
          member.monthly_salary = role.monthly_salary || 0;
        }
      }

      if (field === 'hours') {
        member.utilization_percent = utilizationFromHours(
          parseFloat(value) || 0,
          standardMonthlyHours
        );
      } else if (field === 'utilization_percent') {
        member.hours = hoursFromUtilization(
          parseFloat(value) || 0,
          standardMonthlyHours
        );
      } else if (field === 'calc_mode') {
        if (value === 'utilization' && (member.hours || 0) > 0) {
          member.utilization_percent = utilizationFromHours(member.hours, standardMonthlyHours);
        } else if (value === 'hours' && (member.utilization_percent || 0) > 0) {
          member.hours = hoursFromUtilization(member.utilization_percent, standardMonthlyHours);
        }
      }

      updated[index] = member;
      return { ...prev, team_members: updated };
    });
  };

  const removeTeamMember = (index) => {
    setProductsTeamLink(null);
    setCalcData(prev => ({
      ...prev,
      team_members: prev.team_members.filter((_, i) => i !== index)
    }));
  };

  // Vendor functions
  const addVendor = () => {
    setCalcData(prev => ({
      ...prev,
      vendors: [...prev.vendors, {
        id: `v-${Date.now()}`,
        service_id: '',
        service_name: '',
        cost: 0,
        markup_percent: 15
      }]
    }));
  };

  const updateVendor = (index, field, value) => {
    setCalcData(prev => {
      const updated = [...prev.vendors];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'service_id' && value) {
        const service = vendorServices.find(s => s.id === value);
        if (service) {
          updated[index].service_name = service.name;
          updated[index].markup_percent = service.default_markup || 15;
        }
      }
      
      return { ...prev, vendors: updated };
    });
  };

  const removeVendor = (index) => {
    setCalcData(prev => ({
      ...prev,
      vendors: prev.vendors.filter((_, i) => i !== index)
    }));
  };

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
            // Try to find a matching role
            let role = roleMapping[roleRef.role_id];
            
            // If no mapping, try first available role in similar category
            if (!role && roles.length > 0) {
              role = roles[Math.floor(Math.random() * Math.min(5, roles.length))];
            }
            
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
        const restored = pricingProducts.map((p, idx) => ({
          id: p.id || `pp-${Date.now()}-${idx}`,
          product_name: p.product_name || '',
          size: p.size || 'standard',
          quantity: Math.max(1, Number(p.quantity) || 1),
          margin_percent: p.margin_percent,
          margin_source: p.margin_source,
          locked: p.locked,
        }));
        setSelectedProducts(restored);
        const firstName = restored[0]?.product_name;
        if (firstName) {
          const catProduct = findCatalogProduct(firstName);
          const family = catProduct?.service_family || catProduct?.section_name;
          if (family) setSelectedSection(family);
        }
        setProductsTeamLink('replace');
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

      const parts = [];
      if (pricingProducts.length > 0) parts.push(`${pricingProducts.length} منتج`);
      if (newTeamMembers.length > 0) parts.push(`${newTeamMembers.length} وظيفة`);
      toast.success(`تم تحميل القالب: ${template.name} (${parts.join('، ')})`);
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('فشل تحميل القالب');
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
      setAdminPassword('Amr123');
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
      setAdminPassword('Amr123');
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
      const data = await getRoles(forceRefresh);
      setRoles(data);
      toast.success(`Refreshed ${data.length} roles`);
    } catch {
      toast.error('Failed to refresh roles');
    }
  };

  // Refresh vendor services
  const refreshVendorServices = async () => {
    const data = await getVendorServices();
    setVendorServices(data);
  };

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsLg(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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
          ? composeSubTab === 'team'
            ? 'team'
            : 'products'
          : dealStepToPrimarySection(stepId);
    requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [composeSubTab]);

  const isSectionVisible = useCallback(
    (sectionId) => {
      if (expandAllSections) return true;
      if (sectionId === 'review') return activeDealStep === 'review';
      const step = DEAL_STEPS.find(s => s.sectionIds.includes(sectionId));
      if (!step || step.id !== activeDealStep) return false;
      if (step.id === 'compose' && !isLg) {
        return sectionId === (composeSubTab === 'team' ? 'team' : 'products');
      }
      return true;
    },
    [expandAllSections, activeDealStep, composeSubTab, isLg]
  );

  useEffect(() => {
    const sectionIds = ['project', 'products', 'team', 'vendors', 'pricing', 'review'];
    const elements = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveDealStep(sectionIdToDealStep(visible[0].target.id));
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.25, 0.5] }
    );
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [expandAllSections, isLg, composeSubTab]);

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
    if (tabId === 'compose') setComposeSubTab('products');
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
            {themeSettings.logo_url ? (
              <img 
                src={themeSettings.logo_url} 
                alt="Logo" 
                className="w-10 h-10 rounded-lg object-contain"
                onError={(e) => e.target.style.display = 'none'}
              />
            ) : (
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-white' : 'bg-neutral-900'}`}>
                <span className={`font-bold text-sm  ${isDarkMode ? 'text-neutral-900' : 'text-white'}`}>ZAN</span>
              </div>
            )}
            <div>
              <h1 className={`text-lg font-bold  ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
                {themeSettings.company_name || 'ZAN'}
              </h1>
              <p className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Pricing Command Center</p>
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
              data={calcData} 
              results={results} 
              projectInfo={projectInfo}
              themeSettings={themeSettings}
              isDarkMode={isDarkMode}
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
        calculating={calculating}
        readiness={readiness}
        isDarkMode={isDarkMode}
        sheetPriceFloorWarning={sheetPriceFloorWarning}
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
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[240px_1fr_360px] gap-6 p-4 sm:p-6 pb-28 lg:pb-6">
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
            <DataSourcesStatus
              isDarkMode={isDarkMode}
              productsPricingLoading={productsPricingLoading}
              productsPricingSyncedAt={productsPricingSyncedAt}
              productsPricingStale={productsPricingStale}
              rolesCount={roles.length}
              onRefreshProducts={loadProductsPricingCatalog}
              onRefreshRoles={refreshRoles}
            />
            <div className="flex items-center gap-2">
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

          {activeDealStep === 'compose' && !isLg && (
            <div className={`flex gap-1 p-1 rounded-lg ${isDarkMode ? 'bg-neutral-900' : 'bg-slate-100'}`}>
              {['products', 'team'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setComposeSubTab(tab);
                    document.getElementById(tab)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    composeSubTab === tab
                      ? isDarkMode
                        ? 'bg-neutral-800 text-white'
                        : 'bg-white text-slate-900 shadow-sm'
                      : isDarkMode
                        ? 'text-neutral-500'
                        : 'text-slate-600'
                  }`}
                >
                  {tab === 'products' ? 'Products' : 'Team'}
                </button>
              ))}
            </div>
          )}

          {isSectionVisible('project') && (
            <StepFrame
              isDarkMode={isDarkMode}
              projectInfo={projectInfo}
              setProjectInfo={setProjectInfo}
              paymentTerms={paymentTerms}
              calcData={calcData}
              setCalcData={setCalcData}
              onContinue={() => goToDealStep('compose')}
            />
          )}

          {(isSectionVisible('products') || isSectionVisible('team')) && (
            <StepCompose
              showProducts={isSectionVisible('products')}
              showTeam={isSectionVisible('team')}
              isDarkMode={isDarkMode}
              productsPricingSyncedAt={productsPricingSyncedAt}
              productsPricingLoading={productsPricingLoading}
              loadProductsPricingCatalog={loadProductsPricingCatalog}
              selectedSection={selectedSection}
              setSelectedSection={setSelectedSection}
              sectionOptions={sectionOptions}
              selectedProducts={selectedProducts}
              setSelectedProducts={setSelectedProducts}
              handleApplyProducts={handleApplyProducts}
              findCatalogProduct={findCatalogProduct}
              getSegmentPayload={getSegmentPayload}
              filteredProductsCatalog={filteredProductsCatalog}
              onContinue={() => goToDealStep('economics')}
              roles={roles}
              calcData={calcData}
              setCalcData={setCalcData}
              addTeamMember={addTeamMember}
              updateTeamMember={updateTeamMember}
              removeTeamMember={removeTeamMember}
              refreshRoles={refreshRoles}
              standardMonthlyHours={standardMonthlyHours}
            />
          )}
          {(isSectionVisible('vendors') || isSectionVisible('pricing')) && (
            <StepEconomics
              showVendors={isSectionVisible('vendors')}
              showPricing={isSectionVisible('pricing')}
              isDarkMode={isDarkMode}
              calcData={calcData}
              setCalcData={setCalcData}
              selectedProducts={selectedProducts}
              setSelectedProducts={setSelectedProducts}
              findCatalogProduct={findCatalogProduct}
              getSegmentPayload={getSegmentPayload}
              roles={roles}
              results={results}
              vendorServices={vendorServices}
              addVendor={addVendor}
              updateVendor={updateVendor}
              removeVendor={removeVendor}
              refreshVendorServices={refreshVendorServices}
              onContinueToReview={() => goToDealStep('review')}
            />
          )}
          {isSectionVisible('review') && (
            <StepReview
              isDarkMode={isDarkMode}
              stepCompletion={stepCompletion}
              results={results}
              onGoToScope={() => goToDealStep('compose')}
              onSaveTemplate={openCreateTemplateDialog}
              hasTemplateSaveContent={hasTemplateSaveContent}
              exportPdfSlot={
                <ExportPDF
                  data={calcData}
                  results={results}
                  projectInfo={projectInfo}
                  themeSettings={themeSettings}
                  isDarkMode={isDarkMode}
                />
              }
            />
          )}
        </main>

        <aside className="hidden lg:block sticky top-[140px] h-[calc(100vh-9rem)] min-h-0">
          <InsightRail
            className="h-full"
            results={results}
            calculating={calculating}
            isDarkMode={isDarkMode}
            sheetPriceFloorWarning={sheetPriceFloorWarning}
            productsTeamLink={productsTeamLink}
            calcData={calcData}
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
          />
        </aside>

      </div>

      <InsightSheet
        open={mobileInsightOpen}
        onOpenChange={setMobileInsightOpen}
        results={results}
        calculating={calculating}
        isDarkMode={isDarkMode}
        sheetPriceFloorWarning={sheetPriceFloorWarning}
        productsTeamLink={productsTeamLink}
        calcData={calcData}
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

      <Dialog open={applyProductsDialogOpen} onOpenChange={setApplyProductsDialogOpen}>
        <DialogContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-200'}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : 'text-slate-900'}>Apply Generated Team</DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-neutral-400' : 'text-slate-500'}>
              Do you want to replace current team members or append generated members?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                applyGeneratedTeam('append', pendingTeamMembers);
                setProductsTeamLink(null);
                setApplyProductsDialogOpen(false);
                toast.success(`Appended ${pendingTeamMembers.length} team members from products pricing.`);
              }}
              className={isDarkMode ? 'border-neutral-700 text-neutral-200' : 'border-slate-300 text-slate-700'}
            >
              Append
            </Button>
            <Button
              onClick={() => {
                applyGeneratedTeam('replace', pendingTeamMembers);
                setProductsTeamLink('replace');
                setApplyProductsDialogOpen(false);
                toast.success(`Replaced team with ${pendingTeamMembers.length} generated members.`);
              }}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

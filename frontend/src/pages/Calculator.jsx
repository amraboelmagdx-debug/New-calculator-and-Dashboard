import { useState, useEffect, useCallback } from 'react';
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
  fetchProductsPricing
} from '@/lib/api';

import DepartmentRolePicker from '@/components/DepartmentRolePicker';
import ServicePricingDetail from '@/components/ServicePricingDetail';

import TeamMemberRow from '@/components/TeamMemberRow';
import VendorRow from '@/components/VendorRow';
import ExportPDF from '@/components/ExportPDF';
import { formatCurrency } from '@/lib/utils';

function metricAmountSizeClass(formatted) {
  const len = String(formatted || '').length;
  if (len > 18) return 'text-sm';
  if (len > 14) return 'text-base';
  if (len > 11) return 'text-lg';
  return 'text-xl';
}

function DashboardMetricAmount({ value, className = '' }) {
  const formatted = formatCurrency(value);
  return (
    <p
      className={`font-bold font-mono tabular-nums leading-tight break-words mt-1 min-w-0 ${metricAmountSizeClass(formatted)} ${className}`}
      title={formatted}
    >
      {formatted}
    </p>
  );
}

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
  const [sheetPriceFloorWarning, setSheetPriceFloorWarning] = useState(null);
  const [applyProductsDialogOpen, setApplyProductsDialogOpen] = useState(false);
  const [pendingTeamMembers, setPendingTeamMembers] = useState([]);
  /** When 'replace', team hours stay in sync with product qty/selection changes */
  const [productsTeamLink, setProductsTeamLink] = useState(null);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [themeSettings, setThemeSettings] = useState({ company_name: 'ZAN', logo_url: '' });
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
    internal_risk: { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0 },
    vendor_risk: { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0 },
    client_type: 'new',
    lead_source: 'direct'
  });
  
  const [results, setResults] = useState(null);
  const [activeSection, setActiveSection] = useState('project');
  
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
        quantity: p.quantity
      }))
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
      const [rolesData, vendorsData, scopesData, termsData, themeData] = await Promise.all([
        getRoles(),
        getVendorServices(),
        getScopeTemplates(),
        getPaymentTerms(),
        getThemeSettings().catch(() => ({ company_name: 'ZAN', logo_url: '' }))
      ]);
      
      setRoles(rolesData);
      setVendorServices(vendorsData);
      setScopeTemplates(scopesData);
      setPaymentTerms(termsData);
      setThemeSettings(themeData);
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
      if (result?.status === 'success') {
        setProductsPricingCatalog(result.data || []);
        setProductsPricingSyncedAt(result.synced_at || new Date().toISOString());
        if (forceRefresh) {
          const synced = result.synced ?? result.count ?? result.data?.length ?? 0;
          toast.success(`Synced ${synced} service groups from Google Sheet`);
        }
      } else {
        setProductsPricingCatalog([]);
        if (forceRefresh) {
          toast.error(result?.message || 'Failed to sync products pricing');
        }
      }
    } catch {
      setProductsPricingCatalog([]);
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
      const roleList = seg?.internal_roles?.length
        ? seg.internal_roles
        : (product?.sizes?.[item.size] || []);
      if (!roleList.length) return;
      const qty = Number(item.quantity) || 1;
      roleList.forEach(roleItem => {
        const key = normalizeRoleName(roleItem.role_name);
        const prev = roleHoursMap.get(key) || { role_name: roleItem.role_name, hours: 0 };
        prev.hours += (Number(roleItem.hours) || 0) * qty;
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
      const prior = existingByRoleId.get(matched.id);
      return {
        id: prior?.id || `tm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role_id: matched.id,
        role_name: matched.name,
        hours,
        hourly_rate: matched.hourly_rate || 0,
        monthly_salary: matched.monthly_salary || 0,
        utilization_percent: prior?.utilization_percent ?? 0,
        duration_months: prior?.duration_months ?? 1,
        calc_mode: prior?.calc_mode || 'hours',
        employee_type: prior?.employee_type || 'internal',
        quantity: 1,
      };
    }).filter(Boolean);

    return { members, unmatched };
  }, [selectedProducts, productsPricingCatalog, roles]);

  const hasValidProductSelections = selectedProducts.some(
    item => item.product_name && item.size && (Number(item.quantity) || 0) > 0
  );

  // Auto-sync team from products when qty / service / segment changes (like Internal Team hours)
  useEffect(() => {
    if (!hasValidProductSelections) return;

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
  }, [selectedProducts, hasValidProductSelections, buildTeamMembersFromProducts]);

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
    if (calcData.team_members.length === 0 && calcData.vendors.length === 0) {
      setResults(null);
      return;
    }

    setCalculating(true);
    try {
      const result = await calculateSimple(calcData);
      
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
    if (field === 'hours' || field === 'role_id') {
      setProductsTeamLink(null);
    }
    setCalcData(prev => {
      const updated = [...prev.team_members];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'role_id' && value) {
        const role = roles.find(r => r.id === value);
        if (role) {
          updated[index].role_name = role.name;
          updated[index].hourly_rate = role.hourly_rate || 0;
          updated[index].monthly_salary = role.monthly_salary || 0;
        }
      }
      
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
        vendors: [...prev.vendors, ...newVendors]
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

  // Navigation sections
  const navSections = [
    { id: 'project', label: 'Project Info', icon: Briefcase },
    { id: 'products', label: 'Products Builder', icon: LayoutTemplate },
    { id: 'team', label: 'Internal Team', icon: Users },
    { id: 'vendors', label: 'Vendors', icon: Truck },
    { id: 'pricing', label: 'Pricing Settings', icon: Target },
  ];

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
              <p className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Cost Calculator</p>
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

      {/* Main Layout */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[220px_1fr_380px] gap-6 p-6">
        
        {/* Left Navigation */}
        <nav className={`hidden lg:block sticky top-24 h-fit space-y-2 p-4 rounded-xl ${isDarkMode ? '' : 'bg-white shadow-sm border border-slate-200'}`}>
          {navSections.map(section => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeSection === section.id 
                  ? (isDarkMode ? 'text-neutral-50 bg-neutral-800' : 'text-slate-900 bg-slate-100') 
                  : (isDarkMode ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50')
              }`}
              data-testid={`nav-${section.id}`}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
          
          <div className={`border-t my-4 ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`} />
          
          {/* Template Loader */}
          <div className="px-2 space-y-2">
            <Label className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Templates</Label>
            <Select
              value={activeTemplateId || undefined}
              onValueChange={loadScopeTemplate}
            >
              <SelectTrigger className={`text-sm ${isDarkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-white border-slate-300 text-slate-700'}`} data-testid="template-select">
                <SelectValue placeholder="Choose template..." />
              </SelectTrigger>
              <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                {scopeTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id} className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeTemplateId && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openEditTemplateDialog}
                  disabled={!hasTemplateSaveContent}
                  className={`flex-1 gap-1.5 text-xs ${isDarkMode ? 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`}
                  data-testid="update-template-btn"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Update
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTemplateDialogOpen(true)}
                  className={`gap-1.5 text-xs text-rose-500 hover:text-rose-600 ${isDarkMode ? 'border-neutral-700 bg-neutral-900 hover:bg-rose-950/40' : 'border-slate-300 bg-white hover:bg-rose-50'}`}
                  data-testid="delete-template-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Save as Template Button */}
          <div className="px-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={openCreateTemplateDialog}
              disabled={!hasTemplateSaveContent}
              className={`w-full gap-2 ${isDarkMode ? 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 hover:text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-950'}`}
              data-testid="save-template-btn"
            >
              <Save className="w-4 h-4" />
              Save as Template
            </Button>
          </div>
        </nav>

        {/* Center Content */}
        <main className="space-y-6 pb-20">
          
          {/* Project Info Section */}
          <section id="project" className="animate-fade-in">
            <Card className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'} data-testid="project-info-section">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                    <Briefcase className={`w-5 h-5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`} />
                  </div>
                  <div>
                    <CardTitle className={`text-lg  ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Project Information</CardTitle>
                    <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>Basic details about the opportunity</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Client Name</Label>
                    <Input
                      value={projectInfo.client_name}
                      onChange={(e) => setProjectInfo(p => ({ ...p, client_name: e.target.value }))}
                      placeholder="Enter client name"
                      className={`mt-1.5 ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                      data-testid="client-name-input"
                    />
                  </div>
                  <div>
                    <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Project Name</Label>
                    <Input
                      value={projectInfo.project_name}
                      onChange={(e) => setProjectInfo(p => ({ ...p, project_name: e.target.value }))}
                      placeholder="Enter project name"
                      className={`mt-1.5 ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                      data-testid="project-name-input"
                    />
                  </div>
                  <div>
                    <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Sales Owner</Label>
                    <Input
                      value={projectInfo.sales_owner}
                      onChange={(e) => setProjectInfo(p => ({ ...p, sales_owner: e.target.value }))}
                      placeholder="Enter sales owner"
                      className={`mt-1.5 ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                      data-testid="sales-owner-input"
                    />
                  </div>
                  <div>
                    <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Payment Terms</Label>
                    <Select 
                      value={projectInfo.payment_term_id} 
                      onValueChange={(v) => setProjectInfo(p => ({ ...p, payment_term_id: v }))}
                    >
                      <SelectTrigger className={`mt-1.5 ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-slate-300 text-slate-700'}`} data-testid="payment-terms-select">
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                        {paymentTerms.map(term => (
                          <SelectItem key={term.id} value={term.id} className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>
                            {term.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Client Type & Lead Source */}
                <div className={`grid grid-cols-2 gap-4 mt-4 pt-4 border-t ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
                  <div>
                    <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Client Type</Label>
                    <Select 
                      value={calcData.client_type} 
                      onValueChange={(v) => setCalcData(p => ({ ...p, client_type: v }))}
                    >
                      <SelectTrigger className={`mt-1.5 ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-slate-300 text-slate-700'}`} data-testid="client-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                        <SelectItem value="new" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>New Customer</SelectItem>
                        <SelectItem value="existing" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>Existing Customer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Lead Source</Label>
                    <Select 
                      value={calcData.lead_source} 
                      onValueChange={(v) => setCalcData(p => ({ ...p, lead_source: v }))}
                    >
                      <SelectTrigger className={`mt-1.5 ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-slate-300 text-slate-700'}`} data-testid="lead-source-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                        <SelectItem value="direct" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>Direct (Sales Generated)</SelectItem>
                        <SelectItem value="referral" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>Referral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="products" className="animate-fade-in">
            <Card className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                      <LayoutTemplate className={`w-5 h-5 ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`} />
                    </div>
                    <div>
                      <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Products Pricing Builder</CardTitle>
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
                    className={isDarkMode ? 'border-neutral-700 text-neutral-200 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}
                  >
                    Refresh Sheet
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedProducts.map((item) => {
                  const product = findCatalogProduct(item.product_name);
                  const segmentKeys = Object.keys(product?.segments || product?.sizes || {});
                  const segmentPayload = getSegmentPayload(product, item.size);
                  return (
                    <div key={item.id} className={`grid grid-cols-12 gap-3 rounded-lg border p-3 ${isDarkMode ? 'border-neutral-700 bg-neutral-900/40' : 'border-slate-200 bg-slate-50/60'}`}>
                      <div className="col-span-5">
                        <Label className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Service Name</Label>
                        <Select
                          value={item.product_name}
                          onValueChange={(value) => {
                            const p = findCatalogProduct(value);
                            const firstSeg = Object.keys(p?.segments || p?.sizes || {})[0] || 'standard';
                            setSelectedProducts(prev => prev.map(row => row.id === item.id ? { ...row, product_name: value, size: firstSeg } : row));
                          }}
                        >
                          <SelectTrigger className={`mt-1 ${isDarkMode ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}>
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
                          onValueChange={(value) => setSelectedProducts(prev => prev.map(p => p.id === item.id ? { ...p, size: value } : p))}
                        >
                          <SelectTrigger className={`mt-1 ${isDarkMode ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                            {(segmentKeys.length ? segmentKeys : ['tiny', 'standard', 'big', 'mega']).map(size => (
                              <SelectItem key={size} value={size}>{size.toUpperCase()}</SelectItem>
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
                          onChange={(e) => setSelectedProducts(prev => prev.map(p => p.id === item.id ? { ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) } : p))}
                          className={`mt-1 ${isDarkMode ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
                        />
                      </div>
                      <div className="col-span-2 flex items-end justify-end">
                        <Button
                          variant="ghost"
                          onClick={() => setSelectedProducts(prev => prev.length === 1 ? prev : prev.filter(p => p.id !== item.id))}
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
                })}

                <div className="flex flex-wrap gap-2 pt-1">
                  <div className="w-[260px]">
                    <Select value={selectedSection} onValueChange={setSelectedSection}>
                      <SelectTrigger className={isDarkMode ? 'border-neutral-700 bg-neutral-900 text-neutral-100' : 'border-slate-300 bg-white text-slate-700'}>
                        <SelectValue placeholder="Filter by family" />
                      </SelectTrigger>
                      <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                        {sectionOptions.map(section => (
                          <SelectItem key={section} value={section}>
                            {section === 'all' ? 'All Service Families' : section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedProducts(prev => [...prev, { id: `pp-${Date.now()}-${prev.length}`, product_name: '', size: 'tiny', quantity: 1 }])}
                    className={isDarkMode ? 'border-neutral-700 text-neutral-200 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Product
                  </Button>
                  <Button
                    onClick={handleApplyProducts}
                    disabled={productsPricingLoading || productsPricingCatalog.length === 0}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    Apply to Team
                  </Button>
                  {productsPricingLoading && <p className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Loading products pricing...</p>}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Internal Team Section */}
          <section id="team" className="animate-fade-in">
            <Card className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'} data-testid="team-section">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                      <Users className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <CardTitle className={`text-lg  ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Internal Team</CardTitle>
                      <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>اختر الموظفين حسب الإدارة</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => refreshRoles(true)}
                    className={isDarkMode ? 'border-neutral-700 text-neutral-200 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}
                  >
                    Refresh Sheet
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Department Selection Grid */}
                <DepartmentRolePicker 
                  roles={roles}
                  selectedMembers={calcData.team_members}
                  onAddMember={addTeamMember}
                  onAddMemberWithRole={(roleId) => {
                    const role = roles.find(r => r.id === roleId);
                    if (role) {
                      const newMember = {
                        id: Date.now().toString(),
                        role_id: roleId,
                        employee_type: 'internal',
                        calc_mode: 'hours',
                        hours: 0,
                        utilization_percent: 0,
                        duration_months: 1,
                        hourly_rate: role.hourly_rate || 0,
                        custom_salary: 0,
                        custom_allowance: 0,
                        admin_fee_percent: 0
                      };
                      setCalcData(prev => ({
                        ...prev,
                        team_members: [...prev.team_members, newMember]
                      }));
                    }
                  }}
                  isDarkMode={isDarkMode}
                />
                
                {/* Added Team Members */}
                {calcData.team_members.length > 0 && (
                  <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        الفريق المحدد ({calcData.team_members.length})
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {calcData.team_members.map((member, index) => (
                        <TeamMemberRow
                          key={member.id}
                          member={member}
                          index={index}
                          roles={roles}
                          onUpdate={(field, value) => updateTeamMember(index, field, value)}
                          onRemove={() => removeTeamMember(index)}
                          onRolesRefresh={refreshRoles}
                          darkMode={isDarkMode}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Internal Risk Factors */}
                {calcData.team_members.length > 0 && (
                  <Collapsible className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
                    <CollapsibleTrigger className={`flex items-center justify-between w-full py-2 text-sm ${isDarkMode ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-600 hover:text-slate-900'}`}>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>Internal Risk Factors</span>
                      </div>
                      <Badge className={`text-xs ${isDarkMode ? 'badge-neutral' : 'bg-slate-100 text-slate-600'}`}>
                        {calcData.internal_risk.complexity === 'none' && calcData.internal_risk.rush === 'none' && calcData.internal_risk.execution === 'none' 
                          ? 'None' 
                          : `${[calcData.internal_risk.complexity, calcData.internal_risk.rush, calcData.internal_risk.execution].filter(r => r !== 'none').length} factors`}
                      </Badge>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4">
                        {['complexity', 'rush', 'execution'].map(factor => (
                          <div key={factor}>
                            <Label className={`text-xs capitalize ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>{factor}</Label>
                            <Select 
                              value={calcData.internal_risk[factor]} 
                              onValueChange={(v) => setCalcData(p => ({ 
                                ...p, 
                                internal_risk: { ...p.internal_risk, [factor]: v } 
                              }))}
                            >
                              <SelectTrigger className={`mt-1 text-sm ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-white border-slate-300 text-slate-700'}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                                <SelectItem value="none" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>None</SelectItem>
                                <SelectItem value="low" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>Low</SelectItem>
                                <SelectItem value="medium" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>Medium</SelectItem>
                                <SelectItem value="high" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>High</SelectItem>
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

          {/* Vendors Section */}
          <section id="vendors" className="animate-fade-in">
            <Card className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'} data-testid="vendor-section">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                      <Truck className={`w-5 h-5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <CardTitle className={`text-lg  ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Vendors</CardTitle>
                      <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>External services and costs</CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={addVendor} 
                    className={`font-semibold shadow-sm ${isDarkMode ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
                    data-testid="add-vendor-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vendor
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {calcData.vendors.length === 0 ? (
                  <div className={`text-center py-12 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No vendors added yet</p>
                    <p className="text-xs mt-1">Click "Add Vendor" to add external services</p>
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
                
                {/* Vendor Risk Factors */}
                {calcData.vendors.length > 0 && (
                  <Collapsible className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
                    <CollapsibleTrigger className={`flex items-center justify-between w-full py-2 text-sm ${isDarkMode ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-600 hover:text-slate-900'}`}>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>Vendor Risk Factors</span>
                      </div>
                      <Badge className={`text-xs ${isDarkMode ? 'badge-neutral' : 'bg-slate-100 text-slate-600'}`}>
                        {calcData.vendor_risk.complexity === 'none' && calcData.vendor_risk.rush === 'none' && calcData.vendor_risk.execution === 'none' 
                          ? 'None' 
                          : `${[calcData.vendor_risk.complexity, calcData.vendor_risk.rush, calcData.vendor_risk.execution].filter(r => r !== 'none').length} factors`}
                      </Badge>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4">
                        {['complexity', 'rush', 'execution'].map(factor => (
                          <div key={factor}>
                            <Label className={`text-xs capitalize ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>{factor}</Label>
                            <Select 
                              value={calcData.vendor_risk[factor]} 
                              onValueChange={(v) => setCalcData(p => ({ 
                                ...p, 
                                vendor_risk: { ...p.vendor_risk, [factor]: v } 
                              }))}
                            >
                              <SelectTrigger className={`mt-1 text-sm ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-white border-slate-300 text-slate-700'}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                                <SelectItem value="none" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>None</SelectItem>
                                <SelectItem value="low" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>Low</SelectItem>
                                <SelectItem value="medium" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>Medium</SelectItem>
                                <SelectItem value="high" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>High</SelectItem>
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

          {/* Pricing Settings Section */}
          <section id="pricing" className="animate-fade-in">
            <Card className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'} data-testid="pricing-section">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                    <Target className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <div>
                    <CardTitle className={`text-lg  ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Pricing Settings</CardTitle>
                    <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>Configure margins and pricing strategy</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Split Margins Toggle */}
                <div className={`flex items-center justify-between p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-neutral-800/50' : 'bg-slate-50 border border-slate-200'}`}>
                  <div>
                    <Label className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Split Margins</Label>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Separate margins for internal vs vendor costs</p>
                  </div>
                  <Switch
                    checked={calcData.use_split_margins}
                    onCheckedChange={(checked) => setCalcData(p => ({ ...p, use_split_margins: checked }))}
                    data-testid="split-margins-toggle"
                  />
                </div>

                {calcData.use_split_margins ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className={`text-sm flex items-center gap-2 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        Internal Margin %
                      </Label>
                      <Input
                        type="number"
                        value={calcData.internal_margin_percent}
                        onChange={(e) => setCalcData(p => ({ ...p, internal_margin_percent: parseFloat(e.target.value) || 0 }))}
                        className={`mt-1.5 font-mono ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                        data-testid="internal-margin-input"
                      />
                    </div>
                    <div>
                      <Label className={`text-sm flex items-center gap-2 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        Vendor Margin %
                      </Label>
                      <Input
                        type="number"
                        value={calcData.vendor_margin_percent}
                        onChange={(e) => setCalcData(p => ({ ...p, vendor_margin_percent: parseFloat(e.target.value) || 0 }))}
                        className={`mt-1.5 font-mono ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                        data-testid="vendor-margin-input"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Target Margin %</Label>
                    <Input
                      type="number"
                      value={calcData.target_margin_percent}
                      onChange={(e) => setCalcData(p => ({ ...p, target_margin_percent: parseFloat(e.target.value) || 0 }))}
                      className={`mt-1.5 font-mono max-w-xs ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                      data-testid="target-margin-input"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

        </main>

        {/* Right Dashboard */}
        <aside className="hidden lg:block sticky top-24 h-[calc(100vh-7rem)]">
          <div className={`h-full flex flex-col p-6 overflow-y-auto rounded-2xl shadow-xl border ${isDarkMode ? 'bg-neutral-900 border-neutral-800 shadow-black/30' : 'bg-white border-slate-200 shadow-slate-200/70'}`} data-testid="dashboard">
            {/* Revenue & Profit */}
            <div className="mb-6">
              <div className="grid grid-cols-1 gap-3">
                <div className={`rounded-xl border p-4 min-w-0 overflow-hidden ${isDarkMode ? 'bg-neutral-950/60 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Revenue</p>
                  {results ? (
                    <div data-testid="revenue">
                      <DashboardMetricAmount value={results.selling_price} className={isDarkMode ? 'text-white' : 'text-slate-900'} />
                    </div>
                  ) : (
                    <p className={`text-xl font-bold font-mono mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>SAR 0</p>
                  )}
                  {sheetPriceFloorWarning && (
                    <Badge className="mt-2 max-w-full whitespace-normal text-left bg-amber-500/20 text-amber-600 border-amber-500/40">
                      Below sheet min (O): {formatCurrency(sheetPriceFloorWarning.floor)}
                    </Badge>
                  )}
                </div>
                <div className={`rounded-xl border p-4 min-w-0 overflow-hidden ${isDarkMode ? 'bg-neutral-950/60 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Net Profit</p>
                  {results ? (
                    <div data-testid="profit">
                      <DashboardMetricAmount
                        value={results.contribution_margin}
                        className={results.contribution_margin >= 0 ? 'text-emerald-500' : 'text-rose-500'}
                      />
                    </div>
                  ) : (
                    <p className="text-xl font-bold font-mono mt-1 text-emerald-500">SAR 0</p>
                  )}
                </div>
              </div>
            </div>

            {/* Margin Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Contribution Margin</span>
                <span className={`text-lg font-bold font-mono ${
                  (results?.contribution_margin_percent || 0) >= 30 ? 'text-emerald-500' : 
                  (results?.contribution_margin_percent || 0) >= 20 ? 'text-amber-500' : 'text-rose-500'
                }`} data-testid="margin-percent">
                  {results?.contribution_margin_percent?.toFixed(1) || 0}%
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                <div 
                  className={`h-full transition-all duration-500 ease-out ${
                    (results?.contribution_margin_percent || 0) >= 30 ? 'bg-emerald-500' : 
                    (results?.contribution_margin_percent || 0) >= 20 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(Math.max(results?.contribution_margin_percent || 0, 0), 100)}%` }}
                />
              </div>
            </div>

            {/* Deal Size Badge */}
            {results?.incentive_breakdown?.deal_size && (
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Deal Size:</span>
                <Badge className={`text-xs uppercase font-mono border ${
                  results.incentive_breakdown.deal_size === 'mega' 
                    ? (isDarkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-100 text-blue-700 border-blue-200') :
                  results.incentive_breakdown.deal_size === 'big' 
                    ? (isDarkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-amber-200') :
                  results.incentive_breakdown.deal_size === 'standard' 
                    ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-200') :
                  (isDarkMode ? 'bg-neutral-700 text-neutral-300 border-neutral-600' : 'bg-slate-100 text-slate-700 border-slate-200')
                }`}>
                  {results.incentive_breakdown.deal_size}
                </Badge>
              </div>
            )}

            {/* Cost Breakdown */}
            <div className="mb-6">
              <h4 className={`text-xs uppercase tracking-wider mb-3 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Cost Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between gap-2 text-sm min-w-0">
                  <span className={`shrink-0 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Internal Labor</span>
                  <span className={`font-mono text-right break-words min-w-0 max-w-[58%] tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(results?.internal_labor_cost || 0)}</span>
                </div>
                <div className="flex justify-between gap-2 text-sm min-w-0">
                  <span className={`shrink-0 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Vendor Cost</span>
                  <span className={`font-mono text-right break-words min-w-0 max-w-[58%] tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(results?.vendor_cost || 0)}</span>
                </div>
                <div className="flex justify-between gap-2 text-sm min-w-0">
                  <span className={`shrink-0 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Overhead</span>
                  <span className={`font-mono text-right break-words min-w-0 max-w-[58%] tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(results?.overhead_cost || 0)}</span>
                </div>
                <div className={`flex justify-between gap-2 text-sm pt-2 border-t min-w-0 ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
                  <span className={`shrink-0 font-medium ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>Total COGS</span>
                  <span className={`font-mono font-medium text-right break-words min-w-0 max-w-[58%] tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(results?.cogs || 0)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="mb-6">
              <h4 className={`text-xs uppercase tracking-wider mb-3 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Deductions</h4>
              <div className="space-y-2">
                {results?.incentive_breakdown ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Sales Rep</span>
                      <span className="text-rose-500 font-mono">-{formatCurrency(results.incentive_breakdown.sales_rep.capped_value)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Sales Manager</span>
                      <span className="text-rose-500 font-mono">-{formatCurrency(results.incentive_breakdown.sales_manager.capped_value)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Sales Incentive</span>
                    <span className="text-rose-500 font-mono">-{formatCurrency(results?.sales_incentive || 0)}</span>
                  </div>
                )}
                {results?.financing_cost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Financing Cost</span>
                    <span className="text-rose-500 font-mono">-{formatCurrency(results.financing_cost)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Final Price */}
            <div className={`p-4 rounded-xl mb-6 border shadow-sm min-w-0 overflow-hidden ${isDarkMode ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-start gap-y-1">
                <span className={`shrink-0 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>Selling Price</span>
                <div className="min-w-0 sm:text-right" data-testid="selling-price">
                  <DashboardMetricAmount
                    value={results?.selling_price || 0}
                    className={isDarkMode ? 'text-emerald-100' : 'text-emerald-900'}
                  />
                </div>
              </div>
            </div>

            {/* Warnings */}
            {results?.warnings && results.warnings.length > 0 && (
              <div className="space-y-2 mb-6">
                {results.warnings.map((warning, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                      warning.severity === 'error' 
                        ? (isDarkMode ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200')
                        : (isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200')
                    }`}
                    data-testid={`warning-${warning.type}`}
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{warning.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Risk Summary */}
            {results?.risk_level && results.total_risk_multiplier > 1 && (
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Risk Assessment</span>
                  <Badge className={`text-xs border ${
                    results.risk_level === 'High' 
                      ? (isDarkMode ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-700 border-rose-200') :
                    results.risk_level === 'Medium' 
                      ? (isDarkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-amber-200') :
                    (isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-200')
                  }`}>
                    {results.risk_level}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Risk Multiplier</span>
                  <span className={`font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>×{results.total_risk_multiplier?.toFixed(3)}</span>
                </div>
              </div>
            )}
          </div>
        </aside>

      </div>

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

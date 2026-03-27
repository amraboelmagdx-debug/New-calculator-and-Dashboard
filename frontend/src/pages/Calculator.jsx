import { useState, useEffect, useCallback } from 'react';
import { Calculator as CalcIcon, Briefcase, Plus, Trash2, ChevronDown, ChevronRight, FileText, Settings, SplitSquareHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { 
  getRoles, 
  getVendorServices, 
  getProductTemplates, 
  getScopeTemplates,
  getPaymentTerms,
  getRiskMultipliers,
  calculateSimple, 
  calculateOpportunity,
  seedDatabase,
  setAdminPassword,
  getThemeSettings
} from '@/lib/api';
import { formatCurrency, formatPercent, generateId, getDealStatusClass, getMarginColorClass, deepClone } from '@/lib/utils';
import ProfitabilityPanel from '@/components/ProfitabilityPanel';
import ScopeEditor from '@/components/ScopeEditor';
import ExportPDF from '@/components/ExportPDF';
import TeamMemberRow from '@/components/TeamMemberRow';
import VendorRow from '@/components/VendorRow';
import PricingGuidelinesPanel from '@/components/PricingGuidelinesPanel';
import RiskFactorsInput from '@/components/RiskFactorsInput';

export default function Calculator() {
  const [mode, setMode] = useState('simple');
  const [roles, setRoles] = useState([]);
  const [vendorServices, setVendorServices] = useState([]);
  const [productTemplates, setProductTemplates] = useState([]);
  const [scopeTemplates, setScopeTemplates] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [riskMultipliers, setRiskMultipliers] = useState([]);
  const [themeSettings, setThemeSettings] = useState({ company_name: 'Opportunity Pricing Engine', logo_url: '' });
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  
  // Simple mode state
  const [simpleData, setSimpleData] = useState({
    team_members: [],
    vendors: [],
    target_margin_percent: 30,
    internal_margin_percent: 30,
    vendor_margin_percent: 15,
    use_split_margins: false,
    internal_risk: { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0 },
    vendor_risk: { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0 },
    // Incentive inputs
    client_type: 'new',
    lead_source: 'direct'
  });
  const [simpleResults, setSimpleResults] = useState(null);

  // Structured mode state
  const [opportunity, setOpportunity] = useState({
    client: '',
    opportunity_name: '',
    sales_owner: '',
    payment_term_id: '',
    risk_level: 'Low',
    target_margin_percent: 30,
    scopes: []
  });
  const [opportunityResults, setOpportunityResults] = useState(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, vendorsData, productsData, scopesData, termsData, risksData, themeData] = await Promise.all([
        getRoles(),
        getVendorServices(),
        getProductTemplates(),
        getScopeTemplates(),
        getPaymentTerms(),
        getRiskMultipliers(),
        getThemeSettings().catch(() => ({ company_name: 'Opportunity Pricing Engine', logo_url: '' }))
      ]);
      
      setRoles(rolesData);
      setVendorServices(vendorsData);
      setProductTemplates(productsData);
      setScopeTemplates(scopesData);
      setPaymentTerms(termsData);
      setRiskMultipliers(risksData);
      setThemeSettings(themeData);

      // If no data, offer to seed
      if (rolesData.length === 0) {
        toast.info('No data found. Seeding sample data...', { duration: 2000 });
        setAdminPassword('Amr123');
        await seedDatabase();
        loadData();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate simple pricing
  const handleSimpleCalculate = useCallback(async () => {
    if (simpleData.team_members.length === 0 && simpleData.vendors.length === 0) {
      toast.warning('Add at least one team member or vendor');
      return;
    }

    try {
      setCalculating(true);
      const results = await calculateSimple(simpleData);
      setSimpleResults(results);
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Calculation failed');
    } finally {
      setCalculating(false);
    }
  }, [simpleData]);

  // Calculate opportunity pricing
  const handleOpportunityCalculate = useCallback(async () => {
    if (!opportunity.client || !opportunity.opportunity_name) {
      toast.warning('Please fill in client and opportunity name');
      return;
    }

    try {
      setCalculating(true);
      const results = await calculateOpportunity(opportunity);
      setOpportunityResults(results);
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Calculation failed');
    } finally {
      setCalculating(false);
    }
  }, [opportunity]);

  // Auto-calculate on changes
  useEffect(() => {
    if (mode === 'simple' && (simpleData.team_members.length > 0 || simpleData.vendors.length > 0)) {
      const timer = setTimeout(handleSimpleCalculate, 500);
      return () => clearTimeout(timer);
    }
  }, [simpleData, mode, handleSimpleCalculate]);

  useEffect(() => {
    if (mode === 'structured' && opportunity.scopes.length > 0) {
      const timer = setTimeout(handleOpportunityCalculate, 500);
      return () => clearTimeout(timer);
    }
  }, [opportunity, mode, handleOpportunityCalculate]);

  // Simple mode handlers
  const addTeamMember = () => {
    setSimpleData(prev => ({
      ...prev,
      team_members: [...prev.team_members, {
        id: generateId(),
        role_id: '',
        role_name: '',
        hours: 0,
        utilization_percent: 0,
        duration_months: 1,
        hourly_rate: 0,
        monthly_salary: 0,
        calc_mode: 'hours',
        employee_type: 'internal',
        custom_salary: 0,
        custom_allowance: 0,
        admin_fee_percent: 10
      }]
    }));
  };

  const updateTeamMember = (index, field, value) => {
    setSimpleData(prev => {
      const updated = [...prev.team_members];
      updated[index] = { ...updated[index], [field]: value };
      
      // If role changed, update rate and salary
      if (field === 'role_id') {
        const role = roles.find(r => r.id === value);
        if (role) {
          updated[index].role_name = role.name;
          updated[index].hourly_rate = role.hourly_rate;
          updated[index].monthly_salary = role.monthly_salary || 0;
        }
      }
      
      return { ...prev, team_members: updated };
    });
  };

  const removeTeamMember = (index) => {
    setSimpleData(prev => ({
      ...prev,
      team_members: prev.team_members.filter((_, i) => i !== index)
    }));
  };

  // Refresh roles list (used by inline add)
  const refreshRoles = async () => {
    const rolesData = await getRoles();
    setRoles(rolesData);
  };

  // Refresh vendor services list (used by inline add)
  const refreshVendorServices = async () => {
    const vendorsData = await getVendorServices();
    setVendorServices(vendorsData);
  };

  const addVendor = () => {
    setSimpleData(prev => ({
      ...prev,
      vendors: [...prev.vendors, {
        id: generateId(),
        service_id: '',
        service_name: '',
        cost: 0,
        markup_percent: 15
      }]
    }));
  };

  const updateVendor = (index, field, value) => {
    setSimpleData(prev => {
      const updated = [...prev.vendors];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'service_id') {
        const service = vendorServices.find(s => s.id === value);
        if (service) {
          updated[index].service_name = service.name;
          updated[index].markup_percent = service.default_markup_percent;
        }
      }
      
      return { ...prev, vendors: updated };
    });
  };

  const removeVendor = (index) => {
    setSimpleData(prev => ({
      ...prev,
      vendors: prev.vendors.filter((_, i) => i !== index)
    }));
  };

  // Structured mode handlers
  const updateOpportunity = (field, value) => {
    setOpportunity(prev => ({ ...prev, [field]: value }));
  };

  const addScope = (templateId = null) => {
    let newScope = {
      id: generateId(),
      name: 'New Scope',
      template_id: '',
      scope_type: 'standard',
      products: [],
      vendors: [],
      staffing: [],
      tools_cost: 0,
      extras_cost: 0
    };

    if (templateId) {
      const template = scopeTemplates.find(t => t.id === templateId);
      if (template) {
        newScope.name = template.name;
        newScope.template_id = template.id;
        newScope.scope_type = template.scope_type;
        
        // Load default products
        if (template.default_products?.length > 0) {
          newScope.products = template.default_products.map(ptId => {
            const pt = productTemplates.find(p => p.id === ptId);
            if (pt) {
              return {
                id: generateId(),
                name: pt.name,
                template_id: pt.id,
                team_members: pt.default_roles?.map(dr => {
                  const role = roles.find(r => r.id === dr.role_id);
                  return {
                    id: generateId(),
                    role_id: dr.role_id,
                    role_name: role?.name || '',
                    hours: dr.default_hours || 0,
                    utilization_percent: 0,
                    hourly_rate: role?.hourly_rate || 0
                  };
                }) || [],
                description: pt.description
              };
            }
            return null;
          }).filter(Boolean);
        }
      }
    }

    setOpportunity(prev => ({
      ...prev,
      scopes: [...prev.scopes, newScope]
    }));
  };

  const updateScope = (scopeIndex, updatedScope) => {
    setOpportunity(prev => {
      const scopes = [...prev.scopes];
      scopes[scopeIndex] = updatedScope;
      return { ...prev, scopes };
    });
  };

  const removeScope = (scopeIndex) => {
    setOpportunity(prev => ({
      ...prev,
      scopes: prev.scopes.filter((_, i) => i !== scopeIndex)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" data-testid="loading-screen">
        <div className="text-center">
          <div className="spinner mx-auto mb-4">
            <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-slate-600">Loading pricing engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="calculator-page">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50" data-testid="header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {themeSettings.logo_url ? (
                <img 
                  src={themeSettings.logo_url} 
                  alt={themeSettings.company_name || 'Logo'} 
                  className="w-10 h-10 rounded-lg object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-10 h-10 bg-slate-900 rounded-lg items-center justify-center ${themeSettings.logo_url ? 'hidden' : 'flex'}`}
                style={{ display: themeSettings.logo_url ? 'none' : 'flex' }}
              >
                <span className="text-white font-bold text-sm font-['Manrope']">OPE</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 font-['Manrope'] tracking-tight">
                  {themeSettings.company_name || 'Opportunity Pricing Engine'}
                </h1>
                <p className="text-xs text-slate-500">ZAN Cost Calculator</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Mode Selector */}
              <Tabs value={mode} onValueChange={setMode} data-testid="mode-selector">
                <TabsList className="bg-slate-100">
                  <TabsTrigger value="simple" className="gap-2" data-testid="simple-mode-btn">
                    <CalcIcon className="w-4 h-4" />
                    Simple Calculator
                  </TabsTrigger>
                  <TabsTrigger value="structured" className="gap-2" data-testid="structured-mode-btn">
                    <Briefcase className="w-4 h-4" />
                    Structured Opportunity
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Link to="/admin" data-testid="admin-link">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mode === 'simple' ? (
          <SimpleCalculator
            data={simpleData}
            setData={setSimpleData}
            results={simpleResults}
            roles={roles}
            vendorServices={vendorServices}
            addTeamMember={addTeamMember}
            updateTeamMember={updateTeamMember}
            removeTeamMember={removeTeamMember}
            addVendor={addVendor}
            updateVendor={updateVendor}
            removeVendor={removeVendor}
            calculating={calculating}
            refreshRoles={refreshRoles}
            refreshVendorServices={refreshVendorServices}
          />
        ) : (
          <StructuredCalculator
            opportunity={opportunity}
            results={opportunityResults}
            updateOpportunity={updateOpportunity}
            addScope={addScope}
            updateScope={updateScope}
            removeScope={removeScope}
            roles={roles}
            vendorServices={vendorServices}
            productTemplates={productTemplates}
            scopeTemplates={scopeTemplates}
            paymentTerms={paymentTerms}
            riskMultipliers={riskMultipliers}
            calculating={calculating}
            refreshRoles={refreshRoles}
            refreshVendorServices={refreshVendorServices}
          />
        )}
      </main>
    </div>
  );
}

// Simple Calculator Component
function SimpleCalculator({ 
  data, setData, results, roles, vendorServices,
  addTeamMember, updateTeamMember, removeTeamMember,
  addVendor, updateVendor, removeVendor, calculating,
  refreshRoles, refreshVendorServices 
}) {
  // Calculate risk multipliers for display
  const internalRiskMult = results?.internal_risk_multiplier || 1.0;
  const vendorRiskMult = results?.vendor_risk_multiplier || 1.0;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" data-testid="simple-calculator">
      {/* Left: Input Section */}
      <div className="lg:col-span-2 space-y-6">
        {/* Pricing Guidelines Panel */}
        <PricingGuidelinesPanel 
          currentMargin={results?.contribution_margin_percent || 0}
          dealSize={results?.selling_price || 0}
          category="general"
        />
        
        {/* Team Members */}
        <Card data-testid="team-section">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">Internal Team</CardTitle>
                <p className="text-xs text-slate-500 mt-1">Toggle between Hours and Monthly Utilization mode for each role</p>
              </div>
              <Button size="sm" onClick={addTeamMember} className="gap-2" data-testid="add-team-member-btn">
                <Plus className="w-4 h-4" />
                Add Role
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.team_members.length === 0 ? (
              <div className="text-center py-8 text-slate-500" data-testid="no-team-members">
                <p className="text-sm">No team members added yet</p>
                <p className="text-xs mt-1">Click "Add Role" to start building your team</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.team_members.map((member, index) => (
                  <TeamMemberRow
                    key={member.id}
                    member={member}
                    index={index}
                    roles={roles}
                    onUpdate={(field, value) => updateTeamMember(index, field, value)}
                    onRemove={() => removeTeamMember(index)}
                    onRolesRefresh={refreshRoles}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Internal Team Risk Factors */}
        {data.team_members.length > 0 && (
          <RiskFactorsInput
            title="Internal Team Risk Factors"
            riskFactors={data.internal_risk}
            onChange={(risk) => setData(prev => ({ ...prev, internal_risk: risk }))}
            riskMultiplier={internalRiskMult}
            showResult={true}
          />
        )}

        {/* Vendors */}
        <Card data-testid="vendor-section">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-800">Vendors</CardTitle>
              <Button size="sm" onClick={addVendor} className="gap-2" data-testid="add-vendor-btn">
                <Plus className="w-4 h-4" />
                Add Vendor
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.vendors.length === 0 ? (
              <div className="text-center py-8 text-slate-500" data-testid="no-vendors">
                <p className="text-sm">No vendors added yet</p>
                <p className="text-xs mt-1">Click "Add Vendor" to add external services</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-3 text-xs font-medium text-slate-500 uppercase tracking-wider px-3">
                  <div className="col-span-4">Service</div>
                  <div className="col-span-3">Cost (SAR)</div>
                  <div className="col-span-2">Markup %</div>
                  <div className="col-span-2">Client Price</div>
                  <div className="col-span-1"></div>
                </div>
                {data.vendors.map((vendor, index) => (
                  <VendorRow
                    key={vendor.id}
                    vendor={vendor}
                    index={index}
                    vendorServices={vendorServices}
                    onUpdate={(field, value) => updateVendor(index, field, value)}
                    onRemove={() => removeVendor(index)}
                    onServicesRefresh={refreshVendorServices}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Vendor Risk Factors */}
        {data.vendors.length > 0 && (
          <RiskFactorsInput
            title="Vendor Risk Factors"
            riskFactors={data.vendor_risk}
            onChange={(risk) => setData(prev => ({ ...prev, vendor_risk: risk }))}
            riskMultiplier={vendorRiskMult}
            showResult={true}
          />
        )}

        {/* Incentive Settings - Client Type & Lead Source */}
        <Card data-testid="incentive-settings-section">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Sales Incentive Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700">Client Type</Label>
                <Select
                  value={data.client_type}
                  onValueChange={(value) => setData(prev => ({ ...prev, client_type: value }))}
                >
                  <SelectTrigger className="mt-1.5" data-testid="client-type-select">
                    <SelectValue placeholder="Select client type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">عميل جديد (New Customer)</SelectItem>
                    <SelectItem value="existing">عميل حالي (Existing Customer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Lead Source</Label>
                <Select
                  value={data.lead_source}
                  onValueChange={(value) => setData(prev => ({ ...prev, lead_source: value }))}
                >
                  <SelectTrigger className="mt-1.5" data-testid="lead-source-select">
                    <SelectValue placeholder="Select lead source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">مباشر (Direct / Generated by Sales)</SelectItem>
                    <SelectItem value="referral">إحالة (Referral)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Incentive Breakdown Preview */}
            {results?.incentive_breakdown && (
              <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-emerald-800">تفاصيل الحوافز</div>
                  <div className="text-xs px-2 py-1 bg-emerald-100 rounded-full text-emerald-700 font-medium">
                    {results.incentive_breakdown.deal_size.toUpperCase()}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {/* Sales Rep */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-slate-600">Sales Representative</span>
                      {results.incentive_breakdown.sales_rep.cap_applied && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">CAP</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-800">{formatCurrency(results.incentive_breakdown.sales_rep.capped_value)}</span>
                      <span className="text-xs text-slate-500 mr-2">({results.incentive_breakdown.sales_rep.adjusted_percent}%)</span>
                    </div>
                  </div>
                  
                  {/* Sales Manager */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span className="text-slate-600">Sales Manager</span>
                      {results.incentive_breakdown.sales_manager.cap_applied && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">CAP</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-800">{formatCurrency(results.incentive_breakdown.sales_manager.capped_value)}</span>
                      <span className="text-xs text-slate-500 mr-2">({results.incentive_breakdown.sales_manager.adjusted_percent}%)</span>
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div className="border-t border-emerald-200 my-2"></div>
                  
                  {/* Total */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">إجمالي الحوافز</span>
                    <div className="text-right">
                      <span className="font-bold text-lg text-emerald-700">{formatCurrency(results.incentive_breakdown.total_incentive)}</span>
                      <span className="text-xs text-slate-500 mr-2">({results.incentive_breakdown.effective_percent}%)</span>
                    </div>
                  </div>
                  
                  {/* Multiplier Info */}
                  {results.incentive_breakdown.client_multiplier < 1 && (
                    <div className="text-xs text-slate-500 mt-2 p-2 bg-white/50 rounded">
                      <span className="font-medium">المعامل المطبق:</span> ×{results.incentive_breakdown.client_multiplier}
                      {data.client_type === 'existing' && <span className="mx-1">• عميل حالي</span>}
                      {data.lead_source === 'referral' && <span className="mx-1">• إحالة</span>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Settings with Split Margins */}
        <Card data-testid="margin-section">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-800">Pricing Settings</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="split-margins" className="text-sm text-slate-600">Split Margins</Label>
                <Switch
                  id="split-margins"
                  checked={data.use_split_margins}
                  onCheckedChange={(checked) => setData(prev => ({ ...prev, use_split_margins: checked }))}
                  data-testid="split-margins-toggle"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.use_split_margins ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      Internal Margin %
                    </Label>
                    <Input
                      type="number"
                      value={data.internal_margin_percent}
                      onChange={(e) => setData(prev => ({ ...prev, internal_margin_percent: parseFloat(e.target.value) || 0 }))}
                      className="mt-1.5"
                      data-testid="internal-margin-input"
                    />
                    <p className="text-xs text-slate-400 mt-1">Applied to internal labor + overhead</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      Vendor Margin %
                    </Label>
                    <Input
                      type="number"
                      value={data.vendor_margin_percent}
                      onChange={(e) => setData(prev => ({ ...prev, vendor_margin_percent: parseFloat(e.target.value) || 0 }))}
                      className="mt-1.5"
                      data-testid="vendor-margin-input"
                    />
                    <p className="text-xs text-slate-400 mt-1">Applied to vendor costs (or uses markup)</p>
                  </div>
                </div>
                {results && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg border">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Achieved Margins</div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Internal:</span>
                        <span className={`ml-2 font-semibold ${results.internal_margin_percent >= data.internal_margin_percent ? 'text-green-600' : 'text-amber-600'}`}>
                          {results.internal_margin_percent?.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Vendor:</span>
                        <span className={`ml-2 font-semibold ${results.vendor_margin_percent >= data.vendor_margin_percent ? 'text-green-600' : 'text-amber-600'}`}>
                          {results.vendor_margin_percent?.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Blended:</span>
                        <span className="ml-2 font-bold text-indigo-600">
                          {results.blended_margin_percent?.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-slate-700">Target Margin %</Label>
                  <Input
                    type="number"
                    value={data.target_margin_percent}
                    onChange={(e) => setData(prev => ({ ...prev, target_margin_percent: parseFloat(e.target.value) || 0 }))}
                    className="mt-1.5"
                    data-testid="target-margin-input"
                  />
                </div>
                <div className="text-xs text-slate-500 max-w-xs">
                  <p>Selling Price = COGS ÷ (1 − Margin% − Sales%)</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Warnings from calculation */}
        {results?.warnings && results.warnings.length > 0 && (
          <div className="space-y-2" data-testid="warnings-section">
            {results.warnings.map((warning, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg border flex items-start gap-2 ${
                  warning.severity === 'error' 
                    ? 'bg-red-50 border-red-200 text-red-700' 
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}
                data-testid={`warning-${warning.type}`}
              >
                <SplitSquareHorizontal className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{warning.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Results Panel */}
      <div className="lg:col-span-1">
        <ProfitabilityPanel results={results} mode="simple" calculating={calculating} />
      </div>
    </div>
  );
}

// Structured Calculator Component
function StructuredCalculator({
  opportunity, results, updateOpportunity, addScope, updateScope, removeScope,
  roles, vendorServices, productTemplates, scopeTemplates, paymentTerms, riskMultipliers, calculating
}) {
  const [scopeTemplateOpen, setScopeTemplateOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-6" data-testid="structured-calculator">
      {/* Left Panel: Opportunity Details */}
      <div className="space-y-4" data-testid="opportunity-details-panel">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">Opportunity Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-600">Client</Label>
              <Input
                value={opportunity.client}
                onChange={(e) => updateOpportunity('client', e.target.value)}
                placeholder="Client name"
                data-testid="client-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-600">Opportunity Name</Label>
              <Input
                value={opportunity.opportunity_name}
                onChange={(e) => updateOpportunity('opportunity_name', e.target.value)}
                placeholder="Project name"
                data-testid="opportunity-name-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-600">Sales Owner</Label>
              <Input
                value={opportunity.sales_owner}
                onChange={(e) => updateOpportunity('sales_owner', e.target.value)}
                placeholder="Sales owner"
                data-testid="sales-owner-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-600">Payment Terms</Label>
              <Select value={opportunity.payment_term_id} onValueChange={(v) => updateOpportunity('payment_term_id', v)}>
                <SelectTrigger data-testid="payment-terms-select">
                  <SelectValue placeholder="Select terms" />
                </SelectTrigger>
                <SelectContent>
                  {paymentTerms.map(term => (
                    <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-600">Risk Level</Label>
              <Select value={opportunity.risk_level} onValueChange={(v) => updateOpportunity('risk_level', v)}>
                <SelectTrigger data-testid="risk-level-select">
                  <SelectValue placeholder="Select risk" />
                </SelectTrigger>
                <SelectContent>
                  {riskMultipliers.map(risk => (
                    <SelectItem key={risk.id} value={risk.level}>{risk.level} ({risk.multiplier}x)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-600">Target Margin %</Label>
              <Input
                type="number"
                value={opportunity.target_margin_percent}
                onChange={(e) => updateOpportunity('target_margin_percent', parseFloat(e.target.value) || 0)}
                data-testid="opp-margin-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Export Button */}
        {results && (
          <ExportPDF opportunity={opportunity} results={results} />
        )}
      </div>

      {/* Center Panel: Scopes */}
      <div className="space-y-4" data-testid="scopes-panel">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 font-['Manrope']">Scopes</h2>
          <div className="flex items-center gap-2">
            <Collapsible open={scopeTemplateOpen} onOpenChange={setScopeTemplateOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="scope-template-btn">
                  <FileText className="w-4 h-4" />
                  From Template
                  {scopeTemplateOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="absolute mt-2 z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-[200px]">
                {scopeTemplates.map(template => (
                  <button
                    key={template.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded-md"
                    onClick={() => {
                      addScope(template.id);
                      setScopeTemplateOpen(false);
                    }}
                    data-testid={`template-${template.id}`}
                  >
                    {template.name}
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
            <Button size="sm" onClick={() => addScope()} className="gap-2" data-testid="add-scope-btn">
              <Plus className="w-4 h-4" />
              Add Scope
            </Button>
          </div>
        </div>

        {opportunity.scopes.length === 0 ? (
          <Card className="border-dashed" data-testid="no-scopes">
            <CardContent className="py-12">
              <div className="text-center">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-700 mb-1">No scopes yet</h3>
                <p className="text-sm text-slate-500 mb-4">Add scopes to start building your opportunity</p>
                <Button onClick={() => addScope()} className="gap-2" data-testid="add-first-scope-btn">
                  <Plus className="w-4 h-4" />
                  Add First Scope
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {opportunity.scopes.map((scope, index) => (
              <ScopeEditor
                key={scope.id}
                scope={scope}
                scopeIndex={index}
                updateScope={(updatedScope) => updateScope(index, updatedScope)}
                removeScope={() => removeScope(index)}
                roles={roles}
                vendorServices={vendorServices}
                productTemplates={productTemplates}
                results={results?.scopes?.[index]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Panel: Profitability */}
      <div data-testid="profitability-panel">
        <ProfitabilityPanel results={results?.summary} mode="structured" calculating={calculating} />
      </div>
    </div>
  );
}

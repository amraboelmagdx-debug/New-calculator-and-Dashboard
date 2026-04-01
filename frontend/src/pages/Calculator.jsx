import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { 
  Plus, Trash2, Settings, FileText, ChevronDown, ChevronRight,
  Users, Truck, AlertTriangle, TrendingUp, DollarSign, Clock,
  Briefcase, User, Building2, CreditCard, Target, Shield, Zap,
  LayoutTemplate, Calculator as CalcIcon, Download
} from 'lucide-react';

import { 
  getRoles, 
  getVendorServices, 
  getProductTemplates, 
  getScopeTemplates,
  getPaymentTerms,
  getRiskMultipliers,
  calculateSimple, 
  seedDatabase,
  setAdminPassword,
  getThemeSettings
} from '@/lib/api';

import TeamMemberRow from '@/components/TeamMemberRow';
import VendorRow from '@/components/VendorRow';
import ExportPDF from '@/components/ExportPDF';
import { formatCurrency } from '@/lib/utils';

export default function Calculator() {
  // Data states
  const [roles, setRoles] = useState([]);
  const [vendorServices, setVendorServices] = useState([]);
  const [scopeTemplates, setScopeTemplates] = useState([]);
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
        if (term && term.uncovered_percent > 0) {
          const sellingPrice = result.selling_price;
          const uncoveredAmount = sellingPrice * (term.uncovered_percent / 100);
          const interestRate = term.interest_rate || 8;
          const days = term.days_to_payment || 30;
          const financingCost = uncoveredAmount * (interestRate / 100) * (days / 365);
          result.financing_cost = Math.round(financingCost * 100) / 100;
          result.contribution_margin -= financingCost;
          result.contribution_margin_percent = (result.contribution_margin / result.selling_price * 100);
        }
      }
      
      setResults(result);
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Calculation failed');
    } finally {
      setCalculating(false);
    }
  }, [calcData, projectInfo.payment_term_id, paymentTerms]);

  // Auto-calculate on data change
  useEffect(() => {
    const timer = setTimeout(() => {
      handleCalculate();
    }, 300);
    return () => clearTimeout(timer);
  }, [handleCalculate]);

  // Team member functions
  const addTeamMember = () => {
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
  const loadScopeTemplate = (templateId) => {
    const template = scopeTemplates.find(t => t.id === templateId);
    if (!template) return;

    // Convert template products to team members
    const newTeamMembers = (template.default_products || []).flatMap(product => 
      (product.roles || []).map(role => ({
        id: `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role_id: role.role_id || '',
        role_name: role.role_name || '',
        hours: role.hours || 0,
        hourly_rate: role.hourly_rate || 0,
        monthly_salary: 0,
        utilization_percent: 0,
        duration_months: 1,
        calc_mode: 'hours',
        employee_type: 'internal'
      }))
    );

    setCalcData(prev => ({
      ...prev,
      team_members: [...prev.team_members, ...newTeamMembers]
    }));

    toast.success(`Loaded template: ${template.name}`);
  };

  // Refresh roles
  const refreshRoles = async () => {
    const data = await getRoles();
    setRoles(data);
  };

  // Refresh vendor services
  const refreshVendorServices = async () => {
    const data = await getVendorServices();
    setVendorServices(data);
  };

  // Navigation sections
  const navSections = [
    { id: 'project', label: 'Project Info', icon: Briefcase },
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
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 px-6 py-4" data-testid="header">
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
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-neutral-900 font-bold text-sm font-['Manrope']">ZAN</span>
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-white font-['Manrope']">
                {themeSettings.company_name || 'ZAN'}
              </h1>
              <p className="text-xs text-neutral-500">Cost Calculator</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ExportPDF 
              data={calcData} 
              results={results} 
              projectInfo={projectInfo}
              themeSettings={themeSettings}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-neutral-400 hover:text-white hover:bg-neutral-800"
              onClick={() => window.location.href = '/admin'}
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
        <nav className="hidden lg:block sticky top-24 h-fit space-y-2">
          {navSections.map(section => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`nav-item w-full ${activeSection === section.id ? 'active' : ''}`}
              data-testid={`nav-${section.id}`}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
          
          <div className="section-divider" />
          
          {/* Template Loader */}
          <div className="px-4">
            <Label className="text-xs text-neutral-500 uppercase tracking-wider">Load Template</Label>
            <Select onValueChange={loadScopeTemplate}>
              <SelectTrigger className="mt-2 bg-neutral-900 border-neutral-700 text-neutral-300 text-sm" data-testid="template-select">
                <SelectValue placeholder="Choose template..." />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                {scopeTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id} className="text-neutral-300">
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </nav>

        {/* Center Content */}
        <main className="space-y-6 pb-20">
          
          {/* Project Info Section */}
          <section id="project" className="animate-fade-in">
            <Card className="dark-card" data-testid="project-info-section">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-white font-['Manrope']">Project Information</CardTitle>
                    <CardDescription className="text-neutral-500">Basic details about the opportunity</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-neutral-400 text-sm">Client Name</Label>
                    <Input
                      value={projectInfo.client_name}
                      onChange={(e) => setProjectInfo(p => ({ ...p, client_name: e.target.value }))}
                      placeholder="Enter client name"
                      className="mt-1.5 bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600"
                      data-testid="client-name-input"
                    />
                  </div>
                  <div>
                    <Label className="text-neutral-400 text-sm">Project Name</Label>
                    <Input
                      value={projectInfo.project_name}
                      onChange={(e) => setProjectInfo(p => ({ ...p, project_name: e.target.value }))}
                      placeholder="Enter project name"
                      className="mt-1.5 bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600"
                      data-testid="project-name-input"
                    />
                  </div>
                  <div>
                    <Label className="text-neutral-400 text-sm">Sales Owner</Label>
                    <Input
                      value={projectInfo.sales_owner}
                      onChange={(e) => setProjectInfo(p => ({ ...p, sales_owner: e.target.value }))}
                      placeholder="Enter sales owner"
                      className="mt-1.5 bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600"
                      data-testid="sales-owner-input"
                    />
                  </div>
                  <div>
                    <Label className="text-neutral-400 text-sm">Payment Terms</Label>
                    <Select 
                      value={projectInfo.payment_term_id} 
                      onValueChange={(v) => setProjectInfo(p => ({ ...p, payment_term_id: v }))}
                    >
                      <SelectTrigger className="mt-1.5 bg-neutral-950 border-neutral-800 text-white" data-testid="payment-terms-select">
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700">
                        {paymentTerms.map(term => (
                          <SelectItem key={term.id} value={term.id} className="text-neutral-300">
                            {term.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Client Type & Lead Source */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-neutral-800">
                  <div>
                    <Label className="text-neutral-400 text-sm">Client Type</Label>
                    <Select 
                      value={calcData.client_type} 
                      onValueChange={(v) => setCalcData(p => ({ ...p, client_type: v }))}
                    >
                      <SelectTrigger className="mt-1.5 bg-neutral-950 border-neutral-800 text-white" data-testid="client-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700">
                        <SelectItem value="new" className="text-neutral-300">New Customer</SelectItem>
                        <SelectItem value="existing" className="text-neutral-300">Existing Customer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-neutral-400 text-sm">Lead Source</Label>
                    <Select 
                      value={calcData.lead_source} 
                      onValueChange={(v) => setCalcData(p => ({ ...p, lead_source: v }))}
                    >
                      <SelectTrigger className="mt-1.5 bg-neutral-950 border-neutral-800 text-white" data-testid="lead-source-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700">
                        <SelectItem value="direct" className="text-neutral-300">Direct (Sales Generated)</SelectItem>
                        <SelectItem value="referral" className="text-neutral-300">Referral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Internal Team Section */}
          <section id="team" className="animate-fade-in">
            <Card className="dark-card" data-testid="team-section">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white font-['Manrope']">Internal Team</CardTitle>
                      <CardDescription className="text-neutral-500">Add roles and configure hours or utilization</CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={addTeamMember} 
                    className="bg-white text-neutral-900 hover:bg-neutral-200 font-semibold"
                    data-testid="add-team-member-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Role
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {calcData.team_members.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No team members added yet</p>
                    <p className="text-xs mt-1">Click "Add Role" or load a template</p>
                  </div>
                ) : (
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
                        darkMode={true}
                      />
                    ))}
                  </div>
                )}
                
                {/* Internal Risk Factors */}
                {calcData.team_members.length > 0 && (
                  <Collapsible className="mt-4 pt-4 border-t border-neutral-800">
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm text-neutral-400 hover:text-neutral-200">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>Internal Risk Factors</span>
                      </div>
                      <Badge className="badge-neutral text-xs">
                        {calcData.internal_risk.complexity === 'none' && calcData.internal_risk.rush === 'none' && calcData.internal_risk.execution === 'none' 
                          ? 'None' 
                          : `${[calcData.internal_risk.complexity, calcData.internal_risk.rush, calcData.internal_risk.execution].filter(r => r !== 'none').length} factors`}
                      </Badge>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4">
                        {['complexity', 'rush', 'execution'].map(factor => (
                          <div key={factor}>
                            <Label className="text-neutral-500 text-xs capitalize">{factor}</Label>
                            <Select 
                              value={calcData.internal_risk[factor]} 
                              onValueChange={(v) => setCalcData(p => ({ 
                                ...p, 
                                internal_risk: { ...p.internal_risk, [factor]: v } 
                              }))}
                            >
                              <SelectTrigger className="mt-1 bg-neutral-950 border-neutral-800 text-neutral-300 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-neutral-900 border-neutral-700">
                                <SelectItem value="none" className="text-neutral-300">None</SelectItem>
                                <SelectItem value="low" className="text-neutral-300">Low</SelectItem>
                                <SelectItem value="medium" className="text-neutral-300">Medium</SelectItem>
                                <SelectItem value="high" className="text-neutral-300">High</SelectItem>
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
            <Card className="dark-card" data-testid="vendor-section">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white font-['Manrope']">Vendors</CardTitle>
                      <CardDescription className="text-neutral-500">External services and costs</CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={addVendor} 
                    className="bg-white text-neutral-900 hover:bg-neutral-200 font-semibold"
                    data-testid="add-vendor-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vendor
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {calcData.vendors.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500">
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
                        darkMode={true}
                      />
                    ))}
                  </div>
                )}
                
                {/* Vendor Risk Factors */}
                {calcData.vendors.length > 0 && (
                  <Collapsible className="mt-4 pt-4 border-t border-neutral-800">
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm text-neutral-400 hover:text-neutral-200">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>Vendor Risk Factors</span>
                      </div>
                      <Badge className="badge-neutral text-xs">
                        {calcData.vendor_risk.complexity === 'none' && calcData.vendor_risk.rush === 'none' && calcData.vendor_risk.execution === 'none' 
                          ? 'None' 
                          : `${[calcData.vendor_risk.complexity, calcData.vendor_risk.rush, calcData.vendor_risk.execution].filter(r => r !== 'none').length} factors`}
                      </Badge>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4">
                        {['complexity', 'rush', 'execution'].map(factor => (
                          <div key={factor}>
                            <Label className="text-neutral-500 text-xs capitalize">{factor}</Label>
                            <Select 
                              value={calcData.vendor_risk[factor]} 
                              onValueChange={(v) => setCalcData(p => ({ 
                                ...p, 
                                vendor_risk: { ...p.vendor_risk, [factor]: v } 
                              }))}
                            >
                              <SelectTrigger className="mt-1 bg-neutral-950 border-neutral-800 text-neutral-300 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-neutral-900 border-neutral-700">
                                <SelectItem value="none" className="text-neutral-300">None</SelectItem>
                                <SelectItem value="low" className="text-neutral-300">Low</SelectItem>
                                <SelectItem value="medium" className="text-neutral-300">Medium</SelectItem>
                                <SelectItem value="high" className="text-neutral-300">High</SelectItem>
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
            <Card className="dark-card" data-testid="pricing-section">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-white font-['Manrope']">Pricing Settings</CardTitle>
                    <CardDescription className="text-neutral-500">Configure margins and pricing strategy</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Split Margins Toggle */}
                <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-lg mb-4">
                  <div>
                    <Label className="text-white font-medium">Split Margins</Label>
                    <p className="text-xs text-neutral-500 mt-0.5">Separate margins for internal vs vendor costs</p>
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
                      <Label className="text-neutral-400 text-sm flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        Internal Margin %
                      </Label>
                      <Input
                        type="number"
                        value={calcData.internal_margin_percent}
                        onChange={(e) => setCalcData(p => ({ ...p, internal_margin_percent: parseFloat(e.target.value) || 0 }))}
                        className="mt-1.5 bg-neutral-950 border-neutral-800 text-white font-mono"
                        data-testid="internal-margin-input"
                      />
                    </div>
                    <div>
                      <Label className="text-neutral-400 text-sm flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        Vendor Margin %
                      </Label>
                      <Input
                        type="number"
                        value={calcData.vendor_margin_percent}
                        onChange={(e) => setCalcData(p => ({ ...p, vendor_margin_percent: parseFloat(e.target.value) || 0 }))}
                        className="mt-1.5 bg-neutral-950 border-neutral-800 text-white font-mono"
                        data-testid="vendor-margin-input"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-neutral-400 text-sm">Target Margin %</Label>
                    <Input
                      type="number"
                      value={calcData.target_margin_percent}
                      onChange={(e) => setCalcData(p => ({ ...p, target_margin_percent: parseFloat(e.target.value) || 0 }))}
                      className="mt-1.5 bg-neutral-950 border-neutral-800 text-white font-mono max-w-xs"
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
          <div className="dark-card-elevated h-full flex flex-col p-6 overflow-y-auto glow-box" data-testid="dashboard">
            {/* Revenue & Profit */}
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Revenue</p>
                  <p className="text-2xl font-bold text-white font-mono mt-1" data-testid="revenue">
                    {results ? formatCurrency(results.selling_price) : 'SAR 0'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Net Profit</p>
                  <p className={`text-2xl font-bold font-mono mt-1 ${results?.contribution_margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} data-testid="profit">
                    {results ? formatCurrency(results.contribution_margin) : 'SAR 0'}
                  </p>
                </div>
              </div>
            </div>

            {/* Margin Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-400">Contribution Margin</span>
                <span className={`text-lg font-bold font-mono ${
                  (results?.contribution_margin_percent || 0) >= 30 ? 'text-emerald-400' : 
                  (results?.contribution_margin_percent || 0) >= 20 ? 'text-amber-400' : 'text-rose-400'
                }`} data-testid="margin-percent">
                  {results?.contribution_margin_percent?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className={`progress-bar-fill ${
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
                <span className="text-xs text-neutral-500">Deal Size:</span>
                <Badge className={`text-xs uppercase font-mono ${
                  results.incentive_breakdown.deal_size === 'mega' ? 'badge-info' :
                  results.incentive_breakdown.deal_size === 'big' ? 'badge-warning' :
                  results.incentive_breakdown.deal_size === 'standard' ? 'badge-success' :
                  'badge-neutral'
                }`}>
                  {results.incentive_breakdown.deal_size}
                </Badge>
              </div>
            )}

            {/* Cost Breakdown */}
            <div className="mb-6">
              <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Cost Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Internal Labor</span>
                  <span className="text-white font-mono">{formatCurrency(results?.internal_labor_cost || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Vendor Cost</span>
                  <span className="text-white font-mono">{formatCurrency(results?.vendor_cost || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Overhead</span>
                  <span className="text-white font-mono">{formatCurrency(results?.overhead_cost || 0)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-neutral-800">
                  <span className="text-neutral-300 font-medium">Total COGS</span>
                  <span className="text-white font-mono font-medium">{formatCurrency(results?.cogs || 0)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="mb-6">
              <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Deductions</h4>
              <div className="space-y-2">
                {results?.incentive_breakdown ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Sales Rep</span>
                      <span className="text-rose-400 font-mono">-{formatCurrency(results.incentive_breakdown.sales_rep.capped_value)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Sales Manager</span>
                      <span className="text-rose-400 font-mono">-{formatCurrency(results.incentive_breakdown.sales_manager.capped_value)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Sales Incentive</span>
                    <span className="text-rose-400 font-mono">-{formatCurrency(results?.sales_incentive || 0)}</span>
                  </div>
                )}
                {results?.financing_cost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Financing Cost</span>
                    <span className="text-rose-400 font-mono">-{formatCurrency(results.financing_cost)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Final Price */}
            <div className="p-4 bg-neutral-800/50 rounded-lg mb-6">
              <div className="flex justify-between items-center">
                <span className="text-neutral-300">Selling Price</span>
                <span className="text-2xl font-bold text-white font-mono" data-testid="selling-price">
                  {formatCurrency(results?.selling_price || 0)}
                </span>
              </div>
            </div>

            {/* Warnings */}
            {results?.warnings && results.warnings.length > 0 && (
              <div className="space-y-2 mb-6">
                {results.warnings.map((warning, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                      warning.severity === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
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
              <div className="p-4 bg-neutral-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-500 uppercase tracking-wider">Risk Assessment</span>
                  <Badge className={`text-xs ${
                    results.risk_level === 'High' ? 'badge-danger' :
                    results.risk_level === 'Medium' ? 'badge-warning' :
                    'badge-success'
                  }`}>
                    {results.risk_level}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Risk Multiplier</span>
                  <span className="text-white font-mono">×{results.total_risk_multiplier?.toFixed(3)}</span>
                </div>
              </div>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}

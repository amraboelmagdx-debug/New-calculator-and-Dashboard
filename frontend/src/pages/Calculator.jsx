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
  LayoutTemplate, Calculator as CalcIcon, Download, Sun, Moon
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
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true);
  
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
    <div className={`min-h-screen ${isDarkMode ? 'bg-neutral-950' : 'bg-slate-100'}`}>
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
                <span className={`font-bold text-sm font-['Manrope'] ${isDarkMode ? 'text-neutral-900' : 'text-white'}`}>ZAN</span>
              </div>
            )}
            <div>
              <h1 className={`text-lg font-bold font-['Manrope'] ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
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
              className={`${isDarkMode ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
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
              className={`${isDarkMode ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
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
          <div className="px-2">
            <Label className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Load Template</Label>
            <Select onValueChange={loadScopeTemplate}>
              <SelectTrigger className={`mt-2 text-sm ${isDarkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-white border-slate-300 text-slate-700'}`} data-testid="template-select">
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
                    <CardTitle className={`text-lg font-['Manrope'] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Project Information</CardTitle>
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
                      <CardTitle className={`text-lg font-['Manrope'] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Internal Team</CardTitle>
                      <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>Add roles and configure hours or utilization</CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={addTeamMember} 
                    className={`font-semibold ${isDarkMode ? 'bg-white text-neutral-900 hover:bg-neutral-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    data-testid="add-team-member-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Role
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {calcData.team_members.length === 0 ? (
                  <div className={`text-center py-12 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
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
                        darkMode={isDarkMode}
                      />
                    ))}
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
                      <CardTitle className={`text-lg font-['Manrope'] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Vendors</CardTitle>
                      <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>External services and costs</CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={addVendor} 
                    className={`font-semibold ${isDarkMode ? 'bg-white text-neutral-900 hover:bg-neutral-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
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
                    <CardTitle className={`text-lg font-['Manrope'] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Pricing Settings</CardTitle>
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
          <div className={`h-full flex flex-col p-6 overflow-y-auto rounded-2xl shadow-xl border ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'}`} data-testid="dashboard">
            {/* Revenue & Profit */}
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Revenue</p>
                  <p className={`text-2xl font-bold font-mono mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`} data-testid="revenue">
                    {results ? formatCurrency(results.selling_price) : 'SAR 0'}
                  </p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>Net Profit</p>
                  <p className={`text-2xl font-bold font-mono mt-1 ${results?.contribution_margin >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} data-testid="profit">
                    {results ? formatCurrency(results.contribution_margin) : 'SAR 0'}
                  </p>
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
                <div className="flex justify-between text-sm">
                  <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Internal Labor</span>
                  <span className={`font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(results?.internal_labor_cost || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Vendor Cost</span>
                  <span className={`font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(results?.vendor_cost || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-600'}>Overhead</span>
                  <span className={`font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(results?.overhead_cost || 0)}</span>
                </div>
                <div className={`flex justify-between text-sm pt-2 border-t ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
                  <span className={`font-medium ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>Total COGS</span>
                  <span className={`font-mono font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(results?.cogs || 0)}</span>
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
            <div className="p-4 bg-indigo-600 rounded-xl mb-6">
              <div className="flex justify-between items-center">
                <span className="text-indigo-100">Selling Price</span>
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
    </div>
  );
}

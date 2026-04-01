import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, Package, Layers, Truck, CreditCard, Gauge, Percent, 
  AlertTriangle, Palette, Database, LogOut, ChevronRight, Save,
  Plus, Pencil, Trash2, Check, X, Settings2, FileSpreadsheet, RefreshCw,
  Target, ShieldAlert, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  getRoles, createRole, updateRole, deleteRole,
  getProductTemplates, createProductTemplate, updateProductTemplate, deleteProductTemplate,
  getScopeTemplates, createScopeTemplate, updateScopeTemplate, deleteScopeTemplate,
  getVendorServices, createVendorService, updateVendorService, deleteVendorService,
  getPaymentTerms, createPaymentTerm, updatePaymentTerm, deletePaymentTerm,
  getOverheadRates, updateOverheadRates,
  getSalesIncentives, updateSalesIncentives,
  getRiskMultipliers, createRiskMultiplier, updateRiskMultiplier, deleteRiskMultiplier,
  getThemeSettings, updateThemeSettings,
  getHRConfig, updateHRConfig, importGoogleSheet,
  getPricingGuidelines, createPricingGuideline, updatePricingGuideline, deletePricingGuideline,
  getRiskConfig, updateRiskConfig,
  getIncentiveRules, createIncentiveRule, updateIncentiveRule, deleteIncentiveRule, bulkUpdateIncentiveRules,
  getIncentiveMultipliers, updateIncentiveMultipliers,
  seedDatabase,
  setAdminPassword, getAdminPassword
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const ADMIN_PASSWORD = 'Amr123';

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated
    if (getAdminPassword() === ADMIN_PASSWORD) {
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAdminPassword(password);
      setAuthenticated(true);
      toast.success('Welcome to Admin Panel');
    } else {
      toast.error('Invalid password');
    }
  };

  const handleLogout = () => {
    setAdminPassword('');
    setAuthenticated(false);
    setPassword('');
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center light-theme" data-testid="admin-login">
        <Card className="w-full max-w-md bg-white border-slate-200 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
              <span className="text-white font-bold text-lg font-['Manrope']">ZAN</span>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Admin Access</CardTitle>
            <CardDescription className="text-slate-500">Enter password to access admin panel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
                  data-testid="admin-password-input"
                />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="admin-login-btn">
                Login
              </Button>
              <Link to="/" className="block text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Back to Calculator
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navItems = [
    { path: '/admin/roles', label: 'Roles', icon: Users },
    { path: '/admin/hr-config', label: 'HR Cost Config', icon: Settings2 },
    { path: '/admin/pricing-guidelines', label: 'Pricing Guidelines', icon: Target },
    { path: '/admin/risk-config', label: 'Risk Configuration', icon: ShieldAlert },
    { path: '/admin/incentive-rules', label: 'Incentive Rules', icon: DollarSign },
    { path: '/admin/product-templates', label: 'Product Templates', icon: Package },
    { path: '/admin/scope-templates', label: 'Scope Templates', icon: Layers },
    { path: '/admin/vendor-services', label: 'Vendor Services', icon: Truck },
    { path: '/admin/payment-terms', label: 'Payment Terms', icon: CreditCard },
    { path: '/admin/overhead-rates', label: 'Overhead Rates', icon: Gauge },
    { path: '/admin/sales-incentives', label: 'Sales Incentives (Legacy)', icon: Percent },
    { path: '/admin/risk-multipliers', label: 'Risk Multipliers', icon: AlertTriangle },
    { path: '/admin/theme', label: 'Theme Settings', icon: Palette },
    { path: '/admin/data', label: 'Seed Data', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-white flex light-theme" data-testid="admin-panel">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col" data-testid="admin-sidebar">
        <div className="p-5 border-b border-slate-200">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md shadow-indigo-100">
              <span className="text-white font-bold text-sm font-['Manrope']">ZAN</span>
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Admin Panel</h1>
              <p className="text-xs text-slate-500">Configuration</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto" data-testid="admin-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors mx-2 rounded-lg ${
                  isActive 
                    ? 'text-white bg-indigo-600 shadow-md shadow-indigo-100' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                data-testid={`nav-${item.path.split('/').pop()}`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto bg-white" data-testid="admin-content">
        <Routes>
          <Route path="/" element={<AdminWelcome />} />
          <Route path="/roles" element={<RolesManager />} />
          <Route path="/hr-config" element={<HRConfigManager />} />
          <Route path="/pricing-guidelines" element={<PricingGuidelinesManager />} />
          <Route path="/risk-config" element={<RiskConfigManager />} />
          <Route path="/incentive-rules" element={<IncentiveRulesManager />} />
          <Route path="/product-templates" element={<ProductTemplatesManager />} />
          <Route path="/scope-templates" element={<ScopeTemplatesManager />} />
          <Route path="/vendor-services" element={<VendorServicesManager />} />
          <Route path="/payment-terms" element={<PaymentTermsManager />} />
          <Route path="/overhead-rates" element={<OverheadRatesManager />} />
          <Route path="/sales-incentives" element={<SalesIncentivesManager />} />
          <Route path="/risk-multipliers" element={<RiskMultipliersManager />} />
          <Route path="/theme" element={<ThemeManager />} />
          <Route path="/data" element={<DataManager />} />
        </Routes>
      </main>
    </div>
  );
}

// Admin Welcome
function AdminWelcome() {
  return (
    <div className="max-w-2xl" data-testid="admin-welcome">
      <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] mb-2">Welcome to Admin</h1>
      <p className="text-slate-500 mb-8">Manage your pricing engine configuration</p>
      <div className="grid grid-cols-2 gap-4">
        <Card className="hover:shadow-lg transition-shadow border-slate-200 bg-white">
          <CardContent className="pt-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Roles & Rates</h3>
            <p className="text-sm text-slate-500 mt-1">Manage team roles and hourly rates</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow border-slate-200 bg-white">
          <CardContent className="pt-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-3">
              <Package className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Templates</h3>
            <p className="text-sm text-slate-500 mt-1">Configure product and scope templates</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow border-slate-200 bg-white">
          <CardContent className="pt-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-3">
              <Gauge className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Overhead & Incentives</h3>
            <p className="text-sm text-slate-500 mt-1">Set overhead rates and sales commissions</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow border-slate-200 bg-white">
          <CardContent className="pt-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-3">
              <Palette className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Theme</h3>
            <p className="text-sm text-slate-500 mt-1">Customize colors and branding</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Roles Manager
function RolesManager() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', hourly_rate: 0, monthly_salary: 0, description: '' });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (error) {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingRole) {
        await updateRole(editingRole.id, formData);
        toast.success('Role updated');
      } else {
        await createRole(formData);
        toast.success('Role created');
      }
      setIsDialogOpen(false);
      setEditingRole(null);
      setFormData({ name: '', hourly_rate: 0, monthly_salary: 0, description: '' });
      loadRoles();
    } catch (error) {
      toast.error('Failed to save role');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await deleteRole(id);
        toast.success('Role deleted');
        loadRoles();
      } catch (error) {
        toast.error('Failed to delete role');
      }
    }
  };

  const openEdit = (role) => {
    setEditingRole(role);
    setFormData({ name: role.name, hourly_rate: role.hourly_rate, monthly_salary: role.monthly_salary, description: role.description || '' });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingRole(null);
    setFormData({ name: '', hourly_rate: 0, monthly_salary: 0, description: '' });
    setIsDialogOpen(true);
  };

  return (
    <div data-testid="roles-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Roles</h1>
          <p className="text-slate-600">Manage team roles, salaries, and HR benefits</p>
        </div>
        <Button onClick={openCreate} className="gap-2" data-testid="add-role-btn">
          <Plus className="w-4 h-4" />
          Add Role
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Hourly Rate</TableHead>
              <TableHead>Monthly Salary</TableHead>
              <TableHead>Social Insurance</TableHead>
              <TableHead>Medical Ins.</TableHead>
              <TableHead>End of Service</TableHead>
              <TableHead>Total Monthly</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map(role => (
              <TableRow key={role.id} data-testid={`role-row-${role.id}`}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell className="font-mono text-sm">{formatCurrency(role.hourly_rate, false)}</TableCell>
                <TableCell className="font-mono text-sm">{formatCurrency(role.monthly_salary, false)}</TableCell>
                <TableCell className="font-mono text-sm text-slate-500">{formatCurrency(role.social_insurance || 0, false)}</TableCell>
                <TableCell className="font-mono text-sm text-slate-500">{formatCurrency(role.medical_insurance || 0, false)}</TableCell>
                <TableCell className="font-mono text-sm text-slate-500">{formatCurrency(role.end_of_service || 0, false)}</TableCell>
                <TableCell className="font-mono text-sm font-semibold text-indigo-600">{formatCurrency(role.total_monthly_cost || role.monthly_salary, false)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(role)} data-testid={`edit-role-${role.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(role.id)} className="text-red-500 hover:text-red-700" data-testid={`delete-role-${role.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="role-dialog">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Add New Role'}</DialogTitle>
            <DialogDescription>Enter role details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Creative Director"
                data-testid="role-name-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hourly Rate (SAR)</Label>
                <Input
                  type="number"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                  data-testid="role-rate-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Salary (SAR)</Label>
                <Input
                  type="number"
                  value={formData.monthly_salary}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_salary: parseFloat(e.target.value) || 0 }))}
                  data-testid="role-salary-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
                data-testid="role-desc-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="save-role-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simplified managers for other entities (following same pattern)
function ProductTemplatesManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getProductTemplates();
      setTemplates(data);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="product-templates-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Product Templates</h1>
          <p className="text-slate-600">Pre-configured products with default roles</p>
        </div>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Avg Deal Size (SAR)</TableHead>
              <TableHead>Standard CM %</TableHead>
              <TableHead>Default Roles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map(template => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell className="font-mono">{formatCurrency(template.avg_deal_size, false)}</TableCell>
                <TableCell className="font-mono">{template.standard_cm_percent}%</TableCell>
                <TableCell>{template.default_roles?.length || 0} roles</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ScopeTemplatesManager() {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    getScopeTemplates().then(setTemplates).catch(() => toast.error('Failed to load'));
  }, []);

  return (
    <div data-testid="scope-templates-manager">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Scope Templates</h1>
        <p className="text-slate-600">Pre-configured scope packages</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Products</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="capitalize">{t.scope_type}</TableCell>
                <TableCell>{t.default_products?.length || 0} products</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function VendorServicesManager() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: '', default_markup_percent: 15 });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await getVendorServices();
      setServices(data);
    } catch (error) {
      toast.error('Failed to load vendor services');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingService) {
        await updateVendorService(editingService.id, formData);
        toast.success('Vendor service updated');
      } else {
        await createVendorService(formData);
        toast.success('Vendor service created');
      }
      setIsDialogOpen(false);
      setEditingService(null);
      setFormData({ name: '', category: '', default_markup_percent: 15 });
      loadServices();
    } catch (error) {
      toast.error('Failed to save vendor service');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vendor service?')) {
      try {
        await deleteVendorService(id);
        toast.success('Vendor service deleted');
        loadServices();
      } catch (error) {
        toast.error('Failed to delete vendor service');
      }
    }
  };

  const openEdit = (service) => {
    setEditingService(service);
    setFormData({ 
      name: service.name, 
      category: service.category || '', 
      default_markup_percent: service.default_markup_percent 
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingService(null);
    setFormData({ name: '', category: '', default_markup_percent: 15 });
    setIsDialogOpen(true);
  };

  return (
    <div data-testid="vendor-services-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Vendor Services</h1>
          <p className="text-slate-600">External services with default markups</p>
        </div>
        <Button onClick={openCreate} className="gap-2" data-testid="add-vendor-service-btn">
          <Plus className="w-4 h-4" />
          Add Vendor Service
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Default Markup %</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map(service => (
              <TableRow key={service.id} data-testid={`vendor-service-row-${service.id}`}>
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell>{service.category || '-'}</TableCell>
                <TableCell className="font-mono">{service.default_markup_percent}%</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(service)} data-testid={`edit-vendor-service-${service.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(service.id)} className="text-red-500 hover:text-red-700" data-testid={`delete-vendor-service-${service.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="vendor-service-dialog">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Vendor Service' : 'Add New Vendor Service'}</DialogTitle>
            <DialogDescription>Enter vendor service details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Production House"
                data-testid="vendor-service-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Production, Media, Technology"
                data-testid="vendor-service-category-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Default Markup %</Label>
              <Input
                type="number"
                value={formData.default_markup_percent}
                onChange={(e) => setFormData(prev => ({ ...prev, default_markup_percent: parseFloat(e.target.value) || 0 }))}
                data-testid="vendor-service-markup-input"
              />
              <p className="text-xs text-slate-500">This markup will be applied by default when adding this service to quotes</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="save-vendor-service-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentTermsManager() {
  const [terms, setTerms] = useState([]);

  useEffect(() => {
    getPaymentTerms().then(setTerms).catch(() => toast.error('Failed to load'));
  }, []);

  return (
    <div data-testid="payment-terms-manager">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Payment Terms</h1>
        <p className="text-slate-600">Payment conditions and financing impact</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Advance %</TableHead>
              <TableHead>Payment Days</TableHead>
              <TableHead>Interest Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terms.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="font-mono">{t.advance_percent}%</TableCell>
                <TableCell className="font-mono">{t.payment_days} days</TableCell>
                <TableCell className="font-mono">{(t.interest_rate * 100).toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function OverheadRatesManager() {
  const [overhead, setOverhead] = useState(null);
  const [formData, setFormData] = useState({ total_company_overhead: 0, total_billable_hours: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOverheadRates().then(data => {
      setOverhead(data);
      setFormData({ total_company_overhead: data.total_company_overhead, total_billable_hours: data.total_billable_hours });
    }).catch(() => toast.error('Failed to load'));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOverheadRates(formData);
      const updated = await getOverheadRates();
      setOverhead(updated);
      toast.success('Overhead rates updated');
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const calculatedRate = formData.total_billable_hours > 0 
    ? formData.total_company_overhead / formData.total_billable_hours 
    : 0;

  return (
    <div data-testid="overhead-rates-manager">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Overhead Rates</h1>
        <p className="text-slate-600">Configure overhead allocation</p>
      </div>
      <Card className="max-w-xl">
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label>Total Company Overhead (SAR/year)</Label>
            <Input
              type="number"
              value={formData.total_company_overhead}
              onChange={(e) => setFormData(prev => ({ ...prev, total_company_overhead: parseFloat(e.target.value) || 0 }))}
              data-testid="overhead-total-input"
            />
          </div>
          <div className="space-y-2">
            <Label>Total Billable Hours (hours/year)</Label>
            <Input
              type="number"
              value={formData.total_billable_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, total_billable_hours: parseFloat(e.target.value) || 0 }))}
              data-testid="overhead-hours-input"
            />
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500 mb-1">Calculated Overhead Rate</p>
            <p className="text-2xl font-bold font-mono text-slate-900" data-testid="overhead-rate">
              {formatCurrency(calculatedRate, false)} / hour
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full" data-testid="save-overhead-btn">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SalesIncentivesManager() {
  const [incentive, setIncentive] = useState(null);
  const [percent, setPercent] = useState(5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSalesIncentives().then(data => {
      setIncentive(data);
      setPercent(data.percent);
    }).catch(() => toast.error('Failed to load'));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSalesIncentives(percent);
      toast.success('Sales incentive updated');
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="sales-incentives-manager">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Sales Incentives</h1>
        <p className="text-slate-600">Configure sales commission percentage</p>
      </div>
      <Card className="max-w-xl">
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label>Sales Incentive Percentage</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={percent}
                onChange={(e) => setPercent(parseFloat(e.target.value) || 0)}
                className="max-w-32"
                data-testid="sales-percent-input"
              />
              <span className="text-slate-600">%</span>
            </div>
            <p className="text-sm text-slate-500">This percentage is deducted from the selling price for sales commission</p>
          </div>
          <Button onClick={handleSave} disabled={saving} data-testid="save-sales-btn">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RiskMultipliersManager() {
  const [multipliers, setMultipliers] = useState([]);

  useEffect(() => {
    getRiskMultipliers().then(setMultipliers).catch(() => toast.error('Failed to load'));
  }, []);

  return (
    <div data-testid="risk-multipliers-manager">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Risk Multipliers</h1>
        <p className="text-slate-600">Cost multipliers based on risk level</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Risk Level</TableHead>
              <TableHead>Multiplier</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {multipliers.map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.level}</TableCell>
                <TableCell className="font-mono">{m.multiplier}x</TableCell>
                <TableCell className="text-slate-500">{m.description || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ThemeManager() {
  const [theme, setTheme] = useState(null);
  const [formData, setFormData] = useState({
    primary_color: '#0F172A',
    brand_color: '#4F46E5',
    success_color: '#10B981',
    warning_color: '#F59E0B',
    destructive_color: '#EF4444',
    logo_url: '',
    company_name: 'OPE'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getThemeSettings().then(data => {
      setTheme(data);
      setFormData({
        primary_color: data.primary_color || '#0F172A',
        brand_color: data.brand_color || '#4F46E5',
        success_color: data.success_color || '#10B981',
        warning_color: data.warning_color || '#F59E0B',
        destructive_color: data.destructive_color || '#EF4444',
        logo_url: data.logo_url || '',
        company_name: data.company_name || 'OPE'
      });
    }).catch(() => toast.error('Failed to load'));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateThemeSettings(formData);
      toast.success('Theme settings updated');
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="theme-manager">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Theme Settings</h1>
        <p className="text-slate-600">Customize branding and colors</p>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                data-testid="company-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                value={formData.logo_url}
                onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
                data-testid="logo-url-input"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Colors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'primary_color', label: 'Primary' },
              { key: 'brand_color', label: 'Brand' },
              { key: 'success_color', label: 'Success' },
              { key: 'warning_color', label: 'Warning' },
              { key: 'destructive_color', label: 'Destructive' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-4">
                <input
                  type="color"
                  value={formData[key]}
                  onChange={(e) => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer"
                  data-testid={`color-${key}`}
                />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-slate-500 font-mono">{formData[key]}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        <Button onClick={handleSave} disabled={saving} data-testid="save-theme-btn">
          {saving ? 'Saving...' : 'Save Theme Settings'}
        </Button>
      </div>
    </div>
  );
}

function DataManager() {
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    if (window.confirm('This will reset all data to sample values. Continue?')) {
      setSeeding(true);
      try {
        await seedDatabase();
        toast.success('Database seeded successfully');
      } catch (error) {
        toast.error('Failed to seed database');
      } finally {
        setSeeding(false);
      }
    }
  };

  return (
    <div data-testid="data-manager">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Seed Data</h1>
        <p className="text-slate-600">Reset database with sample data</p>
      </div>
      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <p className="text-amber-800 text-sm">
              <strong>Warning:</strong> This will delete all existing configuration data and replace it with sample data.
            </p>
          </div>
          <Button onClick={handleSeed} disabled={seeding} variant="destructive" data-testid="seed-btn">
            {seeding ? 'Seeding...' : 'Seed Database'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// HR Config Manager with Google Sheets Integration
function HRConfigManager() {
  const [config, setConfig] = useState(null);
  const [formData, setFormData] = useState({
    social_insurance_percent: 12,
    medical_insurance_percent: 3,
    end_of_service_divisor: 2,
    google_sheets_enabled: false,
    google_sheets_url: ''
  });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await getHRConfig();
      setConfig(data);
      setFormData({
        social_insurance_percent: data.social_insurance_percent || 12,
        medical_insurance_percent: data.medical_insurance_percent || 3,
        end_of_service_divisor: data.end_of_service_divisor || 2,
        google_sheets_enabled: data.google_sheets_enabled || false,
        google_sheets_url: data.google_sheets_url || ''
      });
    } catch (error) {
      toast.error('Failed to load HR config');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateHRConfig(formData);
      toast.success('HR configuration updated');
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleImportFromSheet = async () => {
    if (!formData.google_sheets_url) {
      toast.error('Please enter a Google Sheets URL');
      return;
    }
    
    setImporting(true);
    try {
      const result = await importGoogleSheet(formData.google_sheets_url);
      toast.success(`Successfully imported ${result.imported} roles from Google Sheets`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to import from Google Sheets');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div data-testid="hr-config-manager">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">HR Cost Configuration</h1>
        <p className="text-slate-600">Configure benefits percentages and Google Sheets integration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Benefits Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Benefits Percentages
            </CardTitle>
            <CardDescription>Configure how benefits are calculated from base salary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Social Insurance %</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={formData.social_insurance_percent}
                  onChange={(e) => setFormData(prev => ({ ...prev, social_insurance_percent: parseFloat(e.target.value) || 0 }))}
                  className="max-w-32"
                  data-testid="social-insurance-input"
                />
                <span className="text-slate-500">% of monthly salary</span>
              </div>
              <p className="text-xs text-slate-400">Default: 12%</p>
            </div>

            <div className="space-y-2">
              <Label>Medical Insurance %</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={formData.medical_insurance_percent}
                  onChange={(e) => setFormData(prev => ({ ...prev, medical_insurance_percent: parseFloat(e.target.value) || 0 }))}
                  className="max-w-32"
                  data-testid="medical-insurance-input"
                />
                <span className="text-slate-500">% of monthly salary</span>
              </div>
              <p className="text-xs text-slate-400">Default: 3%</p>
            </div>

            <div className="space-y-2">
              <Label>End of Service Divisor</Label>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">Salary ÷</span>
                <Input
                  type="number"
                  value={formData.end_of_service_divisor}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_of_service_divisor: parseFloat(e.target.value) || 2 }))}
                  className="max-w-32"
                  data-testid="eos-divisor-input"
                />
              </div>
              <p className="text-xs text-slate-400">Default: 2 (means salary/2 per month)</p>
            </div>

            <div className="p-4 bg-indigo-50 rounded-lg">
              <h4 className="text-sm font-semibold text-indigo-900 mb-2">Example Calculation</h4>
              <p className="text-xs text-indigo-700">
                For SAR 20,000 salary:<br />
                • Social Insurance: SAR {(20000 * formData.social_insurance_percent / 100).toLocaleString()}<br />
                • Medical Insurance: SAR {(20000 * formData.medical_insurance_percent / 100).toLocaleString()}<br />
                • End of Service: SAR {formData.end_of_service_divisor > 0 ? (20000 / formData.end_of_service_divisor).toLocaleString() : 0}<br />
                <strong>Total Monthly Cost: SAR {(20000 + 20000 * formData.social_insurance_percent / 100 + 20000 * formData.medical_insurance_percent / 100 + (formData.end_of_service_divisor > 0 ? 20000 / formData.end_of_service_divisor : 0)).toLocaleString()}</strong>
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full" data-testid="save-hr-config-btn">
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </CardContent>
        </Card>

        {/* Google Sheets Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Google Sheets Integration
            </CardTitle>
            <CardDescription>Import roles and salaries from a Google Sheet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Enable Google Sheets</Label>
                <p className="text-xs text-slate-500">Sync roles from external spreadsheet</p>
              </div>
              <Switch
                checked={formData.google_sheets_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, google_sheets_enabled: checked }))}
                data-testid="google-sheets-toggle"
              />
            </div>

            {formData.google_sheets_enabled && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label>Google Sheets URL</Label>
                  <Input
                    value={formData.google_sheets_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, google_sheets_url: e.target.value }))}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    data-testid="google-sheets-url-input"
                  />
                  <p className="text-xs text-slate-400">
                    Make sure the sheet is publicly accessible (Anyone with link can view)
                  </p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-amber-900 mb-2">Required Columns</h4>
                  <ul className="text-xs text-amber-800 space-y-1">
                    <li>• <strong>Role Name</strong> or <strong>الدور</strong></li>
                    <li>• <strong>Average Salary</strong> or <strong>متوسط الراتب</strong></li>
                  </ul>
                </div>

                <Button 
                  onClick={handleImportFromSheet} 
                  disabled={importing || !formData.google_sheets_url}
                  variant="outline"
                  className="w-full gap-2"
                  data-testid="import-sheets-btn"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      Import from Google Sheets
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Pricing Guidelines Manager
function PricingGuidelinesManager() {
  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingGuideline, setEditingGuideline] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'general',
    deal_size: 'standard',
    deal_size_min: 0,
    deal_size_max: 0,
    min_margin: 15,
    target_margin: 30,
    premium_margin: 45,
    min_internal_margin: 25,
    min_vendor_margin: 10,
    description: '',
    is_active: true
  });

  useEffect(() => {
    loadGuidelines();
  }, []);

  const loadGuidelines = async () => {
    try {
      const data = await getPricingGuidelines();
      setGuidelines(data);
    } catch (error) {
      toast.error('Failed to load pricing guidelines');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingGuideline) {
        await updatePricingGuideline(editingGuideline.id, formData);
        toast.success('Pricing guideline updated');
      } else {
        await createPricingGuideline(formData);
        toast.success('Pricing guideline created');
      }
      setIsDialogOpen(false);
      setEditingGuideline(null);
      resetForm();
      loadGuidelines();
    } catch (error) {
      toast.error('Failed to save pricing guideline');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this guideline?')) {
      try {
        await deletePricingGuideline(id);
        toast.success('Pricing guideline deleted');
        loadGuidelines();
      } catch (error) {
        toast.error('Failed to delete guideline');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'general',
      deal_size: 'standard',
      deal_size_min: 0,
      deal_size_max: 0,
      min_margin: 15,
      target_margin: 30,
      premium_margin: 45,
      min_internal_margin: 25,
      min_vendor_margin: 10,
      description: '',
      is_active: true
    });
  };

  const openEdit = (guideline) => {
    setEditingGuideline(guideline);
    setFormData({
      name: guideline.name,
      category: guideline.category || 'general',
      deal_size: guideline.deal_size || 'standard',
      deal_size_min: guideline.deal_size_min || 0,
      deal_size_max: guideline.deal_size_max || 0,
      min_margin: guideline.min_margin,
      target_margin: guideline.target_margin,
      premium_margin: guideline.premium_margin,
      min_internal_margin: guideline.min_internal_margin || 25,
      min_vendor_margin: guideline.min_vendor_margin || 10,
      description: guideline.description || '',
      is_active: guideline.is_active !== false
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingGuideline(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const categories = [
    { value: 'general', label: 'General (By Deal Size)' },
    { value: 'branding', label: 'Branding Services' },
    { value: 'campaign', label: 'Campaign Services' },
    { value: 'digital', label: 'Digital Services' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'staffing', label: 'Staffing / Secondment' }
  ];

  const dealSizes = [
    { value: 'tiny', label: 'Tiny (<50K)' },
    { value: 'standard', label: 'Standard (50K-200K)' },
    { value: 'big', label: 'Big (200K-500K)' },
    { value: 'mega', label: 'Mega (500K+)' }
  ];

  return (
    <div data-testid="pricing-guidelines-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Pricing Guidelines</h1>
          <p className="text-slate-600">Configure margin thresholds by deal size and service type</p>
        </div>
        <Button onClick={openCreate} className="gap-2" data-testid="add-guideline-btn">
          <Plus className="w-4 h-4" />
          Add Guideline
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Deal Size Range (SAR)</TableHead>
              <TableHead className="text-center text-red-600">Min %</TableHead>
              <TableHead className="text-center text-amber-600">Target %</TableHead>
              <TableHead className="text-center text-emerald-600">Premium %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guidelines.map(g => (
              <TableRow key={g.id} data-testid={`guideline-row-${g.id}`}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell className="capitalize">{g.category || 'general'}</TableCell>
                <TableCell className="font-mono text-sm text-slate-500">
                  {g.deal_size_min?.toLocaleString()} - {g.deal_size_max?.toLocaleString()}
                </TableCell>
                <TableCell className="text-center font-mono font-semibold text-red-600">{g.min_margin}%</TableCell>
                <TableCell className="text-center font-mono font-semibold text-amber-600">{g.target_margin}%</TableCell>
                <TableCell className="text-center font-mono font-semibold text-emerald-600">{g.premium_margin}%</TableCell>
                <TableCell>
                  <Badge className={g.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                    {g.is_active !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(g)} data-testid={`edit-guideline-${g.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(g.id)} className="text-red-500 hover:text-red-700" data-testid={`delete-guideline-${g.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="guideline-dialog">
          <DialogHeader>
            <DialogTitle>{editingGuideline ? 'Edit Pricing Guideline' : 'Add New Pricing Guideline'}</DialogTitle>
            <DialogDescription>Define margin thresholds for this guideline</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Guideline Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard Projects"
                  data-testid="guideline-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger data-testid="guideline-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Deal Size Label</Label>
                <Select value={formData.deal_size} onValueChange={(v) => setFormData(prev => ({ ...prev, deal_size: v }))}>
                  <SelectTrigger data-testid="guideline-dealsize-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dealSizes.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Min Deal Size (SAR)</Label>
                <Input
                  type="number"
                  value={formData.deal_size_min}
                  onChange={(e) => setFormData(prev => ({ ...prev, deal_size_min: parseFloat(e.target.value) || 0 }))}
                  data-testid="guideline-min-size-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Deal Size (SAR)</Label>
                <Input
                  type="number"
                  value={formData.deal_size_max}
                  onChange={(e) => setFormData(prev => ({ ...prev, deal_size_max: parseFloat(e.target.value) || 0 }))}
                  data-testid="guideline-max-size-input"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Margin Thresholds</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-red-600">Minimum Margin %</Label>
                  <Input
                    type="number"
                    value={formData.min_margin}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_margin: parseFloat(e.target.value) || 0 }))}
                    className="border-red-200 focus:border-red-400"
                    data-testid="guideline-min-margin-input"
                  />
                  <p className="text-xs text-slate-400">Below this = Warning</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-600">Target Margin %</Label>
                  <Input
                    type="number"
                    value={formData.target_margin}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_margin: parseFloat(e.target.value) || 0 }))}
                    className="border-amber-200 focus:border-amber-400"
                    data-testid="guideline-target-margin-input"
                  />
                  <p className="text-xs text-slate-400">Acceptable range</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-emerald-600">Premium Margin %</Label>
                  <Input
                    type="number"
                    value={formData.premium_margin}
                    onChange={(e) => setFormData(prev => ({ ...prev, premium_margin: parseFloat(e.target.value) || 0 }))}
                    className="border-emerald-200 focus:border-emerald-400"
                    data-testid="guideline-premium-margin-input"
                  />
                  <p className="text-xs text-slate-400">Excellent margin</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Internal Margin %</Label>
                <Input
                  type="number"
                  value={formData.min_internal_margin}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_internal_margin: parseFloat(e.target.value) || 0 }))}
                  data-testid="guideline-min-internal-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Vendor Margin %</Label>
                <Input
                  type="number"
                  value={formData.min_vendor_margin}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_vendor_margin: parseFloat(e.target.value) || 0 }))}
                  data-testid="guideline-min-vendor-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                data-testid="guideline-desc-input"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                data-testid="guideline-active-toggle"
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="save-guideline-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Risk Configuration Manager
function RiskConfigManager() {
  const [config, setConfig] = useState(null);
  const [formData, setFormData] = useState({
    levels: {
      none: 1.0,
      low: 1.05,
      medium: 1.15,
      high: 1.30
    },
    complexity_weight: 0.4,
    rush_weight: 0.35,
    execution_weight: 0.25,
    impact_mode: 'buffer',
    apply_to_internal: true,
    apply_to_vendor: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await getRiskConfig();
      setConfig(data);
      setFormData({
        levels: data.levels || { none: 1.0, low: 1.05, medium: 1.15, high: 1.30 },
        complexity_weight: data.complexity_weight || 0.4,
        rush_weight: data.rush_weight || 0.35,
        execution_weight: data.execution_weight || 0.25,
        impact_mode: data.impact_mode || 'buffer',
        apply_to_internal: data.apply_to_internal !== false,
        apply_to_vendor: data.apply_to_vendor !== false
      });
    } catch (error) {
      toast.error('Failed to load risk configuration');
    }
  };

  const handleSave = async () => {
    // Validate weights sum to 1
    const totalWeight = formData.complexity_weight + formData.rush_weight + formData.execution_weight;
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      toast.error(`Weights must sum to 1.0 (currently ${totalWeight.toFixed(2)})`);
      return;
    }

    setSaving(true);
    try {
      await updateRiskConfig(formData);
      toast.success('Risk configuration updated');
    } catch (error) {
      toast.error('Failed to update risk configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateLevel = (level, value) => {
    setFormData(prev => ({
      ...prev,
      levels: { ...prev.levels, [level]: parseFloat(value) || 1.0 }
    }));
  };

  const impactModes = [
    { value: 'buffer', label: 'Price Buffer', description: 'Increases selling price by risk multiplier' },
    { value: 'cost', label: 'Cost Increase', description: 'Increases COGS by risk multiplier' },
    { value: 'margin', label: 'Margin Buffer', description: 'Increases target margin by risk factor' }
  ];

  const totalWeight = formData.complexity_weight + formData.rush_weight + formData.execution_weight;
  const isWeightValid = Math.abs(totalWeight - 1.0) <= 0.01;

  return (
    <div data-testid="risk-config-manager">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Risk Configuration</h1>
        <p className="text-slate-600">Configure how risk factors affect pricing calculations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Level Multipliers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Risk Level Multipliers
            </CardTitle>
            <CardDescription>Define multipliers for each risk level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'none', label: 'None', color: 'slate' },
              { key: 'low', label: 'Low', color: 'green' },
              { key: 'medium', label: 'Medium', color: 'amber' },
              { key: 'high', label: 'High', color: 'red' }
            ].map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full bg-${color}-500`}></div>
                <div className="flex-1">
                  <Label className="text-sm">{label}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">×</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.levels[key]}
                    onChange={(e) => updateLevel(key, e.target.value)}
                    className="w-24 text-center font-mono"
                    data-testid={`risk-level-${key}-input`}
                  />
                </div>
              </div>
            ))}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">
                Example: A "High" risk with 1.30x multiplier adds 30% buffer to pricing
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Risk Factor Weights */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Factor Weights</CardTitle>
            <CardDescription>How much each factor contributes to total risk (must sum to 1.0)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Client Complexity</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={formData.complexity_weight}
                    onChange={(e) => setFormData(prev => ({ ...prev, complexity_weight: parseFloat(e.target.value) || 0 }))}
                    className="w-20 text-center font-mono"
                    data-testid="complexity-weight-input"
                  />
                  <span className="text-slate-400 text-sm w-10">{(formData.complexity_weight * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Rush / SLA Pressure</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={formData.rush_weight}
                    onChange={(e) => setFormData(prev => ({ ...prev, rush_weight: parseFloat(e.target.value) || 0 }))}
                    className="w-20 text-center font-mono"
                    data-testid="rush-weight-input"
                  />
                  <span className="text-slate-400 text-sm w-10">{(formData.rush_weight * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Execution Risk</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={formData.execution_weight}
                    onChange={(e) => setFormData(prev => ({ ...prev, execution_weight: parseFloat(e.target.value) || 0 }))}
                    className="w-20 text-center font-mono"
                    data-testid="execution-weight-input"
                  />
                  <span className="text-slate-400 text-sm w-10">{(formData.execution_weight * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg ${isWeightValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${isWeightValid ? 'text-green-700' : 'text-red-700'}`}>
                  Total Weight
                </span>
                <span className={`font-mono font-bold ${isWeightValid ? 'text-green-700' : 'text-red-700'}`}>
                  {totalWeight.toFixed(2)}
                </span>
              </div>
              {!isWeightValid && (
                <p className="text-xs text-red-600 mt-1">Weights must sum to 1.0</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Risk Impact Mode */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Impact Mode</CardTitle>
            <CardDescription>How risk affects the final price calculation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {impactModes.map(mode => (
                <div
                  key={mode.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.impact_mode === mode.value 
                      ? 'border-indigo-300 bg-indigo-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, impact_mode: mode.value }))}
                  data-testid={`impact-mode-${mode.value}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      formData.impact_mode === mode.value 
                        ? 'border-indigo-600 bg-indigo-600' 
                        : 'border-slate-300'
                    }`}>
                      {formData.impact_mode === mode.value && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{mode.label}</p>
                      <p className="text-xs text-slate-500">{mode.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Application Scope */}
        <Card>
          <CardHeader>
            <CardTitle>Application Scope</CardTitle>
            <CardDescription>Where risk multipliers are applied</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Apply to Internal Costs</Label>
                <p className="text-xs text-slate-500">Risk affects internal labor pricing</p>
              </div>
              <Switch
                checked={formData.apply_to_internal}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, apply_to_internal: checked }))}
                data-testid="apply-internal-toggle"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Apply to Vendor Costs</Label>
                <p className="text-xs text-slate-500">Risk affects vendor pricing</p>
              </div>
              <Switch
                checked={formData.apply_to_vendor}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, apply_to_vendor: checked }))}
                data-testid="apply-vendor-toggle"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Button onClick={handleSave} disabled={saving || !isWeightValid} className="gap-2" data-testid="save-risk-config-btn">
          {saving ? 'Saving...' : 'Save Risk Configuration'}
        </Button>
      </div>
    </div>
  );
}

// Incentive Rules Manager
function IncentiveRulesManager() {
  const [rules, setRules] = useState([]);
  const [multipliers, setMultipliers] = useState({
    existing_customer_multiplier: 0.9,
    referral_multiplier: 0.5
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    deal_size: 'standard',
    role: 'sales_rep',
    base_percent: 3,
    max_cap: 0,
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rulesData, multipliersData] = await Promise.all([
        getIncentiveRules(),
        getIncentiveMultipliers()
      ]);
      setRules(rulesData);
      setMultipliers(multipliersData);
    } catch (error) {
      toast.error('Failed to load incentive configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async () => {
    try {
      if (editingRule) {
        await updateIncentiveRule(editingRule.id, formData);
        toast.success('Rule updated');
      } else {
        await createIncentiveRule(formData);
        toast.success('Rule created');
      }
      setIsDialogOpen(false);
      setEditingRule(null);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save rule');
    }
  };

  const handleDeleteRule = async (id) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await deleteIncentiveRule(id);
        toast.success('Rule deleted');
        loadData();
      } catch (error) {
        toast.error('Failed to delete rule');
      }
    }
  };

  const handleSaveMultipliers = async () => {
    setSaving(true);
    try {
      await updateIncentiveMultipliers(multipliers);
      toast.success('Multipliers updated');
    } catch (error) {
      toast.error('Failed to update multipliers');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      deal_size: 'standard',
      role: 'sales_rep',
      base_percent: 3,
      max_cap: 0,
      is_active: true
    });
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      deal_size: rule.deal_size,
      role: rule.role,
      base_percent: rule.base_percent,
      max_cap: rule.max_cap || 0,
      is_active: rule.is_active
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingRule(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const dealSizes = [
    { value: 'tiny', label: 'Tiny (<200K SAR)' },
    { value: 'standard', label: 'Standard (200K-500K SAR)' },
    { value: 'big', label: 'Big (500K-2M SAR)' },
    { value: 'mega', label: 'Mega (2M+ SAR)' }
  ];

  const roles = [
    { value: 'sales_rep', label: 'Sales Representative' },
    { value: 'sales_manager', label: 'Sales Manager' }
  ];

  // Group rules by deal size
  const groupedRules = dealSizes.map(ds => ({
    ...ds,
    rules: rules.filter(r => r.deal_size === ds.value)
  }));

  return (
    <div data-testid="incentive-rules-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Incentive Rules</h1>
          <p className="text-slate-600">Configure sales incentive percentages and caps by deal size</p>
        </div>
        <Button onClick={openCreate} className="gap-2" data-testid="add-rule-btn">
          <Plus className="w-4 h-4" />
          Add Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules by Deal Size */}
        <div className="lg:col-span-2 space-y-6">
          {groupedRules.map(group => (
            <Card key={group.value} data-testid={`deal-size-${group.value}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{group.label}</CardTitle>
                  <Badge className={`text-xs ${
                    group.value === 'tiny' ? 'bg-blue-100 text-blue-700' :
                    group.value === 'standard' ? 'bg-green-100 text-green-700' :
                    group.value === 'big' ? 'bg-amber-100 text-amber-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {group.value.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {group.rules.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No rules defined for this deal size</p>
                ) : (
                  <div className="space-y-3">
                    {group.rules.map(rule => (
                      <div key={rule.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${rule.role === 'sales_rep' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              {rule.role === 'sales_rep' ? 'Sales Rep' : 'Sales Manager'}
                            </p>
                            <p className="text-xs text-slate-500">
                              Base: {rule.base_percent}%
                              {rule.max_cap > 0 && ` • Cap: SAR ${rule.max_cap.toLocaleString()}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={rule.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Multipliers Configuration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Multipliers
              </CardTitle>
              <CardDescription>Adjustments for client type and lead source</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Existing Customer Multiplier</Label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">×</span>
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={multipliers.existing_customer_multiplier}
                    onChange={(e) => setMultipliers(prev => ({ ...prev, existing_customer_multiplier: parseFloat(e.target.value) || 0 }))}
                    className="w-24 text-center font-mono"
                    data-testid="existing-multiplier-input"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  0.9 = خصم 10% لعملاء حاليين
                </p>
              </div>

              <div className="space-y-2">
                <Label>Referral Multiplier</Label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">×</span>
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={multipliers.referral_multiplier}
                    onChange={(e) => setMultipliers(prev => ({ ...prev, referral_multiplier: parseFloat(e.target.value) || 0 }))}
                    className="w-24 text-center font-mono"
                    data-testid="referral-multiplier-input"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  0.5 = خصم 50% للإحالات
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">
                  <strong>مثال:</strong> عميل حالي عن طريق إحالة<br />
                  الحافز = Base% × {multipliers.existing_customer_multiplier} × {multipliers.referral_multiplier} = Base% × {(multipliers.existing_customer_multiplier * multipliers.referral_multiplier).toFixed(2)}
                </p>
              </div>

              <Button onClick={handleSaveMultipliers} disabled={saving} className="w-full" data-testid="save-multipliers-btn">
                {saving ? 'Saving...' : 'Save Multipliers'}
              </Button>
            </CardContent>
          </Card>

          {/* Formula Explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">آلية الحساب</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-slate-600 space-y-2" dir="rtl">
                <ol className="list-decimal list-inside space-y-1.5 pr-2">
                  <li>تحديد حجم الصفقة تلقائياً</li>
                  <li>جلب النسبة الأساسية لكل دور</li>
                  <li>تطبيق معامل نوع العميل ومصدر Lead</li>
                  <li>حساب قيمة الحافز = السعر × النسبة المعدلة</li>
                  <li>تطبيق Cap إن وجد</li>
                  <li>جمع حوافز جميع الأدوار</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Rule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="rule-dialog">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Incentive Rule' : 'Add Incentive Rule'}</DialogTitle>
            <DialogDescription>Define incentive percentage for a specific deal size and role</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deal Size</Label>
                <Select value={formData.deal_size} onValueChange={(v) => setFormData(prev => ({ ...prev, deal_size: v }))}>
                  <SelectTrigger data-testid="rule-dealsize-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dealSizes.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData(prev => ({ ...prev, role: v }))}>
                  <SelectTrigger data-testid="rule-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Incentive %</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.base_percent}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_percent: parseFloat(e.target.value) || 0 }))}
                  data-testid="rule-percent-input"
                />
                <p className="text-xs text-slate-500">New Customer, Direct sale</p>
              </div>
              <div className="space-y-2">
                <Label>Max Cap (SAR)</Label>
                <Input
                  type="number"
                  value={formData.max_cap}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_cap: parseFloat(e.target.value) || 0 }))}
                  placeholder="0 = no cap"
                  data-testid="rule-cap-input"
                />
                <p className="text-xs text-slate-500">0 = بدون حد أقصى</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                data-testid="rule-active-toggle"
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRule} data-testid="save-rule-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

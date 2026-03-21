import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, Package, Layers, Truck, CreditCard, Gauge, Percent, 
  AlertTriangle, Palette, Database, LogOut, ChevronRight, Save,
  Plus, Pencil, Trash2, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" data-testid="admin-login">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl font-['Manrope']">OPE</span>
            </div>
            <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
            <CardDescription>Enter password to access admin panel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  data-testid="admin-password-input"
                />
              </div>
              <Button type="submit" className="w-full" data-testid="admin-login-btn">
                Login
              </Button>
              <Link to="/" className="block text-center text-sm text-slate-500 hover:text-slate-700">
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
    { path: '/admin/product-templates', label: 'Product Templates', icon: Package },
    { path: '/admin/scope-templates', label: 'Scope Templates', icon: Layers },
    { path: '/admin/vendor-services', label: 'Vendor Services', icon: Truck },
    { path: '/admin/payment-terms', label: 'Payment Terms', icon: CreditCard },
    { path: '/admin/overhead-rates', label: 'Overhead Rates', icon: Gauge },
    { path: '/admin/sales-incentives', label: 'Sales Incentives', icon: Percent },
    { path: '/admin/risk-multipliers', label: 'Risk Multipliers', icon: AlertTriangle },
    { path: '/admin/theme', label: 'Theme Settings', icon: Palette },
    { path: '/admin/data', label: 'Seed Data', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex" data-testid="admin-panel">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col" data-testid="admin-sidebar">
        <div className="p-6 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm font-['Manrope']">OPE</span>
            </div>
            <div>
              <h1 className="font-bold text-white">Admin Panel</h1>
              <p className="text-xs text-slate-400">Configuration</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-4" data-testid="admin-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  isActive 
                    ? 'text-white bg-indigo-600' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
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

        <div className="p-4 border-t border-slate-800">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto" data-testid="admin-content">
        <Routes>
          <Route path="/" element={<AdminWelcome />} />
          <Route path="/roles" element={<RolesManager />} />
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
      <p className="text-slate-600 mb-8">Manage your pricing engine configuration</p>
      <div className="grid grid-cols-2 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <Users className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-slate-900">Roles & Rates</h3>
            <p className="text-sm text-slate-500 mt-1">Manage team roles and hourly rates</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <Package className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-slate-900">Templates</h3>
            <p className="text-sm text-slate-500 mt-1">Configure product and scope templates</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <Gauge className="w-8 h-8 text-indigo-600 mb-3" />
            <h3 className="font-semibold text-slate-900">Overhead & Incentives</h3>
            <p className="text-sm text-slate-500 mt-1">Set overhead rates and sales commissions</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <Palette className="w-8 h-8 text-indigo-600 mb-3" />
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
          <p className="text-slate-600">Manage team roles and hourly rates</p>
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
              <TableHead>Hourly Rate (SAR)</TableHead>
              <TableHead>Monthly Salary (SAR)</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map(role => (
              <TableRow key={role.id} data-testid={`role-row-${role.id}`}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell className="font-mono">{formatCurrency(role.hourly_rate, false)}</TableCell>
                <TableCell className="font-mono">{formatCurrency(role.monthly_salary, false)}</TableCell>
                <TableCell className="text-slate-500">{role.description || '-'}</TableCell>
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

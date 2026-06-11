import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, Package, Layers, Truck, CreditCard, Gauge, Percent, 
  AlertTriangle, Palette, Database, LogOut, ChevronRight, Save,
  Plus, Pencil, Trash2, Check, X, Settings2, FileSpreadsheet, RefreshCw,
  Target, ShieldAlert, DollarSign, CloudDownload, Filter, ArrowUpDown, Clock, Eye,
  FileText, Building2, Landmark, FileSignature
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  fetchSheetsRoles, syncSheetsToDb, clearSheetsCache,
  getPricingGuidelines, createPricingGuideline, updatePricingGuideline, deletePricingGuideline,
  getRiskConfig, updateRiskConfig,
  getIncentiveRules, createIncentiveRule, updateIncentiveRule, deleteIncentiveRule, bulkUpdateIncentiveRules,
  getIncentiveMultipliers, updateIncentiveMultipliers,
  getDealSizeRanges, updateDealSizeRanges,
  seedDatabase,
  setAdminPassword, getAdminPassword
} from '@/lib/api';
import { formatCurrency, getStandardMonthlyHours } from '@/lib/utils';

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
              <span className="text-white font-bold text-lg ">ZAN</span>
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
    { path: '/admin/roles', label: 'Roles & HR', icon: Users },
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
    { path: '/admin/documents', label: 'Documents & Export', icon: FileText },
    { path: '/admin/data', label: 'Seed Data', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-white flex light-theme" data-testid="admin-panel">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col" data-testid="admin-sidebar">
        <div className="p-5 border-b border-slate-200">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md shadow-indigo-100">
              <span className="text-white font-bold text-sm ">ZAN</span>
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
          <Route path="/roles" element={<RolesHRManager />} />
          <Route path="/hr-config" element={<RolesHRManager />} />
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
          <Route path="/documents" element={<DocumentsManager />} />
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
      <h1 className="text-3xl font-bold text-slate-900  mb-2">Welcome to Admin</h1>
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

// Merged Roles & HR Manager - Pulls data from Google Sheets
function RolesHRManager() {
  const [activeTab, setActiveTab] = useState('roles');
  const [roles, setRoles] = useState([]);
  const [sheetsData, setSheetsData] = useState([]);
  const [productsPricingData, setProductsPricingData] = useState([]);
  const [sheetsStatus, setSheetsStatus] = useState({ source: 'none', fetched_at: null });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingProducts, setRefreshingProducts] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', hourly_rate: 0, monthly_salary: 0, department: '', description: '' });
  
  // HR Config State - Only Google Sheets settings (Total Monthly pulled directly from Sheet)
  const [hrConfig, setHrConfig] = useState({
    google_sheets_enabled: false,
    google_sheets_url: '',
    google_sheets_tab: 'Average Emp. Salary',
    google_sheets_products_tab: 'Products Pricing Full-DB-V1',
    seconded_markup_percent: 20
  });
  const [savingConfig, setSavingConfig] = useState(false);
  
  // Filtering & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortField, setSortField] = useState('role_name');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load HR Config
      const config = await getHRConfig();
      setHrConfig({
        social_insurance_percent: config.social_insurance_percent || 12,
        medical_insurance_percent: config.medical_insurance_percent || 3,
        end_of_service_divisor: config.end_of_service_divisor || 2,
        google_sheets_enabled: config.google_sheets_enabled || false,
        google_sheets_url: config.google_sheets_url || '',
        google_sheets_tab: config.google_sheets_tab || 'Average Emp. Salary',
        google_sheets_products_tab: config.google_sheets_products_tab || 'Products Pricing Full-DB-V1'
      });
      
      // Load roles (force refresh when Google Sheets is the source of truth)
      const rolesResult = await getRoles(Boolean(config.google_sheets_enabled && config.google_sheets_url));
      setRoles(rolesResult.roles || []);
      
      // If Google Sheets is enabled, fetch live data
      if (config.google_sheets_enabled && config.google_sheets_url) {
        const sheetsResult = await fetchSheetsRoles(false);
        if (sheetsResult.status === 'success') {
          setSheetsData(sheetsResult.data || []);
          setSheetsStatus({ source: sheetsResult.source, fetched_at: sheetsResult.fetched_at || sheetsResult.cached_at });
        }

        // Also fetch products pricing
        const productsResult = await fetchProductsPricing(false);
        if (productsResult.status === 'success') {
          setProductsPricingData(productsResult.data || []);
        }
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshProducts = async () => {
    setRefreshingProducts(true);
    try {
      const result = await fetchProductsPricing(true);
      if (result.status === 'success') {
        setProductsPricingData(result.data || []);
        toast.success(`Refreshed ${result.count} products from Google Sheets`);
      } else {
        toast.error(result.message || 'Failed to fetch products');
      }
    } catch (error) {
      toast.error('Failed to refresh products');
    } finally {
      setRefreshingProducts(false);
    }
  };

  const handleRefreshSheets = async () => {
    setRefreshing(true);
    try {
      const result = await fetchSheetsRoles(true);
      if (result.status === 'success') {
        setSheetsData(result.data || []);
        setSheetsStatus({ source: 'live', fetched_at: result.fetched_at });
        toast.success(`Refreshed ${result.count} roles from Google Sheets`);
      } else if (result.status === 'error') {
        toast.error(result.message || 'Failed to fetch from Google Sheets');
      } else {
        toast.info('Google Sheets integration is disabled');
      }
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncToDb = async () => {
    setSyncing(true);
    try {
      const result = await syncSheetsToDb();
      toast.success(`Synced ${result.synced} roles (${result.created} created, ${result.updated} updated, ${result.deleted || 0} removed)`);
      // Reload roles from DB
      const rolesResult = await getRoles();
      setRoles(rolesResult.roles || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to sync data');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await updateHRConfig(hrConfig);
      toast.success('Configuration saved');
      // Reload data with new config
      loadData();
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveRole = async () => {
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
      setFormData({ name: '', hourly_rate: 0, monthly_salary: 0, department: '', description: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to save role');
    }
  };

  const handleDeleteRole = async (id) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await deleteRole(id);
        toast.success('Role deleted');
        loadData();
      } catch (error) {
        toast.error('Failed to delete role');
      }
    }
  };

  const openEdit = (role) => {
    setEditingRole(role);
    setFormData({ 
      name: role.name, 
      hourly_rate: role.hourly_rate, 
      monthly_salary: role.monthly_salary, 
      department: role.department || '',
      description: role.description || '' 
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingRole(null);
    setFormData({ name: '', hourly_rate: 0, monthly_salary: 0, department: '', description: '' });
    setIsDialogOpen(true);
  };

  // Get unique departments for filtering
  const departments = useMemo(() => {
    const depts = new Set();
    roles.forEach(r => r.department && depts.add(r.department));
    sheetsData.forEach(r => r.department && depts.add(r.department));
    return Array.from(depts).sort();
  }, [roles, sheetsData]);

  // Filter and sort data
  const filteredSheetsData = useMemo(() => {
    let data = [...sheetsData];
    
    // Filter by search
    if (searchTerm) {
      data = data.filter(r => 
        r.role_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by department
    if (departmentFilter !== 'all') {
      data = data.filter(r => r.department === departmentFilter);
    }
    
    // Sort
    data.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (sortDirection === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    
    return data;
  }, [sheetsData, searchTerm, departmentFilter, sortField, sortDirection]);

  const filteredDbRoles = useMemo(() => {
    let data = [...roles];
    
    if (searchTerm) {
      data = data.filter(r => 
        r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (departmentFilter !== 'all') {
      data = data.filter(r => r.department === departmentFilter);
    }
    
    return data;
  }, [roles, searchTerm, departmentFilter]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div data-testid="roles-hr-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 ">Roles & HR Configuration</h1>
          <p className="text-slate-600">Manage roles, salaries, and Google Sheets integration</p>
        </div>
        <div className="flex items-center gap-2">
          {hrConfig.google_sheets_enabled && (
            <>
              <Button 
                variant="outline" 
                onClick={handleRefreshSheets} 
                disabled={refreshing}
                className="gap-2 border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
                data-testid="refresh-sheets-btn"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSyncToDb} 
                disabled={syncing}
                className="gap-2 border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
                data-testid="sync-to-db-btn"
              >
                <CloudDownload className={`w-4 h-4 ${syncing ? 'animate-pulse' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync to DB'}
              </Button>
            </>
          )}
          {!hrConfig.google_sheets_enabled && (
          <Button onClick={openCreate} className="gap-2 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700" data-testid="add-role-btn">
            <Plus className="w-4 h-4" />
            Add Role
          </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="roles" className="data-[state=active]:bg-white">
            <Users className="w-4 h-4 mr-2" />
            {hrConfig.google_sheets_enabled ? 'Synced Roles' : 'Database Roles'} ({filteredDbRoles.length})
          </TabsTrigger>
          <TabsTrigger value="sheets" className="data-[state=active]:bg-white" disabled={!hrConfig.google_sheets_enabled}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Roles Sheet ({filteredSheetsData.length})
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-white" disabled={!hrConfig.google_sheets_enabled}>
            <Package className="w-4 h-4 mr-2" />
            Products Sheet ({productsPricingData.length})
          </TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-white">
            <Settings2 className="w-4 h-4 mr-2" />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* Search & Filter Bar */}
        {activeTab !== 'config' && (
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex-1">
              <Input
                placeholder="Search by role name or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-48 bg-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Database Roles Tab */}
        <TabsContent value="roles">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                    Role Name <ArrowUpDown className="w-3 h-3 inline ml-1" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('department')}>
                    Department <ArrowUpDown className="w-3 h-3 inline ml-1" />
                  </TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('hourly_rate')}>
                    Hourly Rate <ArrowUpDown className="w-3 h-3 inline ml-1" />
                  </TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('total_monthly_cost')}>
                    Total Monthly <ArrowUpDown className="w-3 h-3 inline ml-1" />
                  </TableHead>
                  <TableHead className="w-24 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDbRoles.map(role => (
                  <TableRow key={role.id} data-testid={`role-row-${role.id}`}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      {role.department && (
                        <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700">{role.department}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-right">{formatCurrency(role.hourly_rate, false)}</TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-emerald-600 text-right">{formatCurrency(role.total_monthly_cost || role.monthly_salary, false)}</TableCell>
                    <TableCell>
                      {!hrConfig.google_sheets_enabled ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(role)} data-testid={`edit-role-${role.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role.id)} className="text-red-500 hover:text-red-700" data-testid={`delete-role-${role.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Sheet managed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDbRoles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No roles found. Add roles manually or sync from Google Sheets.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Google Sheets Tab */}
        <TabsContent value="sheets">
          {sheetsStatus.source && (
            <div className="flex items-center gap-4 mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <Clock className="w-4 h-4" />
              <span>
                Data source: <strong>{sheetsStatus.source === 'cache' ? 'Cached' : 'Live'}</strong>
                {sheetsStatus.fetched_at && ` • Last fetched: ${new Date(sheetsStatus.fetched_at).toLocaleString()}`}
              </span>
            </div>
          )}
          
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('role_name')}>
                    Role Name <ArrowUpDown className="w-3 h-3 inline ml-1" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('department')}>
                    Department <ArrowUpDown className="w-3 h-3 inline ml-1" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('hourly_rate')}>
                    Hourly Rate <ArrowUpDown className="w-3 h-3 inline ml-1" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('total_monthly')}>
                    Total Monthly <ArrowUpDown className="w-3 h-3 inline ml-1" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSheetsData.map((role, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{role.role_name}</TableCell>
                    <TableCell>
                      {role.department && (
                        <Badge variant="secondary" className="text-xs">{role.department}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{formatCurrency(role.hourly_rate, false)}</TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-emerald-600">{formatCurrency(role.total_monthly, false)}</TableCell>
                  </TableRow>
                ))}
                {filteredSheetsData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      {hrConfig.google_sheets_enabled 
                        ? 'No data loaded. Click "Refresh" to fetch from Google Sheets.'
                        : 'Enable Google Sheets in the Configuration tab.'
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Products Pricing Sheet Tab */}
        <TabsContent value="products">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-500">
              Showing products and role hours from <strong>{hrConfig.google_sheets_products_tab}</strong> tab.
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshProducts} 
              disabled={refreshingProducts}
              className="gap-2"
            >
              <RefreshCw className={`w-3 h-3 ${refreshingProducts ? 'animate-spin' : ''}`} />
              Refresh Products
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Sizes & Roles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsPricingData.map((product, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Badge variant="outline">{product.section_name}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell>
                      <div className="space-y-4">
                        {Object.entries(product.sizes).map(([size, roles]) => (
                          <div key={size} className="space-y-1">
                            <div className="text-xs font-bold uppercase text-slate-400">{size}</div>
                            <div className="flex flex-wrap gap-1">
                              {roles.map((r, ridx) => (
                                <Badge key={ridx} variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-100">
                                  {r.role_name}: {r.hours}h
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {productsPricingData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                      No products found. Check the tab name and refresh.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Google Sheets Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Google Sheets Integration
                </CardTitle>
                <CardDescription>Configure the Google Sheet URL and tab name</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Enable Google Sheets</Label>
                    <p className="text-xs text-slate-500">Pull roles from external spreadsheet</p>
                  </div>
                  <Switch
                    checked={hrConfig.google_sheets_enabled}
                    onCheckedChange={(checked) => setHrConfig(prev => ({ ...prev, google_sheets_enabled: checked }))}
                    data-testid="google-sheets-toggle"
                  />
                </div>

                {hrConfig.google_sheets_enabled && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-2">
                      <Label>Google Sheets URL</Label>
                      <Input
                        value={hrConfig.google_sheets_url}
                        onChange={(e) => setHrConfig(prev => ({ ...prev, google_sheets_url: e.target.value }))}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        data-testid="google-sheets-url-input"
                      />
                      <p className="text-xs text-slate-400">
                        Make sure the sheet is publicly accessible (Anyone with link can view)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Roles Tab Name</Label>
                      <Input
                        value={hrConfig.google_sheets_tab}
                        onChange={(e) => setHrConfig(prev => ({ ...prev, google_sheets_tab: e.target.value }))}
                        placeholder="Average Emp. Salary"
                        data-testid="google-sheets-tab-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Products Pricing Tab Name</Label>
                      <Input
                        value={hrConfig.google_sheets_products_tab}
                        onChange={(e) => setHrConfig(prev => ({ ...prev, google_sheets_products_tab: e.target.value }))}
                        placeholder="Products Pricing Full-DB-V1"
                        data-testid="google-sheets-products-tab-input"
                      />
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-amber-900 mb-2">Expected Column Format</h4>
                      <ul className="text-xs text-amber-800 space-y-1">
                        <li>• <strong>Column A</strong>: Role Name (starting row 6)</li>
                        <li>• <strong>Column B</strong>: Department (starting row 6)</li>
                        <li>• <strong>Column C</strong>: Hourly Rate (starting row 6)</li>
                        <li>• <strong>Column D</strong>: Total Monthly (starting row 6)</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          <div className="mt-6">
            <Button onClick={handleSaveConfig} disabled={savingConfig} className="w-full md:w-auto gap-2" data-testid="save-config-btn">
              <Save className="w-4 h-4" />
              {savingConfig ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Role Dialog */}
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
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                placeholder="e.g., Creative"
                data-testid="role-dept-input"
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950">Cancel</Button>
            <Button onClick={handleSaveRole} className="bg-indigo-600 text-white hover:bg-indigo-700" data-testid="save-role-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Keep old RolesManager as alias for backwards compatibility
function RolesManager() {
  return <RolesHRManager />;
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
          <h1 className="text-2xl font-bold text-slate-900 ">Product Templates</h1>
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
  const [previewTemplate, setPreviewTemplate] = useState(null);

  useEffect(() => {
    getScopeTemplates().then(setTemplates).catch(() => toast.error('Failed to load'));
  }, []);

  return (
    <div data-testid="scope-templates-manager">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Scope Templates</h1>
        <p className="text-slate-600">Pre-configured scope packages created from the Calculator</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Team Roles</TableHead>
              <TableHead>Vendors</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-400 py-10 text-sm">
                  No templates yet. Save a template from the Calculator to get started.
                </TableCell>
              </TableRow>
            )}
            {templates.map(t => {
              const serviceCount = (t.default_pricing_products || []).filter(p => !p.vendor_only).length;
              const roleCount = (t.default_roles || []).length;
              const vendorCount = (t.default_vendors || []).length;
              const marginLabel = t.margin_mode === 'split'
                ? `Split ${t.internal_margin_percent ?? '—'}% / ${t.vendor_margin_percent ?? '—'}%`
                : `Unified ${t.target_margin_percent ?? '—'}%`;
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="capitalize text-slate-500">{t.scope_type || 'standard'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{serviceCount} service{serviceCount !== 1 ? 's' : ''}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleCount} role{roleCount !== 1 ? 's' : ''}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{vendorCount} vendor{vendorCount !== 1 ? 's' : ''}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">{marginLabel}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewTemplate(t)}
                      title="Preview template contents"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={open => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Template contents — read only. Edit via the Calculator's "Save as template".
            </DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-4 text-sm">
              {/* Services */}
              {(previewTemplate.default_pricing_products || []).filter(p => !p.vendor_only).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Services</p>
                  <ul className="space-y-1">
                    {(previewTemplate.default_pricing_products || [])
                      .filter(p => !p.vendor_only)
                      .map((p, i) => (
                        <li key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-50">
                          <span className="font-medium text-slate-800">{p.product_name}</span>
                          {p.size && (
                            <Badge variant="outline" className="text-[10px]">
                              {String(p.size).toUpperCase()}
                            </Badge>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Team Roles */}
              {(previewTemplate.default_roles || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Team Roles</p>
                  <ul className="space-y-1">
                    {(previewTemplate.default_roles || []).map((r, i) => (
                      <li key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-50">
                        <span className="text-slate-800">{r.role_name || r.role_id}</span>
                        {r.default_hours > 0 && (
                          <span className="text-xs text-slate-400">{r.default_hours}h</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Vendors */}
              {(previewTemplate.default_vendors || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Vendors</p>
                  <ul className="space-y-1">
                    {(previewTemplate.default_vendors || []).map((v, i) => (
                      <li key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-50">
                        <span className="text-slate-800">{v.service_name}</span>
                        {v.default_markup != null && (
                          <span className="text-xs text-slate-400">{v.default_markup}% markup</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Margin Settings */}
              <div className="px-2 py-2 rounded bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Margin Settings</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600">
                  <span>Mode: <strong>{previewTemplate.margin_mode || 'unified'}</strong></span>
                  {previewTemplate.target_margin_percent != null && (
                    <span>Target: <strong>{previewTemplate.target_margin_percent}%</strong></span>
                  )}
                  {previewTemplate.internal_margin_percent != null && (
                    <span>Internal: <strong>{previewTemplate.internal_margin_percent}%</strong></span>
                  )}
                  {previewTemplate.vendor_margin_percent != null && (
                    <span>Vendor: <strong>{previewTemplate.vendor_margin_percent}%</strong></span>
                  )}
                </div>
              </div>

              {/* Empty state */}
              {(previewTemplate.default_pricing_products || []).length === 0 &&
               (previewTemplate.default_roles || []).length === 0 &&
               (previewTemplate.default_vendors || []).length === 0 && (
                <p className="text-center text-slate-400 py-4">
                  This template has no stored content. Re-save it from the Calculator.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
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
          <h1 className="text-2xl font-bold text-slate-900 ">Vendor Services</h1>
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
        <h1 className="text-2xl font-bold text-slate-900 ">Payment Terms</h1>
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
        <h1 className="text-2xl font-bold text-slate-900 ">Overhead Rates</h1>
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
        <h1 className="text-2xl font-bold text-slate-900 ">Sales Incentives</h1>
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
        <h1 className="text-2xl font-bold text-slate-900 ">Risk Multipliers</h1>
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

// ─── Documents & Export Manager ──────────────────────────────────────────────

function DocumentsManager() {
  const defaultForm = {
    company_name: 'ZAN',
    company_name_ar: 'زان',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_vat: '',
    company_cr: '',
    bank_name: '',
    bank_iban: '',
    bank_account: '',
    quotation_validity_days: 30,
    default_doc_language: 'en',
    terms_en: '',
    terms_ar: '',
    contract_body_en: '',
    contract_body_ar: '',
  };

  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getThemeSettings().then(data => {
      setFormData({
        company_name:             data.company_name             || 'ZAN',
        company_name_ar:          data.company_name_ar          || 'زان',
        company_address:          data.company_address          || '',
        company_phone:            data.company_phone            || '',
        company_email:            data.company_email            || '',
        company_vat:              data.company_vat              || '',
        company_cr:               data.company_cr               || '',
        bank_name:                data.bank_name                || '',
        bank_iban:                data.bank_iban                || '',
        bank_account:             data.bank_account             || '',
        quotation_validity_days:  data.quotation_validity_days  ?? 30,
        default_doc_language:     data.default_doc_language     || 'en',
        terms_en:                 data.terms_en                 || '',
        terms_ar:                 data.terms_ar                 || '',
        contract_body_en:         data.contract_body_en         || '',
        contract_body_ar:         data.contract_body_ar         || '',
      });
    }).catch(() => toast.error('Failed to load document settings'));
  }, []);

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Merge with full theme settings (PUT replaces all fields)
      const current = await getThemeSettings();
      await updateThemeSettings({ ...current, ...formData });
      toast.success('Document settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ title, icon: Icon, children }) => (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="w-4 h-4 text-indigo-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  const Field = ({ label, children, hint }) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );

  return (
    <div data-testid="documents-manager">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Documents & Export</h1>
        <p className="text-slate-600 mt-1">Control company info, bank details, and document templates used in all exported files</p>
      </div>

      <Section title="Company Identity" icon={Building2}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name (EN)">
            <Input value={formData.company_name} onChange={e => set('company_name', e.target.value)} placeholder="ZAN" />
          </Field>
          <Field label="اسم الشركة (AR)">
            <Input dir="rtl" value={formData.company_name_ar} onChange={e => set('company_name_ar', e.target.value)} placeholder="زان" />
          </Field>
          <Field label="Address" hint="Appears on quotations and contracts">
            <textarea
              className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
              value={formData.company_address} onChange={e => set('company_address', e.target.value)}
              placeholder="Riyadh, Saudi Arabia"
            />
          </Field>
          <div className="space-y-4">
            <Field label="Phone">
              <Input value={formData.company_phone} onChange={e => set('company_phone', e.target.value)} placeholder="+966 XX XXX XXXX" />
            </Field>
            <Field label="Email">
              <Input type="email" value={formData.company_email} onChange={e => set('company_email', e.target.value)} placeholder="info@zan.com" />
            </Field>
          </div>
          <Field label="VAT Number">
            <Input value={formData.company_vat} onChange={e => set('company_vat', e.target.value)} placeholder="3XXXXXXXXXX" />
          </Field>
          <Field label="CR Number">
            <Input value={formData.company_cr} onChange={e => set('company_cr', e.target.value)} placeholder="1XXXXXXXXXX" />
          </Field>
        </div>
      </Section>

      <Section title="Bank Details" icon={Landmark}>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Bank Name">
            <Input value={formData.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="Al Rajhi Bank" />
          </Field>
          <Field label="IBAN">
            <Input value={formData.bank_iban} onChange={e => set('bank_iban', e.target.value)} placeholder="SA00 0000 0000 0000 0000 0000" />
          </Field>
          <Field label="Account Number">
            <Input value={formData.bank_account} onChange={e => set('bank_account', e.target.value)} placeholder="000000000000000" />
          </Field>
        </div>
      </Section>

      <Section title="Document Settings" icon={Settings2}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quotation Validity (days)" hint="How long a quote is valid after issue date">
            <Input
              type="number" min="1" max="365"
              value={formData.quotation_validity_days}
              onChange={e => set('quotation_validity_days', Number(e.target.value) || 30)}
            />
          </Field>
          <Field label="Default Language">
            <Select value={formData.default_doc_language} onValueChange={v => set('default_doc_language', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Document Templates" icon={FileSignature}>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Field label="Terms & Conditions (EN)" hint="Appears at the bottom of quotations and contracts">
              <textarea
                className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                value={formData.terms_en} onChange={e => set('terms_en', e.target.value)}
                placeholder="1. All prices are in SAR and exclusive of VAT.&#10;2. Payment is due within 30 days of invoice date.&#10;3. ZAN reserves the right to adjust scope if brief changes significantly."
              />
            </Field>
            <Field label="الشروط والأحكام (AR)">
              <textarea
                dir="rtl"
                className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                value={formData.terms_ar} onChange={e => set('terms_ar', e.target.value)}
                placeholder="١. جميع الأسعار بالريال السعودي وغير شاملة لضريبة القيمة المضافة.&#10;٢. يستحق الدفع خلال ٣٠ يوماً من تاريخ الفاتورة."
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Field label="Contract Body (EN)" hint="Main body text for service agreements. Use [CLIENT_NAME], [PROJECT_NAME], [TOTAL_AMOUNT] as placeholders.">
              <textarea
                className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y font-mono text-xs"
                value={formData.contract_body_en} onChange={e => set('contract_body_en', e.target.value)}
                placeholder="This Service Agreement is entered into between ZAN (the Agency) and [CLIENT_NAME] (the Client)...&#10;&#10;1. SCOPE OF SERVICES&#10;The Agency agrees to provide [PROJECT_NAME] as detailed in the attached Scope of Work.&#10;&#10;2. FEES&#10;The Client agrees to pay [TOTAL_AMOUNT] according to the payment schedule..."
              />
            </Field>
            <Field label="نص العقد (AR)">
              <textarea
                dir="rtl"
                className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y font-mono text-xs"
                value={formData.contract_body_ar} onChange={e => set('contract_body_ar', e.target.value)}
                placeholder="هذه الاتفاقية مبرمة بين زان (الوكالة) و[CLIENT_NAME] (العميل)..."
              />
            </Field>
          </div>
        </div>
      </Section>

      <div className="flex justify-end mt-2 mb-8">
        <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
          {saving ? 'Saving...' : 'Save Document Settings'}
        </Button>
      </div>
    </div>
  );
}

// ─── Theme Manager ────────────────────────────────────────────────────────────

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
        <h1 className="text-2xl font-bold text-slate-900 ">Theme Settings</h1>
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
        <h1 className="text-2xl font-bold text-slate-900 ">Seed Data</h1>
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
    google_sheets_url: '',
    weeks_per_month: 4,
    work_days_per_week: 5,
    hours_per_work_day: 8,
  });
  const standardMonthlyHours = useMemo(
    () => getStandardMonthlyHours(formData),
    [formData.weeks_per_month, formData.work_days_per_week, formData.hours_per_work_day]
  );
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
        google_sheets_url: data.google_sheets_url || '',
        weeks_per_month: data.weeks_per_month ?? 4,
        work_days_per_week: data.work_days_per_week ?? 5,
        hours_per_work_day: data.hours_per_work_day ?? 8,
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
        <h1 className="text-2xl font-bold text-slate-900 ">HR Cost Configuration</h1>
        <p className="text-slate-600">Configure benefits percentages and Google Sheets integration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Work Calendar
            </CardTitle>
            <CardDescription>
              Defines standard monthly hours for linking Hours ↔ Month % in the Calculator (weeks × days × hours/day)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Weeks per Month</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.5"
                  value={formData.weeks_per_month}
                  onChange={(e) => setFormData(prev => ({ ...prev, weeks_per_month: parseFloat(e.target.value) || 4 }))}
                  data-testid="weeks-per-month-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Work Days per Week</Label>
                <Input
                  type="number"
                  min="1"
                  max="7"
                  value={formData.work_days_per_week}
                  onChange={(e) => setFormData(prev => ({ ...prev, work_days_per_week: parseFloat(e.target.value) || 5 }))}
                  data-testid="work-days-per-week-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Hours per Work Day</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={formData.hours_per_work_day}
                  onChange={(e) => setFormData(prev => ({ ...prev, hours_per_work_day: parseFloat(e.target.value) || 8 }))}
                  data-testid="hours-per-work-day-input"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-700">
                <strong>Standard monthly hours:</strong>{' '}
                <span className="font-mono text-indigo-700" data-testid="standard-monthly-hours">
                  {standardMonthlyHours}
                </span>
                {' '}(example: 25% = {Math.round(standardMonthlyHours * 0.25 * 100) / 100} hours)
              </p>
            </div>
          </CardContent>
        </Card>

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
  const [dealSizeRanges, setDealSizeRanges] = useState({
    tiny_min: 0,
    tiny_max: 50000,
    standard_min: 50001,
    standard_max: 200000,
    big_min: 200001,
    big_max: 500000,
    mega_min: 500001,
    mega_max: 999999999
  });
  const [savingRanges, setSavingRanges] = useState(false);
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
    loadDealSizeRanges();
  }, []);

  const loadDealSizeRanges = async () => {
    try {
      const data = await getDealSizeRanges();
      setDealSizeRanges(data);
    } catch (error) {
      console.error('Failed to load deal size ranges');
    }
  };

  const handleSaveDealSizeRanges = async () => {
    setSavingRanges(true);
    try {
      await updateDealSizeRanges(dealSizeRanges);
      toast.success('Deal size ranges updated');
    } catch (error) {
      toast.error('Failed to update deal size ranges');
    } finally {
      setSavingRanges(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-900 ">Pricing Guidelines</h1>
          <p className="text-slate-600">Configure margin thresholds by deal size and service type</p>
        </div>
        <Button onClick={openCreate} className="gap-2" data-testid="add-guideline-btn">
          <Plus className="w-4 h-4" />
          Add Guideline
        </Button>
      </div>

      {/* Deal Size Ranges Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Deal Size Ranges (SAR)
          </CardTitle>
          <CardDescription>Define the value ranges for each deal size category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            {/* Tiny */}
            <div className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-100 text-purple-700">Tiny</Badge>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-slate-500">Min</Label>
                  <Input
                    type="number"
                    value={dealSizeRanges.tiny_min}
                    onChange={(e) => setDealSizeRanges(prev => ({ ...prev, tiny_min: parseFloat(e.target.value) || 0 }))}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Max</Label>
                  <Input
                    type="number"
                    value={dealSizeRanges.tiny_max}
                    onChange={(e) => setDealSizeRanges(prev => ({ ...prev, tiny_max: parseFloat(e.target.value) || 0 }))}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
            
            {/* Standard */}
            <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-700">Standard</Badge>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-slate-500">Min</Label>
                  <Input
                    type="number"
                    value={dealSizeRanges.standard_min}
                    onChange={(e) => setDealSizeRanges(prev => ({ ...prev, standard_min: parseFloat(e.target.value) || 0 }))}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Max</Label>
                  <Input
                    type="number"
                    value={dealSizeRanges.standard_max}
                    onChange={(e) => setDealSizeRanges(prev => ({ ...prev, standard_max: parseFloat(e.target.value) || 0 }))}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
            
            {/* Big */}
            <div className="space-y-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-100 text-amber-700">Big</Badge>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-slate-500">Min</Label>
                  <Input
                    type="number"
                    value={dealSizeRanges.big_min}
                    onChange={(e) => setDealSizeRanges(prev => ({ ...prev, big_min: parseFloat(e.target.value) || 0 }))}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Max</Label>
                  <Input
                    type="number"
                    value={dealSizeRanges.big_max}
                    onChange={(e) => setDealSizeRanges(prev => ({ ...prev, big_max: parseFloat(e.target.value) || 0 }))}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
            
            {/* Mega */}
            <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-700">Mega</Badge>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-slate-500">Min</Label>
                  <Input
                    type="number"
                    value={dealSizeRanges.mega_min}
                    onChange={(e) => setDealSizeRanges(prev => ({ ...prev, mega_min: parseFloat(e.target.value) || 0 }))}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Max</Label>
                  <Input
                    type="number"
                    value={dealSizeRanges.mega_max}
                    onChange={(e) => setDealSizeRanges(prev => ({ ...prev, mega_max: parseFloat(e.target.value) || 0 }))}
                    className="font-mono"
                    placeholder="No limit"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveDealSizeRanges} disabled={savingRanges} className="gap-2">
              <Save className="w-4 h-4" />
              {savingRanges ? 'Saving...' : 'Save Deal Sizes'}
            </Button>
          </div>
        </CardContent>
      </Card>

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
        <h1 className="text-2xl font-bold text-slate-900 ">Risk Configuration</h1>
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
      order_percent: 2,
      collection_percent: 1,
      order_fixed: 0,
      collection_fixed: 0,
      max_cap: 0,
      is_active: true
    });
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      deal_size: rule.deal_size,
      role: rule.role,
      order_percent: rule.order_percent || rule.base_percent || 0,
      collection_percent: rule.collection_percent || 0,
      order_fixed: rule.order_fixed || 0,
      collection_fixed: rule.collection_fixed || 0,
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
          <h1 className="text-2xl font-bold text-slate-900 ">Incentive Rules</h1>
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
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                                Order: {rule.order_percent || rule.base_percent || 0}%
                                {rule.order_fixed > 0 && ` + SAR ${rule.order_fixed}`}
                              </span>
                              <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded">
                                Collection: {rule.collection_percent || 0}%
                                {rule.collection_fixed > 0 && ` + SAR ${rule.collection_fixed}`}
                              </span>
                              {rule.max_cap > 0 && (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">
                                  Cap: SAR {rule.max_cap.toLocaleString()}
                                </span>
                              )}
                            </div>
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
        <DialogContent className="max-w-lg" data-testid="rule-dialog">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Incentive Rule' : 'Add Incentive Rule'}</DialogTitle>
            <DialogDescription>Define incentive for Order and Collection phases</DialogDescription>
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

            {/* Order Phase */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <Label className="text-blue-700 font-semibold mb-3 block">Order Phase (عند التعاقد)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Percentage %</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.order_percent}
                    onChange={(e) => setFormData(prev => ({ ...prev, order_percent: parseFloat(e.target.value) || 0 }))}
                    className="bg-white"
                    data-testid="rule-order-percent"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Fixed Amount (SAR)</Label>
                  <Input
                    type="number"
                    value={formData.order_fixed}
                    onChange={(e) => setFormData(prev => ({ ...prev, order_fixed: parseFloat(e.target.value) || 0 }))}
                    className="bg-white"
                    placeholder="0"
                    data-testid="rule-order-fixed"
                  />
                </div>
              </div>
            </div>

            {/* Collection Phase */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <Label className="text-green-700 font-semibold mb-3 block">Collection Phase (عند التحصيل)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Percentage %</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.collection_percent}
                    onChange={(e) => setFormData(prev => ({ ...prev, collection_percent: parseFloat(e.target.value) || 0 }))}
                    className="bg-white"
                    data-testid="rule-collection-percent"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Fixed Amount (SAR)</Label>
                  <Input
                    type="number"
                    value={formData.collection_fixed}
                    onChange={(e) => setFormData(prev => ({ ...prev, collection_fixed: parseFloat(e.target.value) || 0 }))}
                    className="bg-white"
                    placeholder="0"
                    data-testid="rule-collection-fixed"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2 flex items-center pt-6">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  data-testid="rule-active-toggle"
                />
                <Label className="ml-2">Active</Label>
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 bg-slate-100 rounded-lg">
              <p className="text-xs text-slate-600">
                <strong>Preview:</strong> For SAR 100,000 deal = Order: SAR {((formData.order_percent / 100) * 100000 + (formData.order_fixed || 0)).toLocaleString()} + Collection: SAR {((formData.collection_percent / 100) * 100000 + (formData.collection_fixed || 0)).toLocaleString()} = Total: SAR {(((formData.order_percent + formData.collection_percent) / 100) * 100000 + (formData.order_fixed || 0) + (formData.collection_fixed || 0)).toLocaleString()}
              </p>
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

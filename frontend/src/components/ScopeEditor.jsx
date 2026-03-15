import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Package, Users, Truck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, generateId, getDealStatusClass } from '@/lib/utils';

export default function ScopeEditor({ 
  scope, scopeIndex, updateScope, removeScope, 
  roles, vendorServices, productTemplates, results 
}) {
  const [isOpen, setIsOpen] = useState(true);

  // Update scope field
  const updateField = (field, value) => {
    updateScope({ ...scope, [field]: value });
  };

  // Product handlers
  const addProduct = (templateId = null) => {
    let newProduct = {
      id: generateId(),
      name: 'New Product',
      template_id: '',
      team_members: [],
      description: ''
    };

    if (templateId) {
      const template = productTemplates.find(t => t.id === templateId);
      if (template) {
        newProduct.name = template.name;
        newProduct.template_id = template.id;
        newProduct.team_members = template.default_roles?.map(dr => {
          const role = roles.find(r => r.id === dr.role_id);
          return {
            id: generateId(),
            role_id: dr.role_id,
            role_name: role?.name || '',
            hours: dr.default_hours || 0,
            utilization_percent: 0,
            hourly_rate: role?.hourly_rate || 0
          };
        }) || [];
      }
    }

    updateField('products', [...scope.products, newProduct]);
  };

  const updateProduct = (productIndex, field, value) => {
    const products = [...scope.products];
    products[productIndex] = { ...products[productIndex], [field]: value };
    updateField('products', products);
  };

  const removeProduct = (productIndex) => {
    updateField('products', scope.products.filter((_, i) => i !== productIndex));
  };

  // Team member handlers within product
  const addTeamMemberToProduct = (productIndex) => {
    const products = [...scope.products];
    products[productIndex].team_members = [
      ...products[productIndex].team_members,
      { id: generateId(), role_id: '', role_name: '', hours: 0, utilization_percent: 0, hourly_rate: 0 }
    ];
    updateField('products', products);
  };

  const updateProductTeamMember = (productIndex, memberIndex, field, value) => {
    const products = [...scope.products];
    const member = products[productIndex].team_members[memberIndex];
    member[field] = value;

    if (field === 'role_id') {
      const role = roles.find(r => r.id === value);
      if (role) {
        member.role_name = role.name;
        member.hourly_rate = role.hourly_rate;
      }
    }

    updateField('products', products);
  };

  const removeProductTeamMember = (productIndex, memberIndex) => {
    const products = [...scope.products];
    products[productIndex].team_members = products[productIndex].team_members.filter((_, i) => i !== memberIndex);
    updateField('products', products);
  };

  // Vendor handlers
  const addVendor = () => {
    updateField('vendors', [
      ...scope.vendors,
      { id: generateId(), service_id: '', service_name: '', cost: 0, markup_percent: 15 }
    ]);
  };

  const updateVendor = (vendorIndex, field, value) => {
    const vendors = [...scope.vendors];
    vendors[vendorIndex] = { ...vendors[vendorIndex], [field]: value };

    if (field === 'service_id') {
      const service = vendorServices.find(s => s.id === value);
      if (service) {
        vendors[vendorIndex].service_name = service.name;
        vendors[vendorIndex].markup_percent = service.default_markup_percent;
      }
    }

    updateField('vendors', vendors);
  };

  const removeVendor = (vendorIndex) => {
    updateField('vendors', scope.vendors.filter((_, i) => i !== vendorIndex));
  };

  // Staffing handlers
  const addStaffing = () => {
    updateField('staffing', [
      ...scope.staffing,
      { 
        id: generateId(), 
        role_id: '', 
        role_name: '', 
        monthly_salary: 0, 
        duration_months: 1, 
        allowance: 0, 
        admin_fee_percent: 10,
        margin_percent: 20 
      }
    ]);
  };

  const updateStaffing = (staffIndex, field, value) => {
    const staffing = [...scope.staffing];
    staffing[staffIndex] = { ...staffing[staffIndex], [field]: value };

    if (field === 'role_id') {
      const role = roles.find(r => r.id === value);
      if (role) {
        staffing[staffIndex].role_name = role.name;
        staffing[staffIndex].monthly_salary = role.monthly_salary;
      }
    }

    updateField('staffing', staffing);
  };

  const removeStaffing = (staffIndex) => {
    updateField('staffing', scope.staffing.filter((_, i) => i !== staffIndex));
  };

  // Calculate scope totals
  const scopeTotals = results || {
    labor_cost: 0,
    vendor_cost: 0,
    vendor_revenue: 0,
    hours: 0
  };

  return (
    <Card className="border-slate-200" data-testid={`scope-${scopeIndex}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <Input
                  value={scope.name}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateField('name', e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-slate-800 border-none shadow-none p-0 h-auto focus-visible:ring-0 max-w-[200px]"
                  data-testid={`scope-name-${scopeIndex}`}
                />
                {scope.scope_type === 'staffing' && (
                  <Badge variant="secondary" className="text-xs">Staffing</Badge>
                )}
              </div>
              <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Scope Cost</p>
                  <p className="text-sm font-bold font-mono text-slate-900">
                    {formatCurrency(scopeTotals.labor_cost + scopeTotals.vendor_cost, false)}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeScope()}
                  className="text-slate-400 hover:text-red-500"
                  data-testid={`remove-scope-${scopeIndex}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 border-t border-slate-100 pt-6">
            {/* Products Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  <h4 className="text-sm font-semibold text-slate-700">Products</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Select onValueChange={(v) => addProduct(v)}>
                    <SelectTrigger className="w-40 h-8 text-xs" data-testid={`product-template-select-${scopeIndex}`}>
                      <SelectValue placeholder="From template" />
                    </SelectTrigger>
                    <SelectContent>
                      {productTemplates.map(pt => (
                        <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => addProduct()} className="h-8 text-xs" data-testid={`add-product-${scopeIndex}`}>
                    <Plus className="w-3 h-3 mr-1" />
                    Custom
                  </Button>
                </div>
              </div>

              {scope.products.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-lg text-slate-500 text-sm">
                  No products yet. Add from template or create custom.
                </div>
              ) : (
                <div className="space-y-4">
                  {scope.products.map((product, pIndex) => {
                    const productResult = results?.products?.[pIndex];
                    return (
                      <div key={product.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100" data-testid={`product-${scopeIndex}-${pIndex}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Input
                              value={product.name}
                              onChange={(e) => updateProduct(pIndex, 'name', e.target.value)}
                              className="font-medium border-none shadow-none p-0 h-auto bg-transparent focus-visible:ring-0 max-w-[180px]"
                              data-testid={`product-name-${scopeIndex}-${pIndex}`}
                            />
                            {productResult?.deal_status && (
                              <Badge className={`text-xs ${getDealStatusClass(productResult.deal_status)}`}>
                                {productResult.deal_status}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-xs">
                              <span className="text-slate-500">Cost: </span>
                              <span className="font-mono font-medium">{formatCurrency(productResult?.labor_cost || 0, false)}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeProduct(pIndex)}
                              className="text-slate-400 hover:text-red-500 h-6 w-6 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Team Members in Product */}
                        <div className="space-y-2">
                          {product.team_members.map((member, mIndex) => (
                            <div key={member.id} className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-4">
                                <Select value={member.role_id} onValueChange={(v) => updateProductTeamMember(pIndex, mIndex, 'role_id', v)}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {roles.map(role => (
                                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-2">
                                <Input
                                  type="number"
                                  value={member.hours || ''}
                                  onChange={(e) => updateProductTeamMember(pIndex, mIndex, 'hours', parseFloat(e.target.value) || 0)}
                                  placeholder="Hours"
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="col-span-2">
                                <div className="text-xs font-mono text-slate-500 px-2">{formatCurrency(member.hourly_rate, false)}/hr</div>
                              </div>
                              <div className="col-span-3">
                                <div className="text-xs font-mono font-medium text-slate-700">
                                  = {formatCurrency(member.hours * member.hourly_rate, false)}
                                </div>
                              </div>
                              <div className="col-span-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => removeProductTeamMember(pIndex, mIndex)}
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => addTeamMemberToProduct(pIndex)}
                            className="text-xs text-slate-500 h-7"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Role
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vendors Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-slate-400" />
                  <h4 className="text-sm font-semibold text-slate-700">Vendors</h4>
                </div>
                <Button size="sm" variant="outline" onClick={addVendor} className="h-8 text-xs" data-testid={`add-vendor-${scopeIndex}`}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Vendor
                </Button>
              </div>

              {scope.vendors.length === 0 ? (
                <div className="text-center py-4 bg-slate-50 rounded-lg text-slate-500 text-xs">
                  No vendors added
                </div>
              ) : (
                <div className="space-y-2">
                  {scope.vendors.map((vendor, vIndex) => (
                    <div key={vendor.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-slate-50 rounded">
                      <div className="col-span-4">
                        <Select value={vendor.service_id} onValueChange={(v) => updateVendor(vIndex, 'service_id', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Service" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendorServices.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={vendor.cost || ''}
                          onChange={(e) => updateVendor(vIndex, 'cost', parseFloat(e.target.value) || 0)}
                          placeholder="Cost"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={vendor.markup_percent || ''}
                          onChange={(e) => updateVendor(vIndex, 'markup_percent', parseFloat(e.target.value) || 0)}
                          placeholder="%"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <div className="text-xs font-mono font-medium text-slate-700">
                          Client: {formatCurrency(vendor.cost * (1 + vendor.markup_percent / 100), false)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeVendor(vIndex)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Staffing Section (for staffing scopes) */}
            {scope.scope_type === 'staffing' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-slate-400" />
                    <h4 className="text-sm font-semibold text-slate-700">Staffing / Secondment</h4>
                  </div>
                  <Button size="sm" variant="outline" onClick={addStaffing} className="h-8 text-xs" data-testid={`add-staffing-${scopeIndex}`}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Resource
                  </Button>
                </div>

                {scope.staffing.length === 0 ? (
                  <div className="text-center py-4 bg-slate-50 rounded-lg text-slate-500 text-xs">
                    No staffing resources added
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scope.staffing.map((staff, sIndex) => {
                      const baseCost = (staff.monthly_salary + staff.allowance) * staff.duration_months;
                      const adminFee = baseCost * (staff.admin_fee_percent / 100);
                      const totalCost = baseCost + adminFee;
                      const clientPrice = totalCost * (1 + staff.margin_percent / 100);
                      
                      return (
                        <div key={staff.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100" data-testid={`staffing-${scopeIndex}-${sIndex}`}>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <Label className="text-xs text-slate-500">Role</Label>
                              <Select value={staff.role_id} onValueChange={(v) => updateStaffing(sIndex, 'role_id', v)}>
                                <SelectTrigger className="h-8 text-xs mt-1">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map(role => (
                                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-slate-500">Monthly Salary (SAR)</Label>
                              <Input
                                type="number"
                                value={staff.monthly_salary || ''}
                                onChange={(e) => updateStaffing(sIndex, 'monthly_salary', parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <Label className="text-xs text-slate-500">Duration (months)</Label>
                              <Input
                                type="number"
                                value={staff.duration_months || ''}
                                onChange={(e) => updateStaffing(sIndex, 'duration_months', parseInt(e.target.value) || 1)}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-500">Allowance</Label>
                              <Input
                                type="number"
                                value={staff.allowance || ''}
                                onChange={(e) => updateStaffing(sIndex, 'allowance', parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-500">Admin Fee %</Label>
                              <Input
                                type="number"
                                value={staff.admin_fee_percent || ''}
                                onChange={(e) => updateStaffing(sIndex, 'admin_fee_percent', parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-500">Margin %</Label>
                              <Input
                                type="number"
                                value={staff.margin_percent || ''}
                                onChange={(e) => updateStaffing(sIndex, 'margin_percent', parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                            <div className="text-xs">
                              <span className="text-slate-500">Cost: </span>
                              <span className="font-mono font-medium">{formatCurrency(totalCost, false)}</span>
                              <span className="text-slate-400 mx-2">→</span>
                              <span className="text-slate-500">Client: </span>
                              <span className="font-mono font-medium text-emerald-600">{formatCurrency(clientPrice, false)}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeStaffing(sIndex)}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tools & Extras */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500">Tools Cost (SAR)</Label>
                <Input
                  type="number"
                  value={scope.tools_cost || ''}
                  onChange={(e) => updateField('tools_cost', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                  data-testid={`tools-cost-${scopeIndex}`}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Project Extras (SAR)</Label>
                <Input
                  type="number"
                  value={scope.extras_cost || ''}
                  onChange={(e) => updateField('extras_cost', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                  data-testid={`extras-cost-${scopeIndex}`}
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

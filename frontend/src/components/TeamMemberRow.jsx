import { useState } from 'react';
import { Plus, Trash2, Clock, Calendar, User, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency, generateId } from '@/lib/utils';
import { quickCreateRole } from '@/lib/api';

export default function TeamMemberRow({ 
  member, 
  index, 
  roles, 
  onUpdate, 
  onRemove,
  onRolesRefresh,
  darkMode = false,
  secondedMarkupPercent = 20  // Default 20% markup for seconded employees
}) {
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', hourly_rate: 0, monthly_salary: 0 });
  const [saving, setSaving] = useState(false);

  // Dark mode classes
  const cardClass = darkMode 
    ? "p-4 rounded-lg bg-neutral-800/50 border border-neutral-700 space-y-3" 
    : "p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-3";
  const inputClass = darkMode
    ? "bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
    : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400";
  const selectTriggerClass = darkMode
    ? "bg-neutral-900 border-neutral-700 text-white"
    : "bg-white border-slate-200 text-slate-900";
  const labelClass = darkMode
    ? "text-xs text-neutral-400"
    : "text-xs text-slate-500";
  const toggleBgClass = darkMode
    ? "bg-neutral-900 border-neutral-700"
    : "bg-slate-100 border-slate-200";
  const iconActiveClass = darkMode ? "text-blue-400" : "text-slate-700";
  const iconInactiveClass = darkMode ? "text-neutral-500" : "text-slate-400";
  const resultTextClass = darkMode ? "text-white" : "text-slate-900";
  const subtextClass = darkMode ? "text-neutral-500" : "text-slate-500";

  // Calculate cost based on mode
  const calculateCost = () => {
    const quantity = member.quantity || 1;
    
    if (member.employee_type === 'seconded') {
      // Seconded/Per-Project: Use role's monthly salary * (1 + markup%) * duration
      const role = roles.find(r => r.id === member.role_id);
      const baseMonthlyCost = role?.total_monthly_cost || role?.monthly_salary || member.monthly_salary || 0;
      const withMarkup = baseMonthlyCost * (1 + secondedMarkupPercent / 100);
      const duration = member.duration_months || 1;
      return withMarkup * duration * quantity;
    } else {
      // Internal employee
      if (member.calc_mode === 'utilization') {
        // Monthly cost * utilization * duration
        const role = roles.find(r => r.id === member.role_id);
        const monthlyCost = role?.total_monthly_cost || role?.monthly_salary || 0;
        const utilization = (member.utilization_percent || 0) / 100;
        const duration = member.duration_months || 1;
        return monthlyCost * utilization * duration * quantity;
      } else {
        // Hours mode: hours * hourly_rate * quantity
        return (member.hours || 0) * (member.hourly_rate || 0) * quantity;
      }
    }
  };

  const handleAddRole = async () => {
    if (!newRole.name) {
      toast.error('Please enter a role name');
      return;
    }
    
    setSaving(true);
    try {
      const created = await quickCreateRole(newRole);
      toast.success(`Role "${created.name}" created`);
      setShowAddRole(false);
      setNewRole({ name: '', hourly_rate: 0, monthly_salary: 0 });
      
      // Refresh roles and select the new one
      if (onRolesRefresh) {
        await onRolesRefresh();
      }
      onUpdate('role_id', created.id);
      onUpdate('role_name', created.name);
      onUpdate('hourly_rate', created.hourly_rate);
      onUpdate('monthly_salary', created.monthly_salary);
    } catch (error) {
      toast.error('Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = (roleId) => {
    if (roleId === '__add_new__') {
      setShowAddRole(true);
      return;
    }
    
    const role = roles.find(r => r.id === roleId);
    if (role) {
      onUpdate('role_id', roleId);
      onUpdate('role_name', role.name);
      onUpdate('hourly_rate', role.hourly_rate);
      onUpdate('monthly_salary', role.monthly_salary || 0);
    }
  };

  const isUtilizationMode = member.calc_mode === 'utilization';
  const isSeconded = member.employee_type === 'seconded';
  const cost = calculateCost();

  return (
    <>
      <div className={cardClass} data-testid={`team-member-${index}`}>
        {/* Row 1: Role, Employee Type, Calc Mode Toggle */}
        <div className="flex items-center gap-3">
          {/* Role Select */}
          <div className="flex-1">
            <Select value={member.role_id || ''} onValueChange={handleRoleChange}>
              <SelectTrigger className={selectTriggerClass} data-testid={`role-select-${index}`}>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className={darkMode ? "bg-neutral-900 border-neutral-700" : "bg-white border-slate-200"}>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id} className={darkMode ? "text-neutral-300" : "text-slate-700"}>
                    {role.name}
                  </SelectItem>
                ))}
                <SelectItem value="__add_new__" className={darkMode ? "text-blue-400 font-medium" : "text-slate-900 font-medium"}>
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add new role...
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employee Type */}
          <div className="w-44">
            <Select value={member.employee_type || 'internal'} onValueChange={(v) => onUpdate('employee_type', v)}>
              <SelectTrigger className={selectTriggerClass} data-testid={`employee-type-${index}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={darkMode ? "bg-neutral-900 border-neutral-700" : "bg-white border-slate-200"}>
                <SelectItem value="internal" className={darkMode ? "text-neutral-300" : "text-slate-700"}>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Internal Employee
                  </div>
                </SelectItem>
                <SelectItem value="seconded" className={darkMode ? "text-neutral-300" : "text-slate-700"}>
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    منتدب - Per Project
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Calc Mode Toggle (only for internal employees) */}
          {!isSeconded && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${toggleBgClass}`}>
              <Clock className={`w-4 h-4 ${!isUtilizationMode ? iconActiveClass : iconInactiveClass}`} />
              <Switch
                checked={isUtilizationMode}
                onCheckedChange={(checked) => onUpdate('calc_mode', checked ? 'utilization' : 'hours')}
                className={darkMode 
                  ? "data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-neutral-700" 
                  : "data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-300"
                }
                data-testid={`calc-mode-${index}`}
              />
              <Calendar className={`w-4 h-4 ${isUtilizationMode ? iconActiveClass : iconInactiveClass}`} />
            </div>
          )}

          {/* Remove Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRemove}
            className={darkMode ? "text-neutral-500 hover:text-red-400" : "text-slate-400 hover:text-red-500"}
            data-testid={`remove-team-${index}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Row 2: Input fields based on mode */}
        <div className="grid grid-cols-12 gap-3 items-end">
          {isSeconded ? (
            // Seconded/Per-Project employee: Use role's monthly salary + markup
            <>
              <div className="col-span-2">
                <Label className={labelClass}>Qty</Label>
                <Input
                  type="number"
                  min="1"
                  className={`mt-1 ${inputClass}`}
                  value={member.quantity || 1}
                  onChange={(e) => onUpdate('quantity', parseInt(e.target.value) || 1)}
                  placeholder="1"
                />
              </div>
              <div className="col-span-3">
                <Label className={labelClass}>Base Monthly (from DB)</Label>
                <div className={`text-sm font-mono px-3 py-2 rounded-md border mt-1 ${darkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                  {formatCurrency(roles.find(r => r.id === member.role_id)?.total_monthly_cost || roles.find(r => r.id === member.role_id)?.monthly_salary || 0, false)}
                </div>
              </div>
              <div className="col-span-2">
                <Label className={labelClass}>Markup +{secondedMarkupPercent}%</Label>
                <div className={`text-sm font-mono px-3 py-2 rounded-md border mt-1 ${darkMode ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  {formatCurrency((roles.find(r => r.id === member.role_id)?.total_monthly_cost || roles.find(r => r.id === member.role_id)?.monthly_salary || 0) * (1 + secondedMarkupPercent / 100), false)}
                </div>
              </div>
              <div className="col-span-2">
                <Label className={labelClass}>Duration (months)</Label>
                <Input
                  type="number"
                  min="1"
                  className={`mt-1 ${inputClass}`}
                  value={member.duration_months || 1}
                  onChange={(e) => onUpdate('duration_months', parseInt(e.target.value) || 1)}
                  placeholder="Months"
                />
              </div>
              <div className="col-span-3">
                <Label className={labelClass}>Total Cost</Label>
                <div className={`text-lg font-bold font-mono mt-1 ${resultTextClass}`}>
                  {formatCurrency(cost, false)}
                </div>
                <div className={`text-xs ${subtextClass}`}>
                  {member.quantity || 1} × {member.duration_months || 1} mo × +{secondedMarkupPercent}%
                </div>
              </div>
            </>
          ) : isUtilizationMode ? (
            // Utilization mode for internal employee
            <>
              <div className="col-span-3">
                <Label className={labelClass}>Monthly Cost (incl. benefits)</Label>
                <div className={`text-sm font-mono px-3 py-2 rounded-md border mt-1 ${darkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                  {formatCurrency(roles.find(r => r.id === member.role_id)?.total_monthly_cost || roles.find(r => r.id === member.role_id)?.monthly_salary || 0, false)}
                </div>
              </div>
              <div className="col-span-2">
                <Label className={labelClass}>Utilization %</Label>
                <Input
                  type="number"
                  className={`mt-1 ${inputClass}`}
                  value={member.utilization_percent || ''}
                  onChange={(e) => onUpdate('utilization_percent', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 50"
                  data-testid={`util-input-${index}`}
                />
              </div>
              <div className="col-span-2">
                <Label className={labelClass}>Duration (months)</Label>
                <Input
                  type="number"
                  className={`mt-1 ${inputClass}`}
                  value={member.duration_months || ''}
                  onChange={(e) => onUpdate('duration_months', parseInt(e.target.value) || 1)}
                  placeholder="Months"
                  data-testid={`duration-input-${index}`}
                />
              </div>
              <div className="col-span-2">
                <Label className={labelClass}>Calc Preview</Label>
                <div className={`text-xs mt-1 ${subtextClass}`}>
                  {formatCurrency(roles.find(r => r.id === member.role_id)?.total_monthly_cost || 0, false)} × {member.utilization_percent || 0}% × {member.duration_months || 1}m
                </div>
              </div>
              <div className="col-span-3">
                <Label className={labelClass}>Total Cost</Label>
                <div className={`text-lg font-bold font-mono mt-1 ${resultTextClass}`}>
                  {formatCurrency(cost, false)}
                </div>
              </div>
            </>
          ) : (
            // Hours mode for internal employee
            <>
              <div className="col-span-2">
                <Label className={labelClass}>Qty</Label>
                <Input
                  type="number"
                  min="1"
                  className={`mt-1 ${inputClass}`}
                  value={member.quantity || 1}
                  onChange={(e) => onUpdate('quantity', parseInt(e.target.value) || 1)}
                  placeholder="1"
                  data-testid={`qty-input-${index}`}
                />
              </div>
              <div className="col-span-2">
                <Label className={labelClass}>Hours</Label>
                <Input
                  type="number"
                  className={`mt-1 ${inputClass}`}
                  value={member.hours || ''}
                  onChange={(e) => onUpdate('hours', parseFloat(e.target.value) || 0)}
                  placeholder="Hours"
                  data-testid={`hours-input-${index}`}
                />
              </div>
              <div className="col-span-2">
                <Label className={labelClass}>Hourly Rate</Label>
                <div className={`text-sm font-mono px-3 py-2 rounded-md border mt-1 ${darkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                  {formatCurrency(member.hourly_rate || 0, false)} / hr
                </div>
              </div>
              <div className="col-span-3">
                <Label className={labelClass}>Calc Preview</Label>
                <div className={`text-xs mt-1 ${subtextClass}`}>
                  {member.quantity || 1} × {member.hours || 0} hrs × {formatCurrency(member.hourly_rate || 0, false)}
                </div>
              </div>
              <div className="col-span-3">
                <Label className={labelClass}>Total Cost</Label>
                <div className={`text-lg font-bold font-mono mt-1 ${resultTextClass}`}>
                  {formatCurrency(cost, false)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add New Role Dialog */}
      <Dialog open={showAddRole} onOpenChange={setShowAddRole}>
        <DialogContent className={darkMode ? '' : 'bg-white border-slate-200'} data-testid="add-role-dialog">
          <DialogHeader>
            <DialogTitle className={darkMode ? '' : 'text-slate-900'}>Add New Role</DialogTitle>
            <DialogDescription className={darkMode ? '' : 'text-slate-500'}>Create a new role to add to the list</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className={darkMode ? '' : 'text-slate-700'}>Role Name</Label>
              <Input
                value={newRole.name}
                onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Senior Designer"
                className={darkMode ? '' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}
                data-testid="new-role-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={darkMode ? '' : 'text-slate-700'}>Hourly Rate (SAR)</Label>
                <Input
                  type="number"
                  value={newRole.hourly_rate || ''}
                  onChange={(e) => setNewRole(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                  className={darkMode ? '' : 'bg-white border-slate-200 text-slate-900'}
                  data-testid="new-role-rate"
                />
              </div>
              <div className="space-y-2">
                <Label className={darkMode ? '' : 'text-slate-700'}>Monthly Salary (SAR)</Label>
                <Input
                  type="number"
                  value={newRole.monthly_salary || ''}
                  onChange={(e) => setNewRole(prev => ({ ...prev, monthly_salary: parseFloat(e.target.value) || 0 }))}
                  className={darkMode ? '' : 'bg-white border-slate-200 text-slate-900'}
                  data-testid="new-role-salary"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRole(false)} className={darkMode ? '' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}>Cancel</Button>
            <Button onClick={handleAddRole} disabled={saving} className={darkMode ? '' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} data-testid="save-new-role">
              {saving ? 'Saving...' : 'Add Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

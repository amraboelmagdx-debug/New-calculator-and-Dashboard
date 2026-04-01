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
  darkMode = false
}) {
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', hourly_rate: 0, monthly_salary: 0 });
  const [saving, setSaving] = useState(false);

  // Dark mode classes
  const cardClass = darkMode 
    ? "p-4 rounded-lg bg-neutral-800/50 border border-neutral-700 space-y-3" 
    : "p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-3";
  const inputClass = darkMode
    ? "bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
    : "";
  const selectTriggerClass = darkMode
    ? "bg-neutral-900 border-neutral-700 text-white"
    : "";
  const labelClass = darkMode
    ? "text-xs text-neutral-400"
    : "text-xs text-slate-500";
  const toggleBgClass = darkMode
    ? "bg-neutral-900 border-neutral-700"
    : "bg-white border";
  const iconActiveClass = darkMode ? "text-blue-400" : "text-indigo-600";
  const iconInactiveClass = darkMode ? "text-neutral-500" : "text-slate-400";
  const resultTextClass = darkMode ? "text-white" : "text-slate-900";
  const subtextClass = darkMode ? "text-neutral-500" : "text-slate-500";

  // Calculate cost based on mode
  const calculateCost = () => {
    if (member.employee_type === 'seconded') {
      // Seconded: (custom_salary + allowance) * (1 + admin_fee%) * utilization * duration
      const baseCost = (member.custom_salary || 0) + (member.custom_allowance || 0);
      const withAdminFee = baseCost * (1 + (member.admin_fee_percent || 10) / 100);
      const utilization = (member.utilization_percent || 100) / 100;
      const duration = member.duration_months || 1;
      return withAdminFee * utilization * duration;
    } else {
      // Internal employee
      if (member.calc_mode === 'utilization') {
        // Monthly cost * utilization * duration
        const role = roles.find(r => r.id === member.role_id);
        const monthlyCost = role?.total_monthly_cost || role?.monthly_salary || 0;
        const utilization = (member.utilization_percent || 0) / 100;
        const duration = member.duration_months || 1;
        return monthlyCost * utilization * duration;
      } else {
        // Hours mode: hours * hourly_rate
        return (member.hours || 0) * (member.hourly_rate || 0);
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
              <SelectContent className={darkMode ? "bg-neutral-900 border-neutral-700" : ""}>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id} className={darkMode ? "text-neutral-300" : ""}>
                    {role.name}
                  </SelectItem>
                ))}
                <SelectItem value="__add_new__" className={darkMode ? "text-blue-400 font-medium" : "text-indigo-600 font-medium"}>
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
              <SelectContent className={darkMode ? "bg-neutral-900 border-neutral-700" : ""}>
                <SelectItem value="internal" className={darkMode ? "text-neutral-300" : ""}>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Internal Employee
                  </div>
                </SelectItem>
                <SelectItem value="seconded" className={darkMode ? "text-neutral-300" : ""}>
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Seconded / Project
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Calc Mode Toggle (only for internal employees) */}
          {!isSeconded && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${toggleBgClass}`}>
              <Clock className={`w-4 h-4 ${!isUtilizationMode ? iconActiveClass : iconInactiveClass}`} />
              <Switch
                checked={isUtilizationMode}
                onCheckedChange={(checked) => onUpdate('calc_mode', checked ? 'utilization' : 'hours')}
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
            // Seconded employee fields
            <>
              <div className="col-span-2">
                <Label className={labelClass}>Monthly Salary</Label>
                <Input
                  type="number"
                  className={`mt-1 ${inputClass}`}
                  value={member.custom_salary || ''}
                  onChange={(e) => onUpdate('custom_salary', parseFloat(e.target.value) || 0)}
                  placeholder="Salary"
                />
              </div>
              <div className="col-span-2">
                <Label className={labelClass}>Allowance</Label>
                <Input
                  type="number"
                  className={`mt-1 ${inputClass}`}
                  value={member.custom_allowance || ''}
                  onChange={(e) => onUpdate('custom_allowance', parseFloat(e.target.value) || 0)}
                  placeholder="Allowance"
                />
              </div>
              <div className="col-span-2">
                <Label className={labelClass}>Admin Fee %</Label>
                <Input
                  type="number"
                  className={`mt-1 ${inputClass}`}
                  value={member.admin_fee_percent || ''}
                  onChange={(e) => onUpdate('admin_fee_percent', parseFloat(e.target.value) || 0)}
                  placeholder="%"
                />
              </div>
              <div className="col-span-2">
                <Label className={labelClass}>Utilization %</Label>
                <Input
                  type="number"
                  className={`mt-1 ${inputClass}`}
                  value={member.utilization_percent || ''}
                  onChange={(e) => onUpdate('utilization_percent', parseFloat(e.target.value) || 0)}
                  placeholder="%"
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
                />
              </div>
              <div className="col-span-2">
                <Label className={labelClass}>Total Cost</Label>
                <div className={`text-lg font-bold font-mono mt-1 ${resultTextClass}`}>
                  {formatCurrency(cost, false)}
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
              <div className="col-span-3">
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
              <div className="col-span-3">
                <Label className={labelClass}>Hourly Rate</Label>
                <div className={`text-sm font-mono px-3 py-2 rounded-md border mt-1 ${darkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                  {formatCurrency(member.hourly_rate || 0, false)} / hr
                </div>
              </div>
              <div className="col-span-3">
                <Label className={labelClass}>Calc Preview</Label>
                <div className={`text-xs mt-1 ${subtextClass}`}>
                  {member.hours || 0} hrs × {formatCurrency(member.hourly_rate || 0, false)}
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
        <DialogContent data-testid="add-role-dialog">
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
            <DialogDescription>Create a new role to add to the list</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input
                value={newRole.name}
                onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Senior Designer"
                data-testid="new-role-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hourly Rate (SAR)</Label>
                <Input
                  type="number"
                  value={newRole.hourly_rate || ''}
                  onChange={(e) => setNewRole(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                  data-testid="new-role-rate"
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Salary (SAR)</Label>
                <Input
                  type="number"
                  value={newRole.monthly_salary || ''}
                  onChange={(e) => setNewRole(prev => ({ ...prev, monthly_salary: parseFloat(e.target.value) || 0 }))}
                  data-testid="new-role-salary"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRole(false)}>Cancel</Button>
            <Button onClick={handleAddRole} disabled={saving} data-testid="save-new-role">
              {saving ? 'Saving...' : 'Add Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

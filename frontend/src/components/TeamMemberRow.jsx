import { Trash2, Clock, Calendar, User, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { formatCurrency, hoursFromUtilization, utilizationFromHours } from '@/lib/utils';
import { getChargeableHours, EXECUTION_HYBRID } from '@/lib/pricingCostRules';

export default function TeamMemberRow({ 
  member, 
  index, 
  roles, 
  onUpdate, 
  onRemove,
  onRolesRefresh,
  darkMode = false,
  compact = false,
  secondedMarkupPercent = 20,
  standardMonthlyHours = 160,
  sourceBadges = [],
}) {
  const cardClass = darkMode 
    ? `${compact ? 'p-2.5 space-y-2' : 'p-4 space-y-3'} rounded-lg bg-neutral-800/50 border border-neutral-700` 
    : `${compact ? 'p-2.5 space-y-2' : 'p-4 space-y-3'} rounded-lg bg-white border border-slate-200 ${compact ? '' : 'shadow-sm'}`;
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

  const calculateCost = () => {
    const quantity = member.quantity || 1;
    
    if (member.employee_type === 'seconded') {
      const role = roles.find(r => r.id === member.role_id);
      const baseMonthlyCost = role?.total_monthly_cost || role?.monthly_salary || member.monthly_salary || 0;
      const withMarkup = baseMonthlyCost * (1 + secondedMarkupPercent / 100);
      const duration = member.duration_months || 1;
      return withMarkup * duration * quantity;
    } else {
      if (member.calc_mode === 'utilization') {
        const role = roles.find(r => r.id === member.role_id);
        const monthlyCost = role?.total_monthly_cost || role?.monthly_salary || 0;
        const utilization = (member.utilization_percent || 0) / 100;
        const duration = member.duration_months || 1;
        return monthlyCost * utilization * duration * quantity;
      } else {
        const billableHours =
          member.labor_charge_context === EXECUTION_HYBRID && (member.baseline_hours || 0) > 0
            ? getChargeableHours(member.hours, member.baseline_hours, 'hours', EXECUTION_HYBRID)
            : member.hours || 0;
        return billableHours * (member.hourly_rate || 0) * quantity;
      }
    }
  };

  const hybridBillableHours =
    member.labor_charge_context === EXECUTION_HYBRID &&
    member.calc_mode !== 'utilization' &&
    (member.baseline_hours || 0) > 0
      ? getChargeableHours(member.hours, member.baseline_hours, 'hours', EXECUTION_HYBRID)
      : null;

  const handleRoleChange = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
      onUpdate('_roleBundle', {
        role_id: roleId,
        role_name: role.name,
        hourly_rate: role.hourly_rate,
        monthly_salary: role.monthly_salary || 0,
      });
    }
  };

  const isUtilizationMode = member.calc_mode === 'utilization';
  const isSeconded = member.employee_type === 'seconded';
  const cost = calculateCost();
  const mirroredUtilPercent = utilizationFromHours(member.hours || 0, standardMonthlyHours);
  const mirroredHours = hoursFromUtilization(member.utilization_percent || 0, standardMonthlyHours);

  return (
    <div className={cardClass} data-testid={`team-member-${index}`}>
      {sourceBadges.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {sourceBadges.map(name => (
            <span
              key={name}
              className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${
                darkMode
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : 'bg-indigo-50 text-indigo-600 border-indigo-100'
              }`}
            >
              {name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
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
            </SelectContent>
          </Select>
        </div>

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

      <div className="grid grid-cols-12 gap-3 items-end">
        {isSeconded ? (
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
              <p className={`text-xs mt-1 ${subtextClass}`}>
                ≈ {mirroredHours} hours / {standardMonthlyHours}h month
              </p>
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
              <p className={`text-xs mt-1 ${subtextClass}`}>
                ≈ {mirroredUtilPercent}% of month ({member.hours || 0}h / {standardMonthlyHours}h)
              </p>
              {hybridBillableHours != null && (
                <p className={`text-xs mt-1 ${darkMode ? 'text-amber-400/90' : 'text-amber-700'}`}>
                  Included: {member.baseline_hours}h · Billable: {hybridBillableHours}h
                  {(member.hours || 0) < (member.baseline_hours || 0) &&
                    ' — below scope (no labor credit)'}
                </p>
              )}
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
  );
}

import { Trash2, Clock, Calendar, User, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { formatCurrency, hoursFromUtilization, utilizationFromHours } from '@/lib/utils';
import { getChargeableHours, EXECUTION_HYBRID } from '@/lib/pricingCostRules';

function FieldCell({ label, children, className = '', darkMode = false }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <Label
        className={`text-[10px] font-medium uppercase tracking-wider ${
          darkMode ? 'text-neutral-500' : 'text-slate-500'
        }`}
      >
        {label}
      </Label>
      <div className="mt-1 min-h-[2.5rem] flex items-center">{children}</div>
    </div>
  );
}

function ReadonlyValue({ value, darkMode, accent = false }) {
  const base = darkMode
    ? 'bg-neutral-900 border-neutral-700 text-neutral-300'
    : 'bg-white border-slate-200 text-slate-600';
  const accentClass = accent
    ? darkMode
      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : base;
  return (
    <div className={`w-full text-sm font-mono px-3 py-2 rounded-md border ${accentClass}`}>
      {value}
    </div>
  );
}

function TotalCostPanel({ cost, darkMode }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-right min-w-[7.5rem] ${
        darkMode
          ? 'bg-neutral-900/60 border-neutral-700/80'
          : 'bg-slate-50 border-slate-200'
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        Total Cost
      </p>
      <p className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
        {formatCurrency(cost, false)}
      </p>
    </div>
  );
}

function MetaStrip({ children, darkMode }) {
  if (!children) return null;
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 mt-1 border-t text-[11px] ${
        darkMode ? 'border-neutral-700/80 text-neutral-500' : 'border-slate-100 text-slate-500'
      }`}
    >
      {children}
    </div>
  );
}

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
    ? `${compact ? 'p-3 space-y-2.5' : 'p-4 space-y-3'} rounded-lg bg-neutral-800/50 border border-neutral-700 border-l-2 border-l-indigo-500/40`
    : `${compact ? 'p-3 space-y-2.5' : 'p-4 space-y-3'} rounded-lg bg-white border border-slate-200 border-l-2 border-l-indigo-400/50 ${compact ? '' : 'shadow-sm'}`;
  const inputClass = darkMode
    ? 'bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500'
    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400';
  const selectTriggerClass = darkMode
    ? 'bg-neutral-900 border-neutral-700 text-white [&>span]:truncate'
    : 'bg-white border-slate-200 text-slate-900 [&>span]:truncate';
  const toggleBgClass = darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-slate-100 border-slate-200';
  const iconActiveClass = darkMode ? 'text-blue-400' : 'text-slate-700';
  const iconInactiveClass = darkMode ? 'text-neutral-500' : 'text-slate-400';
  const amberClass = darkMode ? 'text-amber-400/90' : 'text-amber-700';

  const selectedRole = roles.find(r => r.id === member.role_id);
  const baseMonthlyCost =
    selectedRole?.total_monthly_cost || selectedRole?.monthly_salary || member.monthly_salary || 0;

  const calculateCost = () => {
    const quantity = member.quantity || 1;

    if (member.employee_type === 'seconded') {
      const withMarkup = baseMonthlyCost * (1 + secondedMarkupPercent / 100);
      const duration = member.duration_months || 1;
      return withMarkup * duration * quantity;
    }
    if (member.calc_mode === 'utilization') {
      const monthlyCost = selectedRole?.total_monthly_cost || selectedRole?.monthly_salary || 0;
      const utilization = (member.utilization_percent || 0) / 100;
      const duration = member.duration_months || 1;
      return monthlyCost * utilization * duration * quantity;
    }
    const billableHours =
      member.labor_charge_context === EXECUTION_HYBRID && (member.baseline_hours || 0) > 0
        ? getChargeableHours(member.hours, member.baseline_hours, 'hours', EXECUTION_HYBRID)
        : member.hours || 0;
    return billableHours * (member.hourly_rate || 0) * quantity;
  };

  const hybridBillableHours =
    member.labor_charge_context === EXECUTION_HYBRID &&
    member.calc_mode !== 'utilization' &&
    (member.baseline_hours || 0) > 0
      ? getChargeableHours(member.hours, member.baseline_hours, 'hours', EXECUTION_HYBRID)
      : null;

  const handleRoleChange = roleId => {
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

  const metricsGridClass =
    'grid grid-cols-1 sm:grid-cols-[72px_1fr_1fr_auto] gap-3 items-start';

  return (
    <div className={cardClass} data-testid={`team-member-${index}`}>
      {sourceBadges.length > 0 && (
        <div className="flex flex-wrap gap-1">
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

      {/* Header: role · employee type · calc toggle · delete */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex-1 min-w-[12rem]">
          <Select value={member.role_id || ''} onValueChange={handleRoleChange}>
            <SelectTrigger className={`${selectTriggerClass} max-w-full`} data-testid={`role-select-${index}`}>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent className={darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
              {roles.map(role => (
                <SelectItem
                  key={role.id}
                  value={role.id}
                  className={darkMode ? 'text-neutral-300' : 'text-slate-700'}
                >
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-44 shrink-0">
          <Select value={member.employee_type || 'internal'} onValueChange={v => onUpdate('employee_type', v)}>
            <SelectTrigger className={selectTriggerClass} data-testid={`employee-type-${index}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
              <SelectItem value="internal" className={darkMode ? 'text-neutral-300' : 'text-slate-700'}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Internal Employee
                </div>
              </SelectItem>
              <SelectItem value="seconded" className={darkMode ? 'text-neutral-300' : 'text-slate-700'}>
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  منتدب - Per Project
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isSeconded && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border shrink-0 ${toggleBgClass}`}>
            <Clock className={`w-4 h-4 ${!isUtilizationMode ? iconActiveClass : iconInactiveClass}`} />
            <Switch
              checked={isUtilizationMode}
              onCheckedChange={checked => onUpdate('calc_mode', checked ? 'utilization' : 'hours')}
              className={
                darkMode
                  ? 'data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-neutral-700'
                  : 'data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-300'
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
          className={`shrink-0 ${darkMode ? 'text-neutral-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}
          data-testid={`remove-team-${index}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Metrics row + meta strip */}
      {isSeconded ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[72px_1fr_1fr_88px_auto] gap-3 items-start">
            <FieldCell label="Qty" darkMode={darkMode}>
              <Input
                type="number"
                min="1"
                className={`w-full ${inputClass}`}
                value={member.quantity || 1}
                onChange={e => onUpdate('quantity', parseInt(e.target.value, 10) || 1)}
                placeholder="1"
              />
            </FieldCell>
            <FieldCell label="Base Monthly" darkMode={darkMode}>
              <ReadonlyValue value={formatCurrency(baseMonthlyCost, false)} darkMode={darkMode} />
            </FieldCell>
            <FieldCell label={`Markup +${secondedMarkupPercent}%`} darkMode={darkMode}>
              <ReadonlyValue
                value={formatCurrency(baseMonthlyCost * (1 + secondedMarkupPercent / 100), false)}
                darkMode={darkMode}
                accent
              />
            </FieldCell>
            <FieldCell label="Duration (mo)" darkMode={darkMode}>
              <Input
                type="number"
                min="1"
                className={`w-full ${inputClass}`}
                value={member.duration_months || 1}
                onChange={e => onUpdate('duration_months', parseInt(e.target.value, 10) || 1)}
                placeholder="Months"
              />
            </FieldCell>
            <div className="sm:col-span-2 lg:col-span-1 flex justify-end lg:justify-end">
              <TotalCostPanel cost={cost} darkMode={darkMode} />
            </div>
          </div>
          <MetaStrip darkMode={darkMode}>
            <span>
              {member.quantity || 1} × {member.duration_months || 1} mo × +{secondedMarkupPercent}% markup
            </span>
          </MetaStrip>
        </>
      ) : isUtilizationMode ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_88px_88px_auto] gap-3 items-start">
            <FieldCell label="Monthly Cost" darkMode={darkMode}>
              <ReadonlyValue
                value={formatCurrency(selectedRole?.total_monthly_cost || selectedRole?.monthly_salary || 0, false)}
                darkMode={darkMode}
              />
            </FieldCell>
            <FieldCell label="Utilization %" darkMode={darkMode}>
              <Input
                type="number"
                className={`w-full ${inputClass}`}
                value={member.utilization_percent || ''}
                onChange={e => onUpdate('utilization_percent', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 50"
                data-testid={`util-input-${index}`}
              />
            </FieldCell>
            <FieldCell label="Duration (mo)" darkMode={darkMode}>
              <Input
                type="number"
                className={`w-full ${inputClass}`}
                value={member.duration_months || ''}
                onChange={e => onUpdate('duration_months', parseInt(e.target.value, 10) || 1)}
                placeholder="Months"
                data-testid={`duration-input-${index}`}
              />
            </FieldCell>
            <div className="sm:col-span-2 lg:col-span-1 flex justify-end">
              <TotalCostPanel cost={cost} darkMode={darkMode} />
            </div>
          </div>
          <MetaStrip darkMode={darkMode}>
            <span>
              ≈ {mirroredHours} hours / {standardMonthlyHours}h month
            </span>
            <span className={darkMode ? 'text-neutral-600' : 'text-slate-300'}>·</span>
            <span>
              {formatCurrency(selectedRole?.total_monthly_cost || 0, false)} × {member.utilization_percent || 0}% ×{' '}
              {member.duration_months || 1}m
            </span>
          </MetaStrip>
        </>
      ) : (
        <>
          <div className={metricsGridClass}>
            <FieldCell label="Qty" darkMode={darkMode}>
              <Input
                type="number"
                min="1"
                className={`w-full ${inputClass}`}
                value={member.quantity || 1}
                onChange={e => onUpdate('quantity', parseInt(e.target.value, 10) || 1)}
                placeholder="1"
                data-testid={`qty-input-${index}`}
              />
            </FieldCell>
            <FieldCell label="Hours" darkMode={darkMode}>
              <Input
                type="number"
                className={`w-full ${inputClass}`}
                value={member.hours || ''}
                onChange={e => onUpdate('hours', parseFloat(e.target.value) || 0)}
                placeholder="Hours"
                data-testid={`hours-input-${index}`}
              />
            </FieldCell>
            <FieldCell label="Hourly Rate" darkMode={darkMode}>
              <ReadonlyValue value={`${formatCurrency(member.hourly_rate || 0, false)} / hr`} darkMode={darkMode} />
            </FieldCell>
            <div className="flex justify-end sm:justify-end">
              <TotalCostPanel cost={cost} darkMode={darkMode} />
            </div>
          </div>
          <MetaStrip darkMode={darkMode}>
            <span>
              ≈ {mirroredUtilPercent}% of month ({member.hours || 0}h / {standardMonthlyHours}h)
            </span>
            <span className={darkMode ? 'text-neutral-600' : 'text-slate-300'}>·</span>
            <span>
              {member.quantity || 1} × {member.hours || 0} hrs × {formatCurrency(member.hourly_rate || 0, false)}
            </span>
            {hybridBillableHours != null && (
              <>
                <span className={darkMode ? 'text-neutral-600' : 'text-slate-300'}>·</span>
                <span className={amberClass}>
                  Included: {member.baseline_hours}h · Billable: {hybridBillableHours}h
                  {(member.hours || 0) < (member.baseline_hours || 0) && ' — below scope (no labor credit)'}
                </span>
              </>
            )}
          </MetaStrip>
        </>
      )}
    </div>
  );
}

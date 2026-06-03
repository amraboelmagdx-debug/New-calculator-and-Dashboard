import { useState } from 'react';
import { Trash2, Users, BarChart2, Pencil, Check, Plus, Percent, Building2, ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServicePricingDetail from '@/components/ServicePricingDetail';
import TeamMemberRow from '@/components/TeamMemberRow';
import DepartmentRolePicker from '@/components/DepartmentRolePicker';
import { formatCurrency } from '@/lib/utils';
import { normalizeExecutionMode, executionModeLabel } from '@/lib/pricingCostRules';

const RISK_LEVELS = ['none', 'low', 'medium', 'high'];

// ─── Section toggle pills ─────────────────────────────────────────────────────

function SectionToggle({ id, label, icon: Icon, active, onClick, isDarkMode }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
        active
          ? isDarkMode
            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          : isDarkMode
            ? 'text-neutral-400 border-neutral-700 hover:text-neutral-200 hover:border-neutral-600'
            : 'text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300'
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

// ─── Price readout (Team Cost / Vendor Cost / Risk x / Margin % / Selling) ─────

function PriceReadout({ line, marginPercent, isDarkMode }) {
  const labelClass = isDarkMode ? 'text-neutral-500' : 'text-slate-400';
  const valueClass = isDarkMode ? 'text-neutral-200' : 'text-slate-800';
  const sellingClass = isDarkMode ? 'text-emerald-400' : 'text-emerald-600';
  const dash = '—';

  const teamCost = line ? formatCurrency(line.team_cost ?? line.internal_cost ?? 0) : dash;
  const vendorCost = line ? formatCurrency(line.vendor_cost ?? 0) : dash;
  const riskMult = line?.risk_multiplier != null ? `${Number(line.risk_multiplier).toFixed(2)}x` : dash;
  const marginText = line?.margin_percent != null ? `${Math.round(line.margin_percent)}%` : (marginPercent != null ? `${Math.round(marginPercent)}%` : dash);
  const selling = line ? formatCurrency(line.selling ?? 0) : dash;

  const Stat = ({ icon: Icon, label, value, accent }) => (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className={`text-[10px] uppercase tracking-wider flex items-center gap-1 ${labelClass}`}>
        {Icon && <Icon className="w-2.5 h-2.5" />}
        {label}
      </span>
      <span className={`text-xs font-semibold tabular-nums truncate ${accent || valueClass}`}>{value}</span>
    </div>
  );

  return (
    <div
      className={`grid grid-cols-5 gap-2 px-2.5 py-2 rounded-lg border ${
        isDarkMode ? 'border-neutral-800 bg-neutral-900/40' : 'border-slate-200 bg-slate-50/60'
      }`}
      data-testid="product-price-readout"
    >
      <Stat icon={Users} label="Team" value={teamCost} />
      <Stat icon={Building2} label="Vendor" value={vendorCost} />
      <Stat icon={ShieldAlert} label="Risk" value={riskMult} />
      <Stat icon={Percent} label="Margin" value={marginText} />
      <Stat label="Selling" value={selling} accent={sellingClass} />
    </div>
  );
}

// ─── Team section (editable) ──────────────────────────────────────────────────

function TeamSection({ item, teamMembers, roles, calcData, standardMonthlyHours, refreshRoles, isDarkMode, onUpdateMember, onRemoveMember, onAddRole, onSyncFromSheet }) {
  return (
    <div className="pt-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[11px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
          {teamMembers.length} role{teamMembers.length !== 1 ? 's' : ''} on this product
        </p>
        {!item.is_standalone && item.product_name && (
          <button
            type="button"
            onClick={onSyncFromSheet}
            className={`inline-flex items-center gap-1 text-[11px] transition-colors ${
              isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'
            }`}
            title="Replace this product's team with the sheet's suggested roles"
          >
            <RefreshCw className="w-3 h-3" />
            Sync from sheet
          </button>
        )}
      </div>

      {teamMembers.length > 0 && (
        <div className="space-y-2">
          {teamMembers.map((member, index) => (
            <TeamMemberRow
              key={member.id || index}
              member={member}
              index={index}
              roles={roles}
              onUpdate={(field, value) => onUpdateMember(index, field, value)}
              onRemove={() => onRemoveMember(index)}
              onRolesRefresh={refreshRoles}
              darkMode={isDarkMode}
              compact
              standardMonthlyHours={standardMonthlyHours}
            />
          ))}
        </div>
      )}

      <div className={`rounded-lg border ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'} p-2`}>
        <DepartmentRolePicker
          roles={roles}
          selectedMembers={teamMembers}
          onAddMemberWithRole={onAddRole}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}

// ─── Vendor section (manual) ──────────────────────────────────────────────────

function VendorSection({ vendors, vendorServices, isDarkMode, onAddVendor, onUpdateVendor, onRemoveVendor }) {
  const inputClass = isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-300';
  return (
    <div className="pt-3 space-y-2">
      <p className={`text-[11px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
        Vendors on this product (manual)
      </p>
      {vendors.length === 0 && (
        <p className={`text-xs ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>
          No vendors. Add an external cost line if this product needs one.
        </p>
      )}
      {vendors.map((v, index) => (
        <div key={v.id || index} className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <label className={`text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>Vendor / service</label>
            {vendorServices?.length ? (
              <Select
                value={v.service_name || ''}
                onValueChange={value => {
                  const svc = vendorServices.find(s => s.name === value);
                  onUpdateVendor(index, 'service_name', value);
                  if (svc) {
                    onUpdateVendor(index, 'service_id', svc.id || '');
                    onUpdateVendor(index, 'markup_percent', svc.default_markup_percent ?? v.markup_percent ?? 15);
                  }
                }}
              >
                <SelectTrigger className={`h-9 ${inputClass}`}>
                  <SelectValue placeholder="Select or type below" />
                </SelectTrigger>
                <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                  {vendorServices.map(svc => (
                    <SelectItem key={svc.id || svc.name} value={svc.name}>{svc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={v.service_name || ''}
                onChange={e => onUpdateVendor(index, 'service_name', e.target.value)}
                placeholder="Vendor name"
                className={`h-9 ${inputClass}`}
              />
            )}
          </div>
          <div className="w-[96px]">
            <label className={`text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>Cost</label>
            <Input
              type="number"
              min="0"
              value={v.cost ?? v.unit_cost ?? 0}
              onChange={e => onUpdateVendor(index, 'cost', Math.max(0, parseFloat(e.target.value) || 0))}
              className={`h-9 ${inputClass}`}
            />
          </div>
          <div className="w-[80px]">
            <label className={`text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>Markup %</label>
            <Input
              type="number"
              min="0"
              value={v.markup_percent ?? 0}
              onChange={e => onUpdateVendor(index, 'markup_percent', Math.max(0, parseFloat(e.target.value) || 0))}
              className={`h-9 ${inputClass}`}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveVendor(index)}
            className={`h-9 w-8 p-0 ${isDarkMode ? 'text-neutral-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={onAddVendor}
        className={isDarkMode ? 'border-neutral-700 text-neutral-200 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Add vendor
      </Button>
    </div>
  );
}

// ─── Risk section (per product, with risk_mode) ───────────────────────────────

function RiskSection({ risk, isDarkMode, onSetRisk }) {
  const mode = risk.risk_mode || 'default';
  const selectClass = isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-300';

  const modeBtn = (value, label) => (
    <button
      type="button"
      onClick={() => onSetRisk({ risk_mode: value })}
      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
        mode === value
          ? isDarkMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          : isDarkMode ? 'text-neutral-400 border-neutral-700 hover:text-neutral-200' : 'text-slate-500 border-slate-200 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="pt-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
          Risk mode
        </span>
        {modeBtn('default', 'Factors')}
        {modeBtn('custom', 'Custom x')}
      </div>

      {mode === 'custom' ? (
        <div className="w-[160px]">
          <label className={`text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>Custom multiplier</label>
          <Input
            type="number"
            min="1"
            step="0.05"
            value={risk.custom_multiplier || 1}
            onChange={e => onSetRisk({ custom_multiplier: Math.max(0, parseFloat(e.target.value) || 0) })}
            className={`h-9 ${selectClass}`}
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {['complexity', 'rush', 'execution'].map(factor => (
            <div key={factor}>
              <label className={`text-[10px] capitalize ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>{factor}</label>
              <Select value={risk[factor] || 'none'} onValueChange={value => onSetRisk({ [factor]: value })}>
                <SelectTrigger className={`h-9 ${selectClass}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                  {RISK_LEVELS.map(level => (
                    <SelectItem key={level} value={level} className="capitalize">{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Margin section ───────────────────────────────────────────────────────────

function MarginSection({ item, segmentPayload, isDarkMode, onSetMargin }) {
  const sheetMin = Number(segmentPayload?.minimum_margin_percent) || 0;
  const current = item.margin_percent != null ? item.margin_percent : (sheetMin || 30);
  const inputClass = isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-300';
  return (
    <div className="pt-3 space-y-2">
      <div className="flex items-end gap-3">
        <div className="w-[120px]">
          <label className={`text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>Margin %</label>
          <Input
            type="number"
            min="0"
            max="99"
            value={current}
            onChange={e => onSetMargin(Math.max(0, Math.min(99, parseFloat(e.target.value) || 0)))}
            className={`h-9 ${inputClass}`}
          />
        </div>
        {sheetMin > 0 && (
          <p className={`text-[11px] pb-2 ${current < sheetMin ? (isDarkMode ? 'text-rose-400' : 'text-rose-600') : (isDarkMode ? 'text-neutral-500' : 'text-slate-400')}`}>
            Sheet min: {sheetMin}%{current < sheetMin ? ' — below floor' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export default function ProductWorkspaceCard({
  item,
  isDarkMode,
  filteredProductsCatalog,
  findCatalogProduct,
  getSegmentPayload,
  onChangeItem,
  onRemove,
  roles,
  calcData,
  results,
  standardMonthlyHours,
  buildProductTeam,
  refreshRoles,
  vendorServices,
}) {
  const [isEditing, setIsEditing] = useState(!item.product_name);
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = id => setOpenSection(prev => (prev === id ? null : id));

  const product = item.is_standalone ? null : findCatalogProduct(item.product_name);
  const segmentKeys = Object.keys(product?.segments || product?.sizes || {});
  const segmentPayload = item.is_standalone ? null : getSegmentPayload(product, item.size);
  const hasDetail = !item.is_standalone && item.product_name && item.size && segmentPayload;

  const execMode = segmentPayload?.execution_mode
    ? executionModeLabel(normalizeExecutionMode(segmentPayload.execution_mode, segmentPayload))
    : null;

  const teamMembers = item.team_members || [];
  const vendors = item.vendors || [];
  const risk = item.risk || { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0, risk_mode: 'default' };

  const teamHours = teamMembers.reduce((s, m) => s + (Number(m.hours) || 0) * (Number(m.quantity) || 1), 0);

  // Backend per-line breakdown for this product (the source of the 5-value readout)
  const line = (results?.margin_breakdown?.products || []).find(p => p.id === item.id) || null;

  const cardBorder = isDarkMode ? 'border-neutral-800 bg-neutral-950/50' : 'border-slate-200 bg-white';
  const sectionDivider = isDarkMode ? 'border-neutral-800' : 'border-slate-100';

  // ── Mutators (all via onChangeItem) ─────────────────────────────────────────
  const setTeam = next => onChangeItem(item.id, 'team_members', next);
  const updateMember = (index, field, value) =>
    setTeam(teamMembers.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  const removeMember = index => setTeam(teamMembers.filter((_, i) => i !== index));
  const addRole = roleId => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    setTeam([
      ...teamMembers,
      {
        id: `tm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role_id: roleId,
        role_name: role.name || '',
        hours: 0,
        hourly_rate: role.hourly_rate || 0,
        monthly_salary: role.monthly_salary || 0,
        utilization_percent: 0,
        duration_months: 1,
        calc_mode: 'hours',
        employee_type: 'internal',
        source: 'manual',
      },
    ]);
  };
  const syncFromSheet = () => {
    const members = buildProductTeam?.(item.product_name, item.size, item.quantity) || [];
    setTeam(members);
  };

  const setVendors = next => onChangeItem(item.id, 'vendors', next);
  const addVendor = () =>
    setVendors([...vendors, { id: `v-${Date.now()}`, service_id: '', service_name: '', cost: 0, quantity: 1, markup_percent: 15 }]);
  const updateVendor = (index, field, value) =>
    setVendors(vendors.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  const removeVendor = index => setVendors(vendors.filter((_, i) => i !== index));

  const setRisk = patch => onChangeItem(item.id, 'risk', { ...risk, ...patch });

  const setMargin = val => {
    onChangeItem(item.id, 'margin_percent', val);
    onChangeItem(item.id, 'margin_source', 'custom');
  };

  // On service select, prefill the product team from the sheet (source:'sheet')
  const selectService = value => {
    const p = findCatalogProduct(value);
    const firstSeg = Object.keys(p?.segments || p?.sizes || {})[0] || 'standard';
    onChangeItem(item.id, 'product_name', value);
    onChangeItem(item.id, 'size', firstSeg);
    const members = buildProductTeam?.(value, firstSeg, item.quantity) || [];
    onChangeItem(item.id, 'team_members', members);
  };

  const changeSegment = value => {
    onChangeItem(item.id, 'size', value);
    if (!item.is_standalone && item.product_name) {
      const members = buildProductTeam?.(item.product_name, value, item.quantity) || [];
      onChangeItem(item.id, 'team_members', members);
    }
  };

  const riskActive = (risk.risk_mode === 'custom' && (risk.custom_multiplier || 0) > 1) ||
    (risk.risk_mode !== 'custom' && [risk.complexity, risk.rush, risk.execution].some(v => v && v !== 'none'));

  // ── Edit mode ────────────────────────────────────────────────────────────────
  const editControls = (
    <div className="flex flex-wrap items-end gap-2 p-3">
      {item.is_standalone ? (
        <div className="flex-1 min-w-[160px]">
          <Input
            value={item.product_name}
            onChange={e => onChangeItem(item.id, 'product_name', e.target.value)}
            placeholder="Service name (e.g. Custom Consulting)"
            className={`h-9 text-sm font-medium ${isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-300'}`}
          />
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-[160px]">
            <Select value={item.product_name} onValueChange={selectService}>
              <SelectTrigger className={`h-9 ${isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-300'}`}>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                {filteredProductsCatalog.map(productItem => {
                  const name = productItem.service_name || productItem.product_name;
                  const fam = productItem.service_family || productItem.section_name || 'General';
                  return (
                    <SelectItem key={`${fam}-${name}`} value={name}>
                      {name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[100px]">
            <Select value={item.size} onValueChange={changeSegment}>
              <SelectTrigger className={`h-9 ${isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-300'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                {(segmentKeys.length ? segmentKeys : ['tiny', 'standard', 'big', 'mega']).map(size => (
                  <SelectItem key={size} value={size}>
                    {size.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="w-[68px]">
        <Input
          type="number"
          min="1"
          value={item.quantity}
          onChange={e => onChangeItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
          className={`h-9 ${isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-300'}`}
        />
      </div>

      <div className="flex items-center gap-1 pb-0.5">
        {item.product_name && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${isDarkMode ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}`}
            onClick={() => setIsEditing(false)}
            title="Done editing"
          >
            <Check className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className={`h-8 w-8 p-0 ${isDarkMode ? 'text-neutral-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // ── View mode header ─────────────────────────────────────────────────────────
  const viewHeader = (
    <div className="px-3 pt-3 pb-2 space-y-2">
      {/* Row 1: Identity */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-sm font-semibold flex-1 min-w-0 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {item.product_name || 'Untitled service'}
        </span>
        {item.is_standalone && (
          <Badge variant="outline" className={`text-[10px] shrink-0 ${isDarkMode ? 'border-violet-500/40 text-violet-400' : 'border-violet-200 text-violet-700'}`}>
            Custom
          </Badge>
        )}
        {item.source === 'opportunity' && (
          <Badge variant="outline" className={`text-[10px] shrink-0 ${isDarkMode ? 'border-neutral-600 text-neutral-400' : 'border-slate-300 text-slate-500'}`}>
            Opp
          </Badge>
        )}
        {!item.is_standalone && item.size && (
          <Badge variant="outline" className={`text-[10px] font-mono shrink-0 ${isDarkMode ? 'border-neutral-700 text-neutral-400' : 'border-slate-200 text-slate-500'}`}>
            {item.size.toUpperCase()}
          </Badge>
        )}
        <Badge variant="outline" className={`text-[10px] shrink-0 ${isDarkMode ? 'border-neutral-700 text-neutral-400' : 'border-slate-200 text-slate-500'}`}>
          ×{item.quantity}
        </Badge>
        {execMode && (
          <Badge variant="outline" className={`text-[10px] shrink-0 ${isDarkMode ? 'border-neutral-700 text-neutral-400' : 'border-slate-200 text-slate-500'}`}>
            {execMode}
          </Badge>
        )}
        <div className="flex items-center gap-0.5 ml-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className={`h-7 w-7 p-0 ${isDarkMode ? 'text-neutral-600 hover:text-neutral-300' : 'text-slate-300 hover:text-slate-600'}`}
            title="Edit service"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className={`h-7 w-7 p-0 ${isDarkMode ? 'text-neutral-600 hover:text-red-400' : 'text-slate-300 hover:text-red-600'}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Row 2: Price readout */}
      <PriceReadout line={line} marginPercent={item.margin_percent} isDarkMode={isDarkMode} />

      {/* Row 3: Section actions */}
      <div className={`flex items-center gap-1.5 flex-wrap pt-0.5`}>
        <SectionToggle
          id="team"
          label={teamMembers.length > 0 ? `${teamMembers.length} roles · ${Math.round(teamHours)}h` : 'Team'}
          icon={Users}
          active={openSection === 'team'}
          onClick={toggleSection}
          isDarkMode={isDarkMode}
        />
        <SectionToggle
          id="vendors"
          label={vendors.length > 0 ? `Vendors ${vendors.length}` : 'Vendors'}
          icon={Building2}
          active={openSection === 'vendors'}
          onClick={toggleSection}
          isDarkMode={isDarkMode}
        />
        <SectionToggle
          id="risk"
          label={riskActive ? 'Risk •' : 'Risk'}
          icon={ShieldAlert}
          active={openSection === 'risk'}
          onClick={toggleSection}
          isDarkMode={isDarkMode}
        />
        <SectionToggle
          id="margin"
          label="Margin"
          icon={Percent}
          active={openSection === 'margin'}
          onClick={toggleSection}
          isDarkMode={isDarkMode}
        />
        {hasDetail && (
          <SectionToggle
            id="insights"
            label="Insights"
            icon={BarChart2}
            active={openSection === 'insights'}
            onClick={toggleSection}
            isDarkMode={isDarkMode}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className={`rounded-xl border transition-all ${cardBorder}`} data-testid="product-workspace-card">
      {isEditing ? editControls : viewHeader}

      {!isEditing && openSection && (
        <div className={`px-3 pb-3 border-t ${sectionDivider}`}>
          {openSection === 'team' && (
            <TeamSection
              item={item}
              teamMembers={teamMembers}
              roles={roles}
              calcData={calcData}
              standardMonthlyHours={standardMonthlyHours}
              refreshRoles={refreshRoles}
              isDarkMode={isDarkMode}
              onUpdateMember={updateMember}
              onRemoveMember={removeMember}
              onAddRole={addRole}
              onSyncFromSheet={syncFromSheet}
            />
          )}
          {openSection === 'vendors' && (
            <VendorSection
              vendors={vendors}
              vendorServices={vendorServices}
              isDarkMode={isDarkMode}
              onAddVendor={addVendor}
              onUpdateVendor={updateVendor}
              onRemoveVendor={removeVendor}
            />
          )}
          {openSection === 'risk' && (
            <RiskSection risk={risk} isDarkMode={isDarkMode} onSetRisk={setRisk} />
          )}
          {openSection === 'margin' && (
            <MarginSection item={item} segmentPayload={segmentPayload} isDarkMode={isDarkMode} onSetMargin={setMargin} />
          )}
          {openSection === 'insights' && hasDetail && (
            <div className="pt-3">
              <ServicePricingDetail
                segmentData={segmentPayload}
                quantity={item.quantity}
                isDarkMode={isDarkMode}
                compact
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

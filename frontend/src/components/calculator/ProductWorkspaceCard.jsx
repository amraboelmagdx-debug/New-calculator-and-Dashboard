import { useState, useEffect } from 'react';
import { Trash2, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServicePricingDetail from '@/components/ServicePricingDetail';
import ProductEconomicsBar from '@/components/calculator/ProductEconomicsBar';
import ProductControlTabs from '@/components/calculator/ProductControlTabs';
import TeamTabPanel from '@/components/calculator/TeamTabPanel';
import VendorTabPanel from '@/components/calculator/VendorTabPanel';
import RiskTabPanel from '@/components/calculator/RiskTabPanel';
import MarginTabPanel from '@/components/calculator/MarginTabPanel';
import { utilizationFromHours } from '@/lib/utils';
import { normalizeExecutionMode, executionModeLabel } from '@/lib/pricingCostRules';
import { getCatalogTierKeys, resolveTierForProduct } from '@/lib/opportunityScope';
import { PRODUCTS_PRICING_SHEET_TAB, HR_ROLES_SHEET_TAB } from '@/lib/roleMatching';

export default function ProductWorkspaceCard({
  item,
  isDarkMode,
  filteredProductsCatalog,
  findCatalogProduct,
  getSegmentPayload,
  onChangeItem,
  onChangeItemFields,
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
  const [teamExpanded, setTeamExpanded] = useState(false);

  useEffect(() => {
    if (openSection !== 'team') setTeamExpanded(false);
  }, [openSection]);

  const handleTabChange = id => {
    setOpenSection(prev => (prev === id ? null : id));
  };

  const product = item.is_standalone ? null : findCatalogProduct(item.product_name);
  const segmentKeys = getCatalogTierKeys(product);
  const segmentPayload = item.is_standalone ? null : getSegmentPayload(product, item.size);
  const hasDetail = !item.is_standalone && item.product_name && item.size && segmentPayload;

  const sheetTeamHint =
    segmentPayload && item.size
      ? `${PRODUCTS_PRICING_SHEET_TAB} · ${String(item.size).toUpperCase()} · ${segmentPayload.internal_roles?.length || 0} roles · ${Number(segmentPayload.total_team_hours) || 0}h (rates from ${HR_ROLES_SHEET_TAB})`
      : null;

  const execMode = segmentPayload?.execution_mode
    ? executionModeLabel(normalizeExecutionMode(segmentPayload.execution_mode, segmentPayload))
    : null;

  const teamMembers = item.team_members || [];
  const vendors = item.vendors || [];
  const risk = item.risk || { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0, risk_mode: 'default' };

  const teamHours = teamMembers.reduce((s, m) => s + (Number(m.hours) || 0) * (Number(m.quantity) || 1), 0);
  const line = (results?.margin_breakdown?.products || []).find(p => p.id === item.id) || null;

  const cardBorder = isDarkMode ? 'border-neutral-800 bg-neutral-950/50' : 'border-slate-200 bg-white';
  const sectionDivider = isDarkMode ? 'border-neutral-800' : 'border-slate-100';

  const patchItem = patch => {
    if (onChangeItemFields) {
      onChangeItemFields(item.id, patch);
      return;
    }
    Object.entries(patch).forEach(([field, value]) => onChangeItem(item.id, field, value));
  };

  const sheetTeamMeta = (qty = item.quantity) => ({
    team_edited: false,
    team_source: 'sheet',
    team_qty_basis: Math.max(1, Number(qty) || 1),
  });

  const scaleMemberHoursForQty = (members, oldQty, newQty) => {
    const ratio = newQty / oldQty;
    const scale = h => Math.round((Number(h) || 0) * ratio * 100) / 100;
    return members.map(m => {
      if (m.source !== 'sheet' && m.hours_edited === true) return m;
      const hours = scale(m.hours);
      return {
        ...m,
        hours,
        baseline_hours: m.baseline_hours != null ? scale(m.baseline_hours) : m.baseline_hours,
        utilization_percent: utilizationFromHours(hours, standardMonthlyHours),
      };
    });
  };

  const updateMember = (index, field, value) => {
    const nextMembers = teamMembers.map((m, i) => {
      if (i !== index) return m;
      if (field === '_roleBundle' && value && typeof value === 'object') {
        return { ...m, ...value };
      }
      const updated = { ...m, [field]: value };
      if (field === 'hours') updated.hours_edited = true;
      return updated;
    });
    patchItem({ team_members: nextMembers, team_edited: true });
  };

  const removeMember = index => {
    patchItem({
      team_members: teamMembers.filter((_, i) => i !== index),
      team_edited: true,
    });
  };

  const addRole = roleId => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    setTeamExpanded(true);
    patchItem({
      team_members: [
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
      ],
      team_edited: true,
    });
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

  const selectService = value => {
    const p = findCatalogProduct(value);
    const tier = resolveTierForProduct(p, item.size);
    const { members } = buildProductTeam?.(value, tier, item.quantity) || { members: [] };
    patchItem({
      product_name: value,
      size: tier,
      team_members: members,
      ...sheetTeamMeta(item.quantity),
    });
  };

  const changeSegment = value => {
    if (item.is_standalone || !item.product_name) {
      onChangeItem(item.id, 'size', value);
      return;
    }
    const { members } = buildProductTeam?.(item.product_name, value, item.quantity) || { members: [] };
    patchItem({
      size: value,
      team_members: members,
      ...sheetTeamMeta(item.quantity),
    });
  };

  const changeQuantity = rawQty => {
    const quantity = Math.max(1, parseInt(rawQty, 10) || 1);
    if (item.is_standalone || !item.product_name) {
      onChangeItem(item.id, 'quantity', quantity);
      return;
    }
    const oldQty = Math.max(1, Number(item.quantity) || 1);
    if (item.team_edited) {
      patchItem({ quantity });
      return;
    }
    if (teamMembers.length > 0 && item.team_source === 'sheet') {
      patchItem({
        quantity,
        team_members: scaleMemberHoursForQty(teamMembers, oldQty, quantity),
        team_qty_basis: quantity,
      });
      return;
    }
    const result = buildProductTeam?.(item.product_name, item.size, quantity) || { members: [] };
    patchItem({
      quantity,
      team_members: result.members,
      ...sheetTeamMeta(quantity),
    });
  };

  const riskMultLabel =
    line?.risk_multiplier != null ? `${Number(line.risk_multiplier).toFixed(2)}x` : null;
  const riskActive =
    (risk.risk_mode === 'custom' && (risk.custom_multiplier || 0) > 1) ||
    (risk.risk_mode !== 'custom' && [risk.complexity, risk.rush, risk.execution].some(v => v && v !== 'none'));

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
          onChange={e => changeQuantity(e.target.value)}
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

  const viewHeader = (
    <div className="px-3 pt-3 pb-0 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-base font-semibold flex-1 min-w-0 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {item.product_name || 'Untitled service'}
        </span>
        {item.source === 'opportunity' && (
          <Badge variant="outline" className={`text-[10px] shrink-0 ${isDarkMode ? 'border-blue-500/40 text-blue-400' : 'border-blue-200 text-blue-700'}`}>
            Opportunity
          </Badge>
        )}
        {item.is_standalone && (
          <Badge variant="outline" className={`text-[10px] shrink-0 ${isDarkMode ? 'border-violet-500/40 text-violet-400' : 'border-violet-200 text-violet-700'}`}>
            Custom
          </Badge>
        )}
        {!item.is_standalone && item.size && (
          <Badge variant="outline" className={`text-[10px] font-mono shrink-0 ${isDarkMode ? 'border-neutral-700 text-neutral-400' : 'border-slate-200 text-slate-500'}`}>
            {item.size.toUpperCase()}
          </Badge>
        )}
        <Badge variant="outline" className={`text-[10px] shrink-0 ${isDarkMode ? 'border-neutral-700 text-neutral-400' : 'border-slate-200 text-slate-500'}`}>
          Qty {item.quantity}
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

      <ProductEconomicsBar
        line={line}
        item={item}
        teamMembers={teamMembers}
        roles={roles}
        standardMonthlyHours={standardMonthlyHours}
        vendorCount={vendors.length}
        marginPercent={item.margin_percent}
        isDarkMode={isDarkMode}
      />

      <ProductControlTabs
        activeTab={openSection}
        onTabChange={handleTabChange}
        isDarkMode={isDarkMode}
        teamLabel={teamMembers.length > 0 ? `Team · ${teamMembers.length}` : 'Team'}
        vendorsLabel={vendors.length > 0 ? `Vendors · ${vendors.length}` : 'Vendors'}
        riskLabel={riskMultLabel ? `Risk · ${riskMultLabel}` : riskActive ? 'Risk •' : 'Risk'}
        showInsights={hasDetail}
      />
    </div>
  );

  return (
    <div className={`rounded-xl border transition-all ${cardBorder}`} data-testid="product-workspace-card">
      {isEditing ? editControls : viewHeader}

      {!isEditing && openSection && (
        <div className={`px-3 pb-3 border-t ${sectionDivider}`}>
          {openSection === 'team' && (
            <TeamTabPanel
              expanded={teamExpanded}
              onExpand={() => setTeamExpanded(true)}
              teamMembers={teamMembers}
              teamHours={teamHours}
              line={line}
              results={results}
              roles={roles}
              standardMonthlyHours={standardMonthlyHours}
              refreshRoles={refreshRoles}
              isDarkMode={isDarkMode}
              sheetHint={sheetTeamHint}
              onUpdateMember={updateMember}
              onRemoveMember={removeMember}
              onAddRole={addRole}
            />
          )}
          {openSection === 'vendors' && (
            <VendorTabPanel
              vendors={vendors}
              line={line}
              vendorServices={vendorServices}
              isDarkMode={isDarkMode}
              onAddVendor={addVendor}
              onUpdateVendor={updateVendor}
              onRemoveVendor={removeVendor}
            />
          )}
          {openSection === 'risk' && (
            <RiskTabPanel
              risk={risk}
              line={line}
              item={item}
              isDarkMode={isDarkMode}
              onSetRisk={setRisk}
            />
          )}
          {openSection === 'margin' && (
            <MarginTabPanel
              item={item}
              segmentPayload={segmentPayload}
              line={line}
              isDarkMode={isDarkMode}
              onSetMargin={setMargin}
            />
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

import { useState } from 'react';
import { Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServicePricingDetail from '@/components/ServicePricingDetail';
import ProductCardSummary from '@/components/calculator/ProductCardSummary';
import ProductControlTabs from '@/components/calculator/ProductControlTabs';
import ProductContextStickyHeader from '@/components/calculator/ProductContextStickyHeader';
import TeamTabPanel from '@/components/calculator/TeamTabPanel';
import RiskTabPanel from '@/components/calculator/RiskTabPanel';
import MarginTabPanel from '@/components/calculator/MarginTabPanel';
import { utilizationFromHours } from '@/lib/utils';
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
  openSection = null,
  teamEditorsOpen = false,
  onToggleCardOpen,
  onOpenSectionChange,
  onTeamEditorsOpenChange,
  onMarginPreview,
}) {
  const [isEditing, setIsEditing] = useState(!item.product_name);

  const handleTabChange = id => {
    if (!onOpenSectionChange) return;
    onOpenSectionChange(openSection === id ? null : id);
  };

  const product = item.is_standalone ? null : findCatalogProduct(item.product_name);
  const segmentKeys = getCatalogTierKeys(product);
  const segmentPayload = item.is_standalone ? null : getSegmentPayload(product, item.size);
  const hasDetail = !item.is_standalone && item.product_name && item.size && segmentPayload;

  const sheetTeamHint =
    segmentPayload && item.size
      ? `${PRODUCTS_PRICING_SHEET_TAB} · ${String(item.size).toUpperCase()} · ${segmentPayload.internal_roles?.length || 0} roles · ${Number(segmentPayload.total_team_hours) || 0}h (rates from ${HR_ROLES_SHEET_TAB})`
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
    onTeamEditorsOpenChange?.(true);
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

  const setRisk = patch => onChangeItem(item.id, 'risk', { ...risk, ...patch });

  const setMargin = val => {
    onChangeItem(item.id, 'margin_percent', val);
    onChangeItem(item.id, 'margin_source', 'custom');
    onMarginPreview?.(item.id, val);
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
          <div className="w-[124px]">
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

  const tabLabels = {
    teamLabel: teamMembers.length > 0 ? `Team · ${teamMembers.length}` : 'Team',
    riskLabel: riskMultLabel ? `Risk · ${riskMultLabel}` : riskActive ? 'Risk •' : 'Risk',
  };

  const showPanel = !isEditing && !!openSection;

  return (
    <div
      id={`product-${item.id}`}
      className={`product-portfolio-row rounded-lg border transition-all ${cardBorder} ${
        showPanel ? 'product-portfolio-row--expanded' : ''
      }`}
      data-testid="product-workspace-card"
      aria-expanded={!!openSection}
    >
      {isEditing ? (
        editControls
      ) : (
        <>
          <div className="px-2.5 py-1.5">
            <ProductCardSummary
              item={item}
              line={line}
              teamMembers={teamMembers}
              vendors={vendors}
              roles={roles}
              standardMonthlyHours={standardMonthlyHours}
              isDarkMode={isDarkMode}
              openSection={openSection}
              onTabChange={handleTabChange}
              onEdit={() => setIsEditing(true)}
              onRemove={onRemove}
              showInsights={hasDetail}
              riskActive={riskActive}
              onToggleCardOpen={onToggleCardOpen}
            />
          </div>
          {openSection && (
            <div className="px-3 pb-0">
              <ProductControlTabs
                activeTab={openSection}
                onTabChange={handleTabChange}
                isDarkMode={isDarkMode}
                teamLabel={tabLabels.teamLabel}
                riskLabel={tabLabels.riskLabel}
                showInsights={hasDetail}
                panelOpen
              />
            </div>
          )}
        </>
      )}

      {showPanel && (
        <div
          className={`mx-3 mb-3 rounded-b-lg border border-t-0 ${
            isDarkMode
              ? 'border-indigo-500/20 bg-neutral-900/40'
              : 'border-indigo-200/60 bg-slate-50/50'
          }`}
        >
          {openSection !== 'margin' && (
            <ProductContextStickyHeader
              productName={item.product_name}
              tier={!item.is_standalone ? item.size : null}
              line={line}
              item={item}
              isDarkMode={isDarkMode}
            />
          )}
          <div className={`px-3 pb-4 ${isDarkMode ? 'bg-neutral-900/30' : 'bg-white/80'}`}>
          {openSection === 'team' && (
            <TeamTabPanel
              expanded={teamEditorsOpen}
              onExpand={() => onTeamEditorsOpenChange?.(!teamEditorsOpen)}
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
              onMarginPreview={onMarginPreview ? val => onMarginPreview(item.id, val) : undefined}
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
        </div>
      )}
    </div>
  );
}

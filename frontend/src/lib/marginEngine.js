/**
 * Margin pricing helpers — per-line products, validation, API payloads.
 */

import {
  normalizeExecutionMode,
  resolveProductLineCost,
  shouldAutoSyncTeamFromSegment,
  costBasisDescription,
  getChargeableHours,
  EXECUTION_HYBRID,
  EXECUTION_ALL_IN,
  EXECUTION_RESOURCE,
} from '@/lib/pricingCostRules';

export const MARGIN_MODES = {
  UNIFIED: 'unified',
  SPLIT: 'split',
  GRANULAR: 'granular',
};

export function sellingFromCostAndMargin(cost, marginPercent) {
  const costNum = Number(cost) || 0;
  const m = Math.min(99.99, Math.max(0, Number(marginPercent) || 0)) / 100;
  if (costNum <= 0) return 0;
  if (m >= 1) return costNum * 2;
  const divisor = 1 - m;
  return divisor > 0 ? costNum / divisor : costNum * 2;
}

export function resolveDefaultMarginPercent(item, segment, calcData) {
  if (item.margin_percent != null && item.margin_source === 'custom') {
    return Number(item.margin_percent);
  }
  const sheetMin = Number(segment?.minimum_margin_percent) || 0;
  if (sheetMin > 0 && (item.margin_source === 'sheet' || !item.margin_source)) {
    return sheetMin;
  }
  return Number(calcData?.target_margin_percent) || 30;
}

export function buildProductLineFromSelection(item, segment, calcData) {
  const qty = Math.max(1, Number(item.quantity) || 1);
  const { cost, executionMode, costBasis, usedFallback } = resolveProductLineCost(segment, qty);
  const sheetMinMargin = Number(segment?.minimum_margin_percent) || 0;
  const sheetMinSelling = (Number(segment?.base_minimum_selling_price) || 0) * qty;
  const marginPercent = resolveDefaultMarginPercent(item, segment, calcData);
  const rawSelling = sellingFromCostAndMargin(cost, marginPercent);
  const lineSelling = Math.max(rawSelling, sheetMinSelling);

  return {
    id: item.id,
    product_name: item.product_name,
    segment: item.size,
    quantity: qty,
    cost,
    execution_mode: executionMode,
    cost_basis: costBasis,
    cost_basis_description: costBasisDescription(executionMode, costBasis),
    cost_fallback: usedFallback,
    sheet_min_margin_percent: sheetMinMargin,
    sheet_min_selling: Math.round(sheetMinSelling * 100) / 100,
    margin_percent: marginPercent,
    line_selling: Math.round(lineSelling * 100) / 100,
    service_family: segment?.service_family,
    direct_cost_per_unit: Number(segment?.direct_cost_per_unit) || 0,
    oh_cost_value: Number(segment?.oh_cost_value) || 0,
    total_cost_sheet: Number(segment?.total_cost) || 0,
  };
}

export function validateProductLine(line) {
  if (!line || line.cost <= 0) {
    return { status: 'incomplete', label: 'Incomplete', tone: 'neutral' };
  }
  const margin = Number(line.margin_percent) || 0;
  const minMargin = Number(line.sheet_min_margin_percent) || 0;
  const selling = line.line_selling ?? sellingFromCostAndMargin(line.cost, margin);
  const floor = Number(line.sheet_min_selling) || 0;

  if (minMargin > 0 && margin < minMargin) {
    return { status: 'below_min_margin', label: 'Below min margin', tone: 'rose' };
  }
  if (floor > 0 && selling < floor - 0.01) {
    return { status: 'below_floor', label: 'Below floor (O)', tone: 'amber' };
  }
  if (margin >= (minMargin || 0) && selling >= floor - 0.01) {
    return { status: 'ok', label: 'OK', tone: 'emerald' };
  }
  return { status: 'ok', label: 'OK', tone: 'emerald' };
}

export function buildProductLines(selectedProducts, findCatalogProduct, getSegmentPayload, calcData) {
  const lines = [];
  (selectedProducts || []).forEach(item => {
    if (!item.product_name || !item.size) return;
    const product = findCatalogProduct(item.product_name);
    const segment = getSegmentPayload(product, item.size);
    if (!segment) return;
    const line = buildProductLineFromSelection(item, segment, calcData);
    const validation = validateProductLine(line);
    lines.push({ ...line, validation });
  });
  return lines;
}

export function buildProductLinesForApi(lines) {
  return lines.map(l => ({
    id: l.id,
    product_name: l.product_name,
    segment: l.segment,
    quantity: l.quantity,
    cost: l.cost,
    execution_mode: l.execution_mode,
    direct_cost_per_unit: l.direct_cost_per_unit,
    oh_cost_value: l.oh_cost_value,
    total_cost: l.total_cost_sheet,
    sheet_min_margin_percent: l.sheet_min_margin_percent,
    sheet_min_selling: l.sheet_min_selling,
    margin_percent: l.margin_percent,
  }));
}

export function getDealComposition(selectedProducts, calcData, findCatalogProduct, getSegmentPayload) {
  const hasProducts = (selectedProducts || []).some(p => p.product_name && p.size);
  const hasTeam = (calcData?.team_members?.length || 0) > 0;
  const hasVendors = (calcData?.vendors?.length || 0) > 0;
  const isHybridDeal = hasProducts && (hasTeam || hasVendors);

  let hasHybridMode = false;
  let hasAllIn = false;
  if (findCatalogProduct && getSegmentPayload) {
    (selectedProducts || []).forEach(item => {
      if (!item.product_name || !item.size) return;
      const product = findCatalogProduct(item.product_name);
      const seg = getSegmentPayload(product, item.size);
      if (!seg) return;
      const mode = normalizeExecutionMode(seg.execution_mode, seg);
      if (mode === EXECUTION_HYBRID) hasHybridMode = true;
      if (mode === EXECUTION_ALL_IN) hasAllIn = true;
    });
  }

  let hint = 'Set a quote-level margin for team and vendor costs.';
  if (hasProducts && !hasTeam && !hasVendors) {
    hint = 'Product-led quote — use Per-line mode so sheet rows drive the total.';
  } else if (hasHybridMode) {
    hint =
      'Hybrid rows: package cost is in Total Cost; synced team shows scope — only hours above sheet baseline add labor.';
  } else if (isHybridDeal && hasAllIn) {
    hint = 'All-in products use sheet Total Cost only — avoid adding duplicate team labor for those lines.';
  } else if (isHybridDeal) {
    hint = 'Mixed deal — use Per-line for products; team/vendor use separate margin buckets.';
  } else if (hasTeam && !hasProducts) {
    hint = 'Team-led quote — margin applies to internal labor and overhead.';
  } else if (hasVendors && !hasProducts) {
    hint = 'Vendor-led quote — use markup per vendor or vendor margin %.';
  }

  return {
    hasProducts,
    hasTeam,
    hasVendors,
    isHybrid: isHybridDeal,
    hasHybridMode,
    hasAllIn,
    hint,
  };
}

export { shouldAutoSyncTeamFromSegment, normalizeExecutionMode, EXECUTION_HYBRID };

export function applyMarginModeToCalcData(prev, mode) {
  const next = { ...prev, margin_mode: mode };
  if (mode === MARGIN_MODES.SPLIT) {
    next.use_split_margins = true;
  } else {
    next.use_split_margins = false;
  }
  return next;
}

export function computeClientPreview(productLines, calcData, results) {
  const productSelling = productLines.reduce((s, l) => s + (l.line_selling || 0), 0);
  const productCost = productLines.reduce((s, l) => s + (l.cost || 0), 0);
  const target = Number(calcData?.target_margin_percent) || 30;

  return {
    productSelling,
    productCost,
    productCount: productLines.length,
    apiSelling: results?.selling_price ?? 0,
    apiMargin: results?.contribution_margin_percent ?? 0,
    blendedFromApi: results?.blended_margin_percent ?? 0,
    target,
    gapToTarget: target - (results?.contribution_margin_percent ?? 0),
    invalidLines: productLines.filter(l => l.validation?.status !== 'ok').length,
  };
}

export function createRoleMatcher(roles) {
  const normalize = value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return sheetRoleName => {
    const target = normalize(sheetRoleName);
    const targetCore = target.split(' - ')[0].trim();
    return (roles || []).find(role => {
      const roleName = normalize(role.name);
      const roleCore = roleName.split(' - ')[0].trim();
      return (
        roleName === target ||
        roleCore === targetCore ||
        roleName.includes(targetCore) ||
        target.includes(roleCore)
      );
    });
  };
}

/**
 * BD-facing pricing breakdown for one catalog line (display; granular line selling).
 */
export function buildProductLinePricingBreakdown(line, segment, calcData, matchRoleByName) {
  const qty = Math.max(1, Number(line?.quantity) || 1);
  const mode = line?.execution_mode;
  const roleList = segment?.internal_roles?.length
    ? segment.internal_roles
    : [];

  const rolesIncluded = roleList.map(r => {
    const h = Math.round((Number(r.hours) || 0) * qty * 10) / 10;
    return { name: r.role_name || 'Role', hours: h };
  });
  const totalIncludedHours = rolesIncluded.reduce((s, r) => s + r.hours, 0);
  const roleCount = rolesIncluded.length;
  const isAllIn = mode === EXECUTION_ALL_IN;

  let includedTeamScope = '—';
  let includedTeam = {
    roleCount: 0,
    totalHours: 0,
    roles: [],
    summary: '—',
    isAllIn: false,
  };

  if (isAllIn) {
    includedTeamScope = 'All-in package';
    includedTeam = {
      roleCount: 0,
      totalHours: 0,
      roles: [],
      summary: 'All-in package',
      isAllIn: true,
    };
  } else if (roleCount > 0) {
    const roleWord = roleCount === 1 ? 'role' : 'roles';
    const summary = `${roleCount} ${roleWord} · ${Math.round(totalIncludedHours)}h included`;
    includedTeamScope = summary;
    includedTeam = {
      roleCount,
      totalHours: Math.round(totalIncludedHours * 10) / 10,
      roles: rolesIncluded,
      summary,
      isAllIn: false,
    };
  }

  let additionalHoursCost = 0;
  let belowBaselineNote = false;
  let utilizationNote = false;

  if (mode === EXECUTION_RESOURCE || mode === EXECUTION_HYBRID) {
    roleList.forEach(roleItem => {
      const productBaseline = (Number(roleItem.hours) || 0) * qty;
      const matched = matchRoleByName?.(roleItem.role_name);
      if (!matched) return;
      const member = (calcData?.team_members || []).find(tm => tm.role_id === matched.id);
      if (!member) return;
      const rate = Number(member.hourly_rate) || Number(matched.hourly_rate) || 0;
      const memberQty = Number(member.quantity) || 1;

      if (member.calc_mode && member.calc_mode !== 'hours') {
        utilizationNote = true;
        return;
      }

      let chargeable = 0;
      if (mode === EXECUTION_HYBRID) {
        chargeable = getChargeableHours(
          member.hours,
          productBaseline,
          'hours',
          EXECUTION_HYBRID
        );
        if ((Number(member.hours) || 0) < productBaseline) belowBaselineNote = true;
      } else {
        chargeable = Math.max(0, Number(member.hours) || 0);
      }
      additionalHoursCost += chargeable * rate * memberQty;
    });
  }

  const rawSelling = sellingFromCostAndMargin(line.cost, line.margin_percent);
  const floorApplied = (line.line_selling || 0) > rawSelling + 0.01;
  const marginApplied = Math.round(((line.line_selling || 0) - (line.cost || 0)) * 100) / 100;

  return {
    basePackageCost: line.cost || 0,
    includedTeamScope,
    includedTeam,
    additionalHoursCost: Math.round(additionalHoursCost * 100) / 100,
    vendorCostNote: 'Deal-level — see Vendors tab',
    marginPercent: line.margin_percent,
    marginApplied,
    floorApplied,
    finalSellingPrice: line.line_selling || 0,
    belowBaselineNote,
    utilizationNote,
  };
}

export function getPrimaryGuidelineCategory(selectedProducts, findCatalogProduct) {
  const first = (selectedProducts || []).find(p => p.product_name);
  if (!first) return 'general';
  const product = findCatalogProduct(first.product_name);
  const family = (product?.service_family || product?.section_name || 'general').toLowerCase();
  const map = {
    branding: 'branding',
    campaign: 'campaign',
    digital: 'digital',
    consulting: 'consulting',
    staffing: 'staffing',
  };
  return map[family] || 'general';
}

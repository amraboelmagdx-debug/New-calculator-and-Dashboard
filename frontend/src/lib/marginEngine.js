/**
 * Margin pricing helpers — per-line products, validation, API payloads.
 */

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
  const cost = (Number(segment?.total_cost) || 0) * qty;
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
    cost: Math.round(cost * 100) / 100,
    sheet_min_margin_percent: sheetMinMargin,
    sheet_min_selling: Math.round(sheetMinSelling * 100) / 100,
    margin_percent: marginPercent,
    line_selling: Math.round(lineSelling * 100) / 100,
    service_family: segment?.service_family,
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
    sheet_min_margin_percent: l.sheet_min_margin_percent,
    sheet_min_selling: l.sheet_min_selling,
    margin_percent: l.margin_percent,
  }));
}

export function getDealComposition(selectedProducts, calcData) {
  const hasProducts = (selectedProducts || []).some(p => p.product_name && p.size);
  const hasTeam = (calcData?.team_members?.length || 0) > 0;
  const hasVendors = (calcData?.vendors?.length || 0) > 0;
  const isHybrid = hasProducts && (hasTeam || hasVendors);
  let hint = 'Set a quote-level margin for team and vendor costs.';
  if (hasProducts && !hasTeam && !hasVendors) {
    hint = 'Product-led quote — set margin per catalog line.';
  } else if (isHybrid) {
    hint = 'Hybrid deal — per-product margins plus team/vendor buckets. Sheet costs may include embedded labor.';
  } else if (hasTeam && !hasProducts) {
    hint = 'Team-led quote — margin applies to internal labor and overhead.';
  } else if (hasVendors && !hasProducts) {
    hint = 'Vendor-led quote — use markup per vendor or vendor margin %.';
  }
  return { hasProducts, hasTeam, hasVendors, isHybrid, hint };
}

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

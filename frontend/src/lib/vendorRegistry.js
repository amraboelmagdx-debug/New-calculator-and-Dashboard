/**
 * Vendor registry abstraction.
 *
 * A thin seam over today's `vendor-services` API so that reusable vendors are
 * first-class now, while isolating the data source. A future dedicated Vendor
 * Registry becomes a drop-in swap: the Resources workspace and templates import
 * only from this module, never from `getVendorServices` directly.
 *
 * Pricing is unaffected — vendors still live on each product line (`item.vendors`).
 */

export const VENDOR_PRESET_SOURCE = {
  CATALOG: 'catalog',
  REGISTRY: 'registry',
  TEMPLATE: 'template',
};

const DEFAULT_MARKUP = 15;

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Normalize a raw vendor-service / registry / template row into a canonical VendorPreset. */
export function normalizeVendorPreset(raw, { source = VENDOR_PRESET_SOURCE.CATALOG } = {}) {
  if (!raw) return null;
  const name = raw.name || raw.service_name || '';
  if (!name) return null;
  return {
    id: raw.id || raw.service_id || null,
    name,
    default_markup_percent:
      toNumberOrNull(raw.default_markup_percent) ??
      toNumberOrNull(raw.default_markup) ??
      DEFAULT_MARKUP,
    default_cost: toNumberOrNull(raw.default_cost) ?? toNumberOrNull(raw.cost) ?? null,
    default_risk_profile: raw.default_risk_profile || raw.risk || null,
    category: raw.category || null,
    notes: raw.notes || '',
    source: raw.source || source,
  };
}

/** Normalize a list of raw vendor-service rows into VendorPresets (deduped by name). */
export function listVendorPresets(rawServices = [], options = {}) {
  const seen = new Set();
  const presets = [];
  (rawServices || []).forEach(raw => {
    const preset = normalizeVendorPreset(raw, options);
    if (!preset) return;
    const dedupeKey = (preset.name || '').toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    presets.push(preset);
  });
  return presets;
}

/** Find a preset by name (case-insensitive) within a preset list. */
export function findVendorPresetByName(presets = [], name) {
  const search = String(name || '').toLowerCase().trim();
  if (!search) return null;
  return presets.find(p => (p.name || '').toLowerCase().trim() === search) || null;
}

/**
 * Build an `item.vendors` row from a preset (+ overrides). This is the single seam
 * a future registry-backed model reuses unchanged.
 */
export function presetToLineVendor(preset, overrides = {}) {
  const base = preset || {};
  return {
    id: overrides.id || `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    service_id: base.id || '',
    preset_id: base.id || null,
    service_name: base.name || overrides.service_name || '',
    cost: Number(overrides.cost ?? base.default_cost ?? 0) || 0,
    quantity: Number(overrides.quantity ?? 1) || 1,
    unit: overrides.unit || '',
    markup_percent: Number(overrides.markup_percent ?? base.default_markup_percent ?? DEFAULT_MARKUP) || 0,
    risk_percent: Number(overrides.risk_percent ?? 0) || 0,
    ...(overrides.risk || base.default_risk_profile
      ? { risk: overrides.risk || base.default_risk_profile }
      : {}),
  };
}

// ─── Group vendor helpers ──────────────────────────────────────────────────

/**
 * Create a new group vendor (has sub_items, no top-level cost).
 * A group vendor collects multiple line items (e.g. an Events bundle).
 */
export function createGroupVendor(overrides = {}) {
  return {
    id: overrides.id || `vg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    service_id: '',
    preset_id: null,
    service_name: overrides.service_name || '',
    is_group: true,
    markup_percent: Number(overrides.markup_percent ?? DEFAULT_MARKUP) || DEFAULT_MARKUP,
    risk_percent: Number(overrides.risk_percent ?? 0) || 0,
    cost: 0,
    quantity: 1,
    unit: '',
    sub_items: overrides.sub_items || [],
  };
}

/** Create a blank sub-item for a group vendor. */
export function createSubItem(overrides = {}) {
  return {
    id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: overrides.name || '',
    cost: Number(overrides.cost ?? 0) || 0,
    quantity: Number(overrides.quantity ?? 1) || 1,
    unit: overrides.unit || '',
    markup_percent: Number(overrides.markup_percent ?? DEFAULT_MARKUP) || DEFAULT_MARKUP,
    risk_percent: Number(overrides.risk_percent ?? 0) || 0,
  };
}

/**
 * Compute { cost, revenue } totals for any vendor (simple or group).
 * Mirrors compute_vendor_cost in the backend.
 * Per-vendor risk_percent is applied as a contingency buffer on top of markup.
 */
export function vendorTotals(v) {
  if (v.is_group && v.sub_items?.length > 0) {
    let cost = 0;
    let revenue = 0;
    for (const item of v.sub_items) {
      const c = (Number(item.cost) || 0) * (Number(item.quantity) || 1);
      cost += c;
      const markedUp = c * (1 + (Number(item.markup_percent) || 0) / 100);
      const riskMult = 1 + (Number(item.risk_percent) || 0) / 100;
      revenue += markedUp * riskMult;
    }
    return { cost, revenue };
  }
  const cost = (Number(v.cost) || 0) * (Number(v.quantity) || 1);
  const markedUp = cost * (1 + (Number(v.markup_percent) || 0) / 100);
  const riskMult = 1 + (Number(v.risk_percent) || 0) / 100;
  return { cost, revenue: markedUp * riskMult };
}

// ─── Preferred vendors ────────────────────────────────────────────────────

/** Derive distinct presets actually used across product lines (for template `preferred_vendors`). */
export function collectPreferredVendors(selectedProducts = []) {
  const seen = new Set();
  const presets = [];
  (selectedProducts || []).forEach(product => {
    (product.vendors || []).forEach(v => {
      const name = v.service_name || '';
      if (!name) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      presets.push({
        id: v.preset_id || v.service_id || null,
        name,
        default_markup_percent: Number(v.markup_percent) || DEFAULT_MARKUP,
        default_cost: Number(v.cost) || null,
        default_risk_profile: v.risk || null,
        source: VENDOR_PRESET_SOURCE.TEMPLATE,
      });
    });
  });
  return presets;
}

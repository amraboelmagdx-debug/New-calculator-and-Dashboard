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
    markup_percent: Number(overrides.markup_percent ?? base.default_markup_percent ?? DEFAULT_MARKUP) || 0,
    ...(overrides.risk || base.default_risk_profile
      ? { risk: overrides.risk || base.default_risk_profile }
      : {}),
  };
}

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

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasNumberedScopeItems(text) {
  const t = (text || '').trim();
  return /^\d+\./.test(t) || /,\s*\d+\./.test(t);
}

export function splitScopeSegments(raw) {
  const text = (raw || '').trim();
  if (!text) return [];
  if (hasNumberedScopeItems(text)) {
    return text
      .split(/,\s*(?=\d+\.)/)
      .map(s => s.trim())
      .filter(Boolean);
  }
  return text
    .split(/[,،]\s*/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function parseScopeText(scopeRaw) {
  const segments = splitScopeSegments(scopeRaw);
  return segments.map((piece, i) => ({
    index: i + 1,
    raw: piece,
    label: extractScopeLabel(piece),
  }));
}

export function extractScopeLabel(segment) {
  const withoutNumber = segment.replace(/^\d+\.\s*/, '').trim();
  for (const sep of ['–', '—', '-']) {
    if (withoutNumber.includes(sep)) {
      const parts = withoutNumber.split(sep);
      const english = parts.slice(1).join(sep).trim();
      if (english) return english;
    }
  }
  return withoutNumber;
}

export function matchScopeItemToCatalog(label, catalog = []) {
  const search = normalizeName(label);
  if (!search || !catalog.length) {
    return { product_name: '', matched: false };
  }

  const exact = catalog.find(p => {
    const pn = normalizeName(p.product_name);
    const sn = normalizeName(p.service_name);
    return pn === search || sn === search;
  });
  if (exact) {
    const name = exact.product_name || exact.service_name;
    return { product_name: name, matched: true };
  }

  const contains = catalog.find(p => {
    const pn = normalizeName(p.product_name);
    const sn = normalizeName(p.service_name);
    return (
      (pn && (pn.includes(search) || search.includes(pn))) ||
      (sn && (sn.includes(search) || search.includes(sn)))
    );
  });
  if (contains) {
    const name = contains.product_name || contains.service_name;
    return { product_name: name, matched: true };
  }

  return { product_name: '', matched: false };
}

export function enrichScopeItemsWithCatalog(scopeItems, catalog) {
  return (scopeItems || []).map(item => {
    const match = matchScopeItemToCatalog(item.label || item.raw, catalog);
    return {
      ...item,
      catalog_product_name: match.product_name,
      matched: match.matched,
    };
  });
}

// ─── Multi-tier scope import helpers ─────────────────────────────────────────

const TIER_SORT_ORDER = ['tiny', 'standard', 'big', 'mega', 'large'];

/** Stable scope-line key for tier plan state */
export function scopeRowKey(item) {
  return `${item.index}:${item.catalog_product_name}`;
}

export function normalizeTierKey(tier) {
  return String(tier ?? '').toLowerCase().trim();
}

export function normalizeTierKeyOrDefault(tier) {
  return normalizeTierKey(tier) || 'standard';
}

function getTierTokenAliasesMap() {
  return {
    tiny: ['tiny', 'small', 'xs'],
    standard: ['standard', 'std', 'medium', 'regular'],
    big: ['big', 'large', 'lg'],
    mega: ['mega', 'xl', 'enterprise'],
    large: ['large', 'big', 'lg'],
  };
}

function tierAliasesFor(tierKey) {
  const map = getTierTokenAliasesMap();
  return map[tierKey] || [tierKey];
}

function productFamily(product) {
  return product?.service_family || product?.section_name || 'General';
}

function productDisplayName(product) {
  return product?.product_name || product?.service_name || '';
}

/** Resolve a catalog row by service name with exact, normalized, and fuzzy matching. */
export function resolveCatalogProduct(catalog = [], name, options = {}) {
  const { familyHint } = options;
  const search = String(name || '').trim();
  if (!search || !catalog.length) return null;

  let pool = catalog;
  if (familyHint && familyHint !== 'all') {
    const familyMatches = catalog.filter(p => productFamily(p) === familyHint);
    if (familyMatches.length) pool = familyMatches;
  }

  const exact = pool.find(p => p.service_name === search || p.product_name === search);
  if (exact) return exact;

  const normalizedSearch = normalizeName(search);
  const normalizedExact = pool.find(p => {
    const pn = normalizeName(p.product_name);
    const sn = normalizeName(p.service_name);
    return pn === normalizedSearch || sn === normalizedSearch;
  });
  if (normalizedExact) return normalizedExact;

  const match = matchScopeItemToCatalog(search, pool);
  if (match.matched && match.product_name) {
    return (
      pool.find(p => productDisplayName(p) === match.product_name) ||
      pool.find(
        p => normalizeName(productDisplayName(p)) === normalizeName(match.product_name)
      ) ||
      null
    );
  }

  return null;
}

function tierKeysMatch(requestedNorm, catalogKeyNorm) {
  if (requestedNorm === catalogKeyNorm) return true;
  const requestedAliases = tierAliasesFor(requestedNorm);
  const keyAliases = tierAliasesFor(catalogKeyNorm);
  return requestedAliases.some(a => keyAliases.includes(a));
}

/** Resolve segment payload and the actual catalog tier key for a product. */
export function resolveSegmentPayload(product, tier) {
  if (!product) return { segment: null, resolvedTierKey: null };

  const requested = normalizeTierKeyOrDefault(tier);
  const segmentMap = product.segments || {};
  const sizeMap = product.sizes || {};
  const keys = Object.keys(segmentMap).length ? Object.keys(segmentMap) : Object.keys(sizeMap);
  if (!keys.length) return { segment: null, resolvedTierKey: null };

  for (const key of keys) {
    if (normalizeTierKey(key) === requested) {
      return { segment: segmentMap[key] || null, resolvedTierKey: key };
    }
  }

  for (const key of keys) {
    const keyNorm = normalizeTierKey(key);
    if (tierKeysMatch(requested, keyNorm)) {
      return { segment: segmentMap[key] || null, resolvedTierKey: key };
    }
  }

  return { segment: null, resolvedTierKey: null };
}

/** Backward-compatible wrapper — returns segment only. */
export function getSegmentPayload(product, tier) {
  return resolveSegmentPayload(product, tier).segment;
}

/** Pick the best tier key on a product, preserving preferred tier when valid. */
export function resolveTierForProduct(product, preferredTier) {
  const tiers = getCatalogTierKeys(product);
  if (!tiers.length) return normalizeTierKeyOrDefault(preferredTier);

  if (preferredTier) {
    const { resolvedTierKey } = resolveSegmentPayload(product, preferredTier);
    if (resolvedTierKey) return resolvedTierKey;
  }

  return tiers[0];
}

export function getCatalogTierKeys(catalogProduct) {
  if (!catalogProduct) return [];
  const keys = Object.keys(catalogProduct.segments || catalogProduct.sizes || {});
  const orderIndex = key => {
    const idx = TIER_SORT_ORDER.indexOf(normalizeTierKey(key));
    return idx >= 0 ? idx : TIER_SORT_ORDER.length;
  };
  return [...keys].sort((a, b) => {
    const oa = orderIndex(a);
    const ob = orderIndex(b);
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b);
  });
}

export function estimateMinRevenue(segmentPayload, quantity = 1) {
  const qty = Math.max(1, Math.floor(Number(quantity)) || 1);
  const unit = Number(segmentPayload?.base_minimum_selling_price) || 0;
  return unit * qty;
}

export function getTierSheetHints(segmentPayload, quantity = 1) {
  const qty = Math.max(1, Math.floor(Number(quantity)) || 1);
  return {
    estMinRevenue: estimateMinRevenue(segmentPayload, qty),
    minMarginPercent: Number(segmentPayload?.minimum_margin_percent) || 0,
    teamHours: Number(segmentPayload?.total_team_hours) || 0,
    teamHoursTotal: (Number(segmentPayload?.total_team_hours) || 0) * qty,
  };
}

export function inferTierFromScopeText(raw, label, availableTiers) {
  const tiers = (availableTiers || []).map(normalizeTierKey);
  if (!tiers.length) return null;
  const haystack = normalizeName(`${raw || ''} ${label || ''}`);
  if (!haystack) return null;

  for (const tierKey of tiers) {
    const aliases = tierAliasesFor(tierKey);
    for (const alias of aliases) {
      const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(haystack)) {
        return tierKey;
      }
    }
    if (haystack.includes(tierKey)) {
      return tierKey;
    }
  }
  return null;
}

export function buildInitialTierPlan(scopeItem, catalogProduct) {
  const tiers = getCatalogTierKeys(catalogProduct);
  const inferred = inferTierFromScopeText(scopeItem?.raw, scopeItem?.label, tiers);
  if (inferred) {
    return [{ tier: inferred, quantity: 1 }];
  }
  if (tiers.length === 1) {
    return [{ tier: tiers[0], quantity: 1 }];
  }
  return [{ tier: '', quantity: 1 }];
}

export function validateTierPlan(tierRows, availableTiers, options = {}) {
  const { singleTier = false } = options;
  const errors = [];
  const rows = tierRows || [];
  const tiers = (availableTiers || []).map(normalizeTierKey);

  if (!rows.length) {
    errors.push('At least one tier row is required');
    return { valid: false, errors };
  }

  const seen = new Set();
  for (const row of rows) {
    const qty = Number(row.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      errors.push('Quantity must be at least 1');
    }
    if (singleTier) continue;

    const tier = normalizeTierKey(row.tier);
    if (!tier) {
      errors.push('Select a tier');
      continue;
    }
    if (tiers.length && !tiers.includes(tier)) {
      errors.push('Invalid tier for this service');
    }
    if (seen.has(tier)) {
      errors.push('Duplicate tier — each tier can only appear once');
    }
    seen.add(tier);
  }

  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

export function findExistingProductIndex(products, productName, size) {
  const name = String(productName || '').trim();
  if (!name) return -1;
  const tier = normalizeTierKeyOrDefault(size);
  return (products || []).findIndex(
    p => p.product_name === name && normalizeTierKeyOrDefault(p.size) === tier
  );
}

export function estimateCardTeamHours(tierRows, getSegmentPayload, catalogProduct) {
  let total = 0;
  (tierRows || []).forEach(row => {
    const tier = normalizeTierKey(row.tier);
    if (!tier) return;
    const seg = getSegmentPayload?.(catalogProduct, tier);
    const qty = Math.max(1, Math.floor(Number(row.quantity)) || 1);
    total += (Number(seg?.total_team_hours) || 0) * qty;
  });
  return Math.round(total * 10) / 10;
}

export function estimateCardMinRevenue(tierRows, getSegmentPayload, catalogProduct) {
  let total = 0;
  (tierRows || []).forEach(row => {
    const tier = normalizeTierKey(row.tier);
    if (!tier) return;
    const seg = getSegmentPayload?.(catalogProduct, tier);
    total += estimateMinRevenue(seg, row.quantity);
  });
  return total;
}

export function buildScopeImportPreview(entries, existingProducts = []) {
  return (entries || []).map(entry => {
    const name = entry.product_name;
    const tier = normalizeTierKey(entry.size) || 'standard';
    const qty = Math.max(1, Math.floor(Number(entry.quantity)) || 1);
    const label = `${name} · ${tier.toUpperCase()} × ${qty}`;
    const existingIdx = findExistingProductIndex(existingProducts, name, tier);
    if (existingIdx >= 0) {
      const current = Math.max(1, Number(existingProducts[existingIdx].quantity) || 1);
      return {
        label,
        merge: true,
        detail: `${label} → adds to existing (qty ${current} → ${current + qty})`,
      };
    }
    return { label, merge: false, detail: label };
  });
}

export function buildScopeImportEntries(matchedItems, tierPlansByKey, selectedKeys, options = {}) {
  const { getSegmentPayload, findCatalogProduct } = options;
  const entries = [];
  const skippedLines = [];
  let validLineCount = 0;
  let invalidLineCount = 0;

  (matchedItems || []).forEach(item => {
    const key = scopeRowKey(item);
    if (!selectedKeys.has(key)) return;

    const catalogProduct = findCatalogProduct?.(item.catalog_product_name);
    const availableTiers = getCatalogTierKeys(catalogProduct);
    const tierRows = tierPlansByKey[key] || [];
    const singleTier = availableTiers.length === 1;
    const validation = validateTierPlan(tierRows, availableTiers, { singleTier });

    if (!validation.valid) {
      invalidLineCount += 1;
      skippedLines.push({
        key,
        label: item.label || item.raw,
        errors: validation.errors,
      });
      return;
    }

    validLineCount += 1;
    tierRows.forEach(row => {
      const tier = singleTier ? availableTiers[0] : normalizeTierKey(row.tier);
      entries.push({
        product_name: item.catalog_product_name,
        size: tier,
        quantity: Math.max(1, Math.floor(Number(row.quantity)) || 1),
      });
    });
  });

  const previewRows = buildScopeImportPreview(entries, options.existingProducts);

  return {
    entries,
    skippedLines,
    validLineCount,
    invalidLineCount,
    previewRows,
  };
}

export function summarizeScopeImport(entries, previewRows, skippedLines, getSegmentPayload, findCatalogProduct) {
  let totalTeamHours = 0;
  let totalMinRevenue = 0;

  (entries || []).forEach(entry => {
    const product = findCatalogProduct?.(entry.product_name);
    const seg = getSegmentPayload?.(product, entry.size);
    const qty = Math.max(1, Math.floor(Number(entry.quantity)) || 1);
    totalTeamHours += (Number(seg?.total_team_hours) || 0) * qty;
    totalMinRevenue += estimateMinRevenue(seg, qty);
  });

  return {
    rowCount: entries.length,
    totalTeamHours: Math.round(totalTeamHours * 10) / 10,
    totalMinRevenue,
    previewRows: previewRows || [],
    skippedCount: (skippedLines || []).length,
  };
}

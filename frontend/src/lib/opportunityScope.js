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

import {
  parseScopeText,
  splitScopeSegments,
  hasNumberedScopeItems,
  getCatalogTierKeys,
  inferTierFromScopeText,
  buildInitialTierPlan,
  validateTierPlan,
  buildScopeImportEntries,
  buildScopeImportPreview,
  estimateMinRevenue,
  scopeRowKey,
  resolveCatalogProduct,
  resolveSegmentPayload,
  getSegmentPayload,
  resolveTierForProduct,
} from './opportunityScope';

const mockCatalogProduct = {
  service_name: 'Brand Structure',
  segments: {
    tiny: {
      base_minimum_selling_price: 68000,
      minimum_margin_percent: 65,
      total_team_hours: 163,
      internal_roles: [{ role_name: 'Designer', hours: 80 }],
    },
    standard: {
      base_minimum_selling_price: 120000,
      minimum_margin_percent: 55,
      total_team_hours: 240,
      internal_roles: [{ role_name: 'Designer', hours: 130 }],
    },
  },
};

const duplicateNameCatalog = [
  {
    service_family: 'Branding',
    service_name: 'Identity Build',
    product_name: 'Identity Build',
    segments: { tiny: { total_team_hours: 10, internal_roles: [{ role_name: 'A', hours: 10 }] } },
  },
  {
    service_family: 'Digital',
    service_name: 'Identity Build',
    product_name: 'Identity Build',
    segments: { tiny: { total_team_hours: 99, internal_roles: [{ role_name: 'B', hours: 99 }] } },
  },
];

describe('splitScopeSegments', () => {
  it('splits plain comma-separated Arabic scope into 4 items', () => {
    const raw = 'استراتيجية الاتصال, بناء هوية جديدة, تطوير الهيكلة, بناء الهيكلة';
    expect(splitScopeSegments(raw)).toHaveLength(4);
    expect(parseScopeText(raw)).toHaveLength(4);
    expect(parseScopeText(raw)[0].label).toBe('استراتيجية الاتصال');
  });

  it('splits numbered bilingual scope into 3 items', () => {
    const raw =
      '27. خدمة تغطية – Event Coverage, 9. خدمة الفيديوجرافي – Videography, 10. خدمة سينمائي – Cinematic';
    expect(hasNumberedScopeItems(raw)).toBe(true);
    expect(splitScopeSegments(raw)).toHaveLength(3);
    expect(parseScopeText(raw)[1].label).toBe('Videography');
  });

  it('returns single item when no comma', () => {
    const raw = 'بناء الهيكلة';
    expect(splitScopeSegments(raw)).toHaveLength(1);
  });
});

describe('multi-tier scope import helpers', () => {
  it('sorts catalog tier keys in stable order', () => {
    expect(getCatalogTierKeys({ segments: { mega: {}, standard: {}, tiny: {} } })).toEqual([
      'tiny',
      'standard',
      'mega',
    ]);
  });

  it('infers tier from scope text when confident', () => {
    expect(
      inferTierFromScopeText('Brand Structure Tiny package', 'Brand Structure', ['tiny', 'standard'])
    ).toBe('tiny');
  });

  it('buildInitialTierPlan uses inference then single tier then empty', () => {
    const inferred = buildInitialTierPlan(
      { raw: 'Brand Tiny', label: 'Brand' },
      mockCatalogProduct
    );
    expect(inferred).toEqual([{ tier: 'tiny', quantity: 1 }]);

    const single = buildInitialTierPlan(
      { raw: 'Only one', label: 'Only one' },
      { segments: { standard: {} } }
    );
    expect(single).toEqual([{ tier: 'standard', quantity: 1 }]);

    const empty = buildInitialTierPlan({ raw: 'No tier hint', label: 'No tier hint' }, mockCatalogProduct);
    expect(empty).toEqual([{ tier: '', quantity: 1 }]);
  });

  it('rejects duplicate tiers in validateTierPlan', () => {
    const result = validateTierPlan(
      [
        { tier: 'tiny', quantity: 1 },
        { tier: 'tiny', quantity: 2 },
      ],
      ['tiny', 'standard']
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
  });

  it('skips tier validation for single-tier services', () => {
    const result = validateTierPlan([{ tier: 'standard', quantity: 2 }], ['standard'], {
      singleTier: true,
    });
    expect(result.valid).toBe(true);
  });

  it('estimateMinRevenue multiplies base min selling by qty', () => {
    expect(estimateMinRevenue(mockCatalogProduct.segments.tiny, 2)).toBe(136000);
  });

  it('buildScopeImportEntries flattens valid multi-tier lines and skips invalid', () => {
    const item = {
      index: 1,
      label: 'Brand Structure',
      raw: 'Brand Structure',
      catalog_product_name: 'Brand Structure',
      matched: true,
    };
    const key = scopeRowKey(item);
    const tierPlansByKey = {
      [key]: [
        { tier: 'tiny', quantity: 1 },
        { tier: 'standard', quantity: 2 },
      ],
    };
    const badItem = {
      index: 2,
      label: 'Bad',
      raw: 'Bad',
      catalog_product_name: 'Brand Structure',
      matched: true,
    };
    const badKey = scopeRowKey(badItem);
    const result = buildScopeImportEntries(
      [item, badItem],
      { ...tierPlansByKey, [badKey]: [{ tier: '', quantity: 1 }] },
      new Set([key, badKey]),
      {
        findCatalogProduct: () => mockCatalogProduct,
        getSegmentPayload: (p, size) => p?.segments?.[size],
        existingProducts: [],
      }
    );
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toEqual({ product_name: 'Brand Structure', size: 'tiny', quantity: 1 });
    expect(result.entries[1]).toEqual({ product_name: 'Brand Structure', size: 'standard', quantity: 2 });
    expect(result.skippedLines).toHaveLength(1);
    expect(result.validLineCount).toBe(1);
  });

  it('buildScopeImportPreview annotates merge vs new', () => {
    const preview = buildScopeImportPreview(
      [{ product_name: 'Brand Structure', size: 'tiny', quantity: 1 }],
      [{ product_name: 'Brand Structure', size: 'standard', quantity: 1 }]
    );
    expect(preview[0].merge).toBe(false);
    expect(preview[0].detail).toContain('TINY');

    const mergePreview = buildScopeImportPreview(
      [{ product_name: 'Brand Structure', size: 'standard', quantity: 2 }],
      [{ product_name: 'Brand Structure', size: 'standard', quantity: 1 }]
    );
    expect(mergePreview[0].merge).toBe(true);
    expect(mergePreview[0].detail).toContain('→ adds to existing');
  });
});

describe('catalog resolvers', () => {
  it('resolveSegmentPayload matches tier case-insensitively', () => {
    const product = {
      segments: {
        TINY: { total_team_hours: 50, internal_roles: [{ role_name: 'R', hours: 50 }] },
        Standard: { total_team_hours: 100, internal_roles: [{ role_name: 'R', hours: 100 }] },
      },
    };
    expect(resolveSegmentPayload(product, 'tiny').resolvedTierKey).toBe('TINY');
    expect(resolveSegmentPayload(product, 'STANDARD').segment?.total_team_hours).toBe(100);
  });

  it('resolveSegmentPayload maps large alias to big tier key', () => {
    const product = {
      segments: {
        big: { total_team_hours: 300, internal_roles: [{ role_name: 'Lead', hours: 200 }] },
      },
    };
    const { segment, resolvedTierKey } = resolveSegmentPayload(product, 'large');
    expect(resolvedTierKey).toBe('big');
    expect(segment?.total_team_hours).toBe(300);
  });

  it('getSegmentPayload wrapper returns segment only', () => {
    expect(getSegmentPayload(mockCatalogProduct, 'tiny')?.total_team_hours).toBe(163);
  });

  it('resolveCatalogProduct uses normalized and family hint for duplicates', () => {
    const branding = resolveCatalogProduct(duplicateNameCatalog, 'identity build', {
      familyHint: 'Branding',
    });
    expect(branding?.service_family).toBe('Branding');
    expect(resolveSegmentPayload(branding, 'tiny').segment?.total_team_hours).toBe(10);

    const digital = resolveCatalogProduct(duplicateNameCatalog, 'Identity Build', {
      familyHint: 'Digital',
    });
    expect(resolveSegmentPayload(digital, 'tiny').segment?.total_team_hours).toBe(99);
  });

  it('resolveTierForProduct preserves preferred tier when valid', () => {
    expect(resolveTierForProduct(mockCatalogProduct, 'standard')).toBe('standard');
    expect(resolveTierForProduct(mockCatalogProduct, 'TINY')).toBe('tiny');
    expect(resolveTierForProduct(mockCatalogProduct, 'invalid')).toBe('tiny');
  });

  it('tiny and standard segments expose different role hours', () => {
    const tinyHours = resolveSegmentPayload(mockCatalogProduct, 'tiny').segment?.internal_roles?.[0]?.hours;
    const standardHours = resolveSegmentPayload(mockCatalogProduct, 'standard').segment?.internal_roles?.[0]?.hours;
    expect(tinyHours).toBe(80);
    expect(standardHours).toBe(130);
    expect(tinyHours).not.toBe(standardHours);
  });
});

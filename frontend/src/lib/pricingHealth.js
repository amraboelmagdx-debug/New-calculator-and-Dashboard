/**
 * Display-only pricing health for sticky summary (no pricing formulas).
 */

const RISKY_WARNING_TYPES = new Set([
  'margin_low',
  'negative_margin',
  'product_below_sheet_margin',
  'product_below_floor',
]);

export const PRICING_HEALTH_STYLES = {
  idle: {
    label: 'Run Calculation',
    badge: {
      dark: 'bg-neutral-800 text-neutral-400 border-neutral-700',
      light: 'bg-slate-100 text-slate-600 border-slate-200',
    },
  },
  healthy: {
    label: 'Healthy',
    badge: {
      dark: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      light: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
  },
  near: {
    label: 'Attention Needed',
    badge: {
      dark: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      light: 'bg-amber-50 text-amber-800 border-amber-200',
    },
  },
  risky: {
    label: 'Review Pricing',
    badge: {
      dark: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      light: 'bg-rose-50 text-rose-800 border-rose-200',
    },
  },
};

function hasRiskyWarnings(warnings) {
  return (warnings || []).some(
    w => w.severity === 'error' || RISKY_WARNING_TYPES.has(w.type)
  );
}

export function derivePricingHealth({
  results,
  sheetMinSelling = 0,
  sheetPriceFloorWarning,
  calcData,
  customMarginCount = 0,
}) {
  const selling = Number(results?.selling_price) || 0;
  const marginPct = Number(results?.contribution_margin_percent) || 0;
  const target = Number(calcData?.target_margin_percent) || 30;
  const sheetMin = Number(sheetMinSelling) || 0;
  const warnings = results?.warnings || [];

  if (!results || selling <= 0) {
    return { status: 'idle', ...PRICING_HEALTH_STYLES.idle };
  }

  const belowFloor = sheetPriceFloorWarning || (sheetMin > 0 && selling < sheetMin);
  const lowMargin = marginPct < 20;
  const criticalMargin = marginPct < 15;

  if (belowFloor || lowMargin || criticalMargin || hasRiskyWarnings(warnings)) {
    return { status: 'risky', ...PRICING_HEALTH_STYLES.risky };
  }

  const nearFloor = sheetMin > 0 && selling >= sheetMin && selling < sheetMin * 1.08;
  const belowTarget = marginPct >= 20 && marginPct < target;
  const hasAnyWarnings = warnings.length > 0;
  const heavyOverrides = customMarginCount >= 2;

  if (nearFloor || belowTarget || hasAnyWarnings || heavyOverrides) {
    return { status: 'near', ...PRICING_HEALTH_STYLES.near };
  }

  return { status: 'healthy', ...PRICING_HEALTH_STYLES.healthy };
}

const LINE_HEALTH_BADGE = {
  ok: {
    label: 'Healthy',
    dark: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    light: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  attention: {
    label: 'Attention Needed',
    dark: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    light: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  review: {
    label: 'Review Pricing',
    dark: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    light: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

export function mapLineHealthBadge(validation, isDarkMode) {
  const status = validation?.status;
  let key = 'attention';
  if (status === 'ok') key = 'ok';
  else if (status === 'below_min_margin' || status === 'below_floor') key = 'review';
  const style = LINE_HEALTH_BADGE[key];
  return {
    label: style.label,
    className: `text-xs font-medium border ${isDarkMode ? style.dark : style.light}`,
  };
}

export function derivePricingSummaryDisplay(results, sheetMinSelling) {
  const selling = Number(results?.selling_price) || 0;
  const sheetMin = Number(sheetMinSelling) || 0;

  return {
    totalCost: Number(results?.cogs) || 0,
    minSelling: sheetMin,
    finalPrice: selling,
    marginPercent: Number(results?.contribution_margin_percent) || 0,
    contributionMargin: Number(results?.contribution_margin) || 0,
    hasResults: Boolean(results && selling > 0),
  };
}

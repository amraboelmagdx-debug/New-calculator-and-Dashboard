/**
 * Pricing cost interpretation by Execution Mode (Google Sheet).
 * Keep in sync with backend/pricing_rules.py
 */

export const EXECUTION_ALL_IN = 'all_in';
export const EXECUTION_RESOURCE = 'resource';
export const EXECUTION_HYBRID = 'hybrid';

const ALL_IN_KEYWORDS = ['all-in', 'all in', 'allin', 'package', 'fixed', 'lump', 'turnkey'];
const RESOURCE_KEYWORDS = ['resource', 'manpower', 'hours', 'labor', 'labour', 'team-based', 'team based'];
const HYBRID_KEYWORDS = ['hybrid', 'mixed', 'combo', 'combined'];

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeExecutionMode(raw, segment = null) {
  const text = String(raw || '').trim().toLowerCase();
  if (HYBRID_KEYWORDS.some(k => text.includes(k))) return EXECUTION_HYBRID;
  if (ALL_IN_KEYWORDS.some(k => text.includes(k))) return EXECUTION_ALL_IN;
  if (RESOURCE_KEYWORDS.some(k => text.includes(k))) return EXECUTION_RESOURCE;

  const roles = segment?.internal_roles || [];
  const totalHours = num(segment?.total_team_hours);
  if (roles.length > 0 || totalHours > 0) return EXECUTION_RESOURCE;
  return EXECUTION_ALL_IN;
}

/**
 * @returns {{ cost: number, executionMode: string, costBasis: string, usedFallback: boolean, unitCost: number }}
 */
export function resolveProductLineCost(segment, quantity = 1) {
  const qty = Math.max(1, Number(quantity) || 1);
  const seg = segment || {};
  const executionMode = normalizeExecutionMode(seg.execution_mode, seg);
  const direct = num(seg.direct_cost_per_unit);
  const oh = num(seg.oh_cost_value);
  const total = num(seg.total_cost);
  let unit = 0;
  let costBasis = 'none';
  let usedFallback = false;

  if (executionMode === EXECUTION_RESOURCE) {
    const component = direct + oh;
    if (component > 0) {
      unit = component;
      costBasis = 'direct_plus_oh';
    } else if (total > 0) {
      unit = total;
      costBasis = 'total_cost_fallback';
      usedFallback = true;
    }
  } else {
    unit = total;
    costBasis = 'total_cost_package';
  }

  const cost = Math.round(unit * qty * 100) / 100;
  return { cost, executionMode, costBasis, usedFallback, unitCost: unit };
}

export function shouldAutoSyncTeamFromSegment(segment) {
  const mode = normalizeExecutionMode(segment?.execution_mode, segment);
  return mode === EXECUTION_RESOURCE || mode === EXECUTION_HYBRID;
}

export function getChargeableHours(hours, baselineHours = 0, calcMode = 'hours', executionContext = null) {
  const h = Math.max(0, num(hours));
  const baseline = Math.max(0, num(baselineHours));
  if (calcMode !== 'hours') return h;
  if (executionContext === EXECUTION_HYBRID && baseline > 0) {
    return Math.max(0, h - baseline);
  }
  return h;
}

export function costBasisDescription(executionMode, costBasis) {
  if (executionMode === EXECUTION_ALL_IN) {
    return 'All-in: Total Cost is the full package (no auto team labor charge).';
  }
  if (executionMode === EXECUTION_RESOURCE) {
    if (costBasis === 'total_cost_fallback') {
      return 'Resource: using Total Cost (Direct+OH missing on sheet).';
    }
    return 'Resource: Direct Cost + OH; team hours charged in full.';
  }
  if (executionMode === EXECUTION_HYBRID) {
    return 'Hybrid: Total Cost is included; only hours above sheet baseline add labor.';
  }
  return '';
}

export function executionModeLabel(mode) {
  if (mode === EXECUTION_ALL_IN) return 'All-in';
  if (mode === EXECUTION_RESOURCE) return 'Resource';
  if (mode === EXECUTION_HYBRID) return 'Hybrid';
  return mode || 'Unknown';
}

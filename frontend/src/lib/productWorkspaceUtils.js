import { getChargeableHours, EXECUTION_HYBRID } from '@/lib/pricingCostRules';
import { sellingFromCostAndMargin } from '@/lib/marginEngine';

export function shortRoleLabel(name) {
  const text = (name || '').trim();
  if (!text) return 'Role';
  if (text.includes(' - ')) return text.split(' - ').pop().trim();
  return text;
}

export function computeMemberCost(member, roles, secondedMarkupPercent = 20, standardMonthlyHours = 160) {
  const quantity = member.quantity || 1;
  const role = roles.find(r => r.id === member.role_id);

  if (member.employee_type === 'seconded') {
    const baseMonthlyCost = role?.total_monthly_cost || role?.monthly_salary || member.monthly_salary || 0;
    const withMarkup = baseMonthlyCost * (1 + secondedMarkupPercent / 100);
    const duration = member.duration_months || 1;
    return withMarkup * duration * quantity;
  }

  if (member.calc_mode === 'utilization') {
    const monthlyCost = role?.total_monthly_cost || role?.monthly_salary || member.monthly_salary || 0;
    const utilization = (member.utilization_percent || 0) / 100;
    const duration = member.duration_months || 1;
    return monthlyCost * utilization * duration * quantity;
  }

  const billableHours =
    member.labor_charge_context === EXECUTION_HYBRID && (member.baseline_hours || 0) > 0
      ? getChargeableHours(member.hours, member.baseline_hours, 'hours', EXECUTION_HYBRID)
      : member.hours || 0;
  return billableHours * (member.hourly_rate || 0) * quantity;
}

export function sumTeamCostFromMembers(members, roles, standardMonthlyHours) {
  return (members || []).reduce(
    (sum, m) => sum + computeMemberCost(m, roles, 20, standardMonthlyHours),
    0
  );
}

export function resolveTeamCost(line, members, roles, standardMonthlyHours) {
  if (line?.team_cost != null && Number(line.team_cost) > 0) {
    return Number(line.team_cost);
  }
  return sumTeamCostFromMembers(members, roles, standardMonthlyHours);
}

export function topContributors(members, roles, standardMonthlyHours, limit = 5) {
  const costs = (members || []).map(m => ({
    name: m.role_name || shortRoleLabel(roles.find(r => r.id === m.role_id)?.name),
    cost: computeMemberCost(m, roles, 20, standardMonthlyHours),
  }));
  const total = costs.reduce((s, c) => s + c.cost, 0);
  if (total <= 0) return { total: 0, contributors: [] };

  return {
    total,
    contributors: costs
      .filter(c => c.cost > 0)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit)
      .map(c => ({
        name: shortRoleLabel(c.name),
        cost: c.cost,
        percent: Math.round((c.cost / total) * 1000) / 10,
      })),
  };
}

export function percentOf(part, whole) {
  const p = Number(part) || 0;
  const w = Number(whole) || 0;
  if (w <= 0 || p <= 0) return null;
  return Math.round((p / w) * 1000) / 10;
}

export function computeRiskSellingImpact(line, marginPercent) {
  const mult = Number(line?.risk_multiplier) || 1;
  const margin = marginPercent ?? line?.margin_percent ?? 30;
  if (mult <= 1) return 0;
  // Risk is an ADDITIVE premium on top of the floor-protected price, applied to the internal
  // (labor+overhead) selling only — vendor revenue carries its own risk. Mirrors the backend.
  const internalCost = line?.internal_cost != null
    ? Number(line.internal_cost)
    : Math.max(0, (Number(line?.cost) || 0) - (Number(line?.vendor_cost) || 0));
  if (internalCost <= 0) return 0;
  const internalSellNoRisk = sellingFromCostAndMargin(internalCost, margin);
  return Math.max(0, internalSellNoRisk * (mult - 1));
}

export function deriveLineValidation(line, item) {
  if (!line) return { status: 'incomplete', label: 'No calc', tone: 'neutral' };
  const margin = Number(line.margin_percent ?? item?.margin_percent) || 0;
  const minMargin = Number(line.sheet_min_margin_percent) || 0;
  const selling = Number(line.selling) || 0;
  const floor = Number(line.sheet_min_selling) || 0;

  if (minMargin > 0 && margin < minMargin) {
    return { status: 'below_min_margin', label: 'Below min margin', tone: 'rose' };
  }
  if (floor > 0 && selling < floor - 0.01) {
    return { status: 'below_floor', label: 'Below floor', tone: 'amber' };
  }
  return { status: 'ok', label: 'OK', tone: 'emerald' };
}

/** Lightweight rule-based score 0–100; returns null when no calc line. */
export function computeProductHealthScore(line, item) {
  if (!line || !(Number(line.cost) > 0 || Number(line.selling) > 0)) return null;

  let score = 100;
  const margin = Number(line.margin_percent ?? item?.margin_percent) || 0;
  const minMargin = Number(line.sheet_min_margin_percent) || 0;
  const selling = Number(line.selling) || 0;
  const floor = Number(line.sheet_min_selling) || 0;
  const mult = Number(line.risk_multiplier) || 1;

  if (minMargin > 0 && margin < minMargin) score -= 25;
  else if (minMargin > 0 && margin < minMargin + 5) score -= 10;

  if (floor > 0 && selling < floor - 0.01) score -= 30;

  if (mult > 1.15) score -= 5;

  if (!(item?.team_members?.length) && Number(line.team_cost) > 0) score -= 5;

  return Math.max(0, Math.min(100, score));
}

export function healthScoreTone(score, isDarkMode) {
  if (score == null) {
    return isDarkMode ? 'text-neutral-500' : 'text-slate-400';
  }
  if (score >= 80) return isDarkMode ? 'text-emerald-400' : 'text-emerald-600';
  if (score >= 60) return isDarkMode ? 'text-amber-400' : 'text-amber-600';
  return isDarkMode ? 'text-rose-400' : 'text-rose-600';
}

// ─── Department grouping helpers ──────────────────────────────────────────────

/**
 * Extract the English (or short) portion of a bilingual dept name.
 * "إدارة الحسابات - Accounts Management" → "Accounts Management"
 */
export function shortDeptLabel(name) {
  const s = (name || '').trim();
  if (!s || s === 'Other') return s || 'Other';
  if (s.includes(' - ')) return s.split(' - ').pop().trim();
  return s;
}

/**
 * Group team members by department (looked up from roles array).
 * Returns: [{ dept, members: [{member, originalIndex}], totalHours, totalCost }]
 * Sorted by totalCost descending. Members with no matching role go to "Other".
 */
export function groupMembersByDept(members = [], roles = [], standardMonthlyHours = 160) {
  const deptMap = new Map();
  members.forEach((member, index) => {
    const role = roles.find(r => r.id === member.role_id);
    const dept = (role?.department || '').trim() || 'Other';
    if (!deptMap.has(dept)) deptMap.set(dept, { dept, members: [], totalHours: 0, totalCost: 0 });
    const group = deptMap.get(dept);
    group.members.push({ member, originalIndex: index });
    group.totalHours += (Number(member.hours) || 0) * (Number(member.quantity) || 1);
    group.totalCost += computeMemberCost(member, roles, 20, standardMonthlyHours);
  });
  return [...deptMap.values()].sort((a, b) => b.totalCost - a.totalCost);
}

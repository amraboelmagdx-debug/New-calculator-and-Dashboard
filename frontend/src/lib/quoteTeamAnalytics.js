import { resolveTeamCost, shortRoleLabel, computeMemberCost, percentOf } from '@/lib/productWorkspaceUtils';

export function buildQuoteTeamAnalytics(selectedProducts = [], results, roles = [], standardMonthlyHours = 160) {
  const lineBreakdown = results?.margin_breakdown?.products || [];
  const lineById = new Map(lineBreakdown.map(l => [l.id, l]));

  const products = (selectedProducts || []).filter(p => p.product_name);
  let totalTeamCost = 0;
  let totalHours = 0;
  const roleCosts = new Map();
  const productShares = [];
  // Department-level aggregation
  const deptData = new Map(); // dept → { cost, hours, roleIds: Set }

  for (const item of products) {
    const line = lineById.get(item.id);
    const members = item.team_members || [];
    const teamCost = resolveTeamCost(line, members, roles, standardMonthlyHours);
    const hours = members.reduce(
      (s, m) => s + (Number(m.hours) || 0) * (Number(m.quantity) || 1),
      0
    );

    totalTeamCost += teamCost;
    totalHours += hours;

    for (const m of members) {
      const cost = computeMemberCost(m, roles, 20, standardMonthlyHours);
      if (cost <= 0) continue;
      const label = shortRoleLabel(m.role_name || roles.find(r => r.id === m.role_id)?.name);
      roleCosts.set(label, (roleCosts.get(label) || 0) + cost);

      // Department accumulation
      const role = roles.find(r => r.id === m.role_id);
      const dept = (role?.department || '').trim() || 'Other';
      const memberHours = (Number(m.hours) || 0) * (Number(m.quantity) || 1);
      if (!deptData.has(dept)) deptData.set(dept, { cost: 0, hours: 0, roleIds: new Set() });
      const d = deptData.get(dept);
      d.cost += cost;
      d.hours += memberHours;
      d.roleIds.add(m.role_id || m.role_name);
    }

    productShares.push({
      id: item.id,
      name: item.product_name || 'Untitled service',
      teamCost,
      hours: Math.round(hours * 10) / 10,
      roleCount: members.length,
    });
  }

  const topRoles = [...roleCosts.entries()]
    .map(([name, cost]) => ({ name, cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8)
    .map(r => ({
      ...r,
      percent: percentOf(r.cost, totalTeamCost) ?? 0,
    }));

  const sharesWithPct = productShares
    .map(p => ({
      ...p,
      percent: percentOf(p.teamCost, totalTeamCost) ?? 0,
    }))
    .sort((a, b) => b.teamCost - a.teamCost);

  const laborConcentration =
    sharesWithPct.length > 0 ? Math.max(...sharesWithPct.map(p => p.percent)) : 0;

  const uniqueRoles = roleCosts.size;

  const departmentBreakdown = [...deptData.entries()]
    .map(([name, d]) => ({
      name,
      cost: d.cost,
      hours: Math.round(d.hours * 10) / 10,
      roleCount: d.roleIds.size,
      percent: percentOf(d.cost, totalTeamCost) ?? 0,
    }))
    .filter(d => d.cost > 0)
    .sort((a, b) => b.cost - a.cost);

  return {
    totalTeamCost,
    totalHours: Math.round(totalHours * 10) / 10,
    roleCount: uniqueRoles,
    topRoles,
    productShares: sharesWithPct,
    laborConcentration,
    productCount: products.length,
    departmentBreakdown,
  };
}

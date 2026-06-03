export function normalizeRoleName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitRoleName(name) {
  const n = normalizeRoleName(name);
  const idx = n.indexOf(' - ');
  if (idx === -1) return { full: n, arabic: n, english: n };
  return { full: n, arabic: n.slice(0, idx).trim(), english: n.slice(idx + 3).trim() };
}

/**
 * Match a sheet internal-role line to an HR catalog role using strict bilingual rules.
 * No substring / includes fallback — prevents Junior/Senior collisions.
 */
export function matchSheetRoleToHrRole(sheetRoleName, hrRoles = []) {
  const sheet = splitRoleName(sheetRoleName);
  const list = hrRoles || [];

  let role = list.find(r => normalizeRoleName(r.name) === sheet.full);
  if (role) return { role, matchType: 'full_exact' };

  if (sheet.english) {
    role = list.find(r => splitRoleName(r.name).english === sheet.english);
    if (role) return { role, matchType: 'english_exact' };
  }

  if (sheet.arabic) {
    role = list.find(r => splitRoleName(r.name).arabic === sheet.arabic);
    if (role) return { role, matchType: 'arabic_exact' };
  }

  return { role: null, matchType: 'none' };
}

/** Tab name for product team roles (column F internal_roles). */
export const PRODUCTS_PRICING_SHEET_TAB = 'Products Pricing Full-DB-V1';

/** Tab name for HR hourly rates used to link roles. */
export const HR_ROLES_SHEET_TAB = 'Average Emp. Salary';

/**
 * Build team members from Products Pricing internal_roles lines.
 * Always emits one member per sheet line; unmatched HR roles keep sheet name/hours.
 */
export function buildSheetTeamMembers(roleList, hrRoles, options = {}) {
  const {
    quantity = 1,
    hybridMode = false,
    hybridContext = 'resource',
    utilizationFromHours = () => 0,
  } = options;

  const qty = Math.max(1, Number(quantity) || 1);
  const members = [];
  const unmatchedRoles = [];

  (roleList || []).forEach(roleItem => {
    const sheetName = roleItem.role_name || '';
    const { role: matched } = matchSheetRoleToHrRole(sheetName, hrRoles);
    const hours = Math.round((Number(roleItem.hours) || 0) * qty * 100) / 100;

    if (!matched) unmatchedRoles.push(sheetName);

    members.push({
      id: `tm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role_id: matched?.id || '',
      role_name: matched?.name || sheetName,
      hours,
      baseline_hours: hybridMode ? hours : 0,
      labor_charge_context: hybridMode ? hybridContext : 'resource',
      hourly_rate: matched?.hourly_rate || 0,
      monthly_salary: matched?.monthly_salary || 0,
      utilization_percent: utilizationFromHours(hours),
      duration_months: 1,
      calc_mode: 'hours',
      employee_type: 'internal',
      quantity: 1,
      source: 'sheet',
      sheet_role_name: sheetName,
      hr_linked: Boolean(matched),
    });
  });

  return { members, unmatchedRoles, sheetRoleCount: (roleList || []).length };
}

import { matchSheetRoleToHrRole, splitRoleName, buildSheetTeamMembers } from './roleMatching';

const HR_ROLES = [
  { id: 'junior-bd', name: 'مصمم علامة تجارية مبتدئ - Junior Brand Designer', hourly_rate: 87.93 },
  { id: 'bd', name: 'مصمم علامة تجارية - Brand Designer', hourly_rate: 87.93 },
  { id: 'senior-bd', name: 'مصمم علامة تجارية أول - Senior Brand Designer', hourly_rate: 94.63 },
  { id: 'lead', name: 'قائد فريق العلامة التجارية - Branding Team Lead', hourly_rate: 121.4 },
  { id: 'manager', name: 'مدير إدارة العلامة التجارية - Branding Manager', hourly_rate: 169.72 },
  { id: 'copywriter', name: 'كاتب محتوى - Copywriter', hourly_rate: 94.63 },
  { id: 'senior-copy', name: 'كاتب محتوى أول - Senior Copywriter', hourly_rate: 94.63 },
  { id: 'am', name: 'مدير حسابات - Account Manager', hourly_rate: 108.01 },
  { id: 'senior-am', name: 'مدير حسابات أول - Senior Account Manager', hourly_rate: 108.01 },
];

const BIG_TIER_SHEET_ROLES = [
  { role_name: 'مصمم علامة تجارية مبتدئ - Junior Brand Designer', hours: 169 },
  { role_name: 'مصمم علامة تجارية - Brand Designer', hours: 140 },
  { role_name: 'مصمم علامة تجارية أول - Senior Brand Designer', hours: 110 },
  { role_name: 'قائد فريق العلامة التجارية - Branding Team Lead', hours: 80 },
  { role_name: 'مدير إدارة العلامة التجارية - Branding Manager', hours: 28 },
  { role_name: 'كاتب محتوى - Copywriter', hours: 16 },
  { role_name: 'مدير حسابات - Account Manager', hours: 50 },
  { role_name: 'مدير إدارة الحسابات - Accounts Director', hours: 6 },
];

describe('splitRoleName', () => {
  it('splits bilingual role names', () => {
    const parts = splitRoleName('مصمم علامة تجارية مبتدئ - Junior Brand Designer');
    expect(parts.arabic).toBe('مصمم علامة تجارية مبتدئ');
    expect(parts.english).toBe('junior brand designer');
  });
});

describe('matchSheetRoleToHrRole', () => {
  it('matches Junior Brand Designer to junior role, not Brand Designer', () => {
    const { role } = matchSheetRoleToHrRole(
      'مصمم علامة تجارية مبتدئ - Junior Brand Designer',
      HR_ROLES
    );
    expect(role?.id).toBe('junior-bd');
  });

  it('matches Brand Designer to base role, not Senior', () => {
    const { role } = matchSheetRoleToHrRole('مصمم علامة تجارية - Brand Designer', HR_ROLES);
    expect(role?.id).toBe('bd');
  });

  it('matches Senior Brand Designer correctly', () => {
    const { role } = matchSheetRoleToHrRole(
      'مصمم علامة تجارية أول - Senior Brand Designer',
      HR_ROLES
    );
    expect(role?.id).toBe('senior-bd');
  });

  it('matches Copywriter to Copywriter, not Senior Copywriter', () => {
    const { role } = matchSheetRoleToHrRole('كاتب محتوى - Copywriter', HR_ROLES);
    expect(role?.id).toBe('copywriter');
  });

  it('matches Account Manager to Account Manager, not Senior', () => {
    const { role } = matchSheetRoleToHrRole('مدير حسابات - Account Manager', HR_ROLES);
    expect(role?.id).toBe('am');
  });

  it('returns null for Accounts Director when not in HR catalog', () => {
    const { role, matchType } = matchSheetRoleToHrRole(
      'مدير إدارة الحسابات - Accounts Director',
      HR_ROLES
    );
    expect(role).toBeNull();
    expect(matchType).toBe('none');
  });

  it('buildSheetTeamMembers always includes all 8 sheet lines', () => {
    const { members, unmatchedRoles, sheetRoleCount } = buildSheetTeamMembers(
      BIG_TIER_SHEET_ROLES,
      HR_ROLES,
      { quantity: 1, utilizationFromHours: () => 0 }
    );

    expect(sheetRoleCount).toBe(8);
    expect(members).toHaveLength(8);
    expect(unmatchedRoles).toEqual(['مدير إدارة الحسابات - Accounts Director']);

    const byHours = Object.fromEntries(members.map(m => [m.hours, m]));
    expect(byHours[169].role_name).toContain('Junior Brand Designer');
    expect(byHours[169].hr_linked).toBe(true);
    expect(byHours[140].role_name).toContain('Brand Designer');
    expect(byHours[140].role_name).not.toContain('Senior');
    expect(byHours[110].role_name).toContain('Senior Brand Designer');
    expect(byHours[6].role_name).toContain('Accounts Director');
    expect(byHours[6].hr_linked).toBe(false);
    expect(byHours[6].hourly_rate).toBe(0);
  });
});

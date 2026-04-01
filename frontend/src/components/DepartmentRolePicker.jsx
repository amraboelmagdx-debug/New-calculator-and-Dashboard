import { useState, useMemo } from 'react';
import { 
  Users, Briefcase, Palette, FileText, Film, Megaphone, Target,
  Plus, ChevronDown, ChevronRight, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

// Department configuration with icons and colors
const DEPARTMENTS = [
  { 
    id: 'accounts', 
    nameAr: 'إدارة الحسابات', 
    nameEn: 'Accounts Management',
    icon: Briefcase,
    color: 'blue',
    bgLight: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    bgDark: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30',
    textLight: 'text-blue-700',
    textDark: 'text-blue-400',
    activeLight: 'bg-blue-600 text-white border-blue-600',
    activeDark: 'bg-blue-600 text-white border-blue-600'
  },
  { 
    id: 'branding', 
    nameAr: 'وحدة البراندينج', 
    nameEn: 'Branding Unit',
    icon: Palette,
    color: 'purple',
    bgLight: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    bgDark: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30',
    textLight: 'text-purple-700',
    textDark: 'text-purple-400',
    activeLight: 'bg-purple-600 text-white border-purple-600',
    activeDark: 'bg-purple-600 text-white border-purple-600'
  },
  { 
    id: 'creative', 
    nameAr: 'الوحدة الإبداعية', 
    nameEn: 'Creative Unit',
    icon: Palette,
    color: 'pink',
    bgLight: 'bg-pink-50 hover:bg-pink-100 border-pink-200',
    bgDark: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30',
    textLight: 'text-pink-700',
    textDark: 'text-pink-400',
    activeLight: 'bg-pink-600 text-white border-pink-600',
    activeDark: 'bg-pink-600 text-white border-pink-600'
  },
  { 
    id: 'content', 
    nameAr: 'وحدة المحتوى', 
    nameEn: 'Content Unit',
    icon: FileText,
    color: 'emerald',
    bgLight: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    bgDark: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
    textLight: 'text-emerald-700',
    textDark: 'text-emerald-400',
    activeLight: 'bg-emerald-600 text-white border-emerald-600',
    activeDark: 'bg-emerald-600 text-white border-emerald-600'
  },
  { 
    id: 'production', 
    nameAr: 'وحدة الإنتاج', 
    nameEn: 'Production Unit',
    icon: Film,
    color: 'amber',
    bgLight: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    bgDark: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
    textLight: 'text-amber-700',
    textDark: 'text-amber-400',
    activeLight: 'bg-amber-600 text-white border-amber-600',
    activeDark: 'bg-amber-600 text-white border-amber-600'
  },
  { 
    id: 'media', 
    nameAr: 'وحدة الإعلام والعلاقات العامة', 
    nameEn: 'Media and PR Unit',
    icon: Megaphone,
    color: 'rose',
    bgLight: 'bg-rose-50 hover:bg-rose-100 border-rose-200',
    bgDark: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30',
    textLight: 'text-rose-700',
    textDark: 'text-rose-400',
    activeLight: 'bg-rose-600 text-white border-rose-600',
    activeDark: 'bg-rose-600 text-white border-rose-600'
  },
  { 
    id: 'strategy', 
    nameAr: 'وحدة الاستراتيجية والاتصال', 
    nameEn: 'Strategy and Communication Unit',
    icon: Target,
    color: 'cyan',
    bgLight: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200',
    bgDark: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30',
    textLight: 'text-cyan-700',
    textDark: 'text-cyan-400',
    activeLight: 'bg-cyan-600 text-white border-cyan-600',
    activeDark: 'bg-cyan-600 text-white border-cyan-600'
  }
];

// Map department names from DB to our department IDs
const mapDepartmentToId = (deptName) => {
  if (!deptName) return null;
  const lower = deptName.toLowerCase();
  if (lower.includes('accounts') || lower.includes('الحسابات')) return 'accounts';
  if (lower.includes('branding') || lower.includes('براندينج') || lower.includes('البراندينج')) return 'branding';
  if (lower.includes('creative') || lower.includes('إبداع') || lower.includes('الإبداعية')) return 'creative';
  if (lower.includes('content') || lower.includes('محتوى') || lower.includes('المحتوى')) return 'content';
  if (lower.includes('production') || lower.includes('إنتاج') || lower.includes('الإنتاج')) return 'production';
  if (lower.includes('media') || lower.includes('إعلام') || lower.includes('الإعلام')) return 'media';
  if (lower.includes('strategy') || lower.includes('استراتيجية') || lower.includes('الاستراتيجية')) return 'strategy';
  return null;
};

export default function DepartmentRolePicker({ roles, selectedMembers, onAddMemberWithRole, isDarkMode }) {
  const [expandedDept, setExpandedDept] = useState(null);

  // Group roles by department
  const rolesByDepartment = useMemo(() => {
    const grouped = {};
    DEPARTMENTS.forEach(dept => {
      grouped[dept.id] = [];
    });
    grouped['other'] = [];

    roles.forEach(role => {
      const deptId = mapDepartmentToId(role.department);
      if (deptId && grouped[deptId]) {
        grouped[deptId].push(role);
      } else {
        grouped['other'].push(role);
      }
    });

    return grouped;
  }, [roles]);

  // Count selected members per department
  const selectedCountByDept = useMemo(() => {
    const counts = {};
    DEPARTMENTS.forEach(dept => {
      counts[dept.id] = 0;
    });
    counts['other'] = 0;

    selectedMembers.forEach(member => {
      const role = roles.find(r => r.id === member.role_id);
      if (role) {
        const deptId = mapDepartmentToId(role.department) || 'other';
        counts[deptId] = (counts[deptId] || 0) + 1;
      }
    });

    return counts;
  }, [selectedMembers, roles]);

  const toggleDept = (deptId) => {
    setExpandedDept(prev => prev === deptId ? null : deptId);
  };

  const isRoleSelected = (roleId) => {
    return selectedMembers.some(m => m.role_id === roleId);
  };

  return (
    <div className="space-y-3">
      {/* Department Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {DEPARTMENTS.map(dept => {
          const Icon = dept.icon;
          const rolesCount = rolesByDepartment[dept.id]?.length || 0;
          const selectedCount = selectedCountByDept[dept.id] || 0;
          const isExpanded = expandedDept === dept.id;
          
          if (rolesCount === 0) return null;

          return (
            <button
              key={dept.id}
              onClick={() => toggleDept(dept.id)}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-200 text-right
                ${isExpanded 
                  ? (isDarkMode ? dept.activeDark : dept.activeLight)
                  : (isDarkMode ? dept.bgDark : dept.bgLight)
                }
              `}
              data-testid={`dept-${dept.id}`}
            >
              <div className="flex items-start justify-between">
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center mb-2
                  ${isExpanded 
                    ? 'bg-white/20' 
                    : (isDarkMode ? 'bg-white/10' : 'bg-white')
                  }
                `}>
                  <Icon className={`w-5 h-5 ${isExpanded ? 'text-white' : (isDarkMode ? dept.textDark : dept.textLight)}`} />
                </div>
                {selectedCount > 0 && (
                  <Badge className={`
                    text-xs font-bold
                    ${isExpanded 
                      ? 'bg-white/20 text-white' 
                      : (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                    }
                  `}>
                    {selectedCount}
                  </Badge>
                )}
              </div>
              <h4 className={`font-semibold text-sm mb-0.5 ${isExpanded ? 'text-white' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>
                {dept.nameAr}
              </h4>
              <p className={`text-xs ${isExpanded ? 'text-white/70' : (isDarkMode ? 'text-neutral-400' : 'text-slate-500')}`}>
                {rolesCount} وظيفة
              </p>
              <div className={`absolute bottom-2 left-2 ${isExpanded ? 'text-white' : (isDarkMode ? dept.textDark : dept.textLight)}`}>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded Department Roles */}
      {expandedDept && rolesByDepartment[expandedDept]?.length > 0 && (
        <div className={`
          mt-4 p-4 rounded-xl animate-fade-in
          ${isDarkMode ? 'bg-neutral-800/50 border border-neutral-700' : 'bg-slate-50 border border-slate-200'}
        `}>
          <div className="flex items-center justify-between mb-4">
            <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {DEPARTMENTS.find(d => d.id === expandedDept)?.nameAr}
            </h4>
            <span className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
              اختر الوظائف للإضافة
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {rolesByDepartment[expandedDept].map(role => {
              const isSelected = isRoleSelected(role.id);
              const dept = DEPARTMENTS.find(d => d.id === expandedDept);
              
              return (
                <button
                  key={role.id}
                  onClick={() => !isSelected && onAddMemberWithRole(role.id)}
                  disabled={isSelected}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border transition-all text-right
                    ${isSelected 
                      ? (isDarkMode 
                          ? 'bg-emerald-500/20 border-emerald-500/30 cursor-not-allowed' 
                          : 'bg-emerald-50 border-emerald-200 cursor-not-allowed')
                      : (isDarkMode 
                          ? 'bg-neutral-900 border-neutral-700 hover:border-neutral-500' 
                          : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-sm')
                    }
                  `}
                  data-testid={`role-btn-${role.id}`}
                >
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {role.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs font-mono ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                        {formatCurrency(role.hourly_rate, false)}/ساعة
                      </span>
                      <span className={`text-xs font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {formatCurrency(role.total_monthly_cost || role.monthly_salary, false)}/شهر
                      </span>
                    </div>
                  </div>
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center ml-3
                    ${isSelected 
                      ? (isDarkMode ? 'bg-emerald-500 text-white' : 'bg-emerald-500 text-white')
                      : (isDarkMode ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-100 text-slate-400')
                    }
                  `}>
                    {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Other/Uncategorized Roles */}
      {rolesByDepartment['other']?.length > 0 && (
        <div className={`
          mt-2 p-3 rounded-lg
          ${isDarkMode ? 'bg-neutral-800/30' : 'bg-slate-50'}
        `}>
          <button
            onClick={() => toggleDept('other')}
            className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}
          >
            {expandedDept === 'other' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span>وظائف أخرى ({rolesByDepartment['other'].length})</span>
            {selectedCountByDept['other'] > 0 && (
              <Badge className="text-xs bg-emerald-100 text-emerald-700">{selectedCountByDept['other']}</Badge>
            )}
          </button>
          
          {expandedDept === 'other' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
              {rolesByDepartment['other'].map(role => {
                const isSelected = isRoleSelected(role.id);
                
                return (
                  <button
                    key={role.id}
                    onClick={() => !isSelected && onAddMemberWithRole(role.id)}
                    disabled={isSelected}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border transition-all text-right
                      ${isSelected 
                        ? (isDarkMode 
                            ? 'bg-emerald-500/20 border-emerald-500/30 cursor-not-allowed' 
                            : 'bg-emerald-50 border-emerald-200 cursor-not-allowed')
                        : (isDarkMode 
                            ? 'bg-neutral-900 border-neutral-700 hover:border-neutral-500' 
                            : 'bg-white border-slate-200 hover:border-slate-400')
                      }
                    `}
                  >
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {role.name}
                      </p>
                      <span className={`text-xs font-mono ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                        {formatCurrency(role.hourly_rate, false)}/ساعة
                      </span>
                    </div>
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center ml-3
                      ${isSelected 
                        ? 'bg-emerald-500 text-white'
                        : (isDarkMode ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-100 text-slate-400')
                      }
                    `}>
                      {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

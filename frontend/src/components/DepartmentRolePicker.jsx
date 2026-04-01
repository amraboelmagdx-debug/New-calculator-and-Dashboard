import { useState, useMemo } from 'react';
import { 
  Users, ChevronDown, Plus, Check, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';

export default function DepartmentRolePicker({ roles, selectedMembers, onAddMemberWithRole, isDarkMode }) {
  const [expandedDept, setExpandedDept] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Get unique departments from roles
  const departments = useMemo(() => {
    const depts = new Map();
    roles.forEach(role => {
      if (role.department) {
        if (!depts.has(role.department)) {
          depts.set(role.department, []);
        }
        depts.get(role.department).push(role);
      }
    });
    return depts;
  }, [roles]);

  // Roles without department
  const uncategorizedRoles = useMemo(() => {
    return roles.filter(r => !r.department);
  }, [roles]);

  // Filter roles by search
  const filteredRoles = useMemo(() => {
    if (!searchTerm) return null;
    return roles.filter(r => 
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roles, searchTerm]);

  // Count selected per department
  const selectedCounts = useMemo(() => {
    const counts = {};
    selectedMembers.forEach(member => {
      const role = roles.find(r => r.id === member.role_id);
      if (role?.department) {
        counts[role.department] = (counts[role.department] || 0) + 1;
      }
    });
    return counts;
  }, [selectedMembers, roles]);

  const isRoleSelected = (roleId) => selectedMembers.some(m => m.role_id === roleId);

  const toggleDept = (dept) => {
    setExpandedDept(prev => prev === dept ? null : dept);
    setSearchTerm('');
  };

  // Department colors
  const getDeptColor = (dept, index) => {
    const colors = [
      { bg: 'bg-blue-500', light: 'bg-blue-50 border-blue-200 text-blue-700', badge: 'bg-blue-100 text-blue-700' },
      { bg: 'bg-purple-500', light: 'bg-purple-50 border-purple-200 text-purple-700', badge: 'bg-purple-100 text-purple-700' },
      { bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200 text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
      { bg: 'bg-amber-500', light: 'bg-amber-50 border-amber-200 text-amber-700', badge: 'bg-amber-100 text-amber-700' },
      { bg: 'bg-rose-500', light: 'bg-rose-50 border-rose-200 text-rose-700', badge: 'bg-rose-100 text-rose-700' },
      { bg: 'bg-cyan-500', light: 'bg-cyan-50 border-cyan-200 text-cyan-700', badge: 'bg-cyan-100 text-cyan-700' },
      { bg: 'bg-indigo-500', light: 'bg-indigo-50 border-indigo-200 text-indigo-700', badge: 'bg-indigo-100 text-indigo-700' },
    ];
    return colors[index % colors.length];
  };

  const RoleButton = ({ role }) => {
    const isSelected = isRoleSelected(role.id);
    return (
      <button
        onClick={() => !isSelected && onAddMemberWithRole(role.id)}
        disabled={isSelected}
        className={`
          flex items-center justify-between w-full p-3 rounded-lg border text-right transition-all
          ${isSelected 
            ? (isDarkMode ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200')
            : (isDarkMode ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-500' : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-sm')
          }
          ${isSelected ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {role.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-mono ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
              {formatCurrency(role.hourly_rate, false)}/hr
            </span>
            <span className={`text-xs font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {formatCurrency(role.total_monthly_cost || role.monthly_salary, false)}/mo
            </span>
          </div>
        </div>
        <div className={`
          w-7 h-7 rounded-full flex items-center justify-center ml-2 flex-shrink-0
          ${isSelected ? 'bg-emerald-500 text-white' : (isDarkMode ? 'bg-neutral-700 text-neutral-400' : 'bg-slate-100 text-slate-400')}
        `}>
          {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`} />
        <Input
          placeholder="ابحث عن وظيفة..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`pr-10 text-right ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500' : 'bg-white border-slate-200'}`}
        />
      </div>

      {/* Search Results */}
      {searchTerm && filteredRoles && (
        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-neutral-800/50 border border-neutral-700' : 'bg-slate-50 border border-slate-200'}`}>
          <p className={`text-sm mb-3 ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
            نتائج البحث ({filteredRoles.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {filteredRoles.map(role => (
              <RoleButton key={role.id} role={role} />
            ))}
          </div>
          {filteredRoles.length === 0 && (
            <p className={`text-center py-4 ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
              لا توجد نتائج
            </p>
          )}
        </div>
      )}

      {/* Department Pills */}
      {!searchTerm && (
        <>
          <div className="flex flex-wrap gap-2">
            {Array.from(departments.entries()).map(([dept, deptRoles], index) => {
              const color = getDeptColor(dept, index);
              const isExpanded = expandedDept === dept;
              const selectedCount = selectedCounts[dept] || 0;
              
              return (
                <button
                  key={dept}
                  onClick={() => toggleDept(dept)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all text-sm font-medium
                    ${isExpanded 
                      ? `${color.bg} text-white border-transparent shadow-lg` 
                      : (isDarkMode 
                          ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-500' 
                          : `${color.light} border-2`
                        )
                    }
                  `}
                >
                  <span>{dept}</span>
                  <Badge className={`text-xs ${isExpanded ? 'bg-white/20 text-white' : color.badge}`}>
                    {deptRoles.length}
                  </Badge>
                  {selectedCount > 0 && (
                    <Badge className="text-xs bg-emerald-500 text-white">
                      +{selectedCount}
                    </Badge>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              );
            })}
            
            {uncategorizedRoles.length > 0 && (
              <button
                onClick={() => toggleDept('__other__')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all text-sm
                  ${expandedDept === '__other__'
                    ? 'bg-slate-600 text-white border-transparent'
                    : (isDarkMode 
                        ? 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500' 
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300'
                      )
                  }
                `}
              >
                <span>أخرى</span>
                <Badge className="text-xs bg-slate-200 text-slate-600">{uncategorizedRoles.length}</Badge>
              </button>
            )}
          </div>

          {/* Expanded Department Roles */}
          {expandedDept && (
            <div className={`
              p-4 rounded-xl animate-fade-in
              ${isDarkMode ? 'bg-neutral-800/50 border border-neutral-700' : 'bg-slate-50 border border-slate-200'}
            `}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                  اختر الوظائف
                </span>
                <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {expandedDept === '__other__' ? 'وظائف أخرى' : expandedDept}
                </h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                {(expandedDept === '__other__' ? uncategorizedRoles : departments.get(expandedDept) || []).map(role => (
                  <RoleButton key={role.id} role={role} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!searchTerm && departments.size === 0 && uncategorizedRoles.length === 0 && (
        <div className={`text-center py-8 ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد وظائف متاحة</p>
          <p className="text-sm mt-1">قم بمزامنة البيانات من Google Sheets</p>
        </div>
      )}
    </div>
  );
}

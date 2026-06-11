import { useState, useMemo } from 'react';
import { Users, Search, Plus, Check, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

export default function DepartmentRolePicker({ roles, selectedMembers, onAddMemberWithRole, isDarkMode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState(null);

  // Get unique departments from roles
  const departments = useMemo(() => {
    const depts = new Map();
    roles.forEach(role => {
      const dept = role.department || 'Other';
      if (!depts.has(dept)) {
        depts.set(dept, []);
      }
      depts.get(dept).push(role);
    });
    return Array.from(depts.entries()).map(([name, roles]) => ({ name, roles, count: roles.length }));
  }, [roles]);

  // Count selected per department
  const selectedCounts = useMemo(() => {
    const counts = {};
    selectedMembers.forEach(member => {
      const role = roles.find(r => r.id === member.role_id);
      const dept = role?.department || 'Other';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return counts;
  }, [selectedMembers, roles]);

  // Filter roles by search
  const filteredRoles = useMemo(() => {
    if (!searchTerm) return [];
    return roles.filter(r => 
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roles, searchTerm]);

  const isRoleSelected = (roleId) => selectedMembers.some(m => m.role_id === roleId);

  // Department colors with icons
  const getDeptStyle = (index) => {
    const styles = [
      { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50 border-blue-100', icon: '💼', accent: 'text-blue-600' },
      { bg: 'from-violet-500 to-violet-600', light: 'bg-violet-50 border-violet-100', icon: '🎨', accent: 'text-violet-600' },
      { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50 border-emerald-100', icon: '✨', accent: 'text-emerald-600' },
      { bg: 'from-amber-500 to-amber-600', light: 'bg-amber-50 border-amber-100', icon: '📝', accent: 'text-amber-600' },
      { bg: 'from-rose-500 to-rose-600', light: 'bg-rose-50 border-rose-100', icon: '🎬', accent: 'text-rose-600' },
      { bg: 'from-cyan-500 to-cyan-600', light: 'bg-cyan-50 border-cyan-100', icon: '📢', accent: 'text-cyan-600' },
      { bg: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50 border-indigo-100', icon: '🎯', accent: 'text-indigo-600' },
      { bg: 'from-teal-500 to-teal-600', light: 'bg-teal-50 border-teal-100', icon: '📊', accent: 'text-teal-600' },
    ];
    return styles[index % styles.length];
  };

  // Role Card Component
  const RoleCard = ({ role }) => {
    const isSelected = isRoleSelected(role.id);
    return (
      <div
        onClick={() => !isSelected && onAddMemberWithRole(role.id)}
        className={`
          relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group
          ${isSelected 
            ? (isDarkMode 
                ? 'bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/20' 
                : 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-100')
            : (isDarkMode 
                ? 'bg-neutral-800/60 border-neutral-700/50 hover:border-neutral-500 hover:bg-neutral-800' 
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md')
          }
        `}
        data-testid={`role-card-${role.id}`}
      >
        {/* Selection indicator */}
        <div className={`
          absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center transition-all
          ${isSelected 
            ? 'bg-emerald-500 text-white scale-100' 
            : (isDarkMode 
                ? 'bg-neutral-700 text-neutral-500 group-hover:bg-neutral-600 group-hover:scale-110' 
                : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:scale-110')
          }
        `}>
          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </div>
        
        {/* Role info */}
        <div className="text-right pr-0 pl-8">
          <h4 className={`font-semibold text-sm leading-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {role.name}
          </h4>
          {role.department && (
            <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
              {role.department}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Search Bar */}
      <div className="relative">
        <Search className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`} />
        <Input
          placeholder="ابحث عن وظيفة..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setSelectedDept(null); }}
          className={`pr-11 py-3 text-right rounded-xl ${isDarkMode ? 'bg-neutral-800/80 border-neutral-700 text-white placeholder:text-neutral-500' : 'bg-white border-slate-200 shadow-sm'}`}
        />
      </div>

      {/* Search Results */}
      {searchTerm && (
        <div className={`rounded-2xl overflow-hidden ${isDarkMode ? 'bg-neutral-800/50 border border-neutral-700' : 'bg-slate-50 border border-slate-100'}`}>
          <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-neutral-700 bg-neutral-800/80' : 'border-slate-100 bg-white'}`}>
            <span className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
              نتائج البحث: {filteredRoles.length}
            </span>
          </div>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {filteredRoles.map(role => <RoleCard key={role.id} role={role} />)}
            {filteredRoles.length === 0 && (
              <p className={`col-span-2 text-center py-8 ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
                لا توجد نتائج
              </p>
            )}
          </div>
        </div>
      )}

      {/* Department Cards */}
      {!searchTerm && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {departments.map((dept, index) => {
            const style = getDeptStyle(index);
            const isSelected = selectedDept === dept.name;
            const selectedCount = selectedCounts[dept.name] || 0;
            
            return (
              <button
                key={dept.name}
                onClick={() => setSelectedDept(isSelected ? null : dept.name)}
                className={`
                  relative p-4 rounded-2xl text-right transition-all duration-200 group overflow-hidden
                  ${isSelected 
                    ? `bg-gradient-to-br ${style.bg} text-white shadow-lg scale-[1.02]`
                    : (isDarkMode 
                        ? 'bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/50' 
                        : `${style.light} border hover:shadow-md hover:scale-[1.01]`)
                  }
                `}
                data-testid={`dept-card-${dept.name}`}
              >
                {/* Selected count badge */}
                {selectedCount > 0 && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">
                    {selectedCount}
                  </div>
                )}
                
                {/* Department name */}
                <h3 className={`font-bold text-sm mb-1 line-clamp-2 ${isSelected ? 'text-white' : (isDarkMode ? 'text-white' : style.accent)}`}>
                  {dept.name.split(' - ')[0]}
                </h3>
                
                {/* English name if exists */}
                {dept.name.includes(' - ') && (
                  <p className={`text-xs mb-2 ${isSelected ? 'text-white/80' : (isDarkMode ? 'text-neutral-400' : 'text-slate-500')}`}>
                    {dept.name.split(' - ')[1]}
                  </p>
                )}
                
                {/* Role count */}
                <div className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : (isDarkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-white text-slate-600')
                }`}>
                  <Users className="w-3 h-3" />
                  <span>{dept.count}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Expanded Department Roles */}
      {!searchTerm && selectedDept && (
        <div className={`
          rounded-2xl overflow-hidden animate-fade-in
          ${isDarkMode ? 'bg-neutral-800/50 border border-neutral-700' : 'bg-white border border-slate-200 shadow-lg'}
        `}>
          <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-neutral-700 bg-neutral-800' : 'border-slate-100 bg-slate-50'}`}>
            <Badge variant="secondary" className={isDarkMode ? 'bg-neutral-700 text-neutral-300' : ''}>
              {departments.find(d => d.name === selectedDept)?.count || 0} وظيفة
            </Badge>
            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {selectedDept}
            </h3>
          </div>
          
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {departments.find(d => d.name === selectedDept)?.roles.map(role => (
              <RoleCard key={role.id} role={role} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!searchTerm && departments.length === 0 && (
        <div className={`text-center py-12 rounded-2xl ${isDarkMode ? 'bg-neutral-800/50' : 'bg-slate-50'}`}>
          <Briefcase className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-neutral-700' : 'text-slate-300'}`} />
          <p className={isDarkMode ? 'text-neutral-400' : 'text-slate-500'}>لا توجد وظائف متاحة</p>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
            قم بمزامنة البيانات من Google Sheets
          </p>
        </div>
      )}
    </div>
  );
}

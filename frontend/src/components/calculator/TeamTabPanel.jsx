import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TeamMemberRow from '@/components/TeamMemberRow';
import DepartmentRolePicker from '@/components/DepartmentRolePicker';
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils';
import {
  percentOf,
  resolveTeamCost,
  topContributors,
  groupMembersByDept,
  shortDeptLabel,
} from '@/lib/productWorkspaceUtils';

export default function TeamTabPanel({
  expanded,
  onExpand,
  teamMembers,
  teamHours,
  line,
  results,
  roles,
  standardMonthlyHours,
  refreshRoles,
  isDarkMode,
  sheetHint,
  onUpdateMember,
  onRemoveMember,
  onAddRole,
}) {
  const teamCost = resolveTeamCost(line, teamMembers, roles, standardMonthlyHours);
  const productCostPct = percentOf(teamCost, line?.cost);
  const quoteCostPct = percentOf(teamCost, results?.cogs);
  const { contributors } = topContributors(teamMembers, roles, standardMonthlyHours);

  // Department grouping state — '__all__' sentinel = all expanded by default
  const [expandedDepts, setExpandedDepts] = useState(() => new Set(['__all__']));
  const isDeptExpanded = dept => expandedDepts.has('__all__') || expandedDepts.has(dept);
  const toggleDept = dept => setExpandedDepts(prev => {
    const next = new Set(prev);
    next.delete('__all__'); // leave auto-expand mode on first manual toggle
    if (next.has(dept)) next.delete(dept); else next.add(dept);
    return next;
  });

  const deptGroups = useMemo(
    () => groupMembersByDept(teamMembers, roles, standardMonthlyHours),
    [teamMembers, roles, standardMonthlyHours]
  );
  const deptCount = useMemo(
    () => new Set(teamMembers.map(m => (roles.find(r => r.id === m.role_id)?.department || 'Other').trim())).size,
    [teamMembers, roles]
  );

  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const border = isDarkMode ? 'border-neutral-800' : 'border-slate-200';
  const trackBg = isDarkMode ? 'bg-neutral-800' : 'bg-slate-200';
  const fillBg = isDarkMode ? 'bg-indigo-500/70' : 'bg-indigo-500';

  const teamCostDisplay = (
    <>
      <span className="sm:hidden">{formatCurrencyCompact(teamCost, true)}</span>
      <span className="hidden sm:inline">{formatCurrency(teamCost, true)}</span>
    </>
  );

  return (
    <div className="pt-3 space-y-4" data-testid="team-tab-panel">
      <div className={`rounded-lg border p-4 space-y-4 ${border} ${isDarkMode ? 'bg-neutral-900/30' : 'bg-white'}`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className={isDarkMode ? 'text-neutral-200' : 'text-slate-800'}>
            <strong>{teamMembers.length}</strong> Roles
          </span>
          {deptCount > 1 && (
            <>
              <span className={muted}>·</span>
              <span className={isDarkMode ? 'text-neutral-200' : 'text-slate-800'}>
                <strong>{deptCount}</strong> Depts
              </span>
            </>
          )}
          <span className={muted}>·</span>
          <span className={isDarkMode ? 'text-neutral-200' : 'text-slate-800'}>
            <strong>{Math.round(teamHours)}</strong> Hours
          </span>
          <span className={muted}>·</span>
          <span
            className={`font-mono tabular-nums ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}
            title={formatCurrency(teamCost, true)}
          >
            <strong>{teamCostDisplay}</strong> Team Cost
          </span>
        </div>

        <div className={`flex flex-wrap gap-x-4 gap-y-1 text-[11px] ${muted}`}>
          <span>
            {productCostPct != null
              ? `${productCostPct}% of Product Cost`
              : '— % of Product Cost (run calc)'}
          </span>
          <span>·</span>
          <span>
            {quoteCostPct != null
              ? `${quoteCostPct}% of Quote Cost`
              : '— % of Quote Cost (run calc)'}
          </span>
        </div>

        {contributors.length > 0 && (
          <div className="space-y-2.5">
            <p className={`text-[10px] font-medium uppercase tracking-wider ${muted}`}>Top contributors</p>
            <ul className="space-y-2.5">
              {contributors.map(c => (
                <li key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={`truncate min-w-0 ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                      {c.name}
                    </span>
                    <span className={`tabular-nums shrink-0 font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                      {c.percent}%
                    </span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${trackBg}`}>
                    <div
                      className={`h-full rounded-full ${fillBg}`}
                      style={{ width: `${Math.min(100, c.percent)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!expanded && (
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={onExpand}
            className={`w-full min-h-[44px] mb-20 lg:mb-0 gap-2 font-medium ${
              isDarkMode
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
            }`}
            data-testid="expand-team-btn"
          >
            <Users className="w-4 h-4 shrink-0" />
            Manage Team ({teamMembers.length} {teamMembers.length === 1 ? 'Role' : 'Roles'})
            <ChevronRight className="w-4 h-4 shrink-0 ml-auto" />
          </Button>
        )}
      </div>

      {expanded && (
        <div className="space-y-3 animate-fade-in">
          {/* Collapse header */}
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={onExpand}
            className={`w-full min-h-[44px] gap-2 font-medium ${
              isDarkMode
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/25 hover:text-indigo-200'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
            }`}
            data-testid="collapse-team-btn"
          >
            <Users className="w-4 h-4 shrink-0" />
            Manage Team ({teamMembers.length} {teamMembers.length === 1 ? 'Role' : 'Roles'})
            <ChevronDown className="w-4 h-4 shrink-0 ml-auto" />
          </Button>
          {sheetHint && (
            <p className={`text-[10px] ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>{sheetHint}</p>
          )}
          {teamMembers.length > 0 && (
            <div className="space-y-2">
              {deptGroups.map(({ dept, members: deptMembers, totalHours, totalCost }) => {
                const isExpanded = isDeptExpanded(dept);
                const singleDept = deptGroups.length === 1;
                return (
                  <div key={dept} className={`rounded-xl border overflow-hidden ${border}`}>
                    {/* Department header */}
                    <button
                      type="button"
                      onClick={() => !singleDept && toggleDept(dept)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                        isDarkMode
                          ? 'bg-neutral-900/60 hover:bg-neutral-900'
                          : 'bg-slate-50 hover:bg-slate-100'
                      } ${singleDept ? 'cursor-default' : ''}`}
                    >
                      <Building2 className={`w-3.5 h-3.5 shrink-0 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
                      <span className={`flex-1 text-xs font-semibold truncate ${isDarkMode ? 'text-neutral-200' : 'text-slate-700'}`}>
                        {shortDeptLabel(dept)}
                      </span>
                      <span className={`text-[10px] tabular-nums shrink-0 ${muted}`}>
                        {deptMembers.length} role{deptMembers.length !== 1 ? 's' : ''} · {Math.round(totalHours)}h · {formatCurrencyCompact(totalCost, true)}
                      </span>
                      {!singleDept && (isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-40" />
                        : <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-40" />
                      )}
                    </button>
                    {/* Collapsible member rows */}
                    {isExpanded && (
                      <div className={`p-2 space-y-2 border-t ${border}`}>
                        {deptMembers.map(({ member, originalIndex }) => (
                          <TeamMemberRow
                            key={member.id || originalIndex}
                            member={member}
                            index={originalIndex}
                            roles={roles}
                            onUpdate={(field, value) => onUpdateMember(originalIndex, field, value)}
                            onRemove={() => onRemoveMember(originalIndex)}
                            onRolesRefresh={refreshRoles}
                            darkMode={isDarkMode}
                            compact
                            standardMonthlyHours={standardMonthlyHours}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className={`rounded-lg border ${border} p-2`}>
            <DepartmentRolePicker
              roles={roles}
              selectedMembers={teamMembers}
              onAddMemberWithRole={onAddRole}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}

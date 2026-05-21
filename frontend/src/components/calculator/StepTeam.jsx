import { Users, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import DepartmentRolePicker from '@/components/DepartmentRolePicker';
import TeamMemberRow from '@/components/TeamMemberRow';
import QuoteEmptyState from './QuoteEmptyState';
import StepContinueFooter from './StepContinueFooter';

export default function StepTeam({
  isDarkMode,
  roles,
  calcData,
  setCalcData,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  refreshRoles,
  standardMonthlyHours,
  onContinue,
}) {
  return (
    <section id="team" className="animate-fade-in quote-panel-enter">
      <Card
        className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'}
        data-testid="team-section"
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'
                }`}
              >
                <Users className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Internal team</CardTitle>
                <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>
                  Select departments or let products build the team for you
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => refreshRoles(true)}
              className={
                isDarkMode
                  ? 'border-neutral-700 text-neutral-200 hover:bg-neutral-800'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }
            >
              Refresh sheet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DepartmentRolePicker
            roles={roles}
            selectedMembers={calcData.team_members}
            onAddMember={addTeamMember}
            onAddMemberWithRole={roleId => {
              const role = roles.find(r => r.id === roleId);
              if (role) {
                const newMember = {
                  id: Date.now().toString(),
                  role_id: roleId,
                  employee_type: 'internal',
                  calc_mode: 'hours',
                  hours: 0,
                  utilization_percent: 0,
                  duration_months: 1,
                  hourly_rate: role.hourly_rate || 0,
                  custom_salary: 0,
                  custom_allowance: 0,
                  admin_fee_percent: 0,
                };
                setCalcData(prev => ({
                  ...prev,
                  team_members: [...prev.team_members, newMember],
                }));
              }
            }}
            isDarkMode={isDarkMode}
          />

          {calcData.team_members.length === 0 ? (
            <div className="mt-6">
              <QuoteEmptyState
                title="No team members yet"
                description="Select departments above or apply products to generate a team."
                compact
                isDarkMode={isDarkMode}
              />
            </div>
          ) : (
            <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
              <h4 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Selected team ({calcData.team_members.length})
              </h4>
              <div className="space-y-3">
                {calcData.team_members.map((member, index) => (
                  <TeamMemberRow
                    key={member.id}
                    member={member}
                    index={index}
                    roles={roles}
                    onUpdate={(field, value) => updateTeamMember(index, field, value)}
                    onRemove={() => removeTeamMember(index)}
                    onRolesRefresh={refreshRoles}
                    darkMode={isDarkMode}
                    standardMonthlyHours={standardMonthlyHours}
                  />
                ))}
              </div>
            </div>
          )}

          {calcData.team_members.length > 0 && (
            <Collapsible className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full py-2 text-sm ${
                  isDarkMode ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Internal risk factors</span>
                </div>
                <Badge className={`text-xs ${isDarkMode ? 'badge-neutral' : 'bg-slate-100 text-slate-600'}`}>
                  {calcData.internal_risk.complexity === 'none' &&
                  calcData.internal_risk.rush === 'none' &&
                  calcData.internal_risk.execution === 'none'
                    ? 'None'
                    : `${[calcData.internal_risk.complexity, calcData.internal_risk.rush, calcData.internal_risk.execution].filter(r => r !== 'none').length} factors`}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="grid grid-cols-3 gap-4">
                  {['complexity', 'rush', 'execution'].map(factor => (
                    <div key={factor}>
                      <Label className={`text-xs capitalize ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                        {factor}
                      </Label>
                      <Select
                        value={calcData.internal_risk[factor]}
                        onValueChange={v =>
                          setCalcData(p => ({
                            ...p,
                            internal_risk: { ...p.internal_risk, [factor]: v },
                          }))
                        }
                      >
                        <SelectTrigger
                          className={`mt-1 text-sm ${
                            isDarkMode
                              ? 'bg-neutral-950 border-neutral-800 text-neutral-300'
                              : 'bg-white border-slate-300 text-slate-700'
                          }`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                          {['none', 'low', 'medium', 'high'].map(level => (
                            <SelectItem
                              key={level}
                              value={level}
                              className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}
                            >
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          {onContinue && <StepContinueFooter label="Continue to Economics" onContinue={onContinue} isDarkMode={isDarkMode} />}
        </CardContent>
      </Card>
    </section>
  );
}

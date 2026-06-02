import { Briefcase, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StepContinueFooter from './StepContinueFooter';

export default function StepFrame({
  isDarkMode,
  projectInfo,
  setProjectInfo,
  calcData,
  setCalcData,
  onContinue,
  onLoadOpportunity,
  opportunityLoading = false,
  opportunityLoadError = '',
  opportunityLoadSuccess = '',
}) {
  const inputClass = isDarkMode
    ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600'
    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';

  const scopeItems = projectInfo.opportunity_scope_items || [];

  return (
    <section id="project" className="animate-fade-in quote-panel-enter">
      <Card
        className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'}
        data-testid="project-info-section"
      >
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'
              }`}
            >
              <Briefcase className={`w-5 h-5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`} />
            </div>
            <div>
              <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Project information
              </CardTitle>
              <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>
                Basic details about the opportunity
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Zone A — Opportunity ID lookup */}
          <div className="space-y-2">
            <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Opportunity ID
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={projectInfo.opportunity_id || ''}
                onChange={e =>
                  setProjectInfo(p => ({
                    ...p,
                    opportunity_id: e.target.value,
                    opportunity_loaded: false,
                    opportunity_source: '',
                    opportunity_scope_raw: '',
                    opportunity_scope_items: [],
                  }))
                }
                placeholder="e.g. OPP-2024-001"
                className={`flex-1 ${inputClass}`}
                data-testid="opportunity-id-input"
              />
              <Button
                type="button"
                onClick={onLoadOpportunity}
                disabled={opportunityLoading || !(projectInfo.opportunity_id || '').trim()}
                className="shrink-0"
                data-testid="opportunity-load-btn"
              >
                {opportunityLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading…
                  </>
                ) : (
                  'Load from sheet'
                )}
              </Button>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>
              Pulls from BDsMastersheet (Google Sheet)
            </p>
            {opportunityLoadError && (
              <p className="text-xs text-rose-500" data-testid="opportunity-load-error">
                {opportunityLoadError}
              </p>
            )}
            {opportunityLoadSuccess && !opportunityLoadError && (
              <p className="text-xs text-emerald-500" data-testid="opportunity-load-success">
                {opportunityLoadSuccess}
              </p>
            )}
          </div>

          {/* Zone B — Project details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Client name</Label>
              <Input
                value={projectInfo.client_name}
                onChange={e => setProjectInfo(p => ({ ...p, client_name: e.target.value }))}
                placeholder="Enter client name"
                className={`mt-1.5 ${inputClass}`}
                data-testid="client-name-input"
              />
            </div>
            <div>
              <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Project name</Label>
              <Input
                value={projectInfo.project_name}
                onChange={e => setProjectInfo(p => ({ ...p, project_name: e.target.value }))}
                placeholder="Enter project name"
                className={`mt-1.5 ${inputClass}`}
                data-testid="project-name-input"
              />
            </div>
            <div>
              <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Sales owner</Label>
              <Input
                value={projectInfo.sales_owner}
                onChange={e => setProjectInfo(p => ({ ...p, sales_owner: e.target.value }))}
                placeholder="Enter sales owner"
                className={`mt-1.5 ${inputClass}`}
                data-testid="sales-owner-input"
              />
            </div>
            <div>
              <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                Opportunity Source
              </Label>
              <Input
                value={projectInfo.opportunity_source || ''}
                onChange={e => setProjectInfo(p => ({ ...p, opportunity_source: e.target.value }))}
                placeholder="From sheet after load, or enter manually"
                className={`mt-1.5 ${inputClass}`}
                data-testid="opportunity-source-input"
              />
            </div>
          </div>

          {/* Zone C — Opportunity scope */}
          <div
            className={`pt-4 border-t space-y-3 ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}
            data-testid="opportunity-scope-section"
          >
            <div>
              <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Opportunity scope
              </h3>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                Services from the BD sheet — used when building scope
              </p>
            </div>
            {!projectInfo.opportunity_loaded ? (
              <p className={`text-sm py-4 text-center rounded-lg border border-dashed ${
                isDarkMode ? 'border-neutral-800 text-neutral-600' : 'border-slate-200 text-slate-400'
              }`}>
                Load an opportunity ID to see scope lines
              </p>
            ) : scopeItems.length === 0 ? (
              <p className={`text-sm ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                No scope lines on this opportunity
              </p>
            ) : (
              <ul className="space-y-2">
                {scopeItems.map(item => (
                  <li
                    key={`scope-${item.index}-${item.raw}`}
                    className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                      isDarkMode ? 'border-neutral-800 bg-neutral-900/30' : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
                        {item.label || item.raw}
                      </p>
                      {item.label && item.raw !== item.label && (
                        <p className={`text-xs mt-0.5 line-clamp-2 ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>
                          {item.raw}
                        </p>
                      )}
                    </div>
                    <Badge
                      className={`shrink-0 text-[10px] border ${
                        item.matched
                          ? isDarkMode
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : isDarkMode
                            ? 'bg-neutral-800 text-neutral-500 border-neutral-700'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {item.matched
                        ? `Matched → ${item.catalog_product_name}`
                        : 'No Catalog Match'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Zone D — Client type & Lead source */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t ${
              isDarkMode ? 'border-neutral-800' : 'border-slate-200'
            }`}
          >
            <div>
              <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Client type</Label>
              <Select value={calcData.client_type} onValueChange={v => setCalcData(p => ({ ...p, client_type: v }))}>
                <SelectTrigger className={`mt-1.5 ${inputClass}`} data-testid="client-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                  <SelectItem value="new" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>
                    New customer
                  </SelectItem>
                  <SelectItem value="existing" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>
                    Existing customer
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Lead source</Label>
              <Select value={calcData.lead_source} onValueChange={v => setCalcData(p => ({ ...p, lead_source: v }))}>
                <SelectTrigger className={`mt-1.5 ${inputClass}`} data-testid="lead-source-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                  <SelectItem value="direct" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>
                    Direct (sales generated)
                  </SelectItem>
                  <SelectItem value="referral" className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>
                    Referral
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {onContinue && (
            <StepContinueFooter label="Continue to Scope" onContinue={onContinue} isDarkMode={isDarkMode} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}

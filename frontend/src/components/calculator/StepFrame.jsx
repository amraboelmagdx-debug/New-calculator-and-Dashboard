import { Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StepContinueFooter from './StepContinueFooter';

export default function StepFrame({
  isDarkMode,
  projectInfo,
  setProjectInfo,
  paymentTerms,
  calcData,
  setCalcData,
  onContinue,
}) {
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
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Client name</Label>
              <Input
                value={projectInfo.client_name}
                onChange={e => setProjectInfo(p => ({ ...p, client_name: e.target.value }))}
                placeholder="Enter client name"
                className={`mt-1.5 ${
                  isDarkMode
                    ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
                data-testid="client-name-input"
              />
            </div>
            <div>
              <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Project name</Label>
              <Input
                value={projectInfo.project_name}
                onChange={e => setProjectInfo(p => ({ ...p, project_name: e.target.value }))}
                placeholder="Enter project name"
                className={`mt-1.5 ${
                  isDarkMode
                    ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
                data-testid="project-name-input"
              />
            </div>
            <div>
              <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Sales owner</Label>
              <Input
                value={projectInfo.sales_owner}
                onChange={e => setProjectInfo(p => ({ ...p, sales_owner: e.target.value }))}
                placeholder="Enter sales owner"
                className={`mt-1.5 ${
                  isDarkMode
                    ? 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
                data-testid="sales-owner-input"
              />
            </div>
            <div>
              <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Payment terms</Label>
              <Select
                value={projectInfo.payment_term_id}
                onValueChange={v => setProjectInfo(p => ({ ...p, payment_term_id: v }))}
              >
                <SelectTrigger
                  className={`mt-1.5 ${
                    isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                  data-testid="payment-terms-select"
                >
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                  {paymentTerms.map(term => (
                    <SelectItem
                      key={term.id}
                      value={term.id}
                      className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}
                    >
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className={`grid grid-cols-2 gap-4 mt-4 pt-4 border-t ${
              isDarkMode ? 'border-neutral-800' : 'border-slate-200'
            }`}
          >
            <div>
              <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Client type</Label>
              <Select value={calcData.client_type} onValueChange={v => setCalcData(p => ({ ...p, client_type: v }))}>
                <SelectTrigger
                  className={`mt-1.5 ${
                    isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                  data-testid="client-type-select"
                >
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
                <SelectTrigger
                  className={`mt-1.5 ${
                    isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                  data-testid="lead-source-select"
                >
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

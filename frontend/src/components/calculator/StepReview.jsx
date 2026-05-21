import { FileText, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import QuoteEmptyState from './QuoteEmptyState';
import { DEAL_STEPS } from './quoteSteps';

export default function StepReview({
  isDarkMode,
  stepCompletion,
  results,
  onGoToScope,
  onSaveTemplate,
  hasTemplateSaveContent,
  exportPdfSlot,
}) {
  return (
    <section id="review" className="animate-fade-in quote-panel-enter">
      <Card
        className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'}
        data-testid="review-section"
      >
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'
              }`}
            >
              <FileText className={`w-5 h-5 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`} />
            </div>
            <div>
              <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Review & commit
              </CardTitle>
              <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>
                Confirm scope and economics before export
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {DEAL_STEPS.filter(s => s.id !== 'review').map(step => (
              <li
                key={step.id}
                className={`flex items-center justify-between gap-2 text-sm py-2 px-3 rounded-lg ${
                  isDarkMode ? 'bg-neutral-900/60' : 'bg-slate-50'
                }`}
              >
                <span className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>{step.label}</span>
                <Badge
                  className={
                    stepCompletion[step.id]
                      ? isDarkMode
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : isDarkMode
                        ? 'bg-neutral-800 text-neutral-500 border-neutral-700'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                  }
                >
                  {stepCompletion[step.id] ? 'Complete' : 'Incomplete'}
                </Badge>
              </li>
            ))}
          </ul>
          {!results ? (
            <QuoteEmptyState
              title="No quote calculated yet"
              description="Finish Scope and Economics — pricing updates automatically."
              actionLabel="Go to Scope"
              onAction={onGoToScope}
              isDarkMode={isDarkMode}
            />
          ) : (
            <div
              className={`p-4 rounded-xl border ${
                isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <p className={`text-sm ${isDarkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                Ready to export or save as a template.
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {exportPdfSlot}
            <Button
              variant="outline"
              className={`gap-2 ${isDarkMode ? 'border-neutral-700' : ''}`}
              onClick={onSaveTemplate}
              disabled={!hasTemplateSaveContent}
            >
              <Save className="w-4 h-4" />
              Save as template
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

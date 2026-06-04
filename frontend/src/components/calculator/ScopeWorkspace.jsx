import { LayoutTemplate } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ScopeContextStrip from './ScopeContextStrip';
import StepProducts from './StepProducts';

export default function ScopeWorkspace({
  isDarkMode,
  expandAllSections,
  contextStripProps,
  productsProps,
}) {
  const stacked = expandAllSections;

  return (
    <section id="scope" className="animate-fade-in quote-panel-enter" data-testid="scope-workspace">
      <ScopeContextStrip {...contextStripProps} />

      <Card
        className={`scope-workspace mt-4 ${
          isDarkMode ? 'dark-card border-neutral-800' : 'bg-white border border-slate-200 shadow-sm rounded-xl'
        }`}
      >
        <div
          className={`flex items-center gap-2.5 px-6 py-3 border-b ${
            isDarkMode ? 'border-neutral-800' : 'border-slate-200'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'
            }`}
          >
            <LayoutTemplate className={`w-4 h-4 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`} />
          </div>
          <div className="min-w-0">
            <h2 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Portfolio</h2>
            <p className={`text-xs truncate ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              Build and price your quote — team and risk analytics live on the executive rail
            </p>
          </div>
        </div>

        <CardContent className="px-6 py-4 space-y-4 pb-5">
          <div className={stacked ? 'space-y-2' : undefined}>
            {stacked && (
              <h3 className={`text-xs font-semibold uppercase tracking-wider px-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                Products
              </h3>
            )}
            <StepProducts embedded isDarkMode={isDarkMode} {...productsProps} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

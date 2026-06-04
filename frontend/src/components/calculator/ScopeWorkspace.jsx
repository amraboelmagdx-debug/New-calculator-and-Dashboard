import { useState } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ScopeContextStrip from './ScopeContextStrip';
import QuoteRiskDashboard from './QuoteRiskDashboard';
import StepProducts from './StepProducts';
import StepTeam from './StepTeam';

const TABS = [
  { id: 'products', label: 'Products', subtitle: 'Build and price your quote' },
  { id: 'team', label: 'Team analysis', subtitle: 'Optional — quote-level labor overview' },
  { id: 'risk', label: 'Risk analysis', subtitle: 'Optional — quote-level exposure overview' },
];

export default function ScopeWorkspace({
  isDarkMode,
  expandAllSections,
  contextStripProps,
  productsProps,
  teamProps,
}) {
  const [scopeTab, setScopeTab] = useState('products');
  const stacked = expandAllSections;

  const tabBtnClass = tab =>
    `flex-1 py-2 text-sm rounded-md transition-colors scope-tab ${
      scopeTab === tab ? 'scope-tab-active font-semibold' : 'font-medium scope-tab-inactive'
    } ${
      scopeTab === tab
        ? isDarkMode
          ? 'bg-neutral-800 text-white'
          : 'bg-white text-slate-900 shadow-sm'
        : isDarkMode
          ? 'text-neutral-500 hover:text-neutral-300'
          : 'text-slate-500 hover:text-slate-800'
    }`;

  const panel = (id, title, children) => (
    <div className={stacked ? 'space-y-2' : scopeTab === id ? 'block' : 'hidden'}>
      {stacked && (
        <h3 className={`text-xs font-semibold uppercase tracking-wider px-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );

  const activeTabMeta = TABS.find(t => t.id === scopeTab);

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
            <h2 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Scope workspace</h2>
            <p className={`text-xs truncate ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              {activeTabMeta?.subtitle || 'Products command center'}
            </p>
          </div>
        </div>

        {!stacked && (
          <div
            className={`mx-6 mt-3 flex gap-1 p-1 rounded-lg ${isDarkMode ? 'bg-neutral-900' : 'bg-slate-100'}`}
            role="tablist"
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={scopeTab === tab.id}
                onClick={() => setScopeTab(tab.id)}
                className={tabBtnClass(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <CardContent className="px-6 py-4 space-y-4 pb-5">
          {panel('products', 'Products', <StepProducts embedded isDarkMode={isDarkMode} {...productsProps} />)}
          {panel('team', 'Team analysis', <StepTeam embedded isDarkMode={isDarkMode} {...teamProps} />)}
          {panel(
            'risk',
            'Risk analysis',
            <QuoteRiskDashboard
              isDarkMode={isDarkMode}
              selectedProducts={productsProps?.selectedProducts}
              results={productsProps?.results}
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}

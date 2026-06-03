import { useState } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ScopeContextStrip from './ScopeContextStrip';
import ScopeRiskPanel from './ScopeRiskPanel';
import TeamSyncBanner from './TeamSyncBanner';
import StepProducts from './StepProducts';
import StepTeam from './StepTeam';
import StepContinueFooter from './StepContinueFooter';

const TABS = [
  { id: 'products', label: 'Products' },
  { id: 'team', label: 'Team' },
  { id: 'risk', label: 'Risk' },
];

export default function ScopeWorkspace({
  isDarkMode,
  expandAllSections,
  onContinue,
  teamOutOfSync,
  onReviewTeamChanges,
  onSyncTeam,
  contextStripProps,
  productsProps,
  teamProps,
  calcData,
  setCalcData,
}) {
  const [scopeTab, setScopeTab] = useState('products');
  const [activeProductFilter, setActiveProductFilter] = useState(null);
  const stacked = expandAllSections;

  const openTeamTab = (productName) => {
    setScopeTab('team');
    setActiveProductFilter(productName || null);
  };

  const tabBtnClass = tab =>
    `flex-1 py-2 text-sm font-medium rounded-md transition-colors scope-tab ${
      scopeTab === tab ? 'scope-tab-active' : ''
    } ${
      scopeTab === tab
        ? isDarkMode
          ? 'bg-neutral-800 text-white'
          : 'bg-white text-slate-900 shadow-sm'
        : isDarkMode
          ? 'text-neutral-500 hover:text-neutral-300'
          : 'text-slate-600 hover:text-slate-900'
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

  return (
    <section id="scope" className="animate-fade-in quote-panel-enter" data-testid="scope-workspace">
      <ScopeContextStrip {...contextStripProps} />

      <Card
        className={`scope-workspace mt-4 ${
          isDarkMode ? 'dark-card border-neutral-800' : 'bg-white border border-slate-200 shadow-sm rounded-xl'
        }`}
      >
        <div
          className={`flex items-center gap-3 px-6 pt-5 pb-3 border-b ${
            isDarkMode ? 'border-neutral-800' : 'border-slate-200'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'
            }`}
          >
            <LayoutTemplate className={`w-5 h-5 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`} />
          </div>
          <div>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Scope workspace</h2>
            <p className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              Products, team, and risk in one place
            </p>
          </div>
        </div>

        {!stacked && (
          <div
            className={`mx-6 mt-4 flex gap-1 p-1 rounded-lg ${isDarkMode ? 'bg-neutral-900' : 'bg-slate-100'}`}
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

        <CardContent className="px-6 py-5 space-y-4">
          {teamOutOfSync && (
            <TeamSyncBanner
              isDarkMode={isDarkMode}
              onReviewChanges={onReviewTeamChanges}
              onSyncTeam={onSyncTeam}
            />
          )}

          {panel('products', 'Products', <StepProducts embedded isDarkMode={isDarkMode} onOpenTeamTab={openTeamTab} {...productsProps} />)}
          {panel('team', 'Team',
            <StepTeam
              embedded
              isDarkMode={isDarkMode}
              {...teamProps}
              activeProductFilter={activeProductFilter}
              onSetProductFilter={setActiveProductFilter}
              onClearProductFilter={() => setActiveProductFilter(null)}
            />
          )}
          {panel(
            'risk',
            'Risk',
            <ScopeRiskPanel isDarkMode={isDarkMode} calcData={calcData} setCalcData={setCalcData} />
          )}
        </CardContent>

        <div
          className={`sticky bottom-0 z-10 px-6 py-4 border-t safe-area-pb ${
            isDarkMode ? 'bg-neutral-900/95 border-neutral-800 backdrop-blur-sm' : 'bg-white/95 border-slate-200 backdrop-blur-sm'
          }`}
        >
          <StepContinueFooter label="Continue to Economics" onContinue={onContinue} isDarkMode={isDarkMode} sticky />
        </div>
      </Card>
    </section>
  );
}

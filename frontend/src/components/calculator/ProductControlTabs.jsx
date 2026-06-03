import { Users, Building2, ShieldAlert, Percent, BarChart2 } from 'lucide-react';

const TABS = [
  { id: 'team', label: 'Team', icon: Users },
  { id: 'vendors', label: 'Vendors', icon: Building2 },
  { id: 'risk', label: 'Risk', icon: ShieldAlert },
  { id: 'margin', label: 'Margin', icon: Percent },
  { id: 'insights', label: 'Insights', icon: BarChart2 },
];

export default function ProductControlTabs({
  activeTab,
  onTabChange,
  isDarkMode,
  teamLabel,
  vendorsLabel,
  riskLabel,
  showInsights,
  panelOpen = false,
}) {
  const labels = {
    team: teamLabel || 'Team',
    vendors: vendorsLabel || 'Vendors',
    risk: riskLabel || 'Risk',
    margin: 'Margin',
    insights: 'Insights',
  };

  const stripBg = isDarkMode ? 'bg-neutral-900/30' : 'bg-slate-50/60';

  return (
    <div
      className={`mt-2 pt-2 border-t ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'} ${stripBg}`}
      role="tablist"
      data-testid="product-control-tabs"
    >
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex flex-nowrap gap-0.5 min-w-max px-1">
          {TABS.filter(t => t.id !== 'insights' || showInsights).map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(id)}
                className={`inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2.5 text-sm font-medium transition-colors shrink-0 ${
                  active
                    ? panelOpen
                      ? isDarkMode
                        ? 'rounded-t-lg bg-neutral-900/80 text-indigo-300 border border-b-0 border-indigo-500/30 font-semibold -mb-px relative z-10'
                        : 'rounded-t-lg bg-white text-indigo-700 border border-b-0 border-indigo-200 font-semibold -mb-px relative z-10'
                      : isDarkMode
                        ? 'rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                        : 'rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold'
                    : isDarkMode
                      ? 'rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50 border border-transparent'
                      : 'rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent'
                }`}
                data-testid={`product-tab-${id}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {labels[id] || label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

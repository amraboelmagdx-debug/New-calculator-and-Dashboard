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
}) {
  const labels = {
    team: teamLabel || 'Team',
    vendors: vendorsLabel || 'Vendors',
    risk: riskLabel || 'Risk',
    margin: 'Margin',
    insights: 'Insights',
  };

  return (
    <div
      className={`flex flex-wrap gap-1 border-b ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}
      role="tablist"
      data-testid="product-control-tabs"
    >
      {TABS.filter(t => t.id !== 'insights' || showInsights).map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
              active
                ? isDarkMode
                  ? 'border-indigo-400 text-indigo-300'
                  : 'border-indigo-600 text-indigo-700'
                : isDarkMode
                  ? 'border-transparent text-neutral-500 hover:text-neutral-300'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            data-testid={`product-tab-${id}`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {labels[id] || label}
          </button>
        );
      })}
    </div>
  );
}

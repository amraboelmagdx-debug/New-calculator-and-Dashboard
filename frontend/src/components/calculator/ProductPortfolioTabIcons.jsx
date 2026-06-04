import { Users, ShieldAlert, Percent, BarChart2 } from 'lucide-react';

const TABS = [
  { id: 'team', icon: Users, label: 'Team' },
  { id: 'risk', icon: ShieldAlert, label: 'Risk' },
  { id: 'margin', icon: Percent, label: 'Margin' },
  { id: 'insights', icon: BarChart2, label: 'Insights' },
];

export default function ProductPortfolioTabIcons({
  activeTab,
  onTabChange,
  isDarkMode,
  showInsights,
  riskActive,
}) {
  return (
    <div className="flex items-center gap-0.5" role="tablist" data-testid="product-portfolio-tab-icons">
      {TABS.filter(t => t.id !== 'insights' || showInsights).map(({ id, icon: Icon, label }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            title={label}
            onClick={() => onTabChange(id)}
            className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
              active
                ? isDarkMode
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'bg-indigo-50 text-indigo-700'
                : isDarkMode
                  ? 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            } ${id === 'risk' && riskActive && !active ? (isDarkMode ? 'text-amber-400' : 'text-amber-600') : ''}`}
            data-testid={`product-tab-${id}`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}
